import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Grid3X3 } from 'lucide-react';
import { GameShell } from './GameShell';
import { GameType, GameResult } from '../types';
import SchulteGame from './games/SchulteGame';
import MathGame from './games/MathGame';
import { Card, CardContent } from './ui/Card';
import { Heading, Label, SubHeading, Text } from './ui/Typography';

export default function BrainTrainer() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<GameResult[]>([]);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('brain-trainer-history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem('brain-trainer-history', JSON.stringify(history));
  }, [history]);

  const addResult = (result: GameResult) => {
    setHistory(prev => [result, ...prev]);
  };

  // Sounds
  const playSound = useCallback((type: 'click' | 'error' | 'win') => {
    if (!soundEnabled) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    if (type === 'click') {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start();
      osc.stop(now + 0.05);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(150, now);
      osc.type = 'square';
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start();
      osc.stop(now + 0.15);
    } else if (type === 'win') {
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start();
      osc.stop(now + 0.3);
    }
  }, [soundEnabled]);

  return (
    <GameShell 
      title={activeGame === 'schulte' ? 'Schulte Grid' : activeGame === 'math' ? 'Quick Math' : 'Brain Trainer'}
      onBack={activeGame ? () => setActiveGame(null) : undefined}
      soundEnabled={soundEnabled}
      setSoundEnabled={setSoundEnabled}
    >
      <AnimatePresence mode="wait">
        {!activeGame ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col p-4 sm:p-8 overflow-y-auto bg-surface"
          >
            <div className="mb-8 mt-2 sm:mb-12 sm:mt-6">
              <Heading className="mb-2 sm:mb-3">Select Module</Heading>
              <Label>Choose a training program</Label>
            </div>

            <div className="grid gap-4 sm:gap-6">
              <Card onClick={() => setActiveGame('schulte')} hoverable>
                <div className="p-5 sm:p-6">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <Grid3X3 className="w-6 h-6 text-ink" />
                    <Label>Focus</Label>
                  </div>
                  <SubHeading className="mb-2">Schulte Grid</SubHeading>
                  <Text>Train peripheral vision and attention span.</Text>
                </div>
              </Card>

              <Card onClick={() => setActiveGame('math')} hoverable>
                <div className="p-5 sm:p-6">
                  <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <Calculator className="w-6 h-6 text-ink" />
                    <Label>Logic</Label>
                  </div>
                  <SubHeading className="mb-2">Quick Math</SubHeading>
                  <Text>Speed calculation and mental arithmetic.</Text>
                </div>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col h-full overflow-hidden bg-surface"
          >
            {activeGame === 'schulte' ? (
              <SchulteGame 
                playSound={playSound} 
                history={history.filter(h => h.gameType === 'schulte')} 
                onComplete={addResult}
              />
            ) : (
              <MathGame 
                playSound={playSound} 
                history={history.filter(h => h.gameType === 'math')} 
                onComplete={addResult}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GameShell>
  );
}
