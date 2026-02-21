import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Brain, Volume2, VolumeX } from 'lucide-react';

interface GameShellProps {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
}

export const GameShell: React.FC<GameShellProps> = ({ 
  title, 
  children, 
  onBack, 
  soundEnabled, 
  setSoundEnabled 
}) => (
  <div className="min-h-screen bg-[var(--color-bg-app)] text-ink font-sans flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-white">
    <div className="w-full max-w-md mx-auto relative flex flex-col h-[85vh] max-h-[800px]">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-4 h-12 px-2 shrink-0">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary-hover transition-colors text-ink">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8 h-8 bg-primary text-white rounded-[4px] flex items-center justify-center font-bold text-sm shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
          )}
          <h1 className="font-medium text-sm tracking-widest uppercase text-ink-light">{title}</h1>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setSoundEnabled(!soundEnabled)}
             className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${soundEnabled ? 'bg-secondary text-ink' : 'bg-secondary text-ink-lighter'}`}
             aria-label={soundEnabled ? "Mute" : "Unmute"}
           >
             {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
           </button>
        </div>
      </div>

      {/* Main Content Area - Device Look */}
      <div className="flex-1 relative w-full bg-surface rounded-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] border border-white ring-1 ring-black/5 overflow-hidden flex flex-col">
        {children}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center h-8 shrink-0">
        <p className="text-[10px] font-medium text-ink-lighter max-w-xs mx-auto uppercase tracking-widest">
          Klein Blue Edition
        </p>
      </div>

    </div>
  </div>
);

export const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
};
