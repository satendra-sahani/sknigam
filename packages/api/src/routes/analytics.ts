import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Voter from '../models/Voter';
import Booth from '../models/Booth';
import VoterAssignment from '../models/VoterAssignment';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

/**
 * Shared filter built from query + role scope.
 * super_admin: unrestricted (but may opt into filters).
 * politician: hard-scoped to their assemblyConstituency.
 * staff: scoped to booths they have active assignments for.
 */
async function buildScope(req: AuthRequest): Promise<any> {
  const scope: any = {};
  const q = req.query;

  if (q.assemblyConstituency) scope.assemblyConstituency = q.assemblyConstituency;
  if (q.boothId && mongoose.isValidObjectId(q.boothId as string)) scope.boothId = new mongoose.Types.ObjectId(q.boothId as string);
  if (q.partNumber) scope.partNumber = parseInt(q.partNumber as string, 10);

  if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
    scope.assemblyConstituency = req.user.assemblyConstituency;
  }
  if (req.user?.role === 'staff') {
    const assignments = await VoterAssignment.find({ staffId: req.user.userId, isActive: true }).select('boothId');
    const boothIds = assignments.map((a) => a.boothId);
    if (boothIds.length === 0) {
      scope.boothId = new mongoose.Types.ObjectId(); // forces empty set
    } else {
      scope.boothId = { $in: boothIds };
    }
  }
  return scope;
}

// GET /api/analytics/overview — high-level counts
router.get(
  '/overview',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const [total, verified, boothCount, assignments] = await Promise.all([
        Voter.countDocuments(scope),
        Voter.countDocuments({ ...scope, verificationStatus: true }),
        Booth.countDocuments(scope.assemblyConstituency ? { assemblyConstituency: scope.assemblyConstituency } : {}),
        VoterAssignment.countDocuments({ isActive: true }),
      ]);
      res.json({
        success: true,
        data: {
          totalVoters: total,
          verified,
          unverified: total - verified,
          verificationRate: total > 0 ? Math.round((verified / total) * 1000) / 10 : 0,
          totalBooths: boothCount,
          activeAssignments: assignments,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

function aggregateGroup(field: string) {
  return async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const pipeline: any[] = [{ $match: scope }];
      pipeline.push({
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
          verified: { $sum: { $cond: ['$verificationStatus', 1, 0] } },
        },
      });
      pipeline.push({ $sort: { count: -1 } });
      pipeline.push({ $limit: 50 });
      const rows = await Voter.aggregate(pipeline);
      res.json({
        success: true,
        data: rows.map((r) => ({ key: r._id || 'Unknown', count: r.count, verified: r.verified })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

// GET /api/analytics/caste
router.get('/caste', authenticate, requireRole('super_admin', 'politician', 'staff'), aggregateGroup('caste'));

// GET /api/analytics/religion
router.get('/religion', authenticate, requireRole('super_admin', 'politician', 'staff'), aggregateGroup('religion'));

// GET /api/analytics/gender
router.get('/gender', authenticate, requireRole('super_admin', 'politician', 'staff'), aggregateGroup('gender'));

// GET /api/analytics/candidate-share — who are voters saying they support
router.get(
  '/candidate-share',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  aggregateGroup('favouriteCandidate'),
);

// GET /api/analytics/voting-intention
router.get(
  '/voting-intention',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  aggregateGroup('votingIntention'),
);

// GET /api/analytics/age-distribution
router.get(
  '/age-distribution',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const rows = await Voter.aggregate([
        { $match: { ...scope, age: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [18, 25, 35, 45, 60, 75, 130],
            default: 'Unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]);
      const labels: Record<string, string> = {
        '18': '18–24',
        '25': '25–34',
        '35': '35–44',
        '45': '45–59',
        '60': '60–74',
        '75': '75+',
      };
      res.json({
        success: true,
        data: rows.map((r) => ({
          key: labels[String(r._id)] || String(r._id),
          count: r.count,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/grievances — counts per grievance category (unwinds the array)
router.get(
  '/grievances',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const rows = await Voter.aggregate([
        { $match: { ...scope, grievances: { $exists: true, $ne: [] } } },
        { $unwind: '$grievances' },
        { $group: { _id: '$grievances', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      res.json({
        success: true,
        data: rows.map((r) => ({ key: r._id, count: r.count })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/booth-progress — per-booth verified / total
router.get(
  '/booth-progress',
  authenticate,
  requireRole('super_admin', 'politician', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const scope = await buildScope(req);
      const rows = await Voter.aggregate([
        { $match: scope },
        {
          $group: {
            _id: '$boothId',
            total: { $sum: 1 },
            verified: { $sum: { $cond: ['$verificationStatus', 1, 0] } },
          },
        },
        {
          $lookup: {
            from: 'booths',
            localField: '_id',
            foreignField: '_id',
            as: 'booth',
          },
        },
        { $unwind: { path: '$booth', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            verified: 1,
            partNumber: '$booth.partNumber',
            name: '$booth.name',
            assemblyConstituency: '$booth.assemblyConstituency',
          },
        },
        { $sort: { partNumber: 1 } },
        { $limit: 200 },
      ]);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/analytics/staff-progress — per-staff verified / total (super_admin + politician)
router.get(
  '/staff-progress',
  authenticate,
  requireRole('super_admin', 'politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match: any = { isActive: true };
      if (req.query.assemblyConstituency) {
        const booths = await Booth.find({ assemblyConstituency: req.query.assemblyConstituency }).select('_id');
        match.boothId = { $in: booths.map((b) => b._id) };
      }
      if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
        const booths = await Booth.find({ assemblyConstituency: req.user.assemblyConstituency }).select('_id');
        match.boothId = { $in: booths.map((b) => b._id) };
      }
      const rows = await VoterAssignment.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$staffId',
            assignments: { $sum: 1 },
            totalVoters: { $sum: '$totalVoters' },
            completedCount: { $sum: '$completedCount' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'staff',
          },
        },
        { $unwind: { path: '$staff', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: '$staff.name',
            phone: '$staff.phone',
            assignments: 1,
            totalVoters: 1,
            completedCount: 1,
          },
        },
        { $sort: { completedCount: -1 } },
        { $limit: 100 },
      ]);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
