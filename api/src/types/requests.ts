import { Types } from 'mongoose';

/**
 * Request type definitions
 */

export interface RegisterRequest {
  username: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateGameRequest {
  name: string;
  date?: string;
  groupId: string;
  transactions?: Array<{
    userId?: string;
    playerName?: string;
    amount: number;
  }>;
}

export interface UpdateGameNameRequest {
  name: string;
}

export interface UpdateGameDateRequest {
  date?: string;
}

export interface UpdateTransactionRequest {
  field: 'playerName' | 'amount';
  value: string | number;
}

export interface AddTransactionRequest {
  playerName?: string;
  amount?: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddMemberRequest {
  username: string;
}

export interface UpdateUserRequest {
  displayName: string;
}

export interface CreateTransactionsRequest {
  transactions: Array<{
    userId?: string;
    playerName?: string;
    amount: number;
  }>;
}

export interface UpdateTransactionAmountRequest {
  amount: number;
}

export interface GetStatsRequest {
  groupId?: string;
  timePeriod?: '30d' | '90d' | 'year' | 'all';
}

export interface GetTrendsRequest {
  groupId: string;
  playerIds: string[];
}

export interface QuickSignupRequest {
  username: string;
  displayName: string;
  password?: string;
}


