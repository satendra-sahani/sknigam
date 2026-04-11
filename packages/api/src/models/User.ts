import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  phone: string;
  role: string;
  hashedPassword: string;
  voterId?: string;
  profilePhoto?: string;
  idProofUrl?: string;
  partyMembershipId?: string;
  emergencyContact?: string;
  trainingCompleted: boolean;
  isVerified: boolean;
  isActive: boolean;
  zone?: string;
  otpRequired: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  profileCompleteness: number;
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
      enum: ['super_admin', 'zone_incharge', 'booth_supervisor', 'data_entry_operator', 'observer'],
    },
    hashedPassword: { type: String, required: true },
    voterId: { type: String, sparse: true, unique: true },
    profilePhoto: { type: String },
    idProofUrl: { type: String },
    partyMembershipId: { type: String },
    emergencyContact: { type: String },
    trainingCompleted: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    zone: { type: String },
    otpRequired: { type: Boolean, default: false },
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
UserSchema.index({ voterId: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ zone: 1 });

UserSchema.virtual('profileCompleteness').get(function (this: IUserDocument) {
  const fields = [
    'name', 'email', 'phone', 'role', 'voterId', 'profilePhoto',
    'idProofUrl', 'partyMembershipId', 'emergencyContact',
  ];
  const filled = fields.filter((f) => {
    const val = (this as any)[f];
    return val !== undefined && val !== null && val !== '';
  });
  return Math.round((filled.length / fields.length) * 100);
});

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
