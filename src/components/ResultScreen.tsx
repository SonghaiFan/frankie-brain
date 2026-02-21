import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatTime } from './GameShell';
import { GameResult } from '../types';
import { Button } from './ui/Button';
import { Label, Mono, SubHeading } from './ui/Typography';

interface ResultScreenProps {
  result: GameResult;
  average: number | null;
  best: number | null;
  onMenu: () => void;
  onReplay: () => void;
  onShowReplay?: () => void;
  isRecord: boolean;
  unit?: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ 
  result, 
  average, 
  best, 
  onMenu, 
  onReplay, 
  onShowReplay,
  isRecord,
  unit = 's'
}) => {
  const isTime = unit === 's';
  const scoreDisplay = isTime ? formatTime(result.score) : result.score;
  
  // Calculate diff
  let diff = null;
  let isBetter = false;
  
  if (average) {
    if (isTime) {
      diff = Math.abs(average - result.score);
      isBetter = result.score < average;
    } else {
      diff = Math.abs(result.score - average);
      isBetter = result.score > average;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-surface z-10"
    >
      {isRecord && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-12 right-12 bg-[var(--color-error)] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
        >
          Record
        </motion.div>
      )}

      <div className="text-center mb-12">
        <Label className="mb-2 block">
          {isTime ? 'Time' : 'Score'}
        </Label>
        <div className="text-6xl font-mono font-medium text-ink tracking-tighter">
          {scoreDisplay}
        </div>
        
        {average && diff !== null && (
          <div className="mt-4 text-xs flex items-center justify-center gap-2 text-ink-light">
            {isBetter ? (
              <>
                <TrendingUp className="w-3 h-3 text-ink" />
                <span className="font-medium">
                  {isTime ? formatTime(diff) : Math.round(diff)} {unit} {isTime ? 'faster' : 'more'}
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-ink-light" />
                <span className="font-medium">
                  {isTime ? formatTime(diff) : Math.round(diff)} {unit} {isTime ? 'slower' : 'less'}
                </span>
              </>
            )}
            <span className="text-ink-lighter">vs avg</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-secondary border border-secondary w-full mb-12 rounded-sm overflow-hidden">
        <div className="bg-surface p-4 text-center">
          <Label className="mb-1 block">
            {result.gameType === 'schulte' ? 'Grid' : 'Mode'}
          </Label>
          <div className="font-medium text-lg text-ink capitalize">
            {result.gameType === 'schulte' ? `${result.gridSize}x${result.gridSize}` : 
             result.gameType === 'math' ? result.difficulty : 'Adaptive'}
          </div>
        </div>
        <div className="bg-surface p-4 text-center">
          <Label className="mb-1 block">Errors</Label>
          <div className={`font-medium text-lg ${result.mistakes > 0 ? 'text-[var(--color-error)]' : 'text-ink'}`}>
            {result.mistakes}
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full mt-auto">
        <Button
          onClick={onMenu}
          variant="secondary"
          fullWidth
        >
          Menu
        </Button>
        {onShowReplay && (
          <Button
            onClick={onShowReplay}
            variant="secondary"
            fullWidth
          >
            Replay
          </Button>
        )}
        <Button
          onClick={onReplay}
          variant="primary"
          fullWidth
          className="flex-[2]"
        >
          Again
        </Button>
      </div>
    </motion.div>
  );
};
