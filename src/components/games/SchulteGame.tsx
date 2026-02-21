import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GameProps, GameResult, ClickEvent, TrackingPoint, SchulteTrackingData } from '../../types';
import { ResultScreen } from '../ResultScreen';
import { formatTime } from '../GameShell';
import { Button } from '../ui/Button';
import { Label, Mono, SubHeading } from '../ui/Typography';
import { SchulteReplay } from '../SchulteReplay';
import { SchulteStats } from '../SchulteStats';

export default function SchulteGame({ playSound, history, onComplete }: GameProps) {
  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'finished'>('menu');
  const [gridSize, setGridSize] = useState(5);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [replayData, setReplayData] = useState<SchulteTrackingData | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [errorCell, setErrorCell] = useState<number | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const mousePathRef = useRef<TrackingPoint[]>([]);
  const clicksRef = useRef<ClickEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setCountdownValue(3);
    setGameState('countdown');
    
    // Reset tracking
    mousePathRef.current = [];
    clicksRef.current = [];
  };

  // Mouse Tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !startTime || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const t = Date.now() - startTime;
    
    // Simple throttling: only add if time diff > 20ms or distance > 0.01
    const last = mousePathRef.current[mousePathRef.current.length - 1];
    if (!last || (t - last.t > 20)) {
      mousePathRef.current.push({ x, y, t });
    }
  };

  // Countdown Logic
  useEffect(() => {
    let timeout: number;
    if (gameState === 'countdown') {
      if (countdownValue > 0) {
        timeout = window.setTimeout(() => {
          setCountdownValue(v => v - 1);
        }, 1000);
      } else {
        // Start Game
        setStartTime(Date.now());
        setCurrentTime(0);
        setGameState('playing');
        playSound('click');
      }
    }
    return () => clearTimeout(timeout);
  }, [gameState, countdownValue, playSound]);

  // Game Timer
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

  const handleCellClick = (number: number, index: number) => {
    if (gameState !== 'playing') return;
    
    const time = Date.now() - startTime!;
    
    if (number === currentNumber) {
      playSound('click');
      
      // Record Click
      clicksRef.current.push({
        number,
        time,
        cellIndex: index,
        isError: false
      });

      if (currentNumber === gridSize * gridSize) {
        const finalTime = time;
        
        const trackingData: SchulteTrackingData = {
          grid: numbers,
          clicks: clicksRef.current,
          mousePath: mousePathRef.current
        };

        const result: GameResult = {
          id: crypto.randomUUID(),
          gameType: 'schulte',
          score: finalTime,
          mistakes,
          gridSize,
          date: Date.now(),
          trackingData
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
            colors: ['#002FA7', '#002380', '#e5e5e5']
          });
        }
      } else {
        setCurrentNumber(prev => prev + 1);
      }
    } else {
      playSound('error');
      setMistakes(prev => prev + 1);
      setErrorCell(number);
      setTimeout(() => setErrorCell(null), 300);
      
      // Record Error Click
      clicksRef.current.push({
        number,
        time,
        cellIndex: index,
        isError: true
      });
    }
  };

  if (replayData) {
    return <SchulteReplay data={replayData} onClose={() => setReplayData(null)} />;
  }

  if (gameState === 'finished' && lastResult) {
    return (
      <ResultScreen 
        result={lastResult} 
        average={stats.average} 
        best={stats.best}
        onMenu={() => setGameState('menu')}
        onReplay={startGame}
        onShowReplay={lastResult.trackingData ? () => setReplayData(lastResult.trackingData!) : undefined}
        isRecord={!stats.best || lastResult.score < stats.best}
        unit="s"
      />
    );
  }

  if (gameState === 'menu') {
    if (showStats) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-secondary flex justify-between items-center bg-surface">
            <SubHeading>Statistics</SubHeading>
            <button onClick={() => setShowStats(false)} className="p-2 hover:bg-secondary rounded-full">
              <History className="w-5 h-5 text-ink" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SchulteStats 
              history={history} 
              gridSize={gridSize} 
              onClose={() => setShowStats(false)} 
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-surface">
        <div className="flex justify-between items-center mb-6">
           <SubHeading>Settings</SubHeading>
           <div className="flex gap-2">
             <button 
               onClick={() => setShowStats(true)} 
               className="p-2 hover:bg-secondary rounded-full text-ink-light hover:text-ink transition-colors"
               title="Detailed Stats"
             >
               <LineChart className="w-5 h-5" />
             </button>
             <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-secondary rounded-full">
               <History className="w-5 h-5 text-ink-light" />
             </button>
           </div>
        </div>

        {showHistory ? (
          <div className="flex-1">
             <Label className="mb-4 block">History ({gridSize}x{gridSize})</Label>
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
                          activeDot={{ r: 4, fill: '#002FA7' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-px bg-secondary border border-secondary rounded-sm overflow-hidden">
                    {history.filter(h => h.gridSize === gridSize).slice(0, 10).map(r => (
                      <div key={r.id} className="flex justify-between p-3 bg-surface text-xs">
                        <span className="text-ink-lighter">{format(r.date, 'MM/dd HH:mm')}</span>
                        <Mono className="font-medium">{formatTime(r.score)}</Mono>
                      </div>
                    ))}
                 </div>
               </>
             ) : (
               <p className="text-center text-ink-lighter text-sm mt-8">No games played yet.</p>
             )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div>
              <Label className="mb-4 block text-center">
                Grid Size
              </Label>
              <div className="flex flex-wrap justify-center gap-2">
                {[3, 4, 5, 6, 7, 8, 9].map((size) => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`w-10 h-10 rounded-full font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                      gridSize === size ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-ink-light hover:bg-secondary-hover'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-secondary border border-secondary rounded-md overflow-hidden">
              <div className="bg-surface p-4 text-left">
                <Label className="mb-1 block">Best</Label>
                <Mono className="text-lg font-medium">
                  {stats.best ? formatTime(stats.best) : '--'}
                </Mono>
              </div>
              <div className="bg-surface p-4 text-left">
                <Label className="mb-1 block">Avg</Label>
                <Mono className="text-lg font-medium">
                  {stats.average ? formatTime(stats.average) : '--'}
                </Mono>
              </div>
            </div>

            <Button onClick={startGame} fullWidth size="lg">
              Start
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Playing State
  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative">
      <div className="p-4 flex justify-center border-b border-secondary bg-surface">
        <Mono className="text-2xl font-medium tabular-nums">
          {formatTime(currentTime)}
        </Mono>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 bg-surface relative overflow-hidden">
        
        {/* Countdown Overlay */}
        <AnimatePresence>
          {gameState === 'countdown' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <motion.div
                key={countdownValue}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-9xl font-bold text-primary"
              >
                {countdownValue}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className={`w-full aspect-square grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary transition-all duration-300
            ${gameState === 'countdown' ? 'blur-md opacity-40 scale-95' : 'blur-0 opacity-100 scale-100'}
          `}
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {numbers.map((num, index) => (
            <button
              key={num}
              onMouseDown={() => handleCellClick(num, index)}
              disabled={gameState === 'countdown'}
              className={`
                ${errorCell === num ? 'bg-[var(--color-error)] text-white' : 'bg-surface hover:bg-white text-ink active:bg-primary active:text-white'}
                font-medium flex items-center justify-center transition-colors
                ${gridSize >= 8 ? 'text-lg' : gridSize >= 6 ? 'text-xl' : 'text-2xl'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-secondary bg-surface flex justify-center items-center gap-2">
         <Label>Find</Label>
         <span className="text-xl font-bold text-ink">{currentNumber}</span>
      </div>
    </div>
  );
}
