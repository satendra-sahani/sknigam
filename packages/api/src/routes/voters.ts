import { Router, Response } from 'express';
import { validationResult } from 'express-validator';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import Voter from '../models/Voter';
import Booth from '../models/Booth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { upload } from '../middleware/upload';
import { mongoIdParam, paginationQuery } from '../utils/validators';

const router = Router();

const VALID_GRIEVANCES = new Set([
  'Roads', 'Water', 'Electricity', 'Employment', 'Education',
  'Health', 'Pension', 'Corruption', 'LawAndOrder', 'Other',
]);

// Staff may only see voters in booths they are assigned to (Stage 3 will enforce;
// Stage 2 allows super_admin full access, staff/politician read-only by constituency).
function buildVoterFilter(req: AuthRequest): any {
  const filter: any = {};
  const q = req.query;

  if (q.assemblyConstituency) filter.assemblyConstituency = q.assemblyConstituency;
  if (q.boothId && mongoose.isValidObjectId(q.boothId as string)) filter.boothId = q.boothId;
  if (q.partNumber) filter.partNumber = parseInt(q.partNumber as string, 10);
  if (q.caste) filter.caste = q.caste;
  if (q.religion) filter.religion = q.religion;
  if (q.gender) filter.gender = q.gender;
  if (q.votingIntention) filter.votingIntention = q.votingIntention;
  if (q.verificationStatus !== undefined) filter.verificationStatus = q.verificationStatus === 'true';
  if (q.favouriteCandidate) filter.favouriteCandidate = q.favouriteCandidate;

  if (q.search) {
    const s = String(q.search);
    filter.$or = [
      { fullName: { $regex: s, $options: 'i' } },
      { epicNumber: { $regex: s, $options: 'i' } },
      { fatherOrHusbandName: { $regex: s, $options: 'i' } },
      { mobileNumber: { $regex: s } },
    ];
  }

  // Politicians only see their constituency
  if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
    filter.assemblyConstituency = req.user.assemblyConstituency;
  }

  return filter;
}

