import mongoose, { Schema, Document } from 'mongoose';

export interface IBoothDocument extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const BoothSchema = new Schema<IBoothDocument>(
  {
    name: { type: String, required: true, trim: true },
    partNumber: { type: Number, required: true, unique: true },
    zone: { type: String, required: true, trim: true },
    village: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    totalRegisteredVoters: { type: Number, required: true, min: 0 },
    facilities: {
      power: { type: Boolean, default: false },
      water: { type: Boolean, default: false },
      shade: { type: Boolean, default: false },
      accessibilityRamp: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

BoothSchema.index({ partNumber: 1 }, { unique: true });
BoothSchema.index({ zone: 1 });

export default mongoose.model<IBoothDocument>('Booth', BoothSchema);
