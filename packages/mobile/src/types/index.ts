export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  success: boolean;
  otpRequired?: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  message?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profilePhoto?: string;
  zone?: string;
  isVerified: boolean;
  trainingCompleted: boolean;
}

export interface BoothInfo {
  _id: string;
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
}

export interface AssignmentInfo {
  _id: string;
  boothId: string;
  staffId: string;
  type: string;
  isActive: boolean;
  booth: BoothInfo;
}

export interface CheckInData {
  _id: string;
  staffId: string;
  boothId: string;
  latitude: number;
  longitude: number;
  selfieUrl: string;
  distanceFromBooth: number;
  isWithinRadius: boolean;
  overrideReason?: string;
  checkedInAt: string;
}

export interface VoterCountData {
  _id: string;
  boothId: string;
  staffId: string;
  slot: string;
  electionDate: string;
  totalVoters: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  status: string;
  reviewedBy?: string;
  rejectionReason?: string;
  submittedAt: string;
}

export interface IncidentData {
  _id: string;
  boothId: string;
  reportedBy: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  photos: string[];
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface NotificationData {
  _id: string;
  title: string;
  message: string;
  type: string;
  sentBy: string;
  recipients: string[];
  targetZone?: string;
  readBy: string[];
  createdAt: string;
}

export interface VoterData {
  _id: string;
  voterId: string;
  name: string;
  mobileNumber: string;
  email?: string;
  photoUrl?: string;
  cast: string;
  subCast: string;
  party: string;
  boothId: string;
  addedBy: string;
  createdAt: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'voter_count' | 'check_in' | 'incident' | 'voter';
  data: any;
  createdAt: string;
  retryCount: number;
}

export type RootStackParamList = {
  Login: undefined;
  OtpVerification: { email: string; tempToken: string };
  MainTabs: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  CheckIn: undefined;
  Submit: undefined;
  Voters: undefined;
  Incidents: undefined;
  Notifications: undefined;
};
