import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Grid3X3 } from 'lucide-react';
import { GameShell } from './GameShell';
import { GameType, GameResult } from '../types';
import SchulteGame from './games/SchulteGame';
import MathGame from './games/MathGame';
import { Card } from './ui/Card';
import { Heading, Label, SubHeading, Text } from './ui/Typography';

export default function BrainTrainer() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<GameResult[]>([]);
  const audioGraphRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);

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

  const getAudioGraph = useCallback(() => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!audioGraphRef.current) {
      const ctx = new AudioContextCtor();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.9, ctx.currentTime);
      master.connect(ctx.destination);
      audioGraphRef.current = { ctx, master };
    }

    if (audioGraphRef.current.ctx.state === 'suspended') {
      void audioGraphRef.current.ctx.resume();
    }

    return audioGraphRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (audioGraphRef.current) {
        void audioGraphRef.current.ctx.close();
        audioGraphRef.current = null;
      }
    };
  }, []);

  // Sounds
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'win') => {
    if (!soundEnabled) return;
    const graph = getAudioGraph();
    if (!graph) return;
    const { ctx, master } = graph;
    const now = ctx.currentTime;

    const triggerTone = (
      frequency: number,
      wave: OscillatorType,
      start: number,
      duration: number,
      volume: number,
      targetFrequency?: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(frequency, start);
      if (targetFrequency) {
        osc.frequency.exponentialRampToValueAtTime(targetFrequency, start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration);
    };

    if (type === 'success') {
      const frequencies = [740, 1046, 1480];
      const waveforms: OscillatorType[] = ['triangle', 'sine', 'triangle'];
      frequencies.forEach((freq, i) => {
        triggerTone(freq, waveforms[i], now + i * 0.022, 0.12, 0.06);
      });
      triggerTone(220, 'sine', now, 0.08, 0.02, 260);
      return;
    }

    if (type === 'click') {
      triggerTone(800, 'sine', now, 0.05, 0.05, 420);
    } else if (type === 'error') {
      triggerTone(180, 'square', now, 0.14, 0.05, 120);
    } else if (type === 'win') {
      triggerTone(400, 'triangle', now, 0.18, 0.05, 620);
      triggerTone(620, 'sine', now + 0.08, 0.2, 0.04, 880);
    }
  }, [getAudioGraph, soundEnabled]);

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
