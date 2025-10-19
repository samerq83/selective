import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  notifications: {
    soundEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
  orders: {
    editTimeLimit: number;
    autoArchiveDays: number;
  };
  system: {
    maintenanceMode: boolean;
    backupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema<ISettings> = new Schema(
  {
    notifications: {
      soundEnabled: {
        type: Boolean,
        default: true,
      },
      emailEnabled: {
        type: Boolean,
        default: false,
      },
      smsEnabled: {
        type: Boolean,
        default: false,
      },
    },
    orders: {
      editTimeLimit: {
        type: Number,
        default: 2,
        min: 1,
        max: 24,
      },
      autoArchiveDays: {
        type: Number,
        default: 30,
        min: 7,
        max: 365,
      },
    },
    system: {
      maintenanceMode: {
        type: Boolean,
        default: false,
      },
      backupEnabled: {
        type: Boolean,
        default: true,
      },
      backupFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;