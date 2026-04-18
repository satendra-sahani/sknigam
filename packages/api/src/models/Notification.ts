import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  title: string;
  message: string;
  type: string;
  sentBy?: mongoose.Types.ObjectId;
  recipients: mongoose.Types.ObjectId[];
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
      enum: ['system', 'assignment', 'subscription', 'urgent'],
    },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
    recipients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

NotificationSchema.index({ recipients: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.model<INotificationDocument>('Notification', NotificationSchema);
