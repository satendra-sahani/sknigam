import mongoose, { Schema, Document } from 'mongoose';

export interface IBoothDocument extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const BoothSchema = new Schema<IBoothDocument>(
  {
    partNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    assemblyConstituency: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true, default: 'Uttar Pradesh' },
    village: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    totalVoters: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

BoothSchema.index({ partNumber: 1, assemblyConstituency: 1 }, { unique: true });
BoothSchema.index({ assemblyConstituency: 1 });
BoothSchema.index({ district: 1 });

export default mongoose.model<IBoothDocument>('Booth', BoothSchema);
