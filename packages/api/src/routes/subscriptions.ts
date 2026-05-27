import { Router, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { mongoIdParam, paginationQuery } from '../utils/validators';

const router = Router();

export interface Tier {
  key: 'basic' | 'standard' | 'premium';
  name: string;
  amount: number;
  durationDays: number;
  features: string[];
}

const TIERS: Tier[] = [
  {
    key: 'basic',
    name: 'Basic',
    amount: 9999,
    durationDays: 90,
    features: ['Voter roll access', 'Up to 5 booths', 'Basic analytics'],
  },
  {
    key: 'standard',
    name: 'Standard',
    amount: 24999,
    durationDays: 180,
    features: [
      'Voter roll + visit records',
      'Up to 50 booths',
      'Full analytics dashboard',
      'Caste & grievance insights',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    amount: 49999,
    durationDays: 365,
    features: [
      'All Standard features',
      'Unlimited booths',
      'Candidate share tracking',
      'Priority support',
      'Exportable reports',
    ],
  },
];

function tier(key: string): Tier | undefined {
  return TIERS.find((t) => t.key === key);
}

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RZP_ENABLED = !!(RZP_KEY_ID && RZP_KEY_SECRET);

async function createRazorpayOrder(amount: number, currency: string, receipt: string): Promise<string> {
  if (!RZP_ENABLED) {
    return `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amount * 100, currency, receipt }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order failed: ${body}`);
  }
  const data: any = await res.json();
  return data.id;
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!RZP_ENABLED) return true; // mock mode always passes
  const expected = crypto
    .createHmac('sha256', RZP_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

// GET /api/subscriptions/tiers — public-ish list of plans
router.get('/tiers', (_req, res: Response) => {
  res.json({ success: true, data: { tiers: TIERS, paymentEnabled: RZP_ENABLED, keyId: RZP_KEY_ID || null } });
});

// GET /api/subscriptions/mine — politician's active subscription
router.get('/mine', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sub = await Subscription.findOne({
      politicianId: req.user!.userId,
    })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: sub });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/subscriptions — admin list
router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const filter: any = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.tier) filter.tier = req.query.tier;

      const [subs, total] = await Promise.all([
        Subscription.find(filter)
          .populate(
            'politicianId',
            'name email phone assemblyConstituency district assignedBoothIds partyAffiliation',
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Subscription.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: { subscriptions: subs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/subscriptions/order — politician creates a pending subscription + razorpay order
router.post(
  '/order',
  authenticate,
  requireRole('politician', 'super_admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { tier: tierKey, assemblyConstituency, politicianId } = req.body;
      const selected = tier(tierKey);
      if (!selected) {
        res.status(400).json({ success: false, error: 'Invalid tier' });
        return;
      }

      let targetPoliticianId = req.user!.userId;
      if (req.user!.role === 'super_admin') {
        if (!politicianId) {
          res.status(400).json({ success: false, error: 'politicianId required for admin orders' });
          return;
        }
        const politician = await User.findById(politicianId);
        if (!politician || politician.role !== 'politician') {
          res.status(404).json({ success: false, error: 'Politician not found' });
          return;
        }
        targetPoliticianId = politicianId;
      }

      const constituency = assemblyConstituency || req.user!.assemblyConstituency;
      if (!constituency) {
        res.status(400).json({ success: false, error: 'assemblyConstituency is required' });
        return;
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selected.durationDays);

      const receipt = `pol_${String(targetPoliticianId).slice(-8)}_${Date.now()}`;
      const orderId = await createRazorpayOrder(selected.amount, 'INR', receipt);

      const subscription = await Subscription.create({
        politicianId: targetPoliticianId,
        tier: selected.key,
        status: 'pending',
        assemblyConstituency: constituency,
        startDate,
        endDate,
        amount: selected.amount,
        currency: 'INR',
        razorpayOrderId: orderId,
      });

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'subscription_create',
        req,
        subscription._id.toString(),
        undefined,
        { tier: selected.key, amount: selected.amount, constituency },
      );

      res.status(201).json({
        success: true,
        data: {
          subscription,
          razorpay: {
            keyId: RZP_KEY_ID || null,
            orderId,
            amount: selected.amount * 100,
            currency: 'INR',
            paymentEnabled: RZP_ENABLED,
          },
        },
        message: RZP_ENABLED ? 'Order created' : 'Mock order created (payment gateway not configured)',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/subscriptions/verify — confirm payment, activate
router.post('/verify', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId) {
      res.status(400).json({ success: false, error: 'razorpayOrderId is required' });
      return;
    }
    const subscription = await Subscription.findOne({ razorpayOrderId });
    if (!subscription) {
      res.status(404).json({ success: false, error: 'Subscription not found for order' });
      return;
    }
    if (
      req.user!.role !== 'super_admin' &&
      subscription.politicianId.toString() !== req.user!.userId
    ) {
      res.status(403).json({ success: false, error: 'Not authorised' });
      return;
    }

    const valid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId || `mock_pay_${Date.now()}`,
      razorpaySignature || '',
    );
    if (!valid) {
      res.status(400).json({ success: false, error: 'Signature verification failed' });
      return;
    }

    subscription.status = 'active';
    subscription.razorpayPaymentId = razorpayPaymentId || `mock_pay_${Date.now()}`;
    subscription.razorpaySignature = razorpaySignature;
    subscription.paidAt = new Date();
    await subscription.save();

    await createAuditLog(
      req.user!.userId,
      req.user!.role,
      'subscription_payment',
      req,
      subscription._id.toString(),
      { status: 'pending' },
      { status: 'active', paidAt: subscription.paidAt },
    );

    res.json({ success: true, data: subscription, message: 'Subscription activated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/subscriptions/admin/create — super_admin creates a politician
 * account + active subscription in one call.  Skips the Razorpay flow
 * entirely (admin is comping the seat).  Optional `boothIds[]` get
 * stored on the new politician's `assignedBoothIds` so they're scoped to
 * exactly that set within their AC.
 *
 * Body:
 *   name, email, phone, password         — required (account)
 *   assemblyConstituency, district?       — required (location)
 *   tier                                  — required (basic|standard|premium)
 *   amount?                               — overrides the tier's default
 *   durationDays?                         — overrides the tier's default
 *   boothIds?: string[]                   — optional list of Booth _ids in AC
 *   partyAffiliation?
 */
router.post(
  '/admin/create',
  authenticate,
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        email,
        phone,
        password,
        assemblyConstituency,
        district,
        tier: tierKey,
        amount,
        durationDays,
        boothIds,
        partyAffiliation,
      } = req.body || {};

      // Hard required fields.
      if (!name || !email || !phone || !password) {
        res.status(400).json({ success: false, error: 'name, email, phone, password are required' });
        return;
      }
      if (String(password).length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        return;
      }
      if (!assemblyConstituency) {
        res.status(400).json({ success: false, error: 'assemblyConstituency is required' });
        return;
      }
      const selected = tier(tierKey);
      if (!selected) {
        res.status(400).json({ success: false, error: 'Invalid tier' });
        return;
      }

      // Final values — admin overrides if provided.
      const finalAmount = Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : selected.amount;
      const finalDuration =
        Number.isFinite(Number(durationDays)) && Number(durationDays) > 0
          ? Number(durationDays)
          : selected.durationDays;

      // Validate boothIds (best-effort — bad ids drop out).
      let validBoothIds: any[] = [];
      if (Array.isArray(boothIds) && boothIds.length) {
        validBoothIds = boothIds
          .map((id) => (typeof id === 'string' ? id : ''))
          .filter((id) => mongoose.isValidObjectId(id))
          .map((id) => new mongoose.Types.ObjectId(id));
      }

      // 1) Politician account
      const newUser = await User.create({
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        hashedPassword: String(password),
        role: 'politician',
        assemblyConstituency: String(assemblyConstituency).trim(),
        district: district ? String(district).trim() : undefined,
        partyAffiliation: partyAffiliation ? String(partyAffiliation).trim() : undefined,
        assignedBoothIds: validBoothIds.length ? validBoothIds : undefined,
        otpRequired: false, // admin-created accounts can sign in straight away
        isVerified: true,
        isActive: true,
      });

      // 2) Active subscription, no Razorpay round-trip.
      const now = new Date();
      const end = new Date(now.getTime() + finalDuration * 24 * 60 * 60 * 1000);
      const subscription = await Subscription.create({
        politicianId: newUser._id,
        tier: selected.key,
        assemblyConstituency: String(assemblyConstituency).trim(),
        amount: finalAmount,
        startDate: now,
        endDate: end,
        status: 'active',
        razorpayOrderId: `admin_${Date.now()}`,
        paidAt: now,
      });

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'subscription_create',
        req,
        subscription._id.toString(),
        undefined,
        {
          tier: selected.key,
          amount: finalAmount,
          assemblyConstituency,
          politicianId: newUser._id.toString(),
          boothIds: validBoothIds.length,
        },
      );

      const userOut = newUser.toObject() as any;
      delete userOut.hashedPassword;

      res.status(201).json({
        success: true,
        data: { user: userOut, subscription },
        message: 'Politician and subscription created',
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        res.status(409).json({ success: false, error: 'Email or phone already in use' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * PUT /api/subscriptions/:id/reassign — super_admin only.
 *
 * Re-scopes an existing politician subscription.  Updates BOTH the
 * subscription's `assemblyConstituency` and the politician user's
 * `assemblyConstituency` / `district` / `assignedBoothIds` so the
 * server-side `getPoliticianScope` immediately reflects the new slice
 * on the very next /booths or /voters request.
 *
 * Body:
 *   assemblyConstituency   — required (target AC)
 *   district?              — optional override for the user's district
 *   boothIds?: string[]    — list of Booth _ids in the new AC.  Empty
 *                            array clears the explicit booth scope and
 *                            falls back to AC-wide.
 */
router.put(
  '/:id/reassign',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const { assemblyConstituency, district, boothIds } = req.body || {};
      if (!assemblyConstituency || typeof assemblyConstituency !== 'string') {
        res.status(400).json({ success: false, error: 'assemblyConstituency is required' });
        return;
      }

      const subscription = await Subscription.findById(req.params.id);
      if (!subscription) {
        res.status(404).json({ success: false, error: 'Subscription not found' });
        return;
      }

      // Validate booth IDs — drop anything malformed, normalise to
      // ObjectId.  Empty array (or missing) means "no explicit booth
      // scope" → politician falls back to AC-wide reads.
      let validBoothIds: any[] = [];
      if (Array.isArray(boothIds) && boothIds.length) {
        validBoothIds = boothIds
          .map((id: any) => (typeof id === 'string' ? id : ''))
          .filter((id: string) => mongoose.isValidObjectId(id))
          .map((id: string) => new mongoose.Types.ObjectId(id));
      }

      // Snapshot old values for the audit log diff.
      const oldSubAc = subscription.assemblyConstituency;
      const politician = await User.findById(subscription.politicianId);
      if (!politician || politician.role !== 'politician') {
        res.status(404).json({ success: false, error: 'Politician not found' });
        return;
      }
      const oldUserSnapshot = {
        assemblyConstituency: politician.assemblyConstituency,
        district: politician.district,
        assignedBoothIds: (politician.assignedBoothIds || []).map((x) => x.toString()),
      };

      // 1) Subscription AC
      subscription.assemblyConstituency = assemblyConstituency.trim();
      await subscription.save();

      // 2) Politician scope
      politician.assemblyConstituency = assemblyConstituency.trim();
      if (district !== undefined) {
        politician.district = district ? String(district).trim() : undefined;
      }
      // Setting to undefined removes the explicit scope (AC-wide); a
      // non-empty array stores the new explicit list.
      politician.assignedBoothIds = validBoothIds.length > 0 ? validBoothIds : undefined;
      await politician.save();

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'subscription_reassign',
        req,
        subscription._id.toString(),
        { assemblyConstituency: oldSubAc, user: oldUserSnapshot },
        {
          assemblyConstituency: subscription.assemblyConstituency,
          user: {
            assemblyConstituency: politician.assemblyConstituency,
            district: politician.district,
            assignedBoothIds: (politician.assignedBoothIds || []).map((x) => x.toString()),
          },
        },
      );

      const userOut = politician.toObject() as any;
      delete userOut.hashedPassword;

      res.json({
        success: true,
        data: { user: userOut, subscription },
        message: 'Subscription reassigned',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/subscriptions/politician/:id/password — super_admin sets password
router.post(
  '/politician/:id/password',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const password: string = String(req.body?.password || '');
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        return;
      }
      const user = await User.findById(req.params.id);
      if (!user || user.role !== 'politician') {
        res.status(404).json({ success: false, error: 'Politician not found' });
        return;
      }
      user.hashedPassword = password;
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      await user.save();
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'user_update',
        req,
        user._id.toString(),
        undefined,
        { passwordChanged: true },
      );
      res.json({ success: true, message: 'Password updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// PUT /api/subscriptions/:id/cancel — super_admin only
router.put(
  '/:id/cancel',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const subscription = await Subscription.findById(req.params.id);
      if (!subscription) {
        res.status(404).json({ success: false, error: 'Subscription not found' });
        return;
      }
      const old = subscription.toObject();
      subscription.status = 'cancelled';
      await subscription.save();
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'subscription_cancel',
        req,
        subscription._id.toString(),
        { status: old.status },
        { status: 'cancelled' },
      );
      res.json({ success: true, data: subscription, message: 'Subscription cancelled' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
