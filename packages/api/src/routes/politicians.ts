/**
 * /api/politicians — self-scoped helpers for the politician mobile app.
 *
 *   GET /api/politicians/me            — politician's own profile + scope summary
 *   GET /api/politicians/me/booths     — the booth set the politician can assign to
 *
 * These are convenience endpoints so the mobile app doesn't have to
 * pull the booth list separately and intersect with assignedBoothIds
 * client-side.  All endpoints require role='politician'.
 */
import { Router, Response } from 'express';
import User from '../models/User';
import Booth from '../models/Booth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

/** GET /api/politicians/me — scope summary for the logged-in politician.
 *  Returns name, AC, district, party, and the count of assigned booths +
 *  managed staff.  Cheap call the mobile home screen can fire on launch. */
router.get(
  '/me',
  authenticate,
  requireRole('politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const me = await User.findById(req.user!.userId).select(
        'name email phone assemblyConstituency district partyAffiliation assignedBoothIds',
      );
      if (!me) {
        res.status(404).json({ success: false, error: 'Politician not found' });
        return;
      }
      const managedStaffCount = await User.countDocuments({
        role: 'staff',
        managedBy: me._id,
      });
      res.json({
        success: true,
        data: {
          _id: me._id,
          name: me.name,
          email: me.email,
          phone: me.phone,
          assemblyConstituency: me.assemblyConstituency,
          district: me.district,
          partyAffiliation: me.partyAffiliation,
          assignedBoothCount: me.assignedBoothIds?.length || 0,
          managedStaffCount,
        },
      });
    } catch (err: any) {
      console.error('[politicians/me] failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not load profile' });
    }
  },
);

/** GET /api/politicians/me/booths — the booth set this politician is
 *  scoped to.  Source of truth for the mobile "assign staff to a booth"
 *  picker — never trust the client to filter; the API only returns
 *  booths the politician can legitimately use. */
router.get(
  '/me/booths',
  authenticate,
  requireRole('politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const me = await User.findById(req.user!.userId).select('assignedBoothIds');
      const ids = me?.assignedBoothIds || [];
      if (ids.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }
      const booths = await Booth.find({ _id: { $in: ids } })
        .select('partNumber name assemblyConstituency district pollingStation')
        .sort({ partNumber: 1 })
        .lean();
      res.json({ success: true, data: booths });
    } catch (err: any) {
      console.error('[politicians/me/booths] failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not load booths' });
    }
  },
);

export default router;
