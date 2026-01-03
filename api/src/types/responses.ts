import { Types } from 'mongoose';

/**
 * Response type definitions
 */

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  duplicates?: string[];
  currentSum?: number;
}

export interface GameResponse {
  _id: string;
  name: string;
  date?: Date;
  createdByUserId: Types.ObjectId | UserResponse;
  groupId: Types.ObjectId | { _id: string; name: string };
  transactions: TransactionResponse[];
  publicToken: string;
  settled: boolean;
  createdAt: Date;
}

export interface TransactionResponse {
  _id?: string;
  userId?: Types.ObjectId | UserResponse;
  playerName?: string;
  amount: number;
  createdAt: Date;
}

export interface GroupResponse {
  _id: string;
  name: string;
  description?: string;
  createdByUserId: Types.ObjectId | UserResponse;
  memberIds: Array<Types.ObjectId | UserResponse>;
  isPublic: boolean;
  createdAt: Date;
}

export interface UserSearchResponse {
  inGroup: Array<{
    _id: string;
    id: string;
    username: string;
    displayName: string;
  }>;
  notInGroup: Array<{
    _id: string;
    id: string;
    username: string;
    displayName: string;
  }>;
}

export interface StatsTotalsResponse {
  userId: string;
  username: string;
  displayName: string;
  total: number;
}

export interface GameHistoryResponse {
  game: {
    id: string;
    name: string;
    date?: Date;
    createdBy: UserResponse;
  };
  amount: number;
}

export interface TrendsResponse {
  dataPoints: Array<{
    date: string;
    [playerId: string]: string | number;
  }>;
  playerInfo: Record<string, {
    username: string;
    displayName: string;
  }>;
}


