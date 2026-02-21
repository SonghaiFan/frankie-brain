import React, { useState, useEffect, useRef, useMemo } from 'react';
import { History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GameProps, GameResult } from '../../types';
import { ResultScreen } from '../ResultScreen';
import { formatTime } from '../GameShell';

export default function SchulteGame({ playSound, history, onComplete }: GameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [gridSize, setGridSize] = useState(5);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Stats
  const stats = useMemo(() => {
    const relevant = history.filter(h => h.gridSize === gridSize);
    if (!relevant.length) return { best: null, average: null, data: [] };
    
    const scores = relevant.map(r => r.score);
    const best = Math.min(...scores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const data = relevant.slice(0, 20).reverse().map((r, i) => ({
      index: i,
      value: parseFloat((r.score / 1000).toFixed(2)),
      date: r.date
    }));

    return { best, average, data };
  }, [history, gridSize]);

  const generateGrid = (size: number) => {
    const count = size * size;
    const nums = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums;
  };

  const startGame = () => {
    setNumbers(generateGrid(gridSize));
    setCurrentNumber(1);
    setMistakes(0);
    setStartTime(Date.now());
    setCurrentTime(0);
    setGameState('playing');
    playSound('click');
  };

  useEffect(() => {
    if (gameState === 'playing' && startTime) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, startTime]);

  const handleCellClick = (number: number) => {
    if (gameState !== 'playing') return;
    if (number === currentNumber) {
      playSound('click');
      if (currentNumber === gridSize * gridSize) {
        const finalTime = Date.now() - startTime!;
        const result: GameResult = {
          id: crypto.randomUUID(),
          gameType: 'schulte',
          score: finalTime,
          mistakes,
          gridSize,
          date: Date.now()
        };
        onComplete(result);
        setLastResult(result);
        setGameState('finished');
        playSound('win');
        
        if (!stats.best || finalTime < stats.best) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#333', '#ea580c', '#e5e5e5']
          });
        }
      } else {
        setCurrentNumber(prev => prev + 1);
      }
    } else {
      playSound('error');
      setMistakes(prev => prev + 1);
    }
  };

  if (gameState === 'finished' && lastResult) {
    return (
      <ResultScreen 
        result={lastResult} 
        average={stats.average} 
        best={stats.best}
        onMenu={() => setGameState('menu')}
        onReplay={startGame}
        isRecord={!stats.best || lastResult.score < stats.best}
        unit="s"
      />
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-semibold text-[#111]">Settings</h2>
           <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-[#e0e0e0] rounded-full">
             <History className="w-5 h-5 text-[#666]" />
           </button>
        </div>

        {showHistory ? (
          <div className="flex-1">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#888] mb-4">History ({gridSize}x{gridSize})</h3>
             {stats.data.length > 0 ? (
               <>
                 <div className="h-40 w-full mb-6 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis dataKey="index" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip 
                          contentStyle={{ borderRadius: '4px', border: '1px solid #e0e0e0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '12px', fontFamily: 'monospace' }}
                          labelStyle={{ display: 'none' }}
                          formatter={(value: number) => [`${value}s`, 'Time']}
                        />
                        <Line 
                          type="step" 
                          dataKey="value" 
                          stroke="#111" 
                          strokeWidth={1.5} 
                          dot={{ r: 2, fill: '#111' }} 
                          activeDot={{ r: 4, fill: '#ea580c' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-px bg-[#e0e0e0] border border-[#e0e0e0] rounded-sm overflow-hidden">
                    {history.filter(h => h.gridSize === gridSize).slice(0, 10).map(r => (
                      <div key={r.id} className="flex justify-between p-3 bg-[#f4f4f4] text-xs">
                        <span className="text-[#888]">{format(r.date, 'MM/dd HH:mm')}</span>
                        <span className="font-mono font-medium">{formatTime(r.score)}</span>
                      </div>
                    ))}
                 </div>
               </>
             ) : (
               <p className="text-center text-[#888] text-sm mt-8">No games played yet.</p>
             )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-4 block text-center">
                Grid Size
              </label>
              <div className="flex flex-wrap justify-center gap-2">
                {[3, 4, 5, 6, 7, 8, 9].map((size) => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`w-10 h-10 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                      gridSize === size ? 'bg-[#111] text-white' : 'bg-[#e0e0e0] text-[#666]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[#e0e0e0] border border-[#e0e0e0] rounded-md overflow-hidden">
              <div className="bg-[#f4f4f4] p-4 text-left">
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Best</div>
                <div className="font-mono font-medium text-lg text-[#111]">
                  {stats.best ? formatTime(stats.best) : '--'}
                </div>
              </div>
              <div className="bg-[#f4f4f4] p-4 text-left">
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Avg</div>
                <div className="font-mono font-medium text-lg text-[#111]">
                  {stats.average ? formatTime(stats.average) : '--'}
                </div>
              </div>
            </div>

            <button onClick={startGame} className="w-full py-4 bg-[#ea580c] text-white rounded-[4px] font-medium text-sm uppercase tracking-widest shadow-sm active:translate-y-px">
              Start
            </button>
          </div>
        )}
      </div>
    );
  }

  // Playing State
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 flex justify-center border-b border-[#e0e0e0] bg-[#f4f4f4]">
        <div className="font-mono text-2xl font-medium text-[#111] tabular-nums">
          {formatTime(currentTime)}
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 bg-[#f4f4f4]">
        <div 
          className={`w-full aspect-square grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-[#e0e0e0] border border-[#e0e0e0]`}
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {numbers.map((num) => (
            <button
              key={num}
              onMouseDown={() => handleCellClick(num)}
              className={`bg-[#fcfcfc] hover:bg-[#fff] text-[#111] font-medium flex items-center justify-center active:bg-[#111] active:text-white transition-colors
                ${gridSize >= 8 ? 'text-lg' : gridSize >= 6 ? 'text-xl' : 'text-2xl'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-[#e0e0e0] bg-[#f4f4f4] flex justify-center items-center gap-2">
         <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Find</span>
         <span className="text-xl font-bold text-[#111]">{currentNumber}</span>
      </div>
    </div>
  );
}
