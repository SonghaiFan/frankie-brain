import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import { SchulteTrackingData } from '../types';
import { Button } from './ui/Button';
import { Mono, SubHeading } from './ui/Typography';
import { formatTime } from './GameShell';

interface SchulteReplayProps {
  data: SchulteTrackingData;
  onClose: () => void;
}

export const SchulteReplay: React.FC<SchulteReplayProps> = ({ data, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(2); // Default 2x speed
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [activeNumber, setActiveNumber] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalDuration = data.clicks[data.clicks.length - 1]?.time || 0;
  const gridSize = Math.sqrt(data.grid.length);

  // Reset
  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveNumber(1);
    setCursorPos({ x: 50, y: 50 });
    if (data.mousePath.length > 0) {
      setCursorPos({ x: data.mousePath[0].x * 100, y: data.mousePath[0].y * 100 });
    }
  };

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp: number | null = null;

    const loop = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (isPlaying) {
        setCurrentTime(prev => {
          const nextTime = prev + delta * playbackSpeed;
          if (nextTime >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return nextTime;
        });
      }
      
      animationFrameId = requestAnimationFrame(loop);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Update Cursor Position
  useEffect(() => {
    if (!data.mousePath || data.mousePath.length === 0) return;

    // Find the segment
    // We can use binary search for better performance if needed, but linear is fine for < 1000 points
    let idx = 0;
    for (let i = 0; i < data.mousePath.length - 1; i++) {
      if (data.mousePath[i].t <= currentTime && data.mousePath[i+1].t >= currentTime) {
        idx = i;
        break;
      }
    }
    
    // If we are past the last point, use the last point
    if (currentTime >= data.mousePath[data.mousePath.length - 1].t) {
      const last = data.mousePath[data.mousePath.length - 1];
      setCursorPos({ x: last.x * 100, y: last.y * 100 });
      return;
    }

    const p1 = data.mousePath[idx];
    const p2 = data.mousePath[idx + 1];

    if (p1 && p2) {
      const segmentDuration = p2.t - p1.t;
      const progress = segmentDuration > 0 ? (currentTime - p1.t) / segmentDuration : 0;
      const x = p1.x + (p2.x - p1.x) * progress;
      const y = p1.y + (p2.y - p1.y) * progress;
      setCursorPos({ x: x * 100, y: y * 100 });
    }
  }, [currentTime, data.mousePath]);

  // Update Active Number (what should be highlighted/found)
  useEffect(() => {
    // Find the next number to be clicked
    // The active number is the one we are currently looking for.
    // So if we have clicked 1, 2, 3... and 3 was clicked at t=1000, and now t=1500, we are looking for 4.
    
    let lastFound = 0;
    for (const click of data.clicks) {
      if (click.time <= currentTime && !click.isError) {
        lastFound = Math.max(lastFound, click.number);
      }
    }
    setActiveNumber(lastFound + 1);
  }, [currentTime, data.clicks]);

  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex-1 h-full bg-surface flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-secondary flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-surface shadow-sm z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <SubHeading>Replay</SubHeading>
          <div className="flex gap-1 bg-secondary p-1 rounded-md">
            {[0.5, 1, 2, 4].map(speed => (
              <button 
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 sm:px-3 py-1 text-[10px] font-bold rounded transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                  playbackSpeed === speed 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-ink hover:bg-surface'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-secondary rounded-full transition-colors self-end sm:self-auto"
        >
          <X className="w-5 h-5 text-ink" />
        </button>
      </div>

      {/* Grid Area */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 bg-surface relative overflow-hidden">
        <div 
          ref={containerRef}
          className={`relative w-full max-w-md aspect-square grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary shadow-lg rounded-sm overflow-hidden`}
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {data.grid.map((num, idx) => {
            const isFound = num < activeNumber;
            const isTarget = num === activeNumber;
            
            return (
              <div
                key={idx}
                className={`
                  flex items-center justify-center font-medium transition-[transform,background-color,border-color,color,opacity] duration-[var(--motion-fast)] ease-[var(--ease-standard)]
                  ${isFound 
                    ? 'bg-secondary text-ink-lighter' 
                    : isTarget 
                      ? 'bg-surface text-ink font-bold' 
                      : 'bg-surface text-ink'
                  }
                  ${gridSize >= 8 ? 'text-sm sm:text-lg' : gridSize >= 6 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}
                `}
              >
                {num}
              </div>
            );
          })}
          
          {/* Cursor Overlay - Positioned relative to the grid container */}
          <div 
            className="absolute w-6 h-6 bg-primary/30 rounded-full border-2 border-primary pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 transition-transform duration-75 shadow-sm"
            style={{ 
              left: `${cursorPos.x}%`, 
              top: `${cursorPos.y}%` 
            }}
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 sm:p-6 border-t border-secondary bg-surface pb-6 sm:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
          <Mono className="text-sm font-medium tabular-nums">
            {formatTime(currentTime)} <span className="text-ink-lighter">/ {formatTime(totalDuration)}</span>
          </Mono>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }} 
              variant="secondary" 
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => setIsPlaying(!isPlaying)} 
              variant="primary" 
              size="sm" 
              className="flex-1 sm:w-32"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Play
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div 
          className="h-2 bg-secondary rounded-full cursor-pointer relative group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setCurrentTime(pct * totalDuration);
          }}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-standard)]"
            style={{ width: `${progressPct}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
    </div>
  );
};
