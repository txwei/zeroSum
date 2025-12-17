import { User } from '../../models/User';
import { Group } from '../../models/Group';
import { Game } from '../../models/Game';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface TestUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  displayName: string;
  passwordHash: string;
}

export interface TestGroup {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdByUserId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
}

export interface TestGame {
  _id: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  createdByUserId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  transactions: Array<{
    userId: mongoose.Types.ObjectId;
    amount: number;
  }>;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  username: string = 'testuser',
  displayName: string = 'Test User',
  password: string = 'password123'
): Promise<TestUser> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({
    username: username.toLowerCase(),
    displayName,
    passwordHash,
  });
  await user.save();
  return {
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
    passwordHash: user.passwordHash,
  };
}

/**
 * Create a test group in the database
 */
export async function createTestGroup(
  createdByUserId: mongoose.Types.ObjectId,
  name: string = 'Test Group',
  description?: string,
  memberIds?: mongoose.Types.ObjectId[]
): Promise<TestGroup> {
  const group = new Group({
    name,
    description,
    createdByUserId,
    memberIds: memberIds || [createdByUserId],
  });
  await group.save();
  return {
    _id: group._id,
    name: group.name,
    createdByUserId: group.createdByUserId,
    memberIds: group.memberIds,
  };
}

/**
 * Create a test game in the database
 */
export async function createTestGame(
  createdByUserId: mongoose.Types.ObjectId,
  groupId: mongoose.Types.ObjectId,
  name: string = 'Test Game',
  date: Date = new Date(),
  transactions: Array<{ userId: mongoose.Types.ObjectId; amount: number }> = []
): Promise<TestGame> {
  const game = new Game({
    name,
    date,
    createdByUserId,
    groupId,
    transactions,
  });
  await game.save();
  return {
    _id: game._id,
    name: game.name,
    date: game.date,
    createdByUserId: game.createdByUserId,
    groupId: game.groupId,
    transactions: game.transactions,
  };
}

/**
 * Create multiple test users
 */
export async function createTestUsers(count: number): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(
      `testuser${i}`,
      `Test User ${i}`,
      'password123'
    );
    users.push(user);
  }
  return users;
}

