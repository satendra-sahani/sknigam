/**
 * /api/books — public bookstore catalogue + admin CRUD.
 *
 *   GET    /api/books              public — list active books (paged + filterable)
 *   GET    /api/books/all          admin  — list everything, including inactive
 *   GET    /api/books/:slug        public — fetch one (active only)
 *   GET    /api/books/id/:id       admin  — fetch one by Mongo _id
 *   POST   /api/books              admin  — create
 *   PATCH  /api/books/:id          admin  — update
 *   DELETE /api/books/:id          admin  — remove
 *
 * The PublishedBook submission queue (/api/published-books) is a
 * different entity — admins manage author proposals there; books they
 * decide to publish get a corresponding Book row created here.
 */
import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Book from '../models/Book';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

const CATEGORIES = ['Analysis', 'Psephology', 'Handbook', 'Biography', 'Field'];

/* ─────────────────────────────────────────────────────────────────
 * GET /api/books — PUBLIC list (active only)
 * Used by /bookstore.  Returns the same shape the React UI expects so
 * the page can map records straight onto its existing Book interface.
 * ───────────────────────────────────────────────────────────────── */
router.get(
  '/',
  [
    query('category').optional().isIn([...CATEGORIES, 'all']),
    query('search').optional().trim().isLength({ max: 200 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const filter: any = { isActive: true };
      if (req.query.category && req.query.category !== 'all') {
        filter.category = req.query.category;
      }
      if (req.query.search) {
        const s = String(req.query.search);
        filter.$or = [
          { title: { $regex: s, $options: 'i' } },
          { author: { $regex: s, $options: 'i' } },
        ];
      }
      const items = await Book.find(filter)
        // sortOrder asc (nulls last via Mongo default), then newest first.
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();
      res.json({ success: true, data: items });
    } catch (err: any) {
      console.error('[books] public list failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not load catalogue' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────
 * GET /api/books/all — ADMIN list (includes inactive)
 * ───────────────────────────────────────────────────────────────── */
router.get(
  '/all',
  authenticate,
  requireRole('super_admin'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const items = await Book.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean();
      res.json({ success: true, data: items });
    } catch (err: any) {
      console.error('[books] admin list failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not load books' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────
 * GET /api/books/id/:id — ADMIN fetch by Mongo _id
 * ───────────────────────────────────────────────────────────────── */
router.get(
  '/id/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const doc = await Book.findById(req.params.id).lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[books] admin get failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not fetch book' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────
 * GET /api/books/:slug — PUBLIC fetch by slug
 * Routed AFTER /all and /id/:id so those literal paths take priority.
 * ───────────────────────────────────────────────────────────────── */
router.get(
  '/:slug',
  [param('slug').trim().matches(/^[a-z0-9][a-z0-9-]*$/i)],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const doc = await Book.findOne({ slug: req.params.slug.toLowerCase(), isActive: true }).lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[books] public get failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not fetch book' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────
 * Shared validators for create + update
 * ───────────────────────────────────────────────────────────────── */
const bookBodyValidators = [
  body('slug').optional().trim().toLowerCase().matches(/^[a-z0-9][a-z0-9-]*$/).isLength({ max: 80 }),
  body('title').optional().trim().isLength({ min: 1, max: 400 }),
  body('author').optional().trim().isLength({ min: 1, max: 200 }),
  body('category').optional().isIn(CATEGORIES),
  body('categoryLabel').optional().trim().isLength({ min: 1, max: 80 }),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('mrp').optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
  body('rating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
  body('reviews').optional().isInt({ min: 0 }).toInt(),
  body('coverUrl').optional().trim().isURL().isLength({ max: 1000 }),
  body('coverGradient.c1').optional().trim().isLength({ max: 16 }),
  body('coverGradient.c2').optional().trim().isLength({ max: 16 }),
  body('coverGradient.fg').optional().trim().isLength({ max: 16 }),
  body('isNew').optional().isBoolean().toBoolean(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('description').optional({ nullable: true }).trim().isLength({ max: 4000 }),
  body('sortOrder').optional({ nullable: true }).isInt().toInt(),
];

/* ─────────────────────────────────────────────────────────────────
 * POST /api/books — ADMIN create
 * ───────────────────────────────────────────────────────────────── */
router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  bookBodyValidators.map((v) => v),
  // For POST, the core required fields must actually be present.
  body('slug').notEmpty().withMessage('slug required'),
  body('title').notEmpty().withMessage('title required'),
  body('author').notEmpty().withMessage('author required'),
  body('category').notEmpty().withMessage('category required'),
  body('categoryLabel').notEmpty().withMessage('categoryLabel required'),
  body('price').exists().withMessage('price required'),
  body('coverUrl').notEmpty().withMessage('coverUrl required'),
  body('coverGradient.c1').notEmpty(),
  body('coverGradient.c2').notEmpty(),
  body('coverGradient.fg').notEmpty(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      return;
    }
    try {
      const doc = await Book.create({
        slug: req.body.slug,
        title: req.body.title,
        author: req.body.author,
        category: req.body.category,
        categoryLabel: req.body.categoryLabel,
        price: req.body.price,
        mrp: req.body.mrp,
        rating: req.body.rating ?? 4.5,
        reviews: req.body.reviews ?? 0,
        coverUrl: req.body.coverUrl,
        coverGradient: req.body.coverGradient,
        isNew: req.body.isNew ?? false,
        isActive: req.body.isActive ?? true,
        description: req.body.description,
        sortOrder: req.body.sortOrder,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err: any) {
      if (err?.code === 11000) {
        res.status(409).json({ success: false, error: 'A book with that slug already exists' });
        return;
      }
      console.error('[books] create failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not create book' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────
 * PATCH /api/books/:id — ADMIN update
 * ───────────────────────────────────────────────────────────────── */
router.patch(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId(), ...bookBodyValidators],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      return;
    }
    try {
      // Only touch fields the admin actually sent — partial update.
      const allowed = [
        'slug', 'title', 'author', 'category', 'categoryLabel', 'price', 'mrp',
        'rating', 'reviews', 'coverUrl', 'coverGradient', 'isNew', 'isActive',
        'description', 'sortOrder',
      ] as const;
      const update: any = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) update[k] = req.body[k];
      }
      const doc = await Book.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      }).lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      if (err?.code === 11000) {
        res.status(409).json({ success: false, error: 'Slug already taken by another book' });
        return;
      }
      console.error('[books] update failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not update book' });
    }
  },
);

/* ─────────────────────────────────────────────────────────────────
 * DELETE /api/books/:id — ADMIN remove
 * ───────────────────────────────────────────────────────────────── */
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const out = await Book.findByIdAndDelete(req.params.id);
      if (!out) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[books] delete failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not delete book' });
    }
  },
);

export default router;
