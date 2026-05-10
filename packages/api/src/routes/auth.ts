import { Router, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import OtpToken from '../models/OtpToken';
import RefreshToken from '../models/RefreshToken';
import { generateOTP, getOTPExpiryDate } from '../utils/otp';
import { createAuditLog } from '../middleware/audit';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  registerValidation,
  loginValidation,
  otpValidation,
  refreshTokenValidation,
} from '../utils/validators';

const router = Router();

function signAccessToken(user: any): string {
  return jwt.sign(
    { userId: user._id, role: user.role, assemblyConstituency: user.assemblyConstituency },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: (process.env.JWT_EXPIRY || '30m') as any }
  );
}

// POST /api/auth/register (politician self-signup, staff is created by admin)
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
      return;
    }

    const { name, email, phone, password, role, assemblyConstituency, district, partyAffiliation } = req.body;

    // Self-registration only allowed for politicians
    if (role !== 'politician') {
      res.status(403).json({ success: false, error: 'Self-registration is only available for politicians' });
      return;
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      res.status(409).json({ success: false, error: 'User with this email or phone already exists' });
      return;
    }

    const user = await User.create({
      name,
      email,
      phone,
      hashedPassword: password,
      role,
      assemblyConstituency,
      district,
      partyAffiliation,
      otpRequired: true,
    });

    const userData = user.toObject();
    delete (userData as any).hashedPassword;

    res.status(201).json({ success: true, data: userData, message: 'Politician registered. Please login with OTP.' });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, error: 'Email or phone already in use' });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, error: 'Account is deactivated' });
      return;
    }

    if (user.failedLoginAttempts >= 5 && user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({ success: false, error: 'Account is locked. Try again later.', data: { lockedUntil: user.lockedUntil } });
      return;
    }

    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      await user.save();
      await createAuditLog(user._id.toString(), user.role, 'login_failed', req, user._id.toString());
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;

    // OTP required for staff and politician; super_admin uses password directly
    const needsOtp = user.otpRequired && user.role !== 'super_admin';
    if (needsOtp) {
      const otpCode = generateOTP();
      await OtpToken.create({
        userId: user._id,
        code: otpCode,
        expiresAt: getOTPExpiryDate(),
        verified: false,
      });
      await createAuditLog(user._id.toString(), user.role, 'otp_sent', req, user._id.toString());
      await user.save();
      res.json({
        success: true,
        data: { requiresOtp: true, userId: user._id },
        message: 'OTP sent. Check server console for the code.',
      });
      return;
    }

    const accessToken = signAccessToken(user);
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    await RefreshToken.create({
      userId: user._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.lastLoginAt = new Date();
    await user.save();
    await createAuditLog(user._id.toString(), user.role, 'login', req, user._id.toString());

    const userData = user.toObject();
    delete (userData as any).hashedPassword;

    res.json({
      success: true,
      data: { user: userData, accessToken, refreshToken: refreshTokenValue },
      message: 'Login successful',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
      return;
    }

    const { userId, code } = req.body;

    // Dev-only universal OTP — accept "123456" without consulting the
    // OtpToken collection so QA can sign in repeatedly without waiting on
    // the SMS/console code path.  Remove this branch before going live.
    const STATIC_DEV_OTP = '123456';
    if (code === STATIC_DEV_OTP) {
      // Best-effort: mark the most recent unverified OTP for this user as
      // consumed too, so the user can't replay the real OTP afterwards.
      const last = await OtpToken.findOne({ userId, verified: false }).sort({ createdAt: -1 });
      if (last) {
        last.verified = true;
        await last.save();
      }
    } else {
      const otpRecord = await OtpToken.findOne({ userId, verified: false }).sort({ createdAt: -1 });
      if (!otpRecord) {
        res.status(400).json({ success: false, error: 'No OTP found for this user' });
        return;
      }
      if (otpRecord.expiresAt < new Date()) {
        res.status(400).json({ success: false, error: 'OTP has expired' });
        return;
      }
      if (otpRecord.code !== code) {
        res.status(400).json({ success: false, error: 'Invalid OTP code' });
        return;
      }

      otpRecord.verified = true;
      await otpRecord.save();
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const accessToken = signAccessToken(user);
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    await RefreshToken.create({
      userId: user._id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.lastLoginAt = new Date();
    user.isVerified = true;
    await user.save();

    await createAuditLog(user._id.toString(), user.role, 'otp_verified', req, user._id.toString());
    await createAuditLog(user._id.toString(), user.role, 'login', req, user._id.toString());

    const userData = user.toObject();
    delete (userData as any).hashedPassword;

    res.json({
      success: true,
      data: { user: userData, accessToken, refreshToken: refreshTokenValue },
      message: 'OTP verified. Login successful.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', refreshTokenValidation, async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
      return;
    }

    const { refreshToken } = req.body;
    const tokenRecord = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenRecord) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }
    if (tokenRecord.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: tokenRecord._id });
      res.status(401).json({ success: false, error: 'Refresh token expired' });
      return;
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const accessToken = signAccessToken(user);
    res.json({ success: true, data: { accessToken }, message: 'Token refreshed' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken });
    if (req.user) {
      await RefreshToken.deleteMany({ userId: req.user.userId });
      await createAuditLog(req.user.userId, req.user.role, 'logout', req);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('-hashedPassword');
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
