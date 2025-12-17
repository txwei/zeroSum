import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        // Remove sensitive fields and transform _id to id
        const { passwordHash, _id, __v, ...userWithoutPassword } = ret as any;
        return {
          ...userWithoutPassword,
          id: _id,
        };
      },
    },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);

