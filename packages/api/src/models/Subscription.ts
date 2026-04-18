import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionTier = 'basic' | 'standard' | 'premium';
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export interface ISubscriptionDocument extends Document {
  politicianId: mongoose.Types.ObjectId;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  // Scope of access
  assemblyConstituency: string;
  // Dates
  startDate: Date;
  endDate: Date;
  // Payment
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    politicianId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tier: { type: String, enum: ['basic', 'standard', 'premium'], required: true },
    status: { type: String, enum: ['pending', 'active', 'expired', 'cancelled'], default: 'pending' },
    assemblyConstituency: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ politicianId: 1, status: 1 });
SubscriptionSchema.index({ assemblyConstituency: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1 });

export default mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);
