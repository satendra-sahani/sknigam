import mongoose, { Schema, Document } from 'mongoose';

export interface IBoothAssignmentDocument extends Document {
  boothId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  type: string;
  assignedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BoothAssignmentSchema = new Schema<IBoothAssignmentDocument>(
  {
    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: ['primary', 'backup'],
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BoothAssignmentSchema.index({ boothId: 1, staffId: 1, isActive: 1 });
BoothAssignmentSchema.index({ staffId: 1, isActive: 1 });

export default mongoose.model<IBoothAssignmentDocument>('BoothAssignment', BoothAssignmentSchema);
