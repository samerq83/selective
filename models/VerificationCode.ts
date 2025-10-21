import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVerificationCode extends Document {
  phone: string;
  email?: string;
  companyName?: string;
  name?: string;
  address?: string;
  code: string;
  type: 'signup' | 'login';
  expiresAt: Date;
  createdAt: Date;
}

const VerificationCodeSchema: Schema<IVerificationCode> = new Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['signup', 'login'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete after expiration
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
VerificationCodeSchema.index({ phone: 1, type: 1 });
VerificationCodeSchema.index({ code: 1, type: 1 });

const VerificationCode: Model<IVerificationCode> = 
  mongoose.models.VerificationCode || 
  mongoose.model<IVerificationCode>('VerificationCode', VerificationCodeSchema);

export default VerificationCode;