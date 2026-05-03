import { Router, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { randomUUID } from 'crypto';

import VoterDiscrepancy, { DISCREPANCY_REASONS } from '../models/VoterDiscrepancy';
import Booth from '../models/Booth';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createAuditLog } from '../middleware/audit';
import { parseDiscrepancyPdf } from '../utils/discrepancyPdfParser';

const router = Router();

// Dedicated uploader that accepts PDFs (the app-wide `upload` middleware only
// allows images + Excel).
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted for discrepancy import'));
    }
  },
});

function buildDiscrepancyFilter(req: AuthRequest): any {
  const q = req.query;
  const filter: any = {};

  if (q.assemblyConstituency) filter.assemblyConstituency = q.assemblyConstituency;
  if (q.assemblyConstituencyNumber) {
    filter.assemblyConstituencyNumber = parseInt(String(q.assemblyConstituencyNumber), 10);
  }
  if (q.partNumber) filter.partNumber = parseInt(String(q.partNumber), 10);
  if (q.boothId && mongoose.isValidObjectId(String(q.boothId))) filter.boothId = q.boothId;

  if (q.status && ['pending', 'resolved', 'dismissed'].includes(String(q.status))) {
    filter.status = q.status;
  }
  if (q.checked === 'true' || q.checked === 'false') {
    filter.checked = q.checked === 'true';
  }
  if (q.reasonKey) filter.discrepancyReasonKey = q.reasonKey;

  if (q.search) {
    const s = String(q.search);
    filter.$or = [
      { voterNameHi: { $regex: s, $options: 'i' } },
      { voterNameEn: { $regex: s, $options: 'i' } },
      { epicNumber: { $regex: s, $options: 'i' } },
    ];
  }

  if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
    filter.assemblyConstituency = req.user.assemblyConstituency;
  }

  return filter;
}

