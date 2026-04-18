import { Router, Response } from 'express';
import crypto from 'crypto';
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
          .populate('politicianId', 'name email phone assemblyConstituency')
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
