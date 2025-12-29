
export enum View {
  LOBBY = 'GAME',
  SCORES = 'SCORES',
  HISTORY = 'HISTORY',
  WALLET = 'WALLET',
  PROFILE = 'PROFILE',
  ACTIVE_GAME = 'ACTIVE_GAME',
  ADMIN = 'ADMIN'
}

export interface Player {
  id: string;
  name: string;
  selectedNumber: number;
}

export interface Arena {
  id: string;
  stake: number;
  status: 'waiting' | 'running' | 'finished';
  players: Player[];
  startTime: number;
  pot: number;
}

export interface BingoSquare {
  number: number | 'FREE';
  isMarked: boolean;
}

/**
 * Global augmentation for Telegram WebApp SDK to fix window property errors.
 * This ensures that window.Telegram is recognized by the TypeScript compiler throughout the project.
 */
declare global {
  interface Window {
    Telegram?: any;
  }
}
