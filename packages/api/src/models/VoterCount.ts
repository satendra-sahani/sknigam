import mongoose, { Schema, Document } from 'mongoose';

export interface IVoterCountDocument extends Document {
  boothId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  slot: string;
  electionDate: string;
  totalVoters: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  status: string;
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VoterCountSchema = new Schema<IVoterCountDocument>(
  {
    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    slot: {
      type: String,
      required: true,
      enum: ['09:00', '11:00', '13:00', '15:00', '17:00'],
    },
    electionDate: { type: String, required: true },
    totalVoters: { type: Number, required: true, min: 0 },
    maleCount: { type: Number, required: true, min: 0 },
    femaleCount: { type: Number, required: true, min: 0 },
    otherCount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

VoterCountSchema.index({ boothId: 1, slot: 1, electionDate: 1 }, { unique: true });
VoterCountSchema.index({ staffId: 1 });
VoterCountSchema.index({ status: 1 });

VoterCountSchema.pre('save', function (next) {
  if (this.maleCount + this.femaleCount + this.otherCount !== this.totalVoters) {
    this.totalVoters = this.maleCount + this.femaleCount + this.otherCount;
  }
  next();
});

export default mongoose.model<IVoterCountDocument>('VoterCount', VoterCountSchema);
