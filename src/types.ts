export type GameType = 'schulte' | 'math';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface TrackingPoint {
  x: number; // percentage 0-1 relative to grid container
  y: number; // percentage 0-1 relative to grid container
  t: number; // timestamp relative to start
}

export interface ClickEvent {
  number: number;
  time: number; // relative to start
  cellIndex: number;
  isError?: boolean;
}

export interface SchulteTrackingData {
  grid: number[]; // The layout of numbers
  clicks: ClickEvent[];
  mousePath: TrackingPoint[];
}

export interface GameResult {
  id: string;
  gameType: GameType;
  score: number; // time (ms) for schulte, count for math
  mistakes: number;
  difficulty?: Difficulty; // for math
  gridSize?: number; // for schulte
  date: number;
  trackingData?: SchulteTrackingData; // Optional tracking data
}

export interface GameProps {
  playSound: (type: 'click' | 'error' | 'win') => void;
  history: GameResult[];
  onComplete: (result: GameResult) => void;
}
