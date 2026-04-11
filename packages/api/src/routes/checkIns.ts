import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import CheckIn from '../models/CheckIn';
import Booth from '../models/Booth';
import BoothAssignment from '../models/BoothAssignment';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../middleware/audit';
import { upload, uploadToImageKit } from '../middleware/upload';
import { haversineDistance } from '../utils/gps';
import { checkInValidation } from '../utils/validators';

const router = Router();

function getSocketIO(req: AuthRequest) {
  return (req.app as any).get('io');
}

// POST /api/check-ins
router.post(
  '/',
  authenticate,
  upload.single('selfie'),
  checkInValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const { latitude, longitude, overrideReason } = req.body;
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      // Find staff's active booth assignment
      const assignment = await BoothAssignment.findOne({
        staffId: req.user!.userId,
        isActive: true,
      });

      if (!assignment) {
        res.status(400).json({ success: false, error: 'No active booth assignment found' });
        return;
      }

      const booth = await Booth.findById(assignment.boothId);
      if (!booth) {
        res.status(404).json({ success: false, error: 'Assigned booth not found' });
        return;
      }

      // Calculate GPS distance
      let distance = 0;
      let withinRadius = true;
      const gpsRadius = parseInt(process.env.GPS_RADIUS_METERS || '200', 10);

      if (booth.latitude !== undefined && booth.longitude !== undefined) {
        distance = haversineDistance(lat, lon, booth.latitude, booth.longitude);
        withinRadius = distance <= gpsRadius;
      }

      // If outside radius, require override reason
      if (!withinRadius && !overrideReason) {
        res.status(400).json({
          success: false,
          error: `You are ${Math.round(distance)}m away from the booth (max ${gpsRadius}m). Please provide an override reason.`,
          data: { distance: Math.round(distance), radius: gpsRadius },
        });
        return;
      }

      // Upload selfie to ImageKit
      let selfieUrl = '';
      if (req.file) {
        const result = await uploadToImageKit(
          req.file.buffer,
          `checkin_${req.user!.userId}_${Date.now()}.jpg`,
          '/election/check-ins'
        );
        selfieUrl = result.url;
      } else {
        res.status(400).json({ success: false, error: 'Selfie is required for check-in' });
        return;
      }

      const checkIn = await CheckIn.create({
        staffId: req.user!.userId,
        boothId: booth._id,
        latitude: lat,
        longitude: lon,
        selfieUrl,
        distanceFromBooth: Math.round(distance),
        isWithinRadius: withinRadius,
        overrideReason: overrideReason || undefined,
        checkedInAt: new Date(),
      });

      await createAuditLog(req.user!.userId, req.user!.role, 'check_in', req, checkIn._id.toString(), undefined, {
        boothId: booth._id,
        distance: Math.round(distance),
        withinRadius,
      });

      const io = getSocketIO(req);
      if (io) {
        io.emit('staff-checked-in', {
          checkIn: checkIn.toObject(),
          booth: { name: booth.name, partNumber: booth.partNumber, zone: booth.zone },
        });
      }

      res.status(201).json({
        success: true,
        data: checkIn,
        message: withinRadius
          ? 'Check-in successful'
          : 'Check-in recorded with override (outside radius)',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/check-ins
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.staffId) filter.staffId = req.query.staffId;
    if (req.query.boothId) filter.boothId = req.query.boothId;
    if (req.query.date) {
      const date = new Date(req.query.date as string);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.checkedInAt = { $gte: date, $lt: nextDay };
    }

    const [checkIns, total] = await Promise.all([
      CheckIn.find(filter)
        .populate('staffId', 'name email phone role')
        .populate('boothId', 'name partNumber zone')
        .sort({ checkedInAt: -1 })
        .skip(skip)
        .limit(limit),
      CheckIn.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        checkIns,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
