import mongoose, { Schema, Document } from 'mongoose';

/**
 * Source of the booth record.  The platform ingests from several authoritative
 * sources; we tag every document so the UI can honestly show a freshness pill.
 *
 *  - `harvard_2019`      baseline seed from Jensenius et al. Harvard Dataverse
 *                        (Scientific Data 2025).  Covers 99.5% of 2019 UP ACs.
 *  - `ceo_up_2025`       draft list of polling stations from CEO Uttar Pradesh
 *                        (ceouttarpradesh.nic.in) — the current authoritative
 *                        2025 draft roll.  Programmatic access to rollpdf.aspx
 *                        is blocked by anti-bot; usable via headless browser.
 *  - `voterlist_2026`    ECI 2026 SIR Final-Roll polling-station list obtained
 *                        by scraping voterlist.co.in, which republishes the
 *                        ECI Final-Roll metadata (see data-path attr linking to
 *                        voters.eci.gov.in/eroll/2026/s24/sir-finalroll/...).
 *                        This is the freshest automated source we currently
 *                        have; ranks above ceo_up_2025 in SOURCE_PRIORITY.
 *  - `deo_pdf`           scraped from a specific District Electoral Officer's
 *                        page (e.g. deoria.nic.in).
 *  - `user_upload`       bulk-imported by a super_admin via the web UI.
 *  - `manual`            entered one-by-one through the Booths CRUD.
 */
export type BoothSource =
  | 'harvard_2019'
  | 'ceo_up_2025'
  | 'voterlist_2026'
  | 'deo_pdf'
  | 'user_upload'
  | 'manual';

export interface IBoothDocument extends Document {
  partNumber: number;
  name: string;
  nameHi?: string;                  // original Hindi name, when available
  assemblyConstituency: string;
  assemblyConstituencyNumber?: number;
  district: string;
  state: string;
  village?: string;
  villageHi?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  totalVoters: number;

  // Freshness & provenance
  source: BoothSource;
  sourceUrl?: string;               // URL of the PDF / API the record came from
  lastSyncedAt: Date;               // when this record was last refreshed
  sourceBatchId?: string;           // ties many booths back to one scrape run

  createdAt: Date;
  updatedAt: Date;
}

const BoothSchema = new Schema<IBoothDocument>(
  {
    partNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    nameHi: { type: String, trim: true },
    assemblyConstituency: { type: String, required: true, trim: true },
    assemblyConstituencyNumber: { type: Number },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, default: 'Uttar Pradesh' },
    village: { type: String, trim: true },
    villageHi: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    totalVoters: { type: Number, default: 0, min: 0 },

    source: {
      type: String,
      enum: [
        'harvard_2019',
        'ceo_up_2025',
        'voterlist_2026',
        'deo_pdf',
        'user_upload',
        'manual',
      ],
      default: 'manual',
      required: true,
    },
    sourceUrl: { type: String, trim: true },
    lastSyncedAt: { type: Date, default: Date.now, required: true },
    sourceBatchId: { type: String, index: true },
  },
  { timestamps: true }
);

BoothSchema.index({ partNumber: 1, assemblyConstituency: 1 }, { unique: true });
BoothSchema.index({ assemblyConstituency: 1 });
BoothSchema.index({ district: 1 });
BoothSchema.index({ source: 1, lastSyncedAt: -1 });

export default mongoose.model<IBoothDocument>('Booth', BoothSchema);
