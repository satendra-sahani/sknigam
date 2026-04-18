import mongoose, { Schema, Document } from 'mongoose';

export type Gender = 'M' | 'F' | 'T';
export type Religion = 'Hindu' | 'Muslim' | 'Christian' | 'Sikh' | 'Buddhist' | 'Jain' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
export type EducationLevel = 'Illiterate' | 'Primary' | 'Secondary' | 'Graduate' | 'Post-Graduate';
export type IncomeRange = 'Below 1L' | '1-3L' | '3-6L' | '6-10L' | 'Above 10L';
export type HouseType = 'Pucca' | 'Semi-Pucca' | 'Kuccha';
export type RationCardType = 'APL' | 'BPL' | 'AAY' | 'None';
export type VotingIntention = 'Will Vote' | 'May Vote' | "Won't Vote" | 'First-Time Voter';
export type InfluenceLevel = 'Influencer' | 'Neutral' | 'Opponent';
export type GrievanceCategory =
  | 'Roads'
  | 'Water'
  | 'Electricity'
  | 'Employment'
  | 'Education'
  | 'Health'
  | 'Pension'
  | 'Corruption'
  | 'LawAndOrder'
  | 'Other';

export interface IVoterDocument extends Document {
  // A) Official data (auto-imported)
  voterSerialNumber: number;
  epicNumber: string;
  fullName: string;
  fatherOrHusbandName?: string;
  gender: Gender;
  dateOfBirth?: Date;
  age?: number;
  address: string;
  boothId: mongoose.Types.ObjectId;
  partNumber: number;
  assemblyConstituency: string;

  // B) Social & community fields
  caste?: string;
  subCaste?: string;
  religion?: Religion;
  bloodGroup?: BloodGroup;
  educationLevel?: EducationLevel;
  profession?: string;
  annualIncome?: IncomeRange;
  houseType?: HouseType;
  bplCardHolder?: boolean;
  rationCardType?: RationCardType;
  aadharLinked?: boolean;

  // C) Contact & verification
  mobileNumber?: string;
  whatsappNumber?: string;
  email?: string;
  voterPhoto?: string;
  verificationStatus: boolean;
  visitDate?: Date;
  staffRemarks?: string;
  visitedBy?: mongoose.Types.ObjectId;

  // D) Political preference
  favouriteCandidate?: string;
  partySupport?: string;
  votingIntention?: VotingIntention;
  grievances?: GrievanceCategory[];
  problemDescription?: string;
  influenceLevel?: InfluenceLevel;

  createdAt: Date;
  updatedAt: Date;
}

const VoterSchema = new Schema<IVoterDocument>(
  {
    // Official
    voterSerialNumber: { type: Number, required: true },
    epicNumber: { type: String, required: true, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    fatherOrHusbandName: { type: String, trim: true },
    gender: { type: String, enum: ['M', 'F', 'T'], required: true },
    dateOfBirth: { type: Date },
    age: { type: Number, min: 0, max: 130 },
    address: { type: String, required: true, trim: true },
    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true },
    partNumber: { type: Number, required: true },
    assemblyConstituency: { type: String, required: true, trim: true },

    // Social
    caste: { type: String, trim: true },
    subCaste: { type: String, trim: true },
    religion: { type: String, enum: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'] },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
    educationLevel: { type: String, enum: ['Illiterate', 'Primary', 'Secondary', 'Graduate', 'Post-Graduate'] },
    profession: { type: String, trim: true },
    annualIncome: { type: String, enum: ['Below 1L', '1-3L', '3-6L', '6-10L', 'Above 10L'] },
    houseType: { type: String, enum: ['Pucca', 'Semi-Pucca', 'Kuccha'] },
    bplCardHolder: { type: Boolean },
    rationCardType: { type: String, enum: ['APL', 'BPL', 'AAY', 'None'] },
    aadharLinked: { type: Boolean },

    // Contact
    mobileNumber: { type: String, trim: true, match: /^[0-9]{10}$/ },
    whatsappNumber: { type: String, trim: true, match: /^[0-9]{10}$/ },
    email: { type: String, trim: true, lowercase: true },
    voterPhoto: { type: String },
    verificationStatus: { type: Boolean, default: false },
    visitDate: { type: Date },
    staffRemarks: { type: String, trim: true },
    visitedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Political
    favouriteCandidate: { type: String, trim: true },
    partySupport: { type: String, trim: true },
    votingIntention: { type: String, enum: ['Will Vote', 'May Vote', "Won't Vote", 'First-Time Voter'] },
    grievances: [
      {
        type: String,
        enum: ['Roads', 'Water', 'Electricity', 'Employment', 'Education', 'Health', 'Pension', 'Corruption', 'LawAndOrder', 'Other'],
      },
    ],
    problemDescription: { type: String, trim: true },
    influenceLevel: { type: String, enum: ['Influencer', 'Neutral', 'Opponent'] },
  },
  { timestamps: true }
);

VoterSchema.index({ epicNumber: 1 }, { unique: true });
VoterSchema.index({ boothId: 1, voterSerialNumber: 1 });
VoterSchema.index({ assemblyConstituency: 1, partNumber: 1 });
VoterSchema.index({ caste: 1 });
VoterSchema.index({ religion: 1 });
VoterSchema.index({ favouriteCandidate: 1 });
VoterSchema.index({ verificationStatus: 1 });
VoterSchema.index({ visitedBy: 1 });

export default mongoose.model<IVoterDocument>('Voter', VoterSchema);
