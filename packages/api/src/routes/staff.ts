import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import * as XLSX from 'xlsx';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { upload, uploadToImageKit } from '../middleware/upload';
import { mongoIdParam, paginationQuery } from '../utils/validators';

const router = Router();

// GET /api/staff — list field staff (role = 'staff')
router.get('/', authenticate, requireRole('super_admin'), paginationQuery, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { role: 'staff' };
    if (req.query.assemblyConstituency) filter.assemblyConstituency = req.query.assemblyConstituency;
    if (req.query.district) filter.district = req.query.district;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [staff, total] = await Promise.all([
      User.find(filter).select('-hashedPassword').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { staff, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/staff/:id
router.get('/:id', authenticate, requireRole('super_admin'), mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
      return;
    }
    const staff = await User.findById(req.params.id).select('-hashedPassword');
    if (!staff || staff.role !== 'staff') {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }
    res.json({ success: true, data: staff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/staff
router.post('/', authenticate, requireRole('super_admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, assemblyConstituency, district } = req.body;
    if (!name || !email || !phone || !password) {
      res.status(400).json({ success: false, error: 'name, email, phone and password are required' });
      return;
    }

    const user = await User.create({
      name,
      email,
      phone,
      hashedPassword: password,
      role: 'staff',
      assemblyConstituency,
      district,
      otpRequired: true,
    });

    await createAuditLog(req.user!.userId, req.user!.role, 'user_create', req, user._id.toString(), undefined, { name, email, role: 'staff' });

    const userData = user.toObject();
    delete (userData as any).hashedPassword;

    res.status(201).json({ success: true, data: userData, message: 'Staff created' });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, error: 'Duplicate email or phone' });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/staff/:id
router.put('/:id', authenticate, requireRole('super_admin'), mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
      return;
    }
    const oldUser = await User.findById(req.params.id);
    if (!oldUser || oldUser.role !== 'staff') {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }

    const updateData = { ...req.body };
    delete updateData.hashedPassword;
    delete updateData.password;
    delete updateData.role;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-hashedPassword');
    await createAuditLog(req.user!.userId, req.user!.role, 'user_update', req, req.params.id, { name: oldUser.name }, { name: user?.name });
    res.json({ success: true, data: user, message: 'Staff updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/staff/:id/password — super_admin sets a new password for a staff
// member.  Uses the document `.save()` path (not findByIdAndUpdate) so the
// User pre-save hook hashes the value with bcrypt; also clears any lockout
// state so the staff can sign in straight away.
router.post(
  '/:id/password',
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
      const password: string = String(req.body?.password || '');
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        return;
      }
      const user = await User.findById(req.params.id);
      if (!user || user.role !== 'staff') {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }
      user.hashedPassword = password; // pre-save hook hashes
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      await user.save();
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'user_update',
        req,
        user._id.toString(),
        undefined,
        { passwordChanged: true },
      );
      res.json({ success: true, message: 'Password updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// DELETE /api/staff/:id — soft delete
router.delete('/:id', authenticate, requireRole('super_admin'), mongoIdParam, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid ID', data: errors.array() });
      return;
    }
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'staff') {
      res.status(404).json({ success: false, error: 'Staff not found' });
      return;
    }
    user.isActive = false;
    await user.save();
    await createAuditLog(req.user!.userId, req.user!.role, 'user_delete', req, req.params.id, { isActive: true }, { isActive: false });
    res.json({ success: true, message: 'Staff deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/staff/bulk-import — Excel import of staff list
router.post('/bulk-import', authenticate, requireRole('super_admin'), upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'Excel file is required' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (rows.length === 0) {
      res.status(400).json({ success: false, error: 'Excel file is empty' });
      return;
    }

    const existingEmails = new Set((await User.find({}).select('email')).map((u) => u.email));
    const existingPhones = new Set((await User.find({}).select('phone')).map((u) => u.phone));

    const results: { row: number; status: 'valid' | 'invalid'; data?: any; errors?: string[] }[] = [];
    const newEmails = new Set<string>();
    const newPhones = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];
      if (!row.name) rowErrors.push('Name is required');
      if (!row.email) rowErrors.push('Email is required');
      if (!row.phone) rowErrors.push('Phone is required');
      if (row.phone && !/^[0-9]{10}$/.test(String(row.phone))) rowErrors.push('Phone must be 10 digits');
      if (row.email && (existingEmails.has(row.email) || newEmails.has(row.email))) rowErrors.push('Duplicate email');
      if (row.phone && (existingPhones.has(String(row.phone)) || newPhones.has(String(row.phone)))) rowErrors.push('Duplicate phone');
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

    if (req.body.confirm === 'true' || req.query.confirm === 'true') {
      const usersToCreate = validRows.map((r) => ({
        name: r.data.name,
        email: r.data.email,
        phone: String(r.data.phone),
        hashedPassword: r.data.password || 'Staff@123',
        role: 'staff',
        assemblyConstituency: r.data.assemblyConstituency || undefined,
        district: r.data.district || undefined,
        otpRequired: true,
      }));

      if (usersToCreate.length > 0) {
        const inserted = await User.insertMany(usersToCreate);
        res.json({
          success: true,
          data: { imported: inserted.length, failed: invalidRows.length, errors: invalidRows },
          message: `${inserted.length} staff imported successfully`,
        });
        return;
      }
    }

    res.json({
      success: true,
      data: { total: rows.length, valid: validRows.length, invalid: invalidRows.length, preview: results },
      message: 'Preview generated. Add confirm=true to import valid rows.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/staff/:id/upload — upload an ID proof or profile photo for a staff user
// Body: multipart form-data, field "file", query/body param "kind" = 'idProof' | 'photo'
router.post(
  '/:id/upload',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, error: 'File is required' });
        return;
      }
      const staff = await User.findById(req.params.id);
      if (!staff || staff.role !== 'staff') {
        res.status(404).json({ success: false, error: 'Staff not found' });
        return;
      }

      const kind = (req.body.kind || req.query.kind || 'idProof') as 'idProof' | 'photo';
      const { url } = await uploadToImageKit(
        req.file.buffer,
        `${kind}_${staff._id.toString()}_${Date.now()}`,
        `/pollstics/staff/${kind}`,
      );

      if (kind === 'photo') {
        staff.profilePhoto = url;
      } else {
        staff.idProofUrl = url;
      }
      await staff.save();

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'user_update',
        req,
        staff._id.toString(),
        undefined,
        { [kind]: url },
      );

      res.json({ success: true, data: { url, kind }, message: 'Upload complete' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
