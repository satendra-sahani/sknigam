import { Router, Response } from 'express';
import imagekit from '../config/imagekit';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/imagekit/auth — client-side upload signature.
// Mobile app calls this, then uploads directly to ImageKit so we don't proxy
// large files through Node.  The SDK signs with IMAGEKIT_PRIVATE_KEY; the
// token is short-lived (default 30min).  Auth-gated so only signed-in staff
// can burn upload quota.
router.get('/auth', authenticate, (_req: AuthRequest, res: Response) => {
  try {
    const params = imagekit.getAuthenticationParameters();
    res.json({ success: true, data: params });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to sign upload' });
  }
});

export default router;