// GET /api/discrepancies — paginated list with filters
router.get(
  '/',
  authenticate,
  requireRole('super_admin', 'staff', 'politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(String(req.query.page || 1), 10);
      const limit = Math.min(parseInt(String(req.query.limit || 50), 10), 500);
      const skip = (page - 1) * limit;
      const filter = buildDiscrepancyFilter(req);

      const [rows, total, pending, resolved, dismissed] = await Promise.all([
        VoterDiscrepancy.find(filter)
          .sort({ partNumber: 1, voterSerialNumber: 1 })
          .skip(skip)
          .limit(limit),
        VoterDiscrepancy.countDocuments(filter),
        VoterDiscrepancy.countDocuments({ ...filter, status: 'pending' }),
        VoterDiscrepancy.countDocuments({ ...filter, status: 'resolved' }),
        VoterDiscrepancy.countDocuments({ ...filter, status: 'dismissed' }),
      ]);

      res.json({
        success: true,
        data: {
          rows,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
          counts: { total, pending, resolved, dismissed },
          reasonDictionary: DISCREPANCY_REASONS,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/discrepancies/summary — counts grouped by AC + part (for the AC overview)
router.get(
  '/summary',
  authenticate,
  requireRole('super_admin', 'staff', 'politician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const match: any = {};
      if (req.query.assemblyConstituency) match.assemblyConstituency = req.query.assemblyConstituency;
      if (req.user?.role === 'politician' && req.user.assemblyConstituency) {
        match.assemblyConstituency = req.user.assemblyConstituency;
      }

      const byPart = await VoterDiscrepancy.aggregate([
        { $match: match },
        {
          $group: {
            _id: { partNumber: '$partNumber', partNameHi: '$partNameHi', partNameEn: '$partNameEn' },
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            checked: { $sum: { $cond: ['$checked', 1, 0] } },
          },
        },
        { $sort: { '_id.partNumber': 1 } },
      ]);

      const byReason = await VoterDiscrepancy.aggregate([
        { $match: match },
        { $unwind: '$discrepancyReasonKey' },
        {
          $group: {
            _id: '$discrepancyReasonKey',
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          byPart: byPart.map((p) => ({
            partNumber: p._id.partNumber,
            partNameHi: p._id.partNameHi,
            partNameEn: p._id.partNameEn,
            total: p.total,
            pending: p.pending,
            resolved: p.resolved,
            checked: p.checked,
          })),
          byReason: DISCREPANCY_REASONS.map((r) => ({
            key: r.key,
            hi: r.hi,
            en: r.en,
            count: byReason.find((b) => b._id === r.key)?.count || 0,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/discrepancies/preview — parse PDF and return extracted rows without saving
router.post(
  '/preview',
  authenticate,
  requireRole('super_admin'),
  pdfUpload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'PDF file is required' });
        return;
      }
      const parsed = await parseDiscrepancyPdf(req.file.buffer);
      res.json({
        success: true,
        data: {
          ...parsed,
          fileName: req.file.originalname,
          rowCount: parsed.rows.length,
          preview: parsed.rows.slice(0, 25),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/discrepancies/import — parse + save (upserts by AC+part+EPIC)
router.post(
  '/import',
  authenticate,
  requireRole('super_admin'),
  pdfUpload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'PDF file is required' });
        return;
      }
      const parsed = await parseDiscrepancyPdf(req.file.buffer);
      if (parsed.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No discrepancy rows could be extracted from the PDF',
          data: { warnings: parsed.warnings },
        });
        return;
      }

      // Override AC from body if parser could not detect it
      const acNumber = parsed.assemblyConstituencyNumber || parseInt(String(req.body.assemblyConstituencyNumber || 0), 10);
      const acName =
        parsed.assemblyConstituency ||
        String(req.body.assemblyConstituency || '').trim();
      const partNumber = parsed.partNumber || parseInt(String(req.body.partNumber || 0), 10);

      if (!acNumber || !acName || !partNumber) {
        res.status(400).json({
          success: false,
          error: 'Could not determine Assembly Constituency / Part from PDF. Provide assemblyConstituencyNumber, assemblyConstituency, partNumber in the body.',
          data: { warnings: parsed.warnings, parsed },
        });
        return;
      }

      // Try to find a matching booth in our DB (best-effort).
      const booth = await Booth.findOne({
        assemblyConstituency: acName,
        partNumber,
      }).select('_id');

      const batchId = randomUUID();
      const ops = parsed.rows.map((row) => ({
        updateOne: {
          filter: {
            assemblyConstituencyNumber: acNumber,
            partNumber,
            epicNumber: row.epicNumber,
          },
          update: {
            $set: {
              assemblyConstituencyNumber: acNumber,
              assemblyConstituency: acName,
              assemblyConstituencyHi: parsed.assemblyConstituencyHi,
              partNumber,
              partNameHi: parsed.partNameHi,
              partNameEn: parsed.partNameEn,
              boothId: booth?._id,
              voterSerialNumber: row.voterSerialNumber,
              partSerialNumber: row.partSerialNumber,
              epicNumber: row.epicNumber,
              voterNameHi: row.voterNameHi,
              voterNameEn: row.voterNameEn,
              age: row.age,
              genderHi: row.genderHi,
              gender: row.gender,
              discrepancyReasonHi: row.discrepancyReasonHi,
              discrepancyReasonKey: row.discrepancyReasonKey,
              discrepancyReasonEn: row.discrepancyReasonEn,
              sourcePdf: req.file!.originalname,
              importedBy: req.user!.userId,
              importBatchId: batchId,
            },
            $setOnInsert: {
              status: 'pending',
              checked: false,
            },
          },
          upsert: true,
        },
      }));

      const result = await VoterDiscrepancy.bulkWrite(ops, { ordered: false });

      await createAuditLog(
        req.user!.userId,
        req.user!.role,
        'voter_import',
        req,
        undefined,
        undefined,
        {
          discrepancyImport: true,
          fileName: req.file.originalname,
          assemblyConstituencyNumber: acNumber,
          partNumber,
          rows: parsed.rows.length,
          batchId,
        },
      );

      res.json({
        success: true,
        data: {
          imported: parsed.rows.length,
          inserted: result.upsertedCount || 0,
          updated: result.modifiedCount || 0,
          boothLinked: !!booth,
          batchId,
          warnings: parsed.warnings,
          assemblyConstituencyNumber: acNumber,
          assemblyConstituency: acName,
          partNumber,
        },
        message: `${parsed.rows.length} discrepancy rows imported for AC ${acNumber} Part ${partNumber}`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// PATCH /api/discrepancies/:id — toggle checkbox / change status / add note
router.patch(
  '/:id',
  authenticate,
  requireRole('super_admin', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }

      const update: any = {};
      if (typeof req.body.checked === 'boolean') update.checked = req.body.checked;
      if (req.body.note !== undefined) update.note = String(req.body.note);
      if (req.body.status && ['pending', 'resolved', 'dismissed'].includes(req.body.status)) {
        update.status = req.body.status;
        if (req.body.status !== 'pending') {
          update.resolvedBy = req.user!.userId;
          update.resolvedAt = new Date();
        } else {
          update.resolvedBy = undefined;
          update.resolvedAt = undefined;
        }
      }

      const doc = await VoterDiscrepancy.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!doc) {
        res.status(404).json({ success: false, error: 'Discrepancy not found' });
        return;
      }

      res.json({ success: true, data: doc });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/discrepancies/bulk-update — check/uncheck or resolve many rows at once
router.post(
  '/bulk-update',
  authenticate,
  requireRole('super_admin', 'staff'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids : [];
      if (ids.length === 0) {
        res.status(400).json({ success: false, error: 'ids array is required' });
        return;
      }
      const validIds = ids.filter((id) => mongoose.isValidObjectId(id));

      const update: any = {};
      if (typeof req.body.checked === 'boolean') update.checked = req.body.checked;
      if (req.body.status && ['pending', 'resolved', 'dismissed'].includes(req.body.status)) {
        update.status = req.body.status;
        if (req.body.status !== 'pending') {
          update.resolvedBy = req.user!.userId;
          update.resolvedAt = new Date();
        }
      }

      if (Object.keys(update).length === 0) {
        res.status(400).json({ success: false, error: 'Nothing to update' });
        return;
      }

      const result = await VoterDiscrepancy.updateMany({ _id: { $in: validIds } }, { $set: update });
      res.json({
        success: true,
        data: { matched: result.matchedCount, modified: result.modifiedCount },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// DELETE /api/discrepancies/:id — super_admin only
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400).json({ success: false, error: 'Invalid ID' });
        return;
      }
      const doc = await VoterDiscrepancy.findByIdAndDelete(req.params.id);
      if (!doc) {
        res.status(404).json({ success: false, error: 'Discrepancy not found' });
        return;
      }
      res.json({ success: true, message: 'Discrepancy deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
