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
  user?: UserProfile;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'staff' | 'politician';
  profilePhoto?: string;
  assemblyConstituency?: string;
  district?: string;
  partyAffiliation?: string;
  isVerified: boolean;
  isActive?: boolean;
}

export interface BoothInfo {
  _id: string;
  name: string;
  partNumber: number;
  assemblyConstituency: string;
  district: string;
  state: string;
  village?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalVoters: number;
}

export interface VoterAssignmentInfo {
  _id: string;
  boothId: string;
  staffId: string;
  voterSerialFrom?: number;
  voterSerialTo?: number;
  isActive: boolean;
  totalVoters: number;
  completedCount: number;
  booth?: BoothInfo;
}

export interface VoterData {
  _id: string;
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName: string;
  gender: 'M' | 'F' | 'T';
  age: number;
  address: string;
  boothId: string;
  partNumber: number;
  assemblyConstituency: string;
  caste?: string;
  subCaste?: string;
  religion?: string;
  mobileNumber?: string;
  whatsappNumber?: string;
  email?: string;
  voterPhoto?: string;
  verificationStatus: boolean;
  visitDate?: string;
  staffRemarks?: string;
  visitedBy?: string;
  favouriteCandidate?: string;
  partySupport?: string;
  votingIntention?: string;
  problemDescription?: string;
  aadhaarNumber?: string;
  grievances?: string[];
}

export interface QueuedVisit {
  id: string;
  voterId: string;
  voterName: string;
  boothId: string;
  payload: Record<string, any>;
  photoUri?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export type RootStackParamList = {
  Login: undefined;
  OtpVerification: { email: string; tempToken: string };
  MainTabs: undefined;
  BoothVoters: { assignmentId?: string; boothId: string; boothName: string; partNumber: number };
  VoterVisit: { voterId: string };
  Districts: { state: string };
  Constituencies: { district: string };
  BoothsInAc: { district: string; assemblyConstituency: string };
  // Politician-only stack (drill 04 → 05 → 06 → 07 → 09 of the design canvas)
  InsightDistricts: undefined;
  InsightACs: { district: string };
  InsightBooths: { district?: string; assemblyConstituency: string };
  InsightVoterList: {
    boothId?: string;
    boothName?: string;
    partNumber?: number;
    assemblyConstituency?: string;
  };
  InsightVoterProfile: { voterId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Assignments: undefined;
  Explore: undefined;
  Queue: undefined;
};

// Politician-only tab navigator (Insight Pro surface).  Mirrors the
// prototype's `InsightTabBar` — Home, Explore, Insights, Saved.
export type InsightTabParamList = {
  InsightHome: undefined;
  InsightExplore: undefined;
  InsightInsights: undefined;
  InsightSaved: undefined;
};

export interface HierarchyStateSummary {
  state: string;
  booths: number;
  districts: number;
  constituencies: number;
  totalVoters: number;
  verified: number;
}

export interface HierarchyDistrictRow {
  district: string;
  booths: number;
  totalVoters: number;
  verified: number;
}

export interface HierarchyAcRow {
  assemblyConstituency: string;
  district: string;
  booths: number;
  totalVoters: number;
  verified: number;
}

export interface HierarchyBoothRow {
  _id: string;
  name: string;
  partNumber: number;
  district: string;
  assemblyConstituency: string;
  village?: string;
  totalVoters: number;
  verified: number;
}
