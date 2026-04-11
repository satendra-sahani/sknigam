import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import Notification from '../models/Notification';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { notificationValidation, mongoIdParam } from '../utils/validators';

const router = Router();

function getSocketIO(req: AuthRequest) {
  return (req.app as any).get('io');
}

// POST /api/notifications
router.post(
  '/',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  notificationValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const { title, message, type, recipients, targetZone, targetRole, targetBoothId } = req.body;

      // Determine recipients if not explicitly provided
      let recipientIds: string[] = recipients || [];

      if (!recipients || recipients.length === 0) {
        const userFilter: any = { isActive: true };
        if (targetZone) userFilter.zone = targetZone;
        if (targetRole) userFilter.role = targetRole;

        const users = await User.find(userFilter).select('_id');
        recipientIds = users.map((u) => u._id.toString());
      }

      const notification = await Notification.create({
        title,
        message,
        type,
        sentBy: req.user!.userId,
        recipients: recipientIds,
        targetZone,
        targetRole,
        targetBoothId,
        readBy: [],
      });

      await createAuditLog(req.user!.userId, req.user!.role, 'notification_send', req, notification._id.toString(), undefined, {
        title,
        type,
        recipientCount: recipientIds.length,
      });

      const io = getSocketIO(req);
      if (io) {
        io.emit('notification-sent', notification.toObject());

        // Send targeted socket event to each recipient
        recipientIds.forEach((recipientId) => {
          io.to(`user_${recipientId}`).emit('new-notification', notification.toObject());
        });
      }

      res.status(201).json({ success: true, data: notification, message: 'Notification sent' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      recipients: req.user!.userId,
    };

    if (req.query.unread === 'true') {
      filter.readBy = { $ne: req.user!.userId };
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('sentBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    const unreadCount = await Notification.countDocuments({
      recipients: req.user!.userId,
      readBy: { $ne: req.user!.userId },
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
      return;
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    if (!notification.readBy.map(String).includes(req.user!.userId)) {
      notification.readBy.push(req.user!.userId as any);
      await notification.save();
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      {
        recipients: req.user!.userId,
        readBy: { $ne: req.user!.userId },
      },
      { $addToSet: { readBy: req.user!.userId } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
