import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderCounter extends Document {
  _id: string; // e.g., "counter-251103" (ST + YYMMDD)
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderCounterSchema: Schema<IOrderCounter> = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const OrderCounter: Model<IOrderCounter> =
  mongoose.models.OrderCounter || mongoose.model<IOrderCounter>('OrderCounter', OrderCounterSchema);

export default OrderCounter;