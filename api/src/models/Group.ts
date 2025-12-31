import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  createdByUserId: Types.ObjectId;
  memberIds: Types.ObjectId[];
  isPublic: boolean;
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    memberIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      default: [],
    },
    isPublic: {
      type: Boolean,
      required: true,
      default: true,
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

// Ensure creator is in memberIds
GroupSchema.pre('save', function (next) {
  const creatorId = this.createdByUserId.toString();
  const isMember = this.memberIds.some(
    (memberId) => memberId.toString() === creatorId
  );
  if (!isMember) {
    this.memberIds.push(this.createdByUserId);
  }
  next();
});

export const Group = mongoose.model<IGroup>('Group', GroupSchema);

