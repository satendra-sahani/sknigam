/**
 * Book — the public bookstore catalogue.
 *
 * Distinct from [[PublishedBook]] (which is the author-submission queue
 * that admins triage).  A Book is something currently for sale on the
 * /bookstore page; admins manage them from /books with full CRUD.
 *
 * `slug` is the stable, URL-safe id used in the React UI (the old
 * hard-coded `id` field, e.g. "verdict24", "atlas").  Indexed unique
 * so admins can't accidentally collide.
 *
 * `coverGradient.{c1,c2,fg}` is the soft fallback used when the CDN
 * cover image 404s — same shape the front-end was using inline.  Kept
 * on the doc so a single admin form can edit both at once.
 */
import mongoose, { Schema } from 'mongoose';

export type BookCategory = 'Analysis' | 'Psephology' | 'Handbook' | 'Biography' | 'Field';

/** Plain-attrs interface — intentionally does NOT extend Document.
 *  Mongoose's Document base already has its own `isNew` boolean
 *  (true while the doc is unsaved), and our schema field of the same
 *  name would collide and break the schema generic.  Using a plain
 *  interface lets the field stay named `isNew` everywhere — DB,
 *  API responses, React UI — without needing a rename. */
export interface IBook {
  slug: string;
  title: string;
  author: string;
  category: BookCategory;
  categoryLabel: string;
  price: number;
  mrp?: number;
  rating: number;
  reviews: number;
  coverUrl: string;
  coverGradient: { c1: string; c2: string; fg: string };
  isNew: boolean;
  isActive: boolean;
  description?: string;
  /** Manual sort order; lower = earlier in the grid. Optional —
   *  if null the API sorts by createdAt desc. */
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema = new Schema<IBook>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9][a-z0-9-]*$/,
    },
    title: { type: String, required: true, trim: true, maxlength: 400 },
    author: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['Analysis', 'Psephology', 'Handbook', 'Biography', 'Field'],
      required: true,
    },
    categoryLabel: { type: String, required: true, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    rating: { type: Number, required: true, min: 0, max: 5, default: 4.5 },
    reviews: { type: Number, required: true, min: 0, default: 0 },
    coverUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    coverGradient: {
      c1: { type: String, required: true, trim: true, maxlength: 16 },
      c2: { type: String, required: true, trim: true, maxlength: 16 },
      fg: { type: String, required: true, trim: true, maxlength: 16 },
    },
    isNew: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String, trim: true, maxlength: 4000 },
    sortOrder: { type: Number, index: true },
  },
  { timestamps: true }
);

BookSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });
BookSchema.index({ category: 1, isActive: 1 });

export default mongoose.model<IBook>('Book', BookSchema);
