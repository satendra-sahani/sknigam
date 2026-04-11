import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  title: string;
  message: string;
  type: string;
  sentBy: mongoose.Types.ObjectId;
  recipients: mongoose.Types.ObjectId[];
  targetZone?: string;
  targetRole?: string;
  targetBoothId?: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['system', 'zone_broadcast', 'report_update', 'incident_update', 'urgent'],
    },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    targetZone: { type: String },
    targetRole: {
      type: String,
      enum: ['super_admin', 'zone_incharge', 'booth_supervisor', 'data_entry_operator', 'observer'],
    },
    targetBoothId: { type: Schema.Types.ObjectId, ref: 'Booth' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

NotificationSchema.index({ recipients: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotificationDocument>('Notification', NotificationSchema);
