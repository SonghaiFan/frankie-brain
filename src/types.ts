export type GameType = 'schulte' | 'math';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameResult {
  id: string;
  gameType: GameType;
  score: number; // time (ms) for schulte, count for math
  mistakes: number;
  difficulty?: Difficulty; // for math
  gridSize?: number; // for schulte
  date: number;
}

export interface GameProps {
  playSound: (type: 'click' | 'error' | 'win') => void;
  history: GameResult[];
  onComplete: (result: GameResult) => void;
}
