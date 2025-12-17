import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITransaction {
  userId: Types.ObjectId;
  amount: number;
  createdAt: Date;
}

export interface IGame extends Document {
  name: string;
  date: Date;
  createdByUserId: Types.ObjectId;
  groupId: Types.ObjectId;
  transactions: ITransaction[];
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const GameSchema = new Schema<IGame>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    transactions: {
      type: [TransactionSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

export const Game = mongoose.model<IGame>('Game', GameSchema);

