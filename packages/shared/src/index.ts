// ============ ENUMS ============

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ZONE_INCHARGE = 'zone_incharge',
  BOOTH_SUPERVISOR = 'booth_supervisor',
  DATA_ENTRY_OPERATOR = 'data_entry_operator',
  OBSERVER = 'observer',
}

export enum IncidentCategory {
  TECHNICAL = 'technical',
  SECURITY = 'security',
  ADMINISTRATIVE = 'administrative',
  OTHER = 'other',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export enum SubmissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REVISION_REQUESTED = 'revision_requested',
}

export enum SlotTime {
  SLOT_9AM = '09:00',
  SLOT_11AM = '11:00',
  SLOT_1PM = '13:00',
  SLOT_3PM = '15:00',
  SLOT_5PM = '17:00',
}

export enum AssignmentType {
  PRIMARY = 'primary',
  BACKUP = 'backup',
}

export enum NotificationType {
  SYSTEM = 'system',
  ZONE_BROADCAST = 'zone_broadcast',
  REPORT_UPDATE = 'report_update',
  INCIDENT_UPDATE = 'incident_update',
  URGENT = 'urgent',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  STAFF_CREATE = 'staff_create',
  STAFF_UPDATE = 'staff_update',
  STAFF_DELETE = 'staff_delete',
  BOOTH_CREATE = 'booth_create',
  BOOTH_UPDATE = 'booth_update',
  ASSIGNMENT_CREATE = 'assignment_create',
  ASSIGNMENT_UPDATE = 'assignment_update',
  VOTER_COUNT_SUBMIT = 'voter_count_submit',
  VOTER_COUNT_APPROVE = 'voter_count_approve',
  VOTER_COUNT_REJECT = 'voter_count_reject',
  CHECK_IN = 'check_in',
  INCIDENT_CREATE = 'incident_create',
  INCIDENT_UPDATE = 'incident_update',
  NOTIFICATION_SEND = 'notification_send',
  STAFF_SWAP = 'staff_swap',
  OTP_SENT = 'otp_sent',
  OTP_VERIFIED = 'otp_verified',
}

// ============ INTERFACES ============

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
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
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBooth {
  _id?: string;
  name: string;
  partNumber: number;
  zone: string;
  village?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalRegisteredVoters: number;
  facilities?: {
    power: boolean;
    water: boolean;
    shade: boolean;
    accessibilityRamp: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBoothAssignment {
  _id?: string;
  boothId: string;
  staffId: string;
  type: AssignmentType;
  assignedBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVoterCount {
  _id?: string;
  boothId: string;
  staffId: string;
  slot: SlotTime;
  electionDate: string;
  totalVoters: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  status: SubmissionStatus;
  reviewedBy?: string;
  rejectionReason?: string;
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICheckIn {
  _id?: string;
  staffId: string;
  boothId: string;
  latitude: number;
  longitude: number;
  selfieUrl: string;
  distanceFromBooth: number;
  isWithinRadius: boolean;
  overrideReason?: string;
  supervisorApproval?: boolean;
  checkedInAt: Date;
  createdAt?: Date;
}

export interface IIncident {
  _id?: string;
  boothId: string;
  reportedBy: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  photos: string[];
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotification {
  _id?: string;
  title: string;
  message: string;
  type: NotificationType;
  sentBy: string;
  recipients: string[];
  targetZone?: string;
  targetRole?: UserRole;
  targetBoothId?: string;
  readBy: string[];
  createdAt?: Date;
}

export interface IAuditLog {
  _id?: string;
  userId: string;
  role: UserRole;
  action: AuditAction;
  targetEntityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  deviceInfo?: string;
  timestamp: Date;
}

export interface IOtpToken {
  _id?: string;
  userId: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  createdAt?: Date;
}

export interface IRefreshToken {
  _id?: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardKPIs {
  overallTurnoutPercent: number;
  boothsReporting: number;
  totalBooths: number;
  staffCheckedIn: number;
  totalStaff: number;
  openIncidents: number;
  pendingApprovals: number;
}

export interface HourlyTurnout {
  hour: string;
  cumulativeVoters: number;
  cumulativePercent: number;
}

export interface StaffScorecard {
  staffId: string;
  name: string;
  checkInScore: number;
  submissionScore: number;
  approvalScore: number;
  incidentScore: number;
  totalScore: number;
}
