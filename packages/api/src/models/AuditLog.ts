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
      enum: ['super_admin', 'zone_incharge', 'booth_supervisor', 'data_entry_operator', 'observer'],
    },
    action: {
      type: String,
      required: true,
      enum: [
        'login', 'logout', 'login_failed',
        'staff_create', 'staff_update', 'staff_delete',
        'booth_create', 'booth_update',
        'assignment_create', 'assignment_update',
        'voter_count_submit', 'voter_count_approve', 'voter_count_reject',
        'check_in',
        'incident_create', 'incident_update',
        'notification_send',
        'staff_swap',
        'otp_sent', 'otp_verified',
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
