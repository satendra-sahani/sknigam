import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import Booth from '../models/Booth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole, zoneFilter } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { boothValidation, mongoIdParam, paginationQuery } from '../utils/validators';

const router = Router();

// GET /api/booths
router.get(
  '/',
  authenticate,
  zoneFilter,
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const zoneFilterObj = (req as any).zoneFilter || {};
      const search = req.query.search as string;

      const filter: any = { ...zoneFilterObj };
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { zone: { $regex: search, $options: 'i' } },
          { village: { $regex: search, $options: 'i' } },
        ];
      }
      if (req.query.zone) {
        filter.zone = req.query.zone;
      }

      const [booths, total] = await Promise.all([
        Booth.find(filter).sort({ partNumber: 1 }).skip(skip).limit(limit),
        Booth.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          booths,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/booths/:id
router.get('/:id', authenticate, mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
      return;
    }

    const booth = await Booth.findById(req.params.id);
    if (!booth) {
      res.status(404).json({ success: false, error: 'Booth not found' });
      return;
    }

    res.json({ success: true, data: booth });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/booths
router.post(
  '/',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  boothValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const booth = await Booth.create(req.body);

      if (req.user) {
        await createAuditLog(req.user.userId, req.user.role, 'booth_create', req, booth._id.toString(), undefined, booth.toObject());
      }

      res.status(201).json({ success: true, data: booth, message: 'Booth created successfully' });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Booth with this part number already exists' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/booths/:id
router.put(
  '/:id',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const oldBooth = await Booth.findById(req.params.id);
      if (!oldBooth) {
        res.status(404).json({ success: false, error: 'Booth not found' });
        return;
      }

      const booth = await Booth.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (req.user) {
        await createAuditLog(req.user.userId, req.user.role, 'booth_update', req, req.params.id, oldBooth.toObject(), booth?.toObject());
      }

      res.json({ success: true, data: booth, message: 'Booth updated successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/booths/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
        return;
      }

      const booth = await Booth.findByIdAndDelete(req.params.id);
      if (!booth) {
        res.status(404).json({ success: false, error: 'Booth not found' });
        return;
      }

      res.json({ success: true, message: 'Booth deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
