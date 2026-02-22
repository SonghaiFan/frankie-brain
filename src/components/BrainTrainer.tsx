import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Grid3X3 } from 'lucide-react';
import { GameShell } from './GameShell';
import { Difficulty, GameType, GameResult, MathOperation } from '../types';
import SchulteGame from './games/SchulteGame';
import MathGame from './games/MathGame';
import { Card } from './ui/Card';
import { Heading, Label, SubHeading, Text } from './ui/Typography';
import { sanitizeSchulteConfig } from '../utils/schulteConfig';

const HISTORY_STORAGE_KEY = 'brain-trainer-history';
const HISTORY_MAX_ENTRIES = 300;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'medium' || value === 'hard';

const isMathOperation = (value: unknown): value is MathOperation =>
  value === '+' || value === '-' || value === '*' || value === '/';

const sanitizeSchulteTrackingData = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const { grid, clicks, mousePath } = value;
  if (!Array.isArray(grid) || !grid.every(item => Number.isInteger(item) && item > 0)) return undefined;
  if (!Array.isArray(clicks) || !Array.isArray(mousePath)) return undefined;

  const sanitizedClicks = clicks
    .filter(isRecord)
    .map(click => ({
      number: click.number,
      time: click.time,
      cellIndex: click.cellIndex,
      isError: click.isError
    }))
    .filter(
      click =>
        isFiniteNumber(click.number) &&
        isFiniteNumber(click.time) &&
        isFiniteNumber(click.cellIndex) &&
        (click.isError === undefined || typeof click.isError === 'boolean')
    )
    .map(click => ({
      number: click.number,
      time: click.time,
      cellIndex: click.cellIndex,
      isError: click.isError
    }));

  const sanitizedMousePath = mousePath
    .filter(isRecord)
    .map(point => ({ x: point.x, y: point.y, t: point.t }))
    .filter(point => isFiniteNumber(point.x) && isFiniteNumber(point.y) && isFiniteNumber(point.t))
    .map(point => ({ x: point.x, y: point.y, t: point.t }));

  return {
    grid,
    clicks: sanitizedClicks,
    mousePath: sanitizedMousePath
  };
};

const sanitizeMathTrackingData = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.attempts)) return undefined;
  const attempts = value.attempts
    .filter(isRecord)
    .map(attempt => ({
      question: attempt.question,
      operation: attempt.operation,
      expected: attempt.expected,
      input: attempt.input,
      responseTime: attempt.responseTime,
      isCorrect: attempt.isCorrect,
      at: attempt.at
    }))
    .filter(
      attempt =>
        typeof attempt.question === 'string' &&
        isMathOperation(attempt.operation) &&
        isFiniteNumber(attempt.expected) &&
        (attempt.input === null || isFiniteNumber(attempt.input)) &&
        isFiniteNumber(attempt.responseTime) &&
        typeof attempt.isCorrect === 'boolean' &&
        isFiniteNumber(attempt.at)
    )
    .map(attempt => ({
      question: attempt.question,
      operation: attempt.operation,
      expected: attempt.expected,
      input: attempt.input,
      responseTime: attempt.responseTime,
      isCorrect: attempt.isCorrect,
      at: attempt.at
    }));

  return { attempts };
};

const sanitizeGameResult = (value: unknown): GameResult | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (value.gameType !== 'schulte' && value.gameType !== 'math') return null;
  if (!isFiniteNumber(value.score) || !isFiniteNumber(value.mistakes) || !isFiniteNumber(value.date)) {
    return null;
  }

  const base: GameResult = {
    id: value.id,
    gameType: value.gameType,
    score: value.score,
    mistakes: value.mistakes,
    date: value.date
  };

  if (value.gameType === 'schulte') {
    if (!isFiniteNumber(value.gridSize) || value.gridSize <= 0) return null;
    base.gridSize = value.gridSize;
    if (value.presetId !== undefined) {
      if (typeof value.presetId !== 'string') return null;
      base.presetId = value.presetId;
    }
    if (value.schulteConfig !== undefined) {
      const schulteConfig = sanitizeSchulteConfig(value.schulteConfig);
      if (!schulteConfig) return null;
      base.schulteConfig = schulteConfig;
    }
    const trackingData = sanitizeSchulteTrackingData(value.trackingData);
    if (trackingData) base.trackingData = trackingData;
  }

  if (value.gameType === 'math') {
    if (!isDifficulty(value.difficulty)) return null;
    base.difficulty = value.difficulty;
    const mathTrackingData = sanitizeMathTrackingData(value.mathTrackingData);
    if (mathTrackingData) base.mathTrackingData = mathTrackingData;
  }

  return base;
};

export default function BrainTrainer() {
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<GameResult[]>([]);
  const audioGraphRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        setHistory([]);
        return;
      }
      const sanitized = parsed
        .map(sanitizeGameResult)
        .filter((item): item is GameResult => item !== null)
        .slice(0, HISTORY_MAX_ENTRIES);
      setHistory(sanitized);
    } catch (e) {
      setHistory([]);
    }
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_MAX_ENTRIES)));
  }, [history]);

  const addResult = (result: GameResult) => {
    setHistory(prev => [result, ...prev].slice(0, HISTORY_MAX_ENTRIES));
  };

  const clearSchultePresetData = useCallback((presetId: string) => {
    setHistory(prev =>
      prev.filter(item => !(item.gameType === 'schulte' && item.presetId === presetId))
    );
  }, []);

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
                onClearSchultePresetData={clearSchultePresetData}
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
