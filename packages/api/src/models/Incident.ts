import mongoose, { Schema, Document } from 'mongoose';

export interface IIncidentDocument extends Document {
  boothId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  category: string;
  severity: string;
  status: string;
  description: string;
  photos: string[];
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncidentDocument>(
  {
    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      required: true,
      enum: ['technical', 'security', 'administrative', 'other'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    status: {
      type: String,
      required: true,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
    },
    description: { type: String, required: true },
    photos: [{ type: String }],
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

IncidentSchema.index({ boothId: 1 });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ severity: 1 });

export default mongoose.model<IIncidentDocument>('Incident', IncidentSchema);
