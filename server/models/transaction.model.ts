import mongoose, { Document, Schema } from "mongoose";

export enum TransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
  SET = "SET",
  INITIAL = "INITIAL",
}

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  performedBy?: mongoose.Types.ObjectId | string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.Mixed,
      default: "system",
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Transaction = mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
