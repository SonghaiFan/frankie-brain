import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpDown, ChartNoAxesColumn, ChevronDown, ChevronUp, Crosshair, Grid3X3, Hash, RotateCcw, Settings, Shuffle, Type, Box } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  GameProps,
  GameResult,
  ClickEvent,
  TrackingPoint,
  SchulteConfig,
  SchulteTrackingData,
  SchultePreset,
  SchulteRoundEvent,
  SchulteSymbolOrder,
  SchulteTableStyle,
  SchulteTableType,
  SchulteTrainingMode
} from '../../types';
import { ResultScreen } from '../ResultScreen';
import { formatTime } from '../GameShell';
import { Button } from '../ui/Button';
import { Label, Mono, SubHeading } from '../ui/Typography';
import { SchulteReplay } from '../SchulteReplay';
import { SchulteStats } from '../SchulteStats';
import {
  getResultSchulteConfig,
  getResultSchulteConfigKey,
  getSchulteConfigKey,
  sanitizeSchulteConfig
} from '../../utils/schulteConfig';

const SCHULTE_ROUND_EVENTS_KEY = 'brain-trainer-schulte-round-events';
const SCHULTE_ROUND_EVENTS_MAX = 600;
const SCHULTE_PRESETS_KEY = 'brain-trainer-schulte-presets';
const SCHULTE_PRESETS_MAX = 30;
const SCHULTE_TABLE_SIZES = [3, 4, 5, 6, 7, 8, 9] as const;
const BUILTIN_PRESETS: SchultePreset[] = [
  {
    id: 'builtin-classic-5x5',
    name: 'Classic 5x5 Digits',
    createdAt: 0,
    config: {
      tableSize: 5,
      tableType: 'digits',
      tableStyle: 'classic',
      symbolOrder: 'direct',
      shuffleOnClick: false,
      showCenterDot: true,
      trainingMode: 'classic'
    }
  },
  {
    id: 'builtin-direct-6x6',
    name: 'Direct 6x6 Digits',
    createdAt: 0,
    config: {
      tableSize: 6,
      tableType: 'digits',
      tableStyle: 'classic',
      symbolOrder: 'direct',
      shuffleOnClick: false,
      showCenterDot: true,
      trainingMode: 'classic'
    }
  },
  {
    id: 'builtin-gorbov-5x5',
    name: 'Gorbov Alternating 5x5',
    createdAt: 0,
    config: {
      tableSize: 5,
      tableType: 'gorbov-schulte',
      tableStyle: 'classic',
      symbolOrder: 'direct',
      shuffleOnClick: false,
      showCenterDot: true,
      trainingMode: 'classic'
    }
  }
];

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isSchulteRoundEvent = (value: unknown): value is SchulteRoundEvent => {
  if (!isObjectRecord(value)) return false;
  const gridSize = value.gridSize;
  return (
    typeof value.id === 'string' &&
    isFiniteNumber(value.date) &&
    isFiniteNumber(gridSize) &&
    Number.isInteger(gridSize) &&
    gridSize > 0 &&
    (value.trainingMode === 'classic' || value.trainingMode === 'targeted') &&
    (value.status === 'completed' || value.status === 'abandoned') &&
    (value.reason === 'finished' || value.reason === 'reset' || value.reason === 'exit') &&
    isFiniteNumber(value.progress) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.durationMs) &&
    isFiniteNumber(value.mistakes) &&
    (value.configKey === undefined || typeof value.configKey === 'string') &&
    (value.presetId === undefined || typeof value.presetId === 'string')
  );
};

const isSchultePreset = (value: unknown): value is SchultePreset => {
  if (!isObjectRecord(value)) return false;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || !isFiniteNumber(value.createdAt)) return false;
  const config = sanitizeSchulteConfig(value.config);
  return config !== null && config.tableSize <= 9;
};

