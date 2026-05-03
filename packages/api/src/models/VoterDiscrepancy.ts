import mongoose, { Schema, Document } from 'mongoose';

export type DiscrepancyStatus = 'pending' | 'resolved' | 'dismissed';
export type DiscrepancyGenderHi = 'पुरुष' | 'महिला' | 'अन्य';
export type DiscrepancyGender = 'M' | 'F' | 'T';

/**
 * Canonical keys for the discrepancy reasons published by ECI in the
 * "List of voters with no mapping and logical discrepancy" PDF.  We keep a
 * Hindi label (as it appears in the PDF), a canonical key (machine friendly),
 * and an English label (human friendly) for every reason.
 */
export const DISCREPANCY_REASONS = [
  {
    key: 'name_mismatch',
    hi: 'नाम मे भिन्नता',
    en: 'Name mismatch',
  },
  {
    key: 'unmapped_with_last_sir',
    hi: 'अंतिम एसआईआर के साथ अनमैप्ड',
    en: 'Unmapped with last SIR',
  },
  {
    key: 'parent_age_diff_lt_15',
    hi: 'माता-पिता की आयु में अंतर <15',
    en: 'Parent age difference < 15',
  },
  {
    key: 'parent_age_diff_gt_50',
    hi: 'माता-पिता की आयु में अंतर >50',
    en: 'Parent age difference > 50',
  },
  {
    key: 'grandparent_age_diff_lt_40',
    hi: 'दादा-दादी/नाना-नानी की आयु में अंतर <40',
    en: 'Grandparent age difference < 40',
  },
  {
    key: 'children_gte_6',
    hi: 'संतान >= 6',
    en: 'Children >= 6',
  },
] as const;

export type DiscrepancyReasonKey = typeof DISCREPANCY_REASONS[number]['key'];

export interface IVoterDiscrepancyDocument extends Document {
  // Geography (the PDF gives us AC + part)
  assemblyConstituencyNumber: number;        // e.g. 338
  assemblyConstituency: string;              // romanized name e.g. "Pathardeva"
  assemblyConstituencyHi?: string;           // original Hindi e.g. "पथरदेवा"
  partNumber: number;                        // e.g. 1
  partNameHi?: string;                       // "प्रा0वि0 सिरसिया कक्ष सं0 1"
  partNameEn?: string;                       // "Pra0Vi0 Sirsia Kaksh Sam 1"

  // Booth link is optional — we can wire it in later when a Booth exists
  boothId?: mongoose.Types.ObjectId;

  // Voter identity (bilingual — the PDF is Hindi, we also store English)
  voterSerialNumber: number;                 // क्रम संख्या (row number)
  partSerialNumber?: number;                 // भाग की क्रम संख्या (within the part)
  epicNumber: string;                        // e.g. NTV1234567 / DBS0987654
  voterNameHi: string;                       // मतदाता का नाम (as printed in PDF)
  voterNameEn: string;                       // romanized / transliterated name
  age?: number;                              // आयु
  genderHi?: DiscrepancyGenderHi;            // पुरुष / महिला / अन्य
  gender?: DiscrepancyGender;                // M / F / T

  // The actual discrepancy — kept as parallel arrays so the UI can render
  // both languages side by side without re-translating at read time.
  discrepancyReasonHi: string[];             // raw Hindi phrases
  discrepancyReasonKey: DiscrepancyReasonKey[]; // canonical machine keys
  discrepancyReasonEn: string[];             // English labels

  // Workflow
  status: DiscrepancyStatus;
  checked: boolean;                          // ui-side checkbox ("I've reviewed this")
  note?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;

  // Source tracking
  sourcePdf?: string;                        // file name
  sourcePdfUrl?: string;                     // if stored in ImageKit
  importedBy?: mongoose.Types.ObjectId;
  importBatchId?: string;                    // group rows from a single upload

  createdAt: Date;
  updatedAt: Date;
}

const VoterDiscrepancySchema = new Schema<IVoterDiscrepancyDocument>(
  {
    assemblyConstituencyNumber: { type: Number, required: true, index: true },
    assemblyConstituency: { type: String, required: true, trim: true, index: true },
    assemblyConstituencyHi: { type: String, trim: true },
    partNumber: { type: Number, required: true, index: true },
    partNameHi: { type: String, trim: true },
    partNameEn: { type: String, trim: true },

    boothId: { type: Schema.Types.ObjectId, ref: 'Booth', index: true },

    voterSerialNumber: { type: Number, required: true },
    partSerialNumber: { type: Number },
    epicNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
    voterNameHi: { type: String, required: true, trim: true },
    voterNameEn: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 130 },
    genderHi: { type: String, enum: ['पुरुष', 'महिला', 'अन्य'] },
    gender: { type: String, enum: ['M', 'F', 'T'] },

    discrepancyReasonHi: { type: [String], default: [] },
    discrepancyReasonKey: {
      type: [String],
      enum: DISCREPANCY_REASONS.map((r) => r.key),
      default: [],
      index: true,
    },
    discrepancyReasonEn: { type: [String], default: [] },

    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    checked: { type: Boolean, default: false },
    note: { type: String, trim: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },

    sourcePdf: { type: String, trim: true },
    sourcePdfUrl: { type: String, trim: true },
    importedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    importBatchId: { type: String, index: true },
  },
  { timestamps: true },
);

// One discrepancy row per EPIC per AC+part.  Re-uploading the same PDF should
// upsert rather than duplicate.
VoterDiscrepancySchema.index(
  { assemblyConstituencyNumber: 1, partNumber: 1, epicNumber: 1 },
  { unique: true },
);
VoterDiscrepancySchema.index({ assemblyConstituency: 1, status: 1 });
VoterDiscrepancySchema.index({ boothId: 1, status: 1 });

export default mongoose.model<IVoterDiscrepancyDocument>(
  'VoterDiscrepancy',
  VoterDiscrepancySchema,
);
