import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import VoterAssignment from '../models/VoterAssignment';
import Voter from '../models/Voter';
import Booth from '../models/Booth';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { voterAssignmentValidation, mongoIdParam, paginationQuery } from '../utils/validators';

const router = Router();

// GET /api/voter-assignments
router.get('/', authenticate, paginationQuery, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    // Staff can only see their own assignments
    if (req.user!.role === 'staff') {
      filter.staffId = req.user!.userId;
      filter.isActive = true;
    } else {
      if (req.query.staffId) filter.staffId = req.query.staffId;
      if (req.query.boothId) filter.boothId = req.query.boothId;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    }

    const [assignments, total] = await Promise.all([
      VoterAssignment.find(filter)
        .populate('staffId', 'name email phone')
        .populate('boothId', 'partNumber name assemblyConstituency')
        .populate('assignedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      VoterAssignment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { assignments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/voter-assignments — admin assigns a booth (optionally a serial range) to staff
router.post('/', authenticate, requireRole('super_admin'), voterAssignmentValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
      return;
    }

    const { staffId, boothId, voterSerialFrom, voterSerialTo } = req.body;

    const [staff, booth] = await Promise.all([User.findById(staffId), Booth.findById(boothId)]);
    if (!staff || staff.role !== 'staff') {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }
    if (!booth) {
      res.status(404).json({ success: false, error: 'Booth not found' });
      return;
    }

    // Count voters in the range
    const voterFilter: any = { boothId };
    if (voterSerialFrom !== undefined) voterFilter.voterSerialNumber = { ...(voterFilter.voterSerialNumber || {}), $gte: voterSerialFrom };
    if (voterSerialTo !== undefined) voterFilter.voterSerialNumber = { ...(voterFilter.voterSerialNumber || {}), $lte: voterSerialTo };
    const totalVoters = await Voter.countDocuments(voterFilter);

    const assignment = await VoterAssignment.create({
      staffId,
      boothId,
      voterSerialFrom,
      voterSerialTo,
      assignedBy: req.user!.userId,
      isActive: true,
      totalVoters,
      completedCount: 0,
    });

    await createAuditLog(req.user!.userId, req.user!.role, 'assignment_create', req, assignment._id.toString(), undefined, assignment.toObject());

    const populated = await VoterAssignment.findById(assignment._id)
      .populate('staffId', 'name email phone')
      .populate('boothId', 'partNumber name assemblyConstituency')
      .populate('assignedBy', 'name');

    res.status(201).json({ success: true, data: populated, message: 'Assignment created' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/voter-assignments/:id/deactivate
router.put('/:id/deactivate', authenticate, requireRole('super_admin'), mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const assignment = await VoterAssignment.findById(req.params.id);
    if (!assignment) {
      res.status(404).json({ success: false, error: 'Assignment not found' });
      return;
    }
    const oldValue = assignment.toObject();
    assignment.isActive = false;
    await assignment.save();
    await createAuditLog(req.user!.userId, req.user!.role, 'assignment_update', req, req.params.id, oldValue, assignment.toObject());
    res.json({ success: true, data: assignment, message: 'Assignment deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
