import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { paginationQuery } from '../utils/validators';

const router = Router();

// GET /api/audit-logs
router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (req.query.userId) filter.userId = req.query.userId;
      if (req.query.action) filter.action = req.query.action;
      if (req.query.from || req.query.to) {
        filter.timestamp = {};
        if (req.query.from) filter.timestamp.$gte = new Date(req.query.from as string);
        if (req.query.to) filter.timestamp.$lte = new Date(req.query.to as string);
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .populate('userId', 'name email role')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
