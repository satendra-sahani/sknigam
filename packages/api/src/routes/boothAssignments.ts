import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import BoothAssignment from '../models/BoothAssignment';
import Booth from '../models/Booth';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { boothAssignmentValidation, mongoIdParam, paginationQuery } from '../utils/validators';

const router = Router();

// GET /api/booth-assignments
router.get(
  '/',
  authenticate,
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.boothId) filter.boothId = req.query.boothId;
      if (req.query.staffId) filter.staffId = req.query.staffId;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

      const [assignments, total] = await Promise.all([
        BoothAssignment.find(filter)
          .populate('boothId', 'name partNumber zone')
          .populate('staffId', 'name email phone role')
          .populate('assignedBy', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        BoothAssignment.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          assignments,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/booth-assignments
router.post(
  '/',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  boothAssignmentValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const { boothId, staffId, type } = req.body;

      // Verify booth and staff exist
      const [booth, staff] = await Promise.all([
        Booth.findById(boothId),
        User.findById(staffId),
      ]);

      if (!booth) {
        res.status(404).json({ success: false, error: 'Booth not found' });
        return;
      }
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff member not found' });
        return;
      }

      // Check for existing active assignment
      const existingAssignment = await BoothAssignment.findOne({
        boothId,
        staffId,
        isActive: true,
      });

      if (existingAssignment) {
        res.status(409).json({ success: false, error: 'Staff is already assigned to this booth' });
        return;
      }

      const assignment = await BoothAssignment.create({
        boothId,
        staffId,
        type,
        assignedBy: req.user!.userId,
        isActive: true,
      });

      const populated = await BoothAssignment.findById(assignment._id)
        .populate('boothId', 'name partNumber zone')
        .populate('staffId', 'name email phone role')
        .populate('assignedBy', 'name');

      await createAuditLog(req.user!.userId, req.user!.role, 'assignment_create', req, assignment._id.toString(), undefined, assignment.toObject());

      res.status(201).json({ success: true, data: populated, message: 'Assignment created successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/booth-assignments/:id/deactivate
router.put(
  '/:id/deactivate',
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

      const assignment = await BoothAssignment.findById(req.params.id);
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
  }
);

export default router;
