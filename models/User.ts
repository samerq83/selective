import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  companyName?: string;
  name?: string;
  address?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
UserSchema.index({ phone: 1 });
UserSchema.index({ isAdmin: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;