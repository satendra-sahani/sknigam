import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OtpTokenSchema = new Schema<IOtpTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OtpTokenSchema.index({ userId: 1 });
OtpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOtpTokenDocument>('OtpToken', OtpTokenSchema);
