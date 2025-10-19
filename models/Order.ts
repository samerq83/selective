import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName: {
    en: string;
    ar: string;
  };
  quantity: number;
}

export interface IOrderHistory {
  action: 'created' | 'updated' | 'received' | 'cancelled';
  by: mongoose.Types.ObjectId;
  byName: string;
  timestamp: Date;
  changes?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  items: IOrderItem[];
  totalItems: number;
  status: 'new' | 'received';
  message?: string;
  canEdit: boolean;
  editDeadline?: Date;
  history: IOrderHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema<IOrder> = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: {
          en: String,
          ar: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    totalItems: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['new', 'received'],
      default: 'new',
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    canEdit: {
      type: Boolean,
      default: true,
    },
    editDeadline: {
      type: Date,
    },
    history: [
      {
        action: {
          type: String,
          enum: ['created', 'updated', 'received', 'cancelled'],
          required: true,
        },
        by: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        byName: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        changes: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'items.product': 1 });

// Generate order number before saving
OrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await mongoose.model('Order').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    
    this.orderNumber = `ST${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;