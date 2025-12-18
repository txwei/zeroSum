import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

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
  publicToken: string;
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
    publicToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
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

// Generate unique public token before saving
GameSchema.pre('save', async function (next) {
  if (!this.publicToken) {
    let token: string;
    let isUnique = false;
    
    // Generate token and ensure uniqueness
    while (!isUnique) {
      token = crypto.randomBytes(8).toString('base64url');
      const existingGame = await mongoose.model('Game').findOne({ publicToken: token });
      if (!existingGame) {
        isUnique = true;
        this.publicToken = token;
      }
    }
  }
  next();
});

export const Game = mongoose.model<IGame>('Game', GameSchema);

