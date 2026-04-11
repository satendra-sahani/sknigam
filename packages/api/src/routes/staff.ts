import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import * as XLSX from 'xlsx';
import User from '../models/User';
import BoothAssignment from '../models/BoothAssignment';
import VoterCount from '../models/VoterCount';
import CheckIn from '../models/CheckIn';
import Incident from '../models/Incident';
import Notification from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole, zoneFilter } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { upload } from '../middleware/upload';
import { mongoIdParam, paginationQuery, staffSwapValidation } from '../utils/validators';

const router = Router();

function getSocketIO(req: AuthRequest) {
  return (req.app as any).get('io');
}

// GET /api/staff
router.get(
  '/',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  zoneFilter,
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const zoneFilterObj = (req as any).zoneFilter || {};
      const filter: any = { ...zoneFilterObj };

      if (req.query.role) filter.role = req.query.role;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search, $options: 'i' } },
          { voterId: { $regex: req.query.search, $options: 'i' } },
        ];
      }

      const [staff, total] = await Promise.all([
        User.find(filter)
          .select('-hashedPassword')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          staff,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/staff/:id
router.get(
  '/:id',
  authenticate,
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
        return;
      }

      const staff = await User.findById(req.params.id).select('-hashedPassword');
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      res.json({ success: true, data: staff });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/staff
router.post(
  '/',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, phone, password, role, zone, voterId } = req.body;

      if (!name || !email || !phone || !password || !role) {
        res.status(400).json({ success: false, error: 'name, email, phone, password, and role are required' });
        return;
      }

      const otpRequired = ['super_admin', 'zone_incharge'].includes(role);

      const user = await User.create({
        name,
        email,
        phone,
        hashedPassword: password,
        role,
        zone,
        voterId,
        otpRequired,
      });

      await createAuditLog(req.user!.userId, req.user!.role, 'staff_create', req, user._id.toString(), undefined, { name, email, role });

      const userData = user.toObject();
      delete (userData as any).hashedPassword;

      res.status(201).json({ success: true, data: userData, message: 'Staff created' });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Duplicate email, phone, or voterId' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/staff/:id
router.put(
  '/:id',
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

      const oldUser = await User.findById(req.params.id);
      if (!oldUser) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      // Don't allow changing password through this route
      const updateData = { ...req.body };
      delete updateData.hashedPassword;
      delete updateData.password;

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select('-hashedPassword');

      await createAuditLog(req.user!.userId, req.user!.role, 'staff_update', req, req.params.id, { name: oldUser.name, role: oldUser.role }, { name: user?.name, role: user?.role });

      res.json({ success: true, data: user, message: 'Staff updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/staff/:id
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

      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      // Soft delete: deactivate instead of removing
      user.isActive = false;
      await user.save();

      await createAuditLog(req.user!.userId, req.user!.role, 'staff_delete', req, req.params.id, { isActive: true }, { isActive: false });

      res.json({ success: true, message: 'Staff deactivated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/staff/bulk-import
router.post(
  '/bulk-import',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Excel file is required' });
        return;
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        res.status(400).json({ success: false, error: 'Excel file is empty' });
        return;
      }

      const results: {
        row: number;
        status: 'valid' | 'invalid';
        data?: any;
        errors?: string[];
      }[] = [];

      const existingEmails = new Set(
        (await User.find({}).select('email')).map((u) => u.email)
      );
      const existingPhones = new Set(
        (await User.find({}).select('phone')).map((u) => u.phone)
      );
      const existingVoterIds = new Set(
        (await User.find({ voterId: { $exists: true, $ne: '' } }).select('voterId')).map((u) => u.voterId)
      );

      const newEmails = new Set<string>();
      const newPhones = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowErrors: string[] = [];

        // Required fields
        if (!row.name) rowErrors.push('Name is required');
        if (!row.email) rowErrors.push('Email is required');
        if (!row.phone) rowErrors.push('Phone is required');
        if (!row.role) rowErrors.push('Role is required');

        // Phone format
        if (row.phone && !/^[0-9]{10}$/.test(String(row.phone))) {
          rowErrors.push('Phone must be 10 digits');
        }

        // Valid role
        const validRoles = ['super_admin', 'zone_incharge', 'booth_supervisor', 'data_entry_operator', 'observer'];
        if (row.role && !validRoles.includes(row.role)) {
          rowErrors.push(`Invalid role: ${row.role}`);
        }

        // Duplicate checks
        if (row.email && (existingEmails.has(row.email) || newEmails.has(row.email))) {
          rowErrors.push('Duplicate email');
        }
        if (row.phone && (existingPhones.has(String(row.phone)) || newPhones.has(String(row.phone)))) {
          rowErrors.push('Duplicate phone');
        }
        if (row.voterId && existingVoterIds.has(String(row.voterId))) {
          rowErrors.push('Duplicate voter ID');
        }

        if (rowErrors.length > 0) {
          results.push({ row: i + 2, status: 'invalid', data: row, errors: rowErrors });
        } else {
          results.push({ row: i + 2, status: 'valid', data: row });
          newEmails.add(row.email);
          newPhones.add(String(row.phone));
        }
      }

      const validRows = results.filter((r) => r.status === 'valid');
      const invalidRows = results.filter((r) => r.status === 'invalid');

      // If confirm flag is set, insert valid rows
      if (req.body.confirm === 'true' || req.query.confirm === 'true') {
        const usersToCreate = validRows.map((r) => ({
          name: r.data.name,
          email: r.data.email,
          phone: String(r.data.phone),
          hashedPassword: r.data.password || 'Default@123',
          role: r.data.role,
          zone: r.data.zone || undefined,
          voterId: r.data.voterId ? String(r.data.voterId) : undefined,
          otpRequired: ['super_admin', 'zone_incharge'].includes(r.data.role),
        }));

        if (usersToCreate.length > 0) {
          const inserted = await User.insertMany(usersToCreate);
          res.json({
            success: true,
            data: {
              imported: inserted.length,
              failed: invalidRows.length,
              errors: invalidRows,
            },
            message: `${inserted.length} staff imported successfully`,
          });
          return;
        }
      }

      // Return preview
      res.json({
        success: true,
        data: {
          total: rows.length,
          valid: validRows.length,
          invalid: invalidRows.length,
          preview: results,
        },
        message: 'Preview generated. Add confirm=true to import valid rows.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/staff/scorecard/:id
router.get(
  '/scorecard/:id',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const staffId = req.params.id;

      const staff = await User.findById(staffId).select('name');
      if (!staff) {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // 1. Check-in score (25pts) - on-time check-in
      const checkIn = await CheckIn.findOne({
        staffId,
        checkedInAt: {
          $gte: new Date(`${today}T00:00:00Z`),
          $lt: new Date(`${today}T23:59:59Z`),
        },
      });
      let checkInScore = 0;
      if (checkIn) {
        const checkInHour = checkIn.checkedInAt.getHours();
        checkInScore = checkInHour <= 9 ? 25 : (checkInHour <= 10 ? 15 : 10);
      }

      // 2. Submission score (25pts) - all 5 slots submitted
      const submissions = await VoterCount.countDocuments({
        staffId,
        electionDate: today,
      });
      const submissionScore = Math.min(25, (submissions / 5) * 25);

      // 3. Approval score (25pts) - all submissions approved
      const approvedCount = await VoterCount.countDocuments({
        staffId,
        electionDate: today,
        status: 'approved',
      });
      const approvalScore = submissions > 0
        ? Math.round((approvedCount / submissions) * 25)
        : 0;

      // 4. Incident score (25pts) - zero incidents
      const incidentCount = await Incident.countDocuments({
        reportedBy: staffId,
        createdAt: {
          $gte: new Date(`${today}T00:00:00Z`),
          $lt: new Date(`${today}T23:59:59Z`),
        },
      });
      const incidentScore = incidentCount === 0 ? 25 : Math.max(0, 25 - incidentCount * 5);

      const totalScore = checkInScore + submissionScore + approvalScore + incidentScore;

      res.json({
        success: true,
        data: {
          staffId,
          name: staff.name,
          checkInScore,
          submissionScore,
          approvalScore,
          incidentScore,
          totalScore,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/staff/swap
router.post(
  '/swap',
  authenticate,
  requireRole('super_admin', 'zone_incharge'),
  staffSwapValidation,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
        return;
      }

      const { currentStaffId, replacementStaffId, boothId, reason } = req.body;

      // Verify both staff members exist
      const [currentStaff, replacementStaff] = await Promise.all([
        User.findById(currentStaffId),
        User.findById(replacementStaffId),
      ]);

      if (!currentStaff) {
        res.status(404).json({ success: false, error: 'Current staff not found' });
        return;
      }
      if (!replacementStaff) {
        res.status(404).json({ success: false, error: 'Replacement staff not found' });
        return;
      }

      // Deactivate current assignment
      const currentAssignment = await BoothAssignment.findOne({
        boothId,
        staffId: currentStaffId,
        isActive: true,
      });

      if (!currentAssignment) {
        res.status(404).json({ success: false, error: 'No active assignment found for current staff at this booth' });
        return;
      }

      currentAssignment.isActive = false;
      await currentAssignment.save();

      // Create new assignment for replacement
      const newAssignment = await BoothAssignment.create({
        boothId,
        staffId: replacementStaffId,
        type: currentAssignment.type,
        assignedBy: req.user!.userId,
        isActive: true,
      });

      // Send notifications to both staff
      const notification = await Notification.create({
        title: 'Staff Swap',
        message: `Booth assignment swap: ${currentStaff.name} replaced by ${replacementStaff.name}. Reason: ${reason}`,
        type: 'system',
        sentBy: req.user!.userId,
        recipients: [currentStaffId, replacementStaffId],
        readBy: [],
      });

      await createAuditLog(req.user!.userId, req.user!.role, 'staff_swap', req, boothId, {
        currentStaffId,
        currentStaffName: currentStaff.name,
      }, {
        replacementStaffId,
        replacementStaffName: replacementStaff.name,
        reason,
      });

      const io = getSocketIO(req);
      if (io) {
        io.to(`user_${currentStaffId}`).emit('new-notification', notification.toObject());
        io.to(`user_${replacementStaffId}`).emit('new-notification', notification.toObject());
      }

      res.json({
        success: true,
        data: {
          deactivatedAssignment: currentAssignment,
          newAssignment,
        },
        message: 'Staff swap completed',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
