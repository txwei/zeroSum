import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

export interface ITransaction {
  userId?: Types.ObjectId; // Optional - if not set, use playerName
  playerName?: string; // Optional - if not set, use userId
  amount: number;
  createdAt: Date;
}

export interface IGame extends Document {
  name: string;
  date?: Date; // Optional for public games
  createdByUserId: Types.ObjectId;
  groupId: Types.ObjectId;
  transactions: ITransaction[];
  publicToken: string;
  settled: boolean; // Whether the game has been settled (read-only)
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional - use playerName if not set
    },
    playerName: {
      type: String,
      required: false, // Optional - use userId if not set
      trim: true,
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

// Validate that playerName is set (allow placeholder '_' for temporary transactions)
// userId is optional and kept for backward compatibility with legacy data
TransactionSchema.pre('validate', function (next) {
  const hasPlayerName = this.playerName && this.playerName.toString().trim() !== '';
  
  if (!hasPlayerName) {
    next(new Error('playerName must be provided'));
  } else {
    next();
  }
});

const GameSchema = new Schema<IGame>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: false, // Optional for public games
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
    settled: {
      type: Boolean,
      default: false,
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

// Generate unique public token before validation (so it's available for required check)
GameSchema.pre('validate', async function (next) {
  if (!this.publicToken) {
    // Generate a random token - collision probability is extremely low
    // If there's a duplicate, MongoDB unique index will catch it and we can retry at the application level
    this.publicToken = crypto.randomBytes(8).toString('base64url');
    console.log('Generated publicToken for game:', this.publicToken);
  }
  next();
});

export const Game = mongoose.model<IGame>('Game', GameSchema);

