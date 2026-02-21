import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChartNoAxesColumn } from 'lucide-react';
import confetti from 'canvas-confetti';
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
  const [showInsights, setShowInsights] = useState(false);
  const [replayData, setReplayData] = useState<SchulteTrackingData | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [errorCell, setErrorCell] = useState<number | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const mousePathRef = useRef<TrackingPoint[]>([]);
  const clicksRef = useRef<ClickEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const filteredHistory = useMemo(
    () => history.filter(h => h.gridSize === gridSize),
    [history, gridSize]
  );

  // Stats
  const stats = useMemo(() => {
    if (!filteredHistory.length) return { best: null, average: null };
    
    const scores = filteredHistory.map(r => r.score);
    const best = Math.min(...scores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    return { best, average };
  }, [filteredHistory]);

  const historyForResult = useMemo(() => {
    if (!lastResult || lastResult.gameType !== 'schulte' || lastResult.gridSize !== gridSize) {
      return filteredHistory;
    }
    const exists = filteredHistory.some(item => item.id === lastResult.id);
    return exists ? filteredHistory : [lastResult, ...filteredHistory];
  }, [filteredHistory, lastResult, gridSize]);

  const resultHistoryData = useMemo(
    () =>
      historyForResult.slice(0, 20).reverse().map((r, i) => ({
        index: i,
        value: parseFloat((r.score / 1000).toFixed(2))
      })),
    [historyForResult]
  );

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
  const handlePointerMove = (e: React.PointerEvent) => {
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
        onMenu={() => {
          setShowInsights(false);
          setGameState('menu');
        }}
        onReplay={startGame}
        onShowReplay={lastResult.trackingData ? () => setReplayData(lastResult.trackingData!) : undefined}
        isRecord={!stats.best || lastResult.score < stats.best}
        unit="s"
        historyData={resultHistoryData}
        historyLabel={`History (${gridSize}x${gridSize})`}
      />
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-surface">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
           <SubHeading>{showInsights ? 'Insights' : 'Settings'}</SubHeading>
           <button 
             onClick={() => setShowInsights(v => !v)} 
             className={`p-2 hover:bg-secondary rounded-full transition-colors ${showInsights ? 'text-ink' : 'text-ink-light hover:text-ink'}`}
             title={showInsights ? 'Back to Settings' : 'Show Insights'}
           >
             <ChartNoAxesColumn className="w-5 h-5" />
           </button>
        </div>

        {showInsights ? (
          <div className="flex-1 space-y-6">
            <SchulteStats
              history={history}
              gridSize={gridSize}
              showTitle={false}
              className="p-0 sm:p-0"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-6 sm:space-y-8">
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
              <div className="bg-surface p-3 sm:p-4 text-left">
                <Label className="mb-1 block">Best</Label>
                <Mono className="text-base sm:text-lg font-medium">
                  {stats.best ? formatTime(stats.best) : '--'}
                </Mono>
              </div>
              <div className="bg-surface p-3 sm:p-4 text-left">
                <Label className="mb-1 block">Avg</Label>
                <Mono className="text-base sm:text-lg font-medium">
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
      <div className="p-3 sm:p-4 flex justify-center border-b border-secondary bg-surface">
        <Mono className="text-xl sm:text-2xl font-medium tabular-nums">
          {formatTime(currentTime)}
        </Mono>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 bg-surface relative overflow-hidden">
        
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
                className="text-7xl sm:text-9xl font-bold text-primary"
              >
                {countdownValue}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div 
          ref={containerRef}
          onPointerMove={handlePointerMove}
          className={`w-full aspect-square grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary transition-all duration-300
            ${gameState === 'countdown' ? 'blur-md opacity-40 scale-95' : 'blur-0 opacity-100 scale-100'}
          `}
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {numbers.map((num, index) => (
            <button
              key={num}
              onPointerDown={() => handleCellClick(num, index)}
              disabled={gameState === 'countdown'}
              className={`
                ${errorCell === num ? 'bg-[var(--color-error)] text-white' : 'bg-surface hover:bg-white text-ink active:bg-primary active:text-white'}
                font-medium flex items-center justify-center transition-colors touch-manipulation
                ${gridSize >= 8 ? 'text-sm sm:text-lg' : gridSize >= 6 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-3 sm:p-4 border-t border-secondary bg-surface flex justify-center items-center gap-2">
         <Label>Find</Label>
         <span className="text-lg sm:text-xl font-bold text-ink">{currentNumber}</span>
      </div>
    </div>
  );
}
