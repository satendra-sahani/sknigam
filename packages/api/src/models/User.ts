import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export type UserRole = 'super_admin' | 'staff' | 'politician';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  hashedPassword: string;
  profilePhoto?: string;
  idProofUrl?: string;
  // POLLSTICS scoping
  assemblyConstituency?: string;
  district?: string;
  // Politician-specific
  partyAffiliation?: string;
  // Lifecycle
  isVerified: boolean;
  isActive: boolean;
  otpRequired: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'staff', 'politician'],
    },
    hashedPassword: { type: String, required: true },
    profilePhoto: { type: String },
    idProofUrl: { type: String },
    assemblyConstituency: { type: String, trim: true },
    district: { type: String, trim: true },
    partyAffiliation: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    otpRequired: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ assemblyConstituency: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('hashedPassword')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.hashedPassword = await bcrypt.hash(this.hashedPassword, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.hashedPassword);
};

export default mongoose.model<IUserDocument>('User', UserSchema);
