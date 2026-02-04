export enum View {
  LOBBY = 'GAME',
  SCORES = 'SCORES',
  HISTORY = 'HISTORY',
  WALLET = 'WALLET',
  PROFILE = 'PROFILE',
  ACTIVE_GAME = 'ACTIVE_GAME',
  ADMIN = 'ADMIN' // <--- This line was missing or not saved!
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

declare global {
  interface Window {
    Telegram?: any;
  }
}