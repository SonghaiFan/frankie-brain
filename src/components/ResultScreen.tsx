import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatTime } from './GameShell';
import { GameResult } from '../types';

interface ResultScreenProps {
  result: GameResult;
  average: number | null;
  best: number | null;
  onMenu: () => void;
  onReplay: () => void;
  isRecord: boolean;
  unit?: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ 
  result, 
  average, 
  best, 
  onMenu, 
  onReplay, 
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
      className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#f4f4f4] z-10"
    >
      {isRecord && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-12 right-12 bg-[#ea580c] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
        >
          Record
        </motion.div>
      )}

      <div className="text-center mb-12">
        <div className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-2">
          {isTime ? 'Time' : 'Score'}
        </div>
        <div className="text-6xl font-mono font-medium text-[#111] tracking-tighter">
          {scoreDisplay}
        </div>
        
        {average && diff !== null && (
          <div className="mt-4 text-xs flex items-center justify-center gap-2 text-[#666]">
            {isBetter ? (
              <>
                <TrendingUp className="w-3 h-3 text-[#111]" />
                <span className="font-medium">
                  {isTime ? formatTime(diff) : Math.round(diff)} {unit} {isTime ? 'faster' : 'more'}
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-[#666]" />
                <span className="font-medium">
                  {isTime ? formatTime(diff) : Math.round(diff)} {unit} {isTime ? 'slower' : 'less'}
                </span>
              </>
            )}
            <span className="text-[#999]">vs avg</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#e0e0e0] border border-[#e0e0e0] w-full mb-12 rounded-sm overflow-hidden">
        <div className="bg-[#f4f4f4] p-4 text-center">
          <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">
            {result.gameType === 'schulte' ? 'Grid' : 'Mode'}
          </div>
          <div className="font-medium text-lg text-[#111] capitalize">
            {result.gameType === 'schulte' ? `${result.gridSize}x${result.gridSize}` : 
             result.gameType === 'math' ? result.difficulty : 'Adaptive'}
          </div>
        </div>
        <div className="bg-[#f4f4f4] p-4 text-center">
          <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Errors</div>
          <div className={`font-medium text-lg ${result.mistakes > 0 ? 'text-[#ea580c]' : 'text-[#111]'}`}>
            {result.mistakes}
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full mt-auto">
        <button
          onClick={onMenu}
          className="flex-1 py-4 bg-[#e0e0e0] text-[#111] rounded-[4px] font-medium text-sm uppercase tracking-widest hover:bg-[#d0d0d0] transition-colors"
        >
          Menu
        </button>
        <button
          onClick={onReplay}
          className="flex-[2] py-4 bg-[#111] text-white rounded-[4px] font-medium text-sm uppercase tracking-widest hover:bg-[#333] transition-colors"
        >
          Again
        </button>
      </div>
    </motion.div>
  );
};