const appendRoundEventToStorage = (event: SchulteRoundEvent) => {
  try {
    const raw = localStorage.getItem(SCHULTE_ROUND_EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const existing = Array.isArray(parsed) ? parsed.filter(isSchulteRoundEvent) : [];
    const next = [event, ...existing].slice(0, SCHULTE_ROUND_EVENTS_MAX);
    localStorage.setItem(SCHULTE_ROUND_EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Swallow persistence errors to avoid interrupting gameplay.
  }
};

type GorbovTone = 'black' | 'red';

interface GorbovSymbol {
  id: number;
  value: number;
  tone: GorbovTone;
}

const shuffleNumbers = (values: number[]) => {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const buildSymbolOrder = (count: number, order: SchulteSymbolOrder) => {
  const base = Array.from({ length: count }, (_, i) => i + 1);
  if (order === 'reverse') return [...base].reverse();
  if (order === 'random') return shuffleNumbers(base);
  return base;
};

const numberToLetters = (value: number) => {
  let n = value;
  let label = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};

const buildGorbovConfig = (count: number, order: SchulteSymbolOrder) => {
  const blackCount = Math.ceil(count / 2);
  const redCount = Math.floor(count / 2);
  const symbols: GorbovSymbol[] = [];
  const blackIdByValue: Record<number, number> = {};
  const redIdByValue: Record<number, number> = {};
  let nextId = 1;

  for (let value = 1; value <= blackCount; value++) {
    const id = nextId++;
    symbols.push({ id, value, tone: 'black' });
    blackIdByValue[value] = id;
  }

  for (let value = 1; value <= redCount; value++) {
    const id = nextId++;
    symbols.push({ id, value, tone: 'red' });
    redIdByValue[value] = id;
  }

  const pairedValues = Array.from({ length: redCount }, (_, i) => i + 1);
  const orderedPairs =
    order === 'reverse'
      ? [...pairedValues].reverse()
      : order === 'random'
        ? shuffleNumbers(pairedValues)
        : pairedValues;

  const targetOrder: number[] = [];
  orderedPairs.forEach(value => {
    targetOrder.push(blackIdByValue[value]);
    targetOrder.push(redIdByValue[value]);
  });

  if (blackCount > redCount) {
    targetOrder.push(blackIdByValue[blackCount]);
  }

  return {
    gridIds: shuffleNumbers(symbols.map(symbol => symbol.id)),
    targetOrder,
    symbols
  };
};

export default function SchulteGame({ playSound, history, onComplete, onClearSchultePresetData }: GameProps) {
  const [gameState, setGameState] = useState<'menu' | 'countdown' | 'playing' | 'finished'>('menu');
  const [gridSize, setGridSize] = useState(5);
  const [trainingMode, setTrainingMode] = useState<SchulteTrainingMode>('classic');
  const [tableType, setTableType] = useState<SchulteTableType>('digits');
  const [tableStyle, setTableStyle] = useState<SchulteTableStyle>('classic');
  const [symbolOrder, setSymbolOrder] = useState<SchulteSymbolOrder>('direct');
  const [shuffleOnClick, setShuffleOnClick] = useState(false);
  const [showCenterDot, setShowCenterDot] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [targetOrder, setTargetOrder] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [gorbovSymbols, setGorbovSymbols] = useState<GorbovSymbol[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [replayData, setReplayData] = useState<SchulteTrackingData | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [errorCell, setErrorCell] = useState<number | null>(null);
  const [customPresets, setCustomPresets] = useState<SchultePreset[]>(() => {
    try {
      const raw = localStorage.getItem(SCHULTE_PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isSchultePreset).slice(0, SCHULTE_PRESETS_MAX);
    } catch {
      return [];
    }
  });
  const [roundEvents, setRoundEvents] = useState<SchulteRoundEvent[]>(() => {
    try {
      const raw = localStorage.getItem(SCHULTE_ROUND_EVENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isSchulteRoundEvent).slice(0, SCHULTE_ROUND_EVENTS_MAX);
    } catch {
      return [];
    }
  });
  
  const timerRef = useRef<number | null>(null);
  const mousePathRef = useRef<TrackingPoint[]>([]);
  const clicksRef = useRef<ClickEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRoundRef = useRef({
    gameState: 'menu' as 'menu' | 'countdown' | 'playing' | 'finished',
    gridSize: 5,
    trainingMode: 'classic' as SchulteTrainingMode,
    currentStep: 0,
    startTime: null as number | null,
    mistakes: 0,
    configKey: '',
    presetId: ''
  });

  useEffect(() => {
    localStorage.setItem(
      SCHULTE_ROUND_EVENTS_KEY,
      JSON.stringify(roundEvents.slice(0, SCHULTE_ROUND_EVENTS_MAX))
    );
  }, [roundEvents]);

  useEffect(() => {
    localStorage.setItem(
      SCHULTE_PRESETS_KEY,
      JSON.stringify(customPresets.slice(0, SCHULTE_PRESETS_MAX))
    );
  }, [customPresets]);

  const addRoundEvent = (payload: Omit<SchulteRoundEvent, 'id' | 'date'>) => {
    const event: SchulteRoundEvent = {
      id: crypto.randomUUID(),
      date: Date.now(),
      ...payload
    };
    setRoundEvents(prev => [event, ...prev].slice(0, SCHULTE_ROUND_EVENTS_MAX));
  };

  const sortedCustomPresets = useMemo(
    () => [...customPresets].sort((a, b) => b.createdAt - a.createdAt),
    [customPresets]
  );
  const allPresets = useMemo(() => [...BUILTIN_PRESETS, ...sortedCustomPresets], [sortedCustomPresets]);

  const currentConfig = useMemo<SchulteConfig>(
    () => ({
      tableSize: gridSize,
      tableType,
      tableStyle,
      symbolOrder,
      shuffleOnClick,
      showCenterDot,
      trainingMode
    }),
    [gridSize, showCenterDot, shuffleOnClick, symbolOrder, tableStyle, tableType, trainingMode]
  );
  const currentConfigKey = useMemo(() => getSchulteConfigKey(currentConfig), [currentConfig]);
  const activePreset = useMemo(() => {
    const customMatch = sortedCustomPresets.find(preset => getSchulteConfigKey(preset.config) === currentConfigKey);
    if (customMatch) return customMatch;
    return BUILTIN_PRESETS.find(preset => getSchulteConfigKey(preset.config) === currentConfigKey) ?? null;
  }, [currentConfigKey, sortedCustomPresets]);
  const activeCustomPreset = useMemo(
    () => (activePreset && !activePreset.id.startsWith('builtin-') ? activePreset : null),
    [activePreset]
  );

  const applyConfig = (config: SchulteConfig) => {
    setGridSize(Math.min(config.tableSize, 9));
    setTableType(config.tableType);
    setTableStyle(config.tableStyle);
    setSymbolOrder(config.symbolOrder);
    setShuffleOnClick(config.shuffleOnClick);
    setShowCenterDot(config.showCenterDot);
    setTrainingMode(config.trainingMode);
  };

  useEffect(() => {
    if (tableType !== 'gorbov-schulte') return;
    if (symbolOrder !== 'direct') setSymbolOrder('direct');
    if (shuffleOnClick) setShuffleOnClick(false);
  }, [tableType, symbolOrder, shuffleOnClick]);

  const saveCurrentPreset = () => {
    const initialName = activePreset?.id.startsWith('builtin-') ? '' : (activePreset?.name ?? '');
    const rawName = window.prompt('Mode name', initialName);
    if (!rawName) return;
    const name = rawName.trim();
    if (!name) return;

    const now = Date.now();
    setCustomPresets(prev => {
      const existingIndex = prev.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          name,
          createdAt: now,
          config: currentConfig
        };
        return next.slice(0, SCHULTE_PRESETS_MAX);
      }
      const preset: SchultePreset = {
        id: crypto.randomUUID(),
        name,
        config: currentConfig,
        createdAt: now
      };
      return [preset, ...prev].slice(0, SCHULTE_PRESETS_MAX);
    });
  };
  const applyPreset = (preset: SchultePreset) => {
    applyConfig(preset.config);
    setShowAdvancedSettings(false);
  };
  const deleteCustomPreset = (preset: SchultePreset) => {
    const confirmed = window.confirm(
      `Delete "${preset.name}"?\n\nThis will remove the custom mode and clear all its recorded data.`
    );
    if (!confirmed) return;

    const wasActive = activePreset?.id === preset.id;
    setCustomPresets(prev => prev.filter(item => item.id !== preset.id));
    setRoundEvents(prev => prev.filter(item => item.presetId !== preset.id));
    onClearSchultePresetData?.(preset.id);

    if (wasActive) {
      applyPreset(BUILTIN_PRESETS[0]);
    }
  };

  const baseGridHistory = useMemo(
    () =>
      history.filter(h => {
        if (h.gameType !== 'schulte') return false;
        if (h.gridSize !== gridSize) return false;
        return getResultSchulteConfigKey(h) === currentConfigKey;
      }),
    [currentConfigKey, gridSize, history]
  );
  const totalSymbols = gridSize * gridSize;
  const currentTarget = targetOrder[currentStep] ?? null;
  const gorbovSymbolById = useMemo(
    () => new Map(gorbovSymbols.map(item => [item.id, item])),
    [gorbovSymbols]
  );

  const getSymbolLabel = (id: number) => {
    if (tableType === 'gorbov-schulte') {
      return String(gorbovSymbolById.get(id)?.value ?? id);
    }
    if (tableType === 'letters') return numberToLetters(id);
    return String(id);
  };
  const getPresetBadge = (preset: SchultePreset) => {
    const typeToken =
      preset.config.tableType === 'gorbov-schulte'
        ? 'G'
        : preset.config.tableType === 'letters'
          ? 'L'
          : 'D';
    return `${typeToken}${preset.config.tableSize}`;
  };
  const tableTypeLabel =
    tableType === 'gorbov-schulte'
      ? 'Gorbov'
      : tableType === 'letters'
        ? 'Letters'
        : 'Digits';
  const symbolOrderLabel =
    symbolOrder === 'reverse' ? 'Reverse' : symbolOrder === 'random' ? 'Random' : 'Direct';
  const trainingLabel = trainingMode === 'targeted' ? 'Targeted' : 'Classic';

  useEffect(() => {
    activeRoundRef.current = {
      gameState,
      gridSize,
      trainingMode,
      currentStep,
      startTime,
      mistakes,
      configKey: currentConfigKey,
      presetId: activePreset?.id ?? ''
    };
  }, [activePreset?.id, currentConfigKey, currentStep, gameState, gridSize, mistakes, startTime, trainingMode]);

  useEffect(() => {
    return () => {
      const snapshot = activeRoundRef.current;
      if (snapshot.gameState !== 'playing' && snapshot.gameState !== 'countdown') return;
      const total = snapshot.gridSize * snapshot.gridSize;
      const event: SchulteRoundEvent = {
        id: crypto.randomUUID(),
        date: Date.now(),
        gridSize: snapshot.gridSize,
        trainingMode: snapshot.trainingMode,
        status: 'abandoned',
        reason: 'exit',
        progress: Math.max(0, snapshot.currentStep),
        total,
        durationMs: snapshot.startTime ? Math.max(0, Date.now() - snapshot.startTime) : 0,
        mistakes: snapshot.mistakes,
        configKey: snapshot.configKey || undefined,
        presetId: snapshot.presetId || undefined
      };
      appendRoundEventToStorage(event);
    };
  }, []);

  const mergedHistory = useMemo(() => {
    if (!lastResult || lastResult.gameType !== 'schulte' || lastResult.gridSize !== gridSize) {
      return baseGridHistory;
    }
    if (getResultSchulteConfigKey(lastResult) !== currentConfigKey) {
      return baseGridHistory;
    }
    const exists = baseGridHistory.some(item => item.id === lastResult.id);
    return exists ? baseGridHistory : [lastResult, ...baseGridHistory];
  }, [baseGridHistory, currentConfigKey, gridSize, lastResult]);

  const weaknessHistory = useMemo(() => {
    const matches = (item: GameResult) => {
      if (item.gameType !== 'schulte' || item.gridSize !== gridSize) return false;
      const config = getResultSchulteConfig(item);
      if (!config) return false;
      return (
        config.tableSize === gridSize &&
        config.tableType === tableType &&
        config.symbolOrder === symbolOrder &&
        config.shuffleOnClick === shuffleOnClick
      );
    };

    const base = history.filter(matches);
    if (!lastResult || !matches(lastResult)) return base;
    const exists = base.some(item => item.id === lastResult.id);
    return exists ? base : [lastResult, ...base];
  }, [gridSize, history, lastResult, shuffleOnClick, symbolOrder, tableType]);

  // Stats
  const stats = useMemo(() => {
    if (!mergedHistory.length) return { best: null, average: null };
    
    const scores = mergedHistory.map(r => r.score);
    const best = Math.min(...scores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    return { best, average };
  }, [mergedHistory]);

  const resultHistoryData = useMemo(
    () =>
      mergedHistory.slice(0, 20).reverse().map((r, i) => ({
        index: i,
        value: parseFloat((r.score / 1000).toFixed(2))
      })),
    [mergedHistory]
  );

  const weaknessProfile = useMemo(() => {
    const relevant = weaknessHistory.filter(game => game.trackingData);
    if (!relevant.length) {
      return {
        weakestNumbers: [] as number[],
        weakestCells: [] as number[]
      };
    }

    const cellTimes: Record<number, number[]> = {};
    const numberTimes: Record<number, number[]> = {};

    relevant.forEach(game => {
      if (!game.trackingData) return;
      let lastTime = 0;
      const sortedClicks = [...game.trackingData.clicks].sort((a, b) => a.number - b.number);

      sortedClicks.forEach(click => {
        if (click.isError) return;
        const interval = click.time - lastTime;
        lastTime = click.time;

        if (!cellTimes[click.cellIndex]) cellTimes[click.cellIndex] = [];
        cellTimes[click.cellIndex].push(interval);

        if (!numberTimes[click.number]) numberTimes[click.number] = [];
        numberTimes[click.number].push(interval);
      });
    });

    const weakestNumbers = Object.entries(numberTimes)
      .map(([number, times]) => ({
        number: Number(number),
        avg: times.reduce((sum, v) => sum + v, 0) / times.length
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(item => item.number);

    const weakestCells = Object.entries(cellTimes)
      .map(([index, times]) => ({
        index: Number(index),
        avg: times.reduce((sum, v) => sum + v, 0) / times.length
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(item => item.index);

    return { weakestNumbers, weakestCells };
  }, [weaknessHistory]);

  const bestBeforeLastResult = useMemo(() => {
    if (!lastResult || lastResult.gameType !== 'schulte' || lastResult.gridSize !== gridSize) {
      return stats.best;
    }
    if (getResultSchulteConfigKey(lastResult) !== currentConfigKey) {
      return stats.best;
    }
    const previousScores = mergedHistory
      .filter(item => item.id !== lastResult.id)
      .map(item => item.score);
    return previousScores.length ? Math.min(...previousScores) : null;
  }, [currentConfigKey, gridSize, lastResult, mergedHistory, stats.best]);

  const targetedNumbers = useMemo(() => {
    const maxNumber = tableType === 'gorbov-schulte' ? Math.ceil(totalSymbols / 2) : totalSymbols;
    return weaknessProfile.weakestNumbers.filter(number => number >= 1 && number <= maxNumber);
  }, [tableType, totalSymbols, weaknessProfile.weakestNumbers]);

  const targetedCells = useMemo(() => {
    const maxCellIndex = totalSymbols - 1;
    return weaknessProfile.weakestCells.filter(index => index >= 0 && index <= maxCellIndex);
  }, [totalSymbols, weaknessProfile.weakestCells]);

  const canUseTargetedMode = targetedNumbers.length > 0 && targetedCells.length > 0;

  useEffect(() => {
    if (trainingMode === 'targeted' && !canUseTargetedMode) {
      setTrainingMode('classic');
    }
  }, [trainingMode, canUseTargetedMode]);

  const generateClassicGrid = (size: number) => {
    const count = size * size;
    return shuffleNumbers(Array.from({ length: count }, (_, i) => i + 1));
  };

  const generateTargetedGrid = (size: number) => {
    const nums = generateClassicGrid(size);
    const count = size * size;
    const weakNumbers = Array.from(new Set(targetedNumbers.filter(number => number <= count)));
    const weakCells = Array.from(new Set(targetedCells.filter(index => index < count)));
    const pairCount = Math.min(weakNumbers.length, weakCells.length);

    for (let i = 0; i < pairCount; i++) {
      const targetNumber = weakNumbers[i];
      const targetCell = weakCells[i];
      const currentIndex = nums.indexOf(targetNumber);
      if (currentIndex === -1 || currentIndex === targetCell) continue;
      [nums[targetCell], nums[currentIndex]] = [nums[currentIndex], nums[targetCell]];
    }

    return nums;
  };

  const generateTargetedGorbovConfig = (count: number) => {
    const config = buildGorbovConfig(count, 'direct');
    const weakValues = Array.from(new Set(targetedNumbers.filter(value => value >= 1 && value <= Math.ceil(count / 2))));
    const weakCells = Array.from(new Set(targetedCells.filter(index => index >= 0 && index < count)));
    if (!weakValues.length || !weakCells.length) return config;

    const targetIds = weakValues.flatMap(value =>
      config.symbols
        .filter(symbol => symbol.value === value)
        .map(symbol => symbol.id)
    );
    if (!targetIds.length) return config;

    const gridIds = [...config.gridIds];
    const pairCount = Math.min(targetIds.length, weakCells.length);
    for (let i = 0; i < pairCount; i++) {
      const id = targetIds[i];
      const cell = weakCells[i];
      const currentIndex = gridIds.indexOf(id);
      if (currentIndex === -1 || currentIndex === cell) continue;
      [gridIds[cell], gridIds[currentIndex]] = [gridIds[currentIndex], gridIds[cell]];
    }

    return {
      ...config,
      gridIds
    };
  };

  const startGame = (source: 'menu' | 'replay' | 'reset' = 'menu') => {
    if (source === 'reset' && (gameState === 'playing' || gameState === 'countdown')) {
      const elapsed = startTime ? Math.max(0, Date.now() - startTime) : 0;
      addRoundEvent({
        gridSize,
        trainingMode,
        status: 'abandoned',
        reason: 'reset',
        progress: Math.max(0, currentStep),
        total: totalSymbols,
        durationMs: elapsed,
        mistakes,
        configKey: currentConfigKey,
        presetId: activePreset?.id
      });
    }

    if (tableType === 'gorbov-schulte') {
      const config = trainingMode === 'targeted' && canUseTargetedMode
        ? generateTargetedGorbovConfig(totalSymbols)
        : buildGorbovConfig(totalSymbols, 'direct');
      setNumbers(config.gridIds);
      setTargetOrder(config.targetOrder);
      setGorbovSymbols(config.symbols);
    } else {
      const nextGrid = trainingMode === 'targeted' && canUseTargetedMode
        ? generateTargetedGrid(gridSize)
        : generateClassicGrid(gridSize);
      const nextOrder = buildSymbolOrder(totalSymbols, symbolOrder);
      setNumbers(nextGrid);
      setTargetOrder(nextOrder);
      setGorbovSymbols([]);
    }

    setCurrentStep(0);
    setStartTime(null);
    setCurrentTime(0);
    setMistakes(0);
    setCountdownValue(3);
    setErrorCell(null);
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
    if (currentTarget === null) return;
    
    const time = Date.now() - startTime!;
    const trackedNumber =
      tableType === 'gorbov-schulte'
        ? (gorbovSymbolById.get(number)?.value ?? number)
        : number;
    
    if (number === currentTarget) {
      playSound('click');
      
      // Record Click
      clicksRef.current.push({
        number: trackedNumber,
        time,
        cellIndex: index,
        isError: false
      });

      const isLastStep = currentStep >= Math.max(0, targetOrder.length - 1);
      if (isLastStep) {
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
          schulteConfig: currentConfig,
          presetId: activePreset?.id,
          date: Date.now(),
          trackingData
        };

        addRoundEvent({
          gridSize,
          trainingMode,
          status: 'completed',
          reason: 'finished',
          progress: totalSymbols,
          total: totalSymbols,
          durationMs: finalTime,
          mistakes,
          configKey: currentConfigKey,
          presetId: activePreset?.id
        });
        
        onComplete(result);
        setLastResult(result);
        setGameState('finished');
        playSound('win');

        const shouldReduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (!shouldReduceMotion && (stats.best === null || finalTime < stats.best)) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#002FA7', '#002380', '#e5e5e5']
          });
        }
      } else {
        setCurrentStep(prev => prev + 1);
        if (shuffleOnClick) {
          setNumbers(prev => shuffleNumbers(prev));
        }
      }
    } else {
      playSound('error');
      setMistakes(prev => prev + 1);
      setErrorCell(number);
      setTimeout(() => setErrorCell(null), 300);
      
      // Record Error Click
      clicksRef.current.push({
        number: trackedNumber,
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
        onReplay={() => startGame('replay')}
        onShowReplay={lastResult.trackingData ? () => setReplayData(lastResult.trackingData!) : undefined}
        isRecord={bestBeforeLastResult === null || lastResult.score < bestBeforeLastResult}
        unit="s"
        historyData={resultHistoryData}
        historyLabel={`History (${activePreset?.name ?? `${gridSize}x${gridSize}`})`}
      />
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-surface">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
           <SubHeading>{showInsights ? 'Insights' : 'Settings'}</SubHeading>
           <div
             className="inline-flex items-center rounded-full border border-secondary bg-secondary p-0.5"
             role="tablist"
             aria-label="Schulte menu view switcher"
           >
             <button
               onClick={() => setShowInsights(false)}
               role="tab"
               aria-selected={!showInsights}
               className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                 !showInsights ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
               }`}
               title="Show Settings"
             >
               <Settings className="h-3.5 w-3.5" />
               <span>Settings</span>
             </button>
             <button
               onClick={() => setShowInsights(true)}
               role="tab"
               aria-selected={showInsights}
               className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                 showInsights ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
               }`}
               title="Show Insights"
             >
               <ChartNoAxesColumn className="h-3.5 w-3.5" />
               <span>Insights</span>
             </button>
           </div>
        </div>

        {showInsights ? (
          <div className="flex-1 space-y-6">
            <SchulteStats
              history={history}
              roundEvents={roundEvents}
              gridSize={gridSize}
              configKey={currentConfigKey}
              showTitle={false}
              className="p-0 sm:p-0"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <Label className="mb-3 block text-center">Mode</Label>
              <div className="mx-auto flex w-full max-w-md items-center justify-start gap-2 overflow-x-auto pb-1">
                {allPresets.map((preset) => {
                  const isActive = activePreset?.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tracking-wide transition-[background-color,color,border-color] ${
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-secondary bg-secondary text-ink-light hover:bg-secondary-hover'
                      }`}
                      title={preset.name}
                      aria-label={`Preset ${preset.name}`}
                    >
                      {getPresetBadge(preset)}
                    </button>
                  );
                })}
                <button
                  onClick={saveCurrentPreset}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-secondary bg-surface text-lg font-medium text-ink-light transition-colors hover:bg-secondary hover:text-ink"
                  title="Create preset from current settings"
                  aria-label="Create preset"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                  <Grid3X3 className="h-3 w-3" />
                  {gridSize}x{gridSize}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                  <Box className="h-3 w-3" />
                  {tableTypeLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                  <ArrowUpDown className="h-3 w-3" />
                  {symbolOrderLabel}
                </span>
                
                {!shuffleOnClick || tableType === 'gorbov-schulte' ? null : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                    <Shuffle className="h-3 w-3" />
                    {shuffleOnClick ? 'Shuffle' : 'Static'}
                  </span>
                )}
                {trainingMode === 'targeted' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-surface px-2 py-1 text-[10px] uppercase tracking-wider text-ink-light">
                  <Crosshair className="h-3 w-3" />
                  {trainingLabel}
                </span>
                ) : null}
              </div>
            </div>
            <div>
              <button
                onClick={() => setShowAdvancedSettings(prev => !prev)}
                className="mx-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-light hover:text-ink"
              >
                <span>Advanced</span>
                {showAdvancedSettings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showAdvancedSettings && (
                <div className="mt-3 space-y-4 rounded-md border border-secondary bg-surface p-3">
                  <div>
                    <Label className="mb-2 block text-center">
                      <span className="inline-flex items-center gap-1">
                        <Grid3X3 className="h-3.5 w-3.5" />
                        Table Size
                      </span>
                    </Label>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {SCHULTE_TABLE_SIZES.map((size) => (
                        <button
                          key={size}
                          onClick={() => setGridSize(size)}
                          className={`px-3 py-1.5 rounded-sm font-medium text-xs transition-[background-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                            gridSize === size ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-ink-light hover:bg-secondary-hover'
                          }`}
                        >
                          {size}x{size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-center">
                      <span className="inline-flex items-center gap-1">
                       <Box className="h-3.5 w-3.5" />
                        Table Type
                      </span>
                    </Label>
                    <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                      <button
                        onClick={() => setTableType('digits')}
                        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          tableType === 'digits' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        }`}
                      >
                        Digits
                      </button>
                      <button
                        onClick={() => setTableType('letters')}
                        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          tableType === 'letters' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        }`}
                      >
                        Letters
                      </button>
                      <button
                        onClick={() => setTableType('gorbov-schulte')}
                        className={`inline-flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          tableType === 'gorbov-schulte' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        }`}
                      >
                        Gorbov
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block text-center">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        Symbol Order
                      </span>
                    </Label>
                    <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                      <button
                        onClick={() => setSymbolOrder('direct')}
                        disabled={tableType === 'gorbov-schulte'}
                        className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          symbolOrder === 'direct' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        Direct
                      </button>
                      <button
                        onClick={() => setSymbolOrder('reverse')}
                        disabled={tableType === 'gorbov-schulte'}
                        className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          symbolOrder === 'reverse' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        Reverse
                      </button>
                      <button
                        onClick={() => setSymbolOrder('random')}
                        disabled={tableType === 'gorbov-schulte'}
                        className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          symbolOrder === 'random' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        Random
                      </button>
                    </div>
                
                  </div>

                  <div>
                    <Label className="mb-2 block text-center">
                      <span className="inline-flex items-center gap-1">
                        <Shuffle className="h-3.5 w-3.5" />
                        Shuffle on Click
                      </span>
                    </Label>
                    <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                      <button
                        onClick={() => setShuffleOnClick(true)}
                        disabled={tableType === 'gorbov-schulte'}
                        className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          shuffleOnClick ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        On
                      </button>
                      <button
                        onClick={() => setShuffleOnClick(false)}
                        disabled={tableType === 'gorbov-schulte'}
                        className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          !shuffleOnClick ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        } ${tableType === 'gorbov-schulte' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        Off
                      </button>
                    </div>
                   
                  </div>

                  <div>
                    <Label className="mb-2 block text-center">
                      <span className="inline-flex items-center gap-1">
                        <Crosshair className="h-3.5 w-3.5" />
                        Targeted Training
                      </span>
                    </Label>
                    <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                      <button
                        onClick={() => setTrainingMode('classic')}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          trainingMode === 'classic' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        }`}
                      >
                        <span>Off</span>
                      </button>
                      <button
                        onClick={() => setTrainingMode('targeted')}
                        disabled={!canUseTargetedMode}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          trainingMode === 'targeted' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                        } ${!canUseTargetedMode ? 'cursor-not-allowed opacity-50' : ''}`}
                        title={canUseTargetedMode ? 'Targeted training' : 'Requires more tracking data'}
                      >
                        <span>On</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-secondary pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-2 block text-center">Cell Style</Label>
                        <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                          <button
                            onClick={() => setTableStyle('classic')}
                            className={`inline-flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                              tableStyle === 'classic' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                            }`}
                          >
                            Classic
                          </button>
                          <button
                            onClick={() => setTableStyle('round')}
                            className={`inline-flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                              tableStyle === 'round' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                            }`}
                          >
                            Round
                          </button>
                          <button
                            onClick={() => setTableStyle('colored')}
                            className={`inline-flex flex-1 items-center justify-center rounded-full px-2 py-1.5 text-xs font-medium transition-colors ${
                              tableStyle === 'colored' ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                            }`}
                          >
                            Color
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label className="mb-2 block text-center">Center Dot</Label>
                        <div className="inline-flex w-full items-center rounded-full border border-secondary bg-secondary p-0.5">
                          <button
                            onClick={() => setShowCenterDot(true)}
                            className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              showCenterDot ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                            }`}
                          >
                            On
                          </button>
                          <button
                            onClick={() => setShowCenterDot(false)}
                            className={`inline-flex flex-1 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              !showCenterDot ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
                            }`}
                          >
                            Off
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeCustomPreset && (
                    <div className="border-t border-secondary pt-3">
                      <button
                        onClick={() => deleteCustomPreset(activeCustomPreset)}
                        className="w-full rounded-sm border border-secondary px-3 py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-error)] hover:bg-secondary"
                      >
                        Delete "{activeCustomPreset.name}" and clear data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-px bg-secondary border border-secondary rounded-md overflow-hidden">
              <div className="bg-surface p-3 sm:p-4 text-left">
                <Label className="mb-1 block">Best</Label>
                <Mono className="text-base sm:text-lg font-medium">
                  {stats.best !== null ? formatTime(stats.best) : '--'}
                </Mono>
              </div>
              <div className="bg-surface p-3 sm:p-4 text-left">
                <Label className="mb-1 block">Avg</Label>
                <Mono className="text-base sm:text-lg font-medium">
                  {stats.average !== null ? formatTime(stats.average) : '--'}
                </Mono>
              </div>
            </div>

            <Button onClick={() => startGame('menu')} fullWidth size="lg">
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
      <div className="relative p-3 sm:p-4 flex justify-center border-b border-secondary bg-surface">
        <div className="flex items-center gap-2">
          <Mono className="text-xl sm:text-2xl font-medium tabular-nums">
            {formatTime(currentTime)}
          </Mono>
          {trainingMode === 'targeted' && canUseTargetedMode && (
            <span className="inline-flex items-center gap-1 rounded-full border border-secondary bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-light">
              <Crosshair className="h-3 w-3" />
              Targeted
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => startGame('reset')}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 sm:right-4 sm:px-3"
          aria-label="Reset current round"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="text-[10px] sm:text-xs">Reset</span>
        </Button>
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

        <div className="relative w-full aspect-square">
          <div 
            ref={containerRef}
            onPointerMove={handlePointerMove}
            className={`w-full h-full grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary transition-[filter,opacity,transform] duration-[var(--motion-normal)] ease-[var(--ease-standard)]
              ${gameState === 'countdown' ? 'blur-md opacity-40 scale-95' : 'blur-0 opacity-100 scale-100'}
            `}
            style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {numbers.map((num, index) => {
              const isError = errorCell === num;
              const isGorbov = tableType === 'gorbov-schulte';
              const gorbovSymbol = gorbovSymbolById.get(num);
              const style: React.CSSProperties = {};

              if (!isError && isGorbov) {
                style.backgroundColor = gorbovSymbol?.tone === 'black' ? '#000000' : '#EF1414';
                style.color = '#FFFFFF';
              } else if (!isError && tableStyle === 'colored') {
                const hue = (num * 37) % 360;
                style.backgroundColor = `hsl(${hue} 85% 91%)`;
              }

              return (
                <button
                  key={num}
                  onPointerDown={() => handleCellClick(num, index)}
                  disabled={gameState === 'countdown'}
                  style={style}
                  className={`
                    ${isError ? 'bg-[var(--color-error)] text-white' : isGorbov ? 'hover:opacity-95 active:opacity-80' : tableStyle === 'colored' ? 'text-ink active:opacity-80' : 'bg-surface hover:bg-white text-ink active:bg-primary active:text-white'}
                    ${tableStyle === 'round' ? 'rounded-full' : ''}
                    font-medium flex items-center justify-center transition-colors touch-manipulation
                    ${gridSize >= 8 ? 'text-sm sm:text-lg' : gridSize >= 6 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}
                  `}
                >
                  {getSymbolLabel(num)}
                </button>
              );
            })}
          </div>
          {showCenterDot && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/80 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]" />
          )}
        </div>
      </div>
      
      <div className="p-3 sm:p-4 border-t border-secondary bg-surface flex justify-center items-center gap-2">
         <Label>Find</Label>
         {tableType === 'gorbov-schulte' && currentTarget !== null && (
           <span
             className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white"
             style={{ backgroundColor: gorbovSymbolById.get(currentTarget)?.tone === 'black' ? '#000000' : '#EF1414' }}
           >
             {gorbovSymbolById.get(currentTarget)?.tone === 'black' ? 'Black' : 'Red'}
           </span>
         )}
         <span
           className="text-lg sm:text-xl font-bold"
         >
           {currentTarget !== null ? getSymbolLabel(currentTarget) : '--'}
         </span>
      </div>
    </div>
  );
}