// GET /api/voters — paginated list with filters
router.get(
  '/',
  authenticate,
  requireRole('super_admin', 'staff', 'politician'),
  paginationQuery,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 200);
      const skip = (page - 1) * limit;
      const filter = buildVoterFilter(req);

      const [voters, total] = await Promise.all([
        Voter.find(filter)
          .populate('boothId', 'name partNumber assemblyConstituency')
          .sort({ partNumber: 1, voterSerialNumber: 1 })
          .skip(skip)
          .limit(limit),
        Voter.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: { voters, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/voters/:id
router.get(
  '/:id',
  authenticate,
  requireRole('super_admin', 'staff', 'politician'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const voter = await Voter.findById(req.params.id)
        .populate('boothId', 'name partNumber assemblyConstituency district')
        .populate('visitedBy', 'name phone');
      if (!voter) {
        res.status(404).json({ success: false, error: 'Voter not found' });
        return;
      }
      if (
        req.user?.role === 'politician' &&
        req.user.assemblyConstituency &&
        voter.assemblyConstituency !== req.user.assemblyConstituency
      ) {
        res.status(403).json({ success: false, error: 'Not in your constituency' });
        return;
      }
      res.json({ success: true, data: voter });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/voters — create single voter (super_admin only)
router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const body = req.body;
      const required = ['voterSerialNumber', 'epicNumber', 'fullName', 'gender', 'address', 'boothId'];
      for (const f of required) {
        if (body[f] === undefined || body[f] === null || body[f] === '') {
          res.status(400).json({ success: false, error: `${f} is required` });
          return;
        }
      }
      const booth = await Booth.findById(body.boothId);
      if (!booth) {
        res.status(400).json({ success: false, error: 'Invalid boothId' });
        return;
      }
      const voter = await Voter.create({
        ...body,
        partNumber: booth.partNumber,
        assemblyConstituency: booth.assemblyConstituency,
      });
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'voter_import',
        req,
        voter._id.toString(),
        undefined,
        { epicNumber: voter.epicNumber, fullName: voter.fullName },
      );
      res.status(201).json({ success: true, data: voter, message: 'Voter created' });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(409).json({ success: false, error: 'Duplicate EPIC number' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// PUT /api/voters/:id — update voter (super_admin + staff on visit)
router.put(
  '/:id',
  authenticate,
  requireRole('super_admin', 'staff'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const existing = await Voter.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Voter not found' });
        return;
      }

      const update: any = { ...req.body };
      delete update.epicNumber;
      delete update.boothId;
      delete update.partNumber;
      delete update.assemblyConstituency;

      if (Array.isArray(update.grievances)) {
        update.grievances = update.grievances.filter((g: string) => VALID_GRIEVANCES.has(g));
      }

      const isVisit = !!(update.verificationStatus || update.staffRemarks || update.visitDate);
      if (isVisit && req.user?.role === 'staff') {
        update.visitedBy = req.user.userId;
        update.visitDate = update.visitDate || new Date();
      }

      const voter = await Voter.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        isVisit ? 'voter_visit' : 'voter_update',
        req,
        req.params.id,
        { verificationStatus: existing.verificationStatus },
        { verificationStatus: voter?.verificationStatus },
      );

      res.json({ success: true, data: voter, message: 'Voter updated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// DELETE /api/voters/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  mongoIdParam,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const voter = await Voter.findByIdAndDelete(req.params.id);
      if (!voter) {
        res.status(404).json({ success: false, error: 'Voter not found' });
        return;
      }
      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'voter_update',
        req,
        req.params.id,
        { epicNumber: voter.epicNumber },
        { deleted: true },
      );
      res.json({ success: true, message: 'Voter deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/voters/bulk-import — Excel import (preview + confirm flow)
// Expected columns: voterSerialNumber, epicNumber, fullName, fatherOrHusbandName,
//   gender (M/F/T), age, address, partNumber, caste, religion, mobileNumber, ...
router.post(
  '/bulk-import',
  authenticate,
  requireRole('super_admin'),
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Excel file is required' });
        return;
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: undefined });

      if (rows.length === 0) {
        res.status(400).json({ success: false, error: 'Excel file is empty' });
        return;
      }

      // Allow targeting: either explicit boothId in body OR partNumber per row
      const targetBoothId = (req.body.boothId as string) || (req.query.boothId as string);
      let targetBooth = null as null | { _id: any; partNumber: number; assemblyConstituency: string };
      if (targetBoothId) {
        const b = await Booth.findById(targetBoothId).select('_id partNumber assemblyConstituency');
        if (!b) {
          res.status(400).json({ success: false, error: 'Invalid boothId' });
          return;
        }
        targetBooth = { _id: b._id, partNumber: b.partNumber, assemblyConstituency: b.assemblyConstituency };
      }

      const partNumbers = Array.from(new Set(rows.map((r) => r.partNumber).filter(Boolean).map(Number)));
      const boothsByPart = new Map<number, { _id: any; partNumber: number; assemblyConstituency: string }>();
      if (partNumbers.length > 0) {
        const booths = await Booth.find({ partNumber: { $in: partNumbers } }).select('_id partNumber assemblyConstituency');
        for (const b of booths) {
          boothsByPart.set(b.partNumber, { _id: b._id, partNumber: b.partNumber, assemblyConstituency: b.assemblyConstituency });
        }
      }

      const existingEpics = new Set(
        (await Voter.find({ epicNumber: { $in: rows.map((r) => r.epicNumber).filter(Boolean) } }).select('epicNumber')).map(
          (v) => v.epicNumber,
        ),
      );

      const results: { row: number; status: 'valid' | 'invalid'; data?: any; errors?: string[] }[] = [];
      const seenEpics = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];
        const errs: string[] = [];

        const epic = String(raw.epicNumber || '').trim().toUpperCase();
        if (!epic) errs.push('epicNumber is required');
        else if (existingEpics.has(epic) || seenEpics.has(epic)) errs.push('Duplicate epicNumber');

        if (!raw.fullName) errs.push('fullName is required');
        if (!raw.voterSerialNumber) errs.push('voterSerialNumber is required');
        if (!raw.address) errs.push('address is required');

        const gender = String(raw.gender || '').toUpperCase();
        if (!['M', 'F', 'T'].includes(gender)) errs.push('gender must be M, F or T');

        let booth = targetBooth;
        if (!booth) {
          const part = Number(raw.partNumber);
          if (!part) errs.push('partNumber is required when boothId is not provided');
          else booth = boothsByPart.get(part) || null;
          if (part && !booth) errs.push(`No booth found for partNumber ${part}`);
        }

        if (errs.length === 0 && booth) {
          seenEpics.add(epic);
          results.push({
            row: i + 2,
            status: 'valid',
            data: {
              voterSerialNumber: Number(raw.voterSerialNumber),
              epicNumber: epic,
              fullName: String(raw.fullName).trim(),
              fatherOrHusbandName: raw.fatherOrHusbandName ? String(raw.fatherOrHusbandName).trim() : undefined,
              gender,
              age: raw.age ? Number(raw.age) : undefined,
              dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth) : undefined,
              address: String(raw.address).trim(),
              boothId: booth._id,
              partNumber: booth.partNumber,
              assemblyConstituency: booth.assemblyConstituency,
              caste: raw.caste ? String(raw.caste).trim() : undefined,
              subCaste: raw.subCaste ? String(raw.subCaste).trim() : undefined,
              religion: raw.religion ? String(raw.religion).trim() : undefined,
              mobileNumber: raw.mobileNumber ? String(raw.mobileNumber).replace(/\D/g, '').slice(-10) : undefined,
              email: raw.email ? String(raw.email).trim().toLowerCase() : undefined,
            },
          });
        } else {
          results.push({ row: i + 2, status: 'invalid', data: raw, errors: errs });
        }
      }

      const validRows = results.filter((r) => r.status === 'valid');
      const invalidRows = results.filter((r) => r.status === 'invalid');

      if (req.body.confirm === 'true' || req.query.confirm === 'true') {
        if (validRows.length === 0) {
          res.status(400).json({ success: false, error: 'No valid rows to import', data: { errors: invalidRows } });
          return;
        }
        const inserted = await Voter.insertMany(
          validRows.map((r) => r.data),
          { ordered: false },
        );
        await createAuditLog(
          req.user!.userId,
          req.user!.role,
          'voter_import',
          req,
          undefined,
          undefined,
          { imported: inserted.length, failed: invalidRows.length },
        );
        res.json({
          success: true,
          data: { imported: inserted.length, failed: invalidRows.length, errors: invalidRows.slice(0, 50) },
          message: `${inserted.length} voters imported`,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          total: rows.length,
          valid: validRows.length,
          invalid: invalidRows.length,
          preview: results.slice(0, 50),
        },
        message: 'Preview generated. Post again with confirm=true to import.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/voters/stats/summary — quick counts for dashboard cards
router.get(
  '/stats/summary',
  authenticate,
  requireRole('super_admin', 'politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const baseFilter = buildVoterFilter(req);
      const [total, verified, male, female] = await Promise.all([
        Voter.countDocuments(baseFilter),
        Voter.countDocuments({ ...baseFilter, verificationStatus: true }),
        Voter.countDocuments({ ...baseFilter, gender: 'M' }),
        Voter.countDocuments({ ...baseFilter, gender: 'F' }),
      ]);
      res.json({
        success: true,
        data: {
          total,
          verified,
          unverified: total - verified,
          male,
          female,
          verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
