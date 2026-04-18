import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  role: string;
  action: string;
  targetEntityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  deviceInfo?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'staff', 'politician'],
    },
    action: {
      type: String,
      required: true,
      enum: [
        'login', 'logout', 'login_failed',
        'otp_sent', 'otp_verified',
        'user_create', 'user_update', 'user_delete',
        'booth_create', 'booth_update',
        'voter_import', 'voter_update', 'voter_visit',
        'assignment_create', 'assignment_update', 'assignment_delete',
        'subscription_create', 'subscription_payment', 'subscription_cancel',
        'notification_send',
      ],
    },
    targetEntityId: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    deviceInfo: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
