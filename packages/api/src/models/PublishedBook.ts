/**
 * PublishedBook — submissions from the public /publish page.
 *
 * Each document is one author proposal: who they are, what they want
 * to publish, which package they picked, and an optional manuscript
 * link.  Admins triage these from the /published-books admin page —
 * status moves pending → reviewing → (approved | rejected | published)
 * with optional adminNotes captured along the way.
 *
 * Public submission endpoint creates the doc with status='pending';
 * everything else is admin-only.
 */
import mongoose, { Schema, Document } from 'mongoose';

export type PublishedBookPackage = 'Essential' | 'Analyst' | 'Bureau';
export type PublishedBookStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'published';

export interface IPublishedBookDocument extends Document {
  // Author
  authorName: string;
  email: string;
  phone: string;
  // Book
  title: string;
  genre: string;
  wordCount?: string;
  synopsis?: string;
  // Plan
  package: PublishedBookPackage;
  // Manuscript (optional — author can submit metadata first, attach later)
  manuscriptUrl?: string;
  manuscriptName?: string;
  // Triage
  status: PublishedBookStatus;
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PublishedBookSchema = new Schema<IPublishedBookDocument>(
  {
    authorName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 320 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 400 },
    genre: { type: String, required: true, trim: true, maxlength: 100 },
    wordCount: { type: String, trim: true, maxlength: 40 },
    synopsis: { type: String, trim: true, maxlength: 4000 },
    package: { type: String, enum: ['Essential', 'Analyst', 'Bureau'], required: true },
    manuscriptUrl: { type: String, trim: true, maxlength: 1000 },
    manuscriptName: { type: String, trim: true, maxlength: 400 },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'approved', 'rejected', 'published'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String, trim: true, maxlength: 4000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

PublishedBookSchema.index({ createdAt: -1 });
PublishedBookSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model<IPublishedBookDocument>('PublishedBook', PublishedBookSchema);
