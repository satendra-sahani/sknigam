// ============ ENUMS ============

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  STAFF = 'staff',
  POLITICIAN = 'politician',
}

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  TRANSGENDER = 'T',
}

export enum Religion {
  HINDU = 'Hindu',
  MUSLIM = 'Muslim',
  CHRISTIAN = 'Christian',
  SIKH = 'Sikh',
  BUDDHIST = 'Buddhist',
  JAIN = 'Jain',
  OTHER = 'Other',
}

export enum EducationLevel {
  ILLITERATE = 'Illiterate',
  PRIMARY = 'Primary',
  SECONDARY = 'Secondary',
  GRADUATE = 'Graduate',
  POST_GRADUATE = 'Post-Graduate',
}

export enum IncomeRange {
  BELOW_1L = 'Below 1L',
  RANGE_1_3L = '1-3L',
  RANGE_3_6L = '3-6L',
  RANGE_6_10L = '6-10L',
  ABOVE_10L = 'Above 10L',
}

export enum HouseType {
  PUCCA = 'Pucca',
  SEMI_PUCCA = 'Semi-Pucca',
  KUCCHA = 'Kuccha',
}

export enum RationCardType {
  APL = 'APL',
  BPL = 'BPL',
  AAY = 'AAY',
  NONE = 'None',
}

export enum VotingIntention {
  WILL_VOTE = 'Will Vote',
  MAY_VOTE = 'May Vote',
  WONT_VOTE = "Won't Vote",
  FIRST_TIME = 'First-Time Voter',
}

export enum InfluenceLevel {
  INFLUENCER = 'Influencer',
  NEUTRAL = 'Neutral',
  OPPONENT = 'Opponent',
}

export enum GrievanceCategory {
  ROADS = 'Roads',
  WATER = 'Water',
  ELECTRICITY = 'Electricity',
  EMPLOYMENT = 'Employment',
  EDUCATION = 'Education',
  HEALTH = 'Health',
  PENSION = 'Pension',
  CORRUPTION = 'Corruption',
  LAW_AND_ORDER = 'LawAndOrder',
  OTHER = 'Other',
}

export enum SubscriptionTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  SYSTEM = 'system',
  ASSIGNMENT = 'assignment',
  SUBSCRIPTION = 'subscription',
  URGENT = 'urgent',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  OTP_SENT = 'otp_sent',
  OTP_VERIFIED = 'otp_verified',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  BOOTH_CREATE = 'booth_create',
  BOOTH_UPDATE = 'booth_update',
  VOTER_IMPORT = 'voter_import',
  VOTER_UPDATE = 'voter_update',
  VOTER_VISIT = 'voter_visit',
  ASSIGNMENT_CREATE = 'assignment_create',
  ASSIGNMENT_UPDATE = 'assignment_update',
  ASSIGNMENT_DELETE = 'assignment_delete',
  SUBSCRIPTION_CREATE = 'subscription_create',
  SUBSCRIPTION_PAYMENT = 'subscription_payment',
  SUBSCRIPTION_CANCEL = 'subscription_cancel',
}

// ============ INTERFACES ============

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  profilePhoto?: string;
  idProofUrl?: string;
  assemblyConstituency?: string;
  district?: string;
  partyAffiliation?: string;
  isVerified: boolean;
  isActive: boolean;
  otpRequired: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBooth {
  _id?: string;
  partNumber: number;
  name: string;
  assemblyConstituency: string;
  district: string;
  state: string;
  village?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalVoters: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVoter {
  _id?: string;
  // Official
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName?: string;
  gender: 'M' | 'F' | 'T';
  dateOfBirth?: Date;
  age?: number;
  address: string;
  boothId: string;
  partNumber: number;
  assemblyConstituency: string;
  // Social
  caste?: string;
  subCaste?: string;
  religion?: Religion;
  bloodGroup?: string;
  educationLevel?: EducationLevel;
  profession?: string;
  annualIncome?: IncomeRange;
  houseType?: HouseType;
  bplCardHolder?: boolean;
  rationCardType?: RationCardType;
  aadharLinked?: boolean;
  // Contact
  mobileNumber?: string;
  whatsappNumber?: string;
  email?: string;
  voterPhoto?: string;
  verificationStatus: boolean;
  visitDate?: Date;
  staffRemarks?: string;
  visitedBy?: string;
  // Political
  favouriteCandidate?: string;
  partySupport?: string;
  votingIntention?: VotingIntention;
  grievances?: GrievanceCategory[];
  problemDescription?: string;
  influenceLevel?: InfluenceLevel;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVoterAssignment {
  _id?: string;
  staffId: string;
  boothId: string;
  voterSerialFrom?: number;
  voterSerialTo?: number;
  assignedBy: string;
  isActive: boolean;
  totalVoters: number;
  completedCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubscription {
  _id?: string;
  politicianId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  assemblyConstituency: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INotification {
  _id?: string;
  title: string;
  message: string;
  type: NotificationType;
  sentBy?: string;
  recipients: string[];
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
}

export interface IRefreshToken {
  _id?: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

// ============ API RESPONSE TYPES ============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============ ANALYTICS RESPONSE TYPES ============

export interface AnalyticsOverview {
  totalVoters: number;
  verified: number;
  unverified: number;
  verificationRate: number;
  totalBooths: number;
  activeAssignments: number;
}

export interface AnalyticsGroupRow {
  key: string;
  count: number;
  verified?: number;
}

export interface BoothProgressRow {
  _id: string;
  total: number;
  verified: number;
  partNumber?: number;
  name?: string;
  assemblyConstituency?: string;
}

export interface StaffProgressRow {
  _id: string;
  name?: string;
  phone?: string;
  assignments: number;
  totalVoters: number;
  completedCount: number;
}
