import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import Incident from '../models/Incident';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { upload, uploadToImageKit } from '../middleware/upload';
import { incidentValidation, mongoIdParam } from '../utils/validators';

const router = Router();

function getSocketIO(req: AuthRequest) {
  return (req.app as any).get('io');
}

// POST /api/incidents
router.post(
  '/',
  authenticate,
  upload.array('photos', 5),
  incidentValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const { boothId, category, severity, description } = req.body;

      // Upload photos to ImageKit
      const photoUrls: string[] = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          const result = await uploadToImageKit(
            file.buffer,
            `incident_${Date.now()}_${file.originalname}`,
            '/election/incidents'
          );
          photoUrls.push(result.url);
        }
      }

      const incident = await Incident.create({
        boothId,
        reportedBy: req.user!.userId,
        category,
        severity,
        status: 'open',
        description,
        photos: photoUrls,
      });

      await createAuditLog(req.user!.userId, req.user!.role, 'incident_create', req, incident._id.toString(), undefined, incident.toObject());

      const io = getSocketIO(req);
      if (io) {
        io.emit('incident-reported', incident.toObject());

        if (severity === 'critical' || severity === 'high') {
          io.emit('alert-triggered', {
            type: 'incident',
            severity,
            incident: incident.toObject(),
          });
        }
      }

      res.status(201).json({ success: true, data: incident, message: 'Incident reported successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/incidents
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.boothId) filter.boothId = req.query.boothId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.category) filter.category = req.query.category;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('boothId', 'name partNumber zone')
        .populate('reportedBy', 'name email phone')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Incident.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        incidents,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/incidents/:id
router.get('/:id', authenticate, mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
      return;
    }

    const incident = await Incident.findById(req.params.id)
      .populate('boothId', 'name partNumber zone')
      .populate('reportedBy', 'name email phone')
      .populate('resolvedBy', 'name');

    if (!incident) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    res.json({ success: true, data: incident });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/incidents/:id
router.put(
  '/:id',
  authenticate,
  requireRole('super_admin', 'zone_incharge', 'booth_supervisor'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
        return;
      }

      const incident = await Incident.findById(req.params.id);
      if (!incident) {
        res.status(404).json({ success: false, error: 'Incident not found' });
        return;
      }

      const oldValue = incident.toObject();
      const { status, severity, description } = req.body;

      if (status) {
        incident.status = status;
        if (status === 'resolved') {
          incident.resolvedBy = req.user!.userId as any;
          incident.resolvedAt = new Date();
        }
      }
      if (severity) incident.severity = severity;
      if (description) incident.description = description;

      await incident.save();

      await createAuditLog(req.user!.userId, req.user!.role, 'incident_update', req, req.params.id, oldValue, incident.toObject());

      const io = getSocketIO(req);
      if (io) {
        io.emit('incident-updated', incident.toObject());
      }

      res.json({ success: true, data: incident, message: 'Incident updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
