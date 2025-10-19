import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFavoriteOrder extends Document {
  customer: mongoose.Types.ObjectId;
  name: string;
  items: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteOrderSchema: Schema<IFavoriteOrder> = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
FavoriteOrderSchema.index({ customer: 1 });

const FavoriteOrder: Model<IFavoriteOrder> =
  mongoose.models.FavoriteOrder || mongoose.model<IFavoriteOrder>('FavoriteOrder', FavoriteOrderSchema);

export default FavoriteOrder;