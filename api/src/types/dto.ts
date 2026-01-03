import { Types } from 'mongoose';
import { IGame, ITransaction } from '../models/Game';
import { IGroup } from '../models/Group';
import { IUser } from '../models/User';

/**
 * Data Transfer Object types
 */

export interface GameDTO {
  id: string;
  name: string;
  date?: Date;
  createdByUserId: string;
  groupId: string;
  transactions: TransactionDTO[];
  publicToken: string;
  settled: boolean;
  createdAt: Date;
}

export interface TransactionDTO {
  id?: string;
  userId?: string;
  playerName?: string;
  amount: number;
  createdAt: Date;
}

export interface GroupDTO {
  id: string;
  name: string;
  description?: string;
  createdByUserId: string;
  memberIds: string[];
  isPublic: boolean;
  createdAt: Date;
}

export interface UserDTO {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
}

/**
 * Helper functions to convert models to DTOs
 */

export function gameToDTO(game: IGame): GameDTO {
  return {
    id: game._id.toString(),
    name: game.name,
    date: game.date,
    createdByUserId: game.createdByUserId.toString(),
    groupId: game.groupId.toString(),
    transactions: game.transactions.map(transactionToDTO),
    publicToken: game.publicToken,
    settled: game.settled,
    createdAt: game.createdAt,
  };
}

export function transactionToDTO(transaction: ITransaction & { _id?: Types.ObjectId }): TransactionDTO {
  return {
    id: transaction._id?.toString(),
    userId: transaction.userId?.toString(),
    playerName: transaction.playerName,
    amount: transaction.amount,
    createdAt: transaction.createdAt,
  };
}

export function groupToDTO(group: IGroup): GroupDTO {
  return {
    id: group._id.toString(),
    name: group.name,
    description: group.description,
    createdByUserId: group.createdByUserId.toString(),
    memberIds: group.memberIds.map(id => id.toString()),
    isPublic: group.isPublic,
    createdAt: group.createdAt,
  };
}

export function userToDTO(user: IUser): UserDTO {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}


