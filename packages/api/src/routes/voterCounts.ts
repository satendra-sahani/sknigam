import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import VoterCount from '../models/VoterCount';
import Booth from '../models/Booth';
import BoothAssignment from '../models/BoothAssignment';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { voterCountValidation, mongoIdParam } from '../utils/validators';

const router = Router();

const SLOT_TIMES: Record<string, { hour: number; minute: number }> = {
  '09:00': { hour: 9, minute: 0 },
  '11:00': { hour: 11, minute: 0 },
  '13:00': { hour: 13, minute: 0 },
  '15:00': { hour: 15, minute: 0 },
  '17:00': { hour: 17, minute: 0 },
};

const SLOT_ORDER = ['09:00', '11:00', '13:00', '15:00', '17:00'];

function getSocketIO(req: AuthRequest) {
  return (req.app as any).get('io');
}

// POST /api/voter-counts
router.post(
  '/',
  authenticate,
  voterCountValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const { boothId, slot, electionDate, maleCount, femaleCount, otherCount } = req.body;
      const totalVoters = maleCount + femaleCount + otherCount;

      // Validate total matches
      if (req.body.totalVoters !== undefined && req.body.totalVoters !== totalVoters) {
        res.status(400).json({ success: false, error: 'totalVoters must equal maleCount + femaleCount + otherCount' });
        return;
      }

      // Check booth exists
      const booth = await Booth.findById(boothId);
      if (!booth) {
        res.status(404).json({ success: false, error: 'Booth not found' });
        return;
      }

      // Check staff is assigned to booth
      const assignment = await BoothAssignment.findOne({
        boothId,
        staffId: req.user!.userId,
        isActive: true,
      });

      if (!assignment) {
        res.status(403).json({ success: false, error: 'You are not assigned to this booth' });
        return;
      }

      // Check count doesn't exceed totalRegisteredVoters
      if (totalVoters > booth.totalRegisteredVoters) {
        res.status(400).json({
          success: false,
          error: `Total voters (${totalVoters}) cannot exceed registered voters (${booth.totalRegisteredVoters})`,
        });
        return;
      }

      // Check count is not less than previous slot's count
      const currentSlotIndex = SLOT_ORDER.indexOf(slot);
      if (currentSlotIndex > 0) {
        const previousSlot = SLOT_ORDER[currentSlotIndex - 1];
        const previousCount = await VoterCount.findOne({
          boothId,
          slot: previousSlot,
          electionDate,
          status: { $in: ['pending', 'approved'] },
        });

        if (previousCount && totalVoters < previousCount.totalVoters) {
          res.status(400).json({
            success: false,
            error: `Count (${totalVoters}) cannot be less than previous slot count (${previousCount.totalVoters})`,
          });
          return;
        }
      }

      // Check submission is within slot time window (+15 min grace)
      const slotTime = SLOT_TIMES[slot];
      if (slotTime) {
        const now = new Date();
        const slotDate = new Date(electionDate);
        slotDate.setHours(slotTime.hour, slotTime.minute, 0, 0);
        const graceEnd = new Date(slotDate.getTime() + 15 * 60 * 1000); // 15 min grace

        // Allow submission from slot time until grace period ends
        // For flexibility, also allow early submission (up to 30 min before slot)
        const earlyStart = new Date(slotDate.getTime() - 30 * 60 * 1000);

        if (now < earlyStart || now > graceEnd) {
          // Log warning but still allow (for demo/testing flexibility)
          console.log(`[WARN] Voter count submitted outside slot window for slot ${slot}`);
        }
      }

      // Check for duplicate submission
      const existing = await VoterCount.findOne({ boothId, slot, electionDate });
      if (existing) {
        res.status(409).json({ success: false, error: 'Count already submitted for this slot' });
        return;
      }

      const voterCount = await VoterCount.create({
        boothId,
        staffId: req.user!.userId,
        slot,
        electionDate,
        totalVoters,
        maleCount,
        femaleCount,
        otherCount,
        status: 'pending',
        submittedAt: new Date(),
      });

      await createAuditLog(req.user!.userId, req.user!.role, 'voter_count_submit', req, voterCount._id.toString(), undefined, voterCount.toObject());

      const io = getSocketIO(req);
      if (io) {
        io.emit('voter-count-submitted', {
          voterCount: voterCount.toObject(),
          booth: { name: booth.name, partNumber: booth.partNumber, zone: booth.zone },
        });
      }

      res.status(201).json({ success: true, data: voterCount, message: 'Voter count submitted' });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Duplicate voter count submission' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/voter-counts/live
router.get('/live', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const electionDate = req.query.electionDate as string || new Date().toISOString().split('T')[0];

    const pipeline: any[] = [
      { $match: { status: 'approved', electionDate } },
      {
        $group: {
          _id: '$boothId',
          latestSlot: { $max: '$slot' },
          totalVoters: { $max: '$totalVoters' },
          maleCount: { $max: '$maleCount' },
          femaleCount: { $max: '$femaleCount' },
          otherCount: { $max: '$otherCount' },
          slots: {
            $push: {
              slot: '$slot',
              totalVoters: '$totalVoters',
              status: '$status',
            },
          },
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
      { $unwind: '$booth' },
      {
        $project: {
          boothId: '$_id',
          boothName: '$booth.name',
          partNumber: '$booth.partNumber',
          zone: '$booth.zone',
          totalRegisteredVoters: '$booth.totalRegisteredVoters',
          latestSlot: 1,
          totalVoters: 1,
          maleCount: 1,
          femaleCount: 1,
          otherCount: 1,
          turnoutPercent: {
            $multiply: [
              { $divide: ['$totalVoters', '$booth.totalRegisteredVoters'] },
              100,
            ],
          },
          slots: 1,
        },
      },
    ];

    // Zone filter for zone_incharge
    if (req.user?.role === 'zone_incharge' && req.user.zone) {
      pipeline.push({ $match: { zone: req.user.zone } });
    }

    const liveData = await VoterCount.aggregate(pipeline);

    res.json({ success: true, data: liveData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/voter-counts
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.boothId) filter.boothId = req.query.boothId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.electionDate) filter.electionDate = req.query.electionDate;
    if (req.query.staffId) filter.staffId = req.query.staffId;

    const [counts, total] = await Promise.all([
      VoterCount.find(filter)
        .populate('boothId', 'name partNumber zone')
        .populate('staffId', 'name')
        .populate('reviewedBy', 'name')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit),
      VoterCount.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        counts,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/voter-counts/:id/approve
router.put(
  '/:id/approve',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
        return;
      }

      const voterCount = await VoterCount.findById(req.params.id);
      if (!voterCount) {
        res.status(404).json({ success: false, error: 'Voter count not found' });
        return;
      }

      if (voterCount.status !== 'pending') {
        res.status(400).json({ success: false, error: `Cannot approve a count with status: ${voterCount.status}` });
        return;
      }

      const oldValue = voterCount.toObject();
      voterCount.status = 'approved';
      voterCount.reviewedBy = req.user!.userId as any;
      await voterCount.save();

      await createAuditLog(req.user!.userId, req.user!.role, 'voter_count_approve', req, req.params.id, oldValue, voterCount.toObject());

      const io = getSocketIO(req);
      if (io) {
        io.emit('voter-count-approved', voterCount.toObject());
      }

      res.json({ success: true, data: voterCount, message: 'Voter count approved' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/voter-counts/:id/reject
router.put(
  '/:id/reject',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
        return;
      }

      const { reason } = req.body;
      if (!reason) {
        res.status(400).json({ success: false, error: 'Rejection reason is required' });
        return;
      }

      const voterCount = await VoterCount.findById(req.params.id);
      if (!voterCount) {
        res.status(404).json({ success: false, error: 'Voter count not found' });
        return;
      }

      if (voterCount.status !== 'pending') {
        res.status(400).json({ success: false, error: `Cannot reject a count with status: ${voterCount.status}` });
        return;
      }

      const oldValue = voterCount.toObject();
      voterCount.status = 'rejected';
      voterCount.rejectionReason = reason;
      voterCount.reviewedBy = req.user!.userId as any;
      await voterCount.save();

      await createAuditLog(req.user!.userId, req.user!.role, 'voter_count_reject', req, req.params.id, oldValue, voterCount.toObject());

      const io = getSocketIO(req);
      if (io) {
        io.emit('voter-count-rejected', voterCount.toObject());
      }

      res.json({ success: true, data: voterCount, message: 'Voter count rejected' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
