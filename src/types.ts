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

export type MathOperation = '+' | '-' | '*' | '/';

export interface MathAttemptEvent {
  question: string;
  operation: MathOperation;
  expected: number;
  input: number | null;
  responseTime: number; // ms since the problem was shown
  isCorrect: boolean;
  at: number; // timestamp
}

export interface MathTrackingData {
  attempts: MathAttemptEvent[];
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
  mathTrackingData?: MathTrackingData;
}

export interface GameProps {
  playSound: (type: 'click' | 'success' | 'error' | 'win') => void;
  history: GameResult[];
  onComplete: (result: GameResult) => void;
}
