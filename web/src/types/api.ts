/**
 * API request and response type definitions
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Game {
  _id: string;
  name: string;
  date?: string;
  settled?: boolean;
  createdByUserId: {
    _id: string;
    username: string;
    displayName: string;
  };
  groupId: {
    _id: string;
    name: string;
  };
  transactions: Transaction[];
  publicToken?: string;
  createdAt?: string;
}

export interface Transaction {
  _id?: string;
  userId?: {
    _id: string;
    username: string;
    displayName: string;
  };
  playerName?: string;
  amount: number;
  createdAt?: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  createdByUserId: {
    _id: string;
    username: string;
    displayName: string;
  };
  memberIds: Array<{
    _id: string;
    username: string;
    displayName: string;
  }>;
  isPublic: boolean;
  createdAt?: string;
}

export interface UserSearchResult {
  inGroup: User[];
  notInGroup: User[];
}

export interface StatsTotal {
  userId: string;
  username: string;
  displayName: string;
  total: number;
}

export interface GameHistoryItem {
  game: {
    id: string;
    name: string;
    date?: string;
    createdBy: User;
  };
  amount: number;
}

export interface TrendsData {
  dataPoints: Array<{
    date: string;
    [playerId: string]: string | number;
  }>;
  playerInfo: Record<string, {
    username: string;
    displayName: string;
  }>;
}


