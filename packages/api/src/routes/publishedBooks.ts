/**
 * /api/published-books — public submission + admin triage.
 *
 *   POST   /api/published-books          public  — author submits a book
 *   GET    /api/published-books          admin   — list submissions (paged, filterable)
 *   GET    /api/published-books/:id      admin   — fetch one
 *   PATCH  /api/published-books/:id      admin   — update status / adminNotes
 *   DELETE /api/published-books/:id      admin   — remove (super_admin only)
 *
 * The submission endpoint is intentionally unauthenticated — the form
 * lives on the public /publish page where authors don't have accounts.
 * We accept manuscript metadata only; the manuscript file itself is
 * uploaded separately through ImageKit if/when needed (manuscriptUrl).
 */
import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import PublishedBook, { PublishedBookStatus } from '../models/PublishedBook';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

const STATUSES: PublishedBookStatus[] = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
  'published',
];

/* ────────────────────────────────────────────────────────────────
 * POST /api/published-books — PUBLIC submission
 * ──────────────────────────────────────────────────────────────── */
router.post(
  '/',
  [
    body('authorName').trim().notEmpty().withMessage('Author name required').isLength({ max: 200 }),
    body('email').trim().isEmail().withMessage('Valid email required').isLength({ max: 320 }),
    body('phone').trim().notEmpty().withMessage('Phone required').isLength({ max: 40 }),
    body('title').trim().notEmpty().withMessage('Book title required').isLength({ max: 400 }),
    body('genre').trim().notEmpty().withMessage('Genre required').isLength({ max: 100 }),
    body('package').isIn(['Essential', 'Analyst', 'Bureau']).withMessage('Invalid package'),
    body('wordCount').optional({ checkFalsy: true }).trim().isLength({ max: 40 }),
    body('synopsis').optional({ checkFalsy: true }).trim().isLength({ max: 4000 }),
    body('manuscriptUrl').optional({ checkFalsy: true }).trim().isURL().withMessage('Invalid manuscript URL'),
    body('manuscriptName').optional({ checkFalsy: true }).trim().isLength({ max: 400 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      return;
    }
    try {
      const doc = await PublishedBook.create({
        authorName: req.body.authorName,
        email: req.body.email,
        phone: req.body.phone,
        title: req.body.title,
        genre: req.body.genre,
        wordCount: req.body.wordCount,
        synopsis: req.body.synopsis,
        package: req.body.package,
        manuscriptUrl: req.body.manuscriptUrl,
        manuscriptName: req.body.manuscriptName,
        status: 'pending',
      });
      res.status(201).json({
        success: true,
        message: 'Submission received',
        data: { id: doc._id, status: doc.status, createdAt: doc.createdAt },
      });
    } catch (err: any) {
      console.error('[published-books] submit failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not save submission' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * GET /api/published-books — ADMIN list
 * ──────────────────────────────────────────────────────────────── */
router.get(
  '/',
  authenticate,
  requireRole('super_admin'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(STATUSES),
    query('search').optional().trim().isLength({ max: 200 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 25;
      const skip = (page - 1) * limit;
      const filter: any = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.search) {
        const s = String(req.query.search);
        filter.$or = [
          { authorName: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { title: { $regex: s, $options: 'i' } },
        ];
      }
      const [items, total, counts] = await Promise.all([
        PublishedBook.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('reviewedBy', 'name email')
          .lean(),
        PublishedBook.countDocuments(filter),
        PublishedBook.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      ]);
      const statusCounts: Record<string, number> = {};
      for (const c of counts) statusCounts[c._id as string] = c.n;
      res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        statusCounts,
      });
    } catch (err: any) {
      console.error('[published-books] list failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not load submissions' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * GET /api/published-books/:id — ADMIN fetch one
 * ──────────────────────────────────────────────────────────────── */
router.get(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const doc = await PublishedBook.findById(req.params.id)
        .populate('reviewedBy', 'name email')
        .lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[published-books] get failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not fetch submission' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * PATCH /api/published-books/:id — ADMIN update status / notes
 * ──────────────────────────────────────────────────────────────── */
router.patch(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [
    param('id').isMongoId(),
    body('status').optional().isIn(STATUSES),
    body('adminNotes').optional({ nullable: true }).trim().isLength({ max: 4000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      return;
    }
    try {
      const update: any = {};
      if (req.body.status) {
        update.status = req.body.status;
        update.reviewedBy = req.user?.userId;
        update.reviewedAt = new Date();
      }
      if (req.body.adminNotes !== undefined) update.adminNotes = req.body.adminNotes;
      const doc = await PublishedBook.findByIdAndUpdate(req.params.id, update, { new: true })
        .populate('reviewedBy', 'name email')
        .lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[published-books] update failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not update submission' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * DELETE /api/published-books/:id — ADMIN remove
 * ──────────────────────────────────────────────────────────────── */
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const out = await PublishedBook.findByIdAndDelete(req.params.id);
      if (!out) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[published-books] delete failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not delete submission' });
    }
  },
);

export default router;
