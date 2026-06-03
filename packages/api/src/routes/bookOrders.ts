/**
 * /api/book-orders — public buy-request submission + admin triage.
 *
 *   POST   /api/book-orders          public — customer places an order
 *   GET    /api/book-orders          admin  — list (paged + filter + search)
 *   GET    /api/book-orders/:id      admin  — fetch one
 *   PATCH  /api/book-orders/:id      admin  — update status / notes
 *   DELETE /api/book-orders/:id      admin  — remove
 *
 * The POST endpoint takes the bookSlug from the buy modal, looks up
 * the Book on the server side so we can snapshot author + price (we
 * do NOT trust the client's price — that would let anyone "buy" the
 * ₹1,299 atlas for ₹1), then computes the shipping + total
 * server-side too.  Stale price coming up from the client is logged
 * but the server's truth wins.
 */
import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import BookOrder, { BookOrderStatus, BookOrderFormat } from '../models/BookOrder';
import Book from '../models/Book';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

const STATUSES: BookOrderStatus[] = ['new', 'contacted', 'shipped', 'delivered', 'cancelled'];
const FORMATS: BookOrderFormat[] = ['Paperback', 'E-book', 'Hardcover'];
const PAYMENT_METHODS = ['UPI', 'Card', 'NetBanking', 'COD'];

const SHIPPING_FLAT = 49;
const FREE_SHIPPING_THRESHOLD = 699;

/** Derive the per-edition price from a Book's base price using the same
 *  formula the React buy modal uses, so server-side validation matches
 *  what the customer saw on the page. */
function priceFor(basePrice: number, format: BookOrderFormat): number {
  if (format === 'E-book') return Math.round((basePrice * 0.6) / 10) * 10 - 1;
  if (format === 'Hardcover') return Math.round((basePrice * 1.6) / 10) * 10 + 9;
  return basePrice;
}

/* ────────────────────────────────────────────────────────────────
 * POST /api/book-orders — PUBLIC submission
 * ──────────────────────────────────────────────────────────────── */
router.post(
  '/',
  [
    body('bookSlug').trim().notEmpty().withMessage('Book required').isLength({ max: 80 }),
    body('format').isIn(FORMATS).withMessage('Invalid format'),
    body('quantity').isInt({ min: 1, max: 20 }).toInt(),
    body('customerName').trim().notEmpty().withMessage('Name required').isLength({ max: 200 }),
    body('email').trim().isEmail().withMessage('Valid email required').isLength({ max: 320 }),
    body('phone').trim().notEmpty().withMessage('Phone required').isLength({ max: 40 }),
    body('pincode').trim().notEmpty().withMessage('PIN code required').isLength({ max: 20 }),
    body('address').trim().notEmpty().withMessage('Address required').isLength({ max: 2000 }),
    body('paymentMethod').isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      return;
    }

    try {
      // Look up the book on the server — never trust client price.
      const slug = String(req.body.bookSlug).toLowerCase();
      const book = await Book.findOne({ slug, isActive: true });
      if (!book) {
        res.status(404).json({ success: false, error: 'Book not found or no longer available' });
        return;
      }

      const format = req.body.format as BookOrderFormat;
      const quantity = format === 'E-book' ? 1 : Number(req.body.quantity);
      const unitPrice = priceFor(book.price, format);
      const subtotal = unitPrice * quantity;
      const shipping = format === 'E-book' ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
      const total = subtotal + shipping;

      const doc = await BookOrder.create({
        bookId: book._id,
        bookSlug: book.slug,
        bookTitle: book.title,
        bookAuthor: book.author,
        format,
        unitPrice,
        quantity,
        shipping,
        total,
        customerName: req.body.customerName,
        email: req.body.email,
        phone: req.body.phone,
        pincode: req.body.pincode,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod,
        status: 'new',
      });

      res.status(201).json({
        success: true,
        message: 'Order received',
        data: {
          id: doc._id,
          orderId: `PB-${String(doc._id).slice(-6).toUpperCase()}`,
          status: doc.status,
          total: doc.total,
          createdAt: doc.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[book-orders] submit failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not save order' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * GET /api/book-orders — ADMIN list
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
          { customerName: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { phone: { $regex: s, $options: 'i' } },
          { bookTitle: { $regex: s, $options: 'i' } },
          { bookSlug: { $regex: s, $options: 'i' } },
        ];
      }
      const [items, total, counts, revenue] = await Promise.all([
        BookOrder.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('reviewedBy', 'name email')
          .lean(),
        BookOrder.countDocuments(filter),
        BookOrder.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        // Revenue aggregate ignores cancelled orders so the admin sees
        // a realistic "money committed" number rather than gross intent.
        BookOrder.aggregate([
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]),
      ]);
      const statusCounts: Record<string, number> = {};
      for (const c of counts) statusCounts[c._id as string] = c.n;
      res.json({
        success: true,
        data: items,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        statusCounts,
        revenue: revenue[0] || { total: 0, count: 0 },
      });
    } catch (err: any) {
      console.error('[book-orders] list failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not load orders' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * GET /api/book-orders/:id — ADMIN fetch one
 * ──────────────────────────────────────────────────────────────── */
router.get(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const doc = await BookOrder.findById(req.params.id)
        .populate('reviewedBy', 'name email')
        .populate('bookId', 'slug title coverUrl')
        .lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[book-orders] get failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not fetch order' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * PATCH /api/book-orders/:id — ADMIN update status / notes
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
      const doc = await BookOrder.findByIdAndUpdate(req.params.id, update, { new: true })
        .populate('reviewedBy', 'name email')
        .lean();
      if (!doc) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true, data: doc });
    } catch (err: any) {
      console.error('[book-orders] update failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not update order' });
    }
  },
);

/* ────────────────────────────────────────────────────────────────
 * DELETE /api/book-orders/:id — ADMIN remove
 * ──────────────────────────────────────────────────────────────── */
router.delete(
  '/:id',
  authenticate,
  requireRole('super_admin'),
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const out = await BookOrder.findByIdAndDelete(req.params.id);
      if (!out) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[book-orders] delete failed:', err?.message || err);
      res.status(500).json({ success: false, error: 'Could not delete order' });
    }
  },
);

export default router;
