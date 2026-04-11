import mongoose, { Schema, Document } from 'mongoose';

export interface ICheckInDocument extends Document {
  staffId: mongoose.Types.ObjectId;
  boothId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  selfieUrl: string;
  distanceFromBooth: number;
  isWithinRadius: boolean;
  overrideReason?: string;
  supervisorApproval?: boolean;
  checkedInAt: Date;
  createdAt: Date;
}

const CheckInSchema = new Schema<ICheckInDocument>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    selfieUrl: { type: String, required: true },
    distanceFromBooth: { type: Number, required: true },
    isWithinRadius: { type: Boolean, required: true },
    overrideReason: { type: String },
    supervisorApproval: { type: Boolean },
    checkedInAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CheckInSchema.index({ staffId: 1, checkedInAt: -1 });
CheckInSchema.index({ boothId: 1 });

export default mongoose.model<ICheckInDocument>('CheckIn', CheckInSchema);
