import mongoose, { Schema, Document } from 'mongoose';

export interface IVoterAssignmentDocument extends Document {
  staffId: mongoose.Types.ObjectId;
  boothId: mongoose.Types.ObjectId;
  // Optional range within booth (by voter serial number); null means entire booth
  voterSerialFrom?: number;
  voterSerialTo?: number;
  assignedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  totalVoters: number;
  completedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const VoterAssignmentSchema = new Schema<IVoterAssignmentDocument>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true },
    voterSerialFrom: { type: Number },
    voterSerialTo: { type: Number },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    totalVoters: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VoterAssignmentSchema.index({ staffId: 1, isActive: 1 });
VoterAssignmentSchema.index({ boothId: 1, isActive: 1 });

export default mongoose.model<IVoterAssignmentDocument>('VoterAssignment', VoterAssignmentSchema);
