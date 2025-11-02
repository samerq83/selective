import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: {
    en: string;
    ar: string;
  };
  message: {
    en: string;
    ar: string;
  };
  type: 'order' | 'system' | 'info';
  relatedOrder?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      en: {
        type: String,
        required: true,
      },
      ar: {
        type: String,
        required: true,
      },
    },
    message: {
      en: {
        type: String,
        required: true,
      },
      ar: {
        type: String,
        required: true,
      },
    },
    type: {
      type: String,
      enum: ['order', 'system', 'info'],
      default: 'info',
    },
    relatedOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
// ✅ Optimized composite index for user + createdAt (most common query)
NotificationSchema.index({ user: 1, createdAt: -1 });
// Keep this index for filtering by read status
NotificationSchema.index({ user: 1, isRead: 1 });
// Compound index for unread notifications sorted by date
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;