import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName: {
    en: string;
    ar: string;
  };
  quantity: number;
  selectedUnitType?: 'carton' | 'piece';
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
  purchaseOrderFile?: {
    filename: string;
    path?: string; // 🔄 Optional for backward compatibility
    contentType?: string; // 📄 MIME type
    data?: string; // 📦 Base64 encoded file data
    uploadedAt?: Date;
  };
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
        selectedUnitType: {
          type: String,
          enum: ['carton', 'piece'],
          default: 'piece',
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
    purchaseOrderFile: {
      filename: String,
      path: String, // 🔄 Optional for backward compatibility
      contentType: String, // 📄 MIME type (e.g., application/pdf)
      data: String, // 📦 Base64 encoded file data
      uploadedAt: Date, // ⏰ Upload timestamp
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
// Note: orderNumber has unique: true which creates an index automatically
// Only add additional indexes for fields that need faster queries
OrderSchema.index({ customer: 1, createdAt: -1 });  // Common query: orders by customer sorted by date
OrderSchema.index({ status: 1, createdAt: -1 });    // Common query: filter by status and sort by date
OrderSchema.index({ 'items.product': 1 });

// ✅ Generate order number before saving (FALLBACK ONLY - should be set by API with atomic counter)
OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const dateKey = `${year}${month}${day}`;
      const counterId = `counter-${dateKey}`;
      
      // ✅ ATOMIC: Use OrderCounter for fallback generation
      const OrderCounter = mongoose.model('OrderCounter');
      const counter = await OrderCounter.findByIdAndUpdate(
        counterId,
        { $inc: { count: 1 } },
        { new: true, upsert: true }
      );
      
      this.orderNumber = `ST${dateKey}-${counter.count.toString().padStart(4, '0')}`;
      console.log('[Order Schema] ⚠️ Generated FALLBACK order number:', this.orderNumber);
    } catch (error) {
      console.error('[Order Schema] Failed to generate order number:', error);
      // If counter generation fails, use timestamp-based fallback
      this.orderNumber = `ST${new Date().getTime()}`;
    }
  }
  next();
});

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;