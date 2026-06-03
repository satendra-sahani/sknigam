/**
 * BookOrder — buy requests from the /bookstore checkout modal.
 *
 * These are *leads* in admin language: a customer filled out the buy
 * form on the public site but no real payment has happened yet (the
 * site has no payment integration).  Admins triage them from
 * /book-orders — typical flow is new → contacted → shipped → delivered,
 * with `cancelled` as a kill switch.
 *
 * Why we snapshot book fields (title, slug, price, format) instead of
 * just keeping bookId:
 *   - The Book row might get edited, hidden, or deleted later.  The
 *     order list still needs to show what the customer saw at the
 *     moment they ordered.
 *   - Price in particular: an admin changing the catalogue price
 *     should NOT retroactively change the agreed-upon total on a
 *     pending order.
 */
import mongoose, { Schema } from 'mongoose';

export type BookOrderFormat = 'Paperback' | 'E-book' | 'Hardcover';
export type BookOrderStatus =
  | 'new'           // just submitted, waiting on admin
  | 'contacted'     // admin has reached out
  | 'shipped'       // book is on the way
  | 'delivered'     // fulfilled
  | 'cancelled';    // killed (customer changed mind, fraud, etc.)
export type BookOrderPayment =
  | 'UPI'
  | 'Card'
  | 'NetBanking'
  | 'COD';

export interface IBookOrder {
  // What was bought (snapshot — Book may change later)
  bookId?: mongoose.Types.ObjectId;
  bookSlug: string;
  bookTitle: string;
  bookAuthor: string;
  format: BookOrderFormat;
  unitPrice: number;
  quantity: number;
  shipping: number;
  total: number;

  // Who's buying
  customerName: string;
  email: string;
  phone: string;
  pincode: string;
  address: string;

  // How they want to pay
  paymentMethod: BookOrderPayment;

  // Triage state
  status: BookOrderStatus;
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const BookOrderSchema = new Schema<IBookOrder>(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book' },
    bookSlug: { type: String, required: true, trim: true, maxlength: 80, index: true },
    bookTitle: { type: String, required: true, trim: true, maxlength: 400 },
    bookAuthor: { type: String, required: true, trim: true, maxlength: 200 },
    format: { type: String, enum: ['Paperback', 'E-book', 'Hardcover'], required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },

    customerName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    pincode: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 2000 },

    paymentMethod: { type: String, enum: ['UPI', 'Card', 'NetBanking', 'COD'], required: true },

    status: {
      type: String,
      enum: ['new', 'contacted', 'shipped', 'delivered', 'cancelled'],
      default: 'new',
      index: true,
    },
    adminNotes: { type: String, trim: true, maxlength: 4000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

BookOrderSchema.index({ createdAt: -1 });
BookOrderSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model<IBookOrder>('BookOrder', BookOrderSchema);
