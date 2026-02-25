import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ClickEvent,
  GameProps,
  GameResult,
  SchulteConfig,
  SchultePreset,
  SchulteRoundEvent,
  SchulteSymbolOrder,
  SchulteTableStyle,
  SchulteTableType,
  SchulteTrackingData,
  SchulteTrainingMode,
  TrackingPoint
} from '../../types';
import { ResultScreen } from '../ResultScreen';
import { SchulteReplay } from '../SchulteReplay';
import {
  getResultSchulteConfig,
  getResultSchulteConfigKey,
  getSchulteConfigKey
} from '../../utils/schulteConfig';
import { SchulteBoard } from './schulte/SchulteBoard';
import { SchulteMenuView } from './schulte/SchulteMenuView';
import {
  appendRoundEventToStorage,
  buildGorbovConfig,
  buildSymbolOrder,
  BUILTIN_PRESETS,
  createVoronoiCells,
  GorbovSymbol,
  isSchultePreset,
  isSchulteRoundEvent,
  normalizeTableStyle,
  numberToLetters,
  SCHULTE_PRESETS_KEY,
  SCHULTE_PRESETS_MAX,
  SCHULTE_ROUND_EVENTS_KEY,
  SCHULTE_ROUND_EVENTS_MAX,
  shuffleNumbers
} from './schulte/schulteCore';

type SchulteGameState = 'menu' | 'countdown' | 'playing' | 'finished';

export default function SchulteGame({ playSound, history, onComplete, onClearSchultePresetData }: GameProps) {
  const [gameState, setGameState] = useState<SchulteGameState>('menu');
  const [gridSize, setGridSize] = useState(5);
  const [trainingMode, setTrainingMode] = useState<SchulteTrainingMode>('default');
  const [tableType, setTableType] = useState<SchulteTableType>('digits');
  const [tableStyle, setTableStyle] = useState<SchulteTableStyle>('grid');
  const [symbolOrder, setSymbolOrder] = useState<SchulteSymbolOrder>('direct');
  const [shuffleOnClick, setShuffleOnClick] = useState(false);
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
  const [successCell, setSuccessCell] = useState<number | null>(null);
  const [boardLayoutSeed, setBoardLayoutSeed] = useState(1);
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
    gameState: 'menu' as SchulteGameState,
    gridSize: 5,
    trainingMode: 'default' as SchulteTrainingMode,
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
      showCenterDot: false,
      trainingMode
    }),
    [gridSize, shuffleOnClick, symbolOrder, tableStyle, tableType, trainingMode]
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
    setTableStyle(normalizeTableStyle(config.tableStyle));
    setSymbolOrder(config.symbolOrder);
    setShuffleOnClick(config.shuffleOnClick);
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
  const isVoronoiStyle = tableStyle === 'voronoi';
  const voronoiCells = useMemo(
    () => (isVoronoiStyle ? createVoronoiCells(totalSymbols, boardLayoutSeed) : []),
    [boardLayoutSeed, isVoronoiStyle, totalSymbols]
  );
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

  const tableTypeLabel =
    tableType === 'gorbov-schulte'
      ? 'Gorbov'
      : tableType === 'letters'
        ? 'Letters'
        : 'Digits';
  const tableStyleLabel =
    tableStyle === 'voronoi'
      ? 'Voronoi'
      : tableStyle === 'colored'
        ? 'Colored'
        : tableStyle === 'round'
          ? 'Circle'
          : 'Grid';
  const symbolOrderLabel =
    symbolOrder === 'reverse' ? 'Reverse' : symbolOrder === 'random' ? 'Random' : 'Direct';
  const trainingLabel = trainingMode === 'targeted' ? 'Targeted' : 'default';

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
        normalizeTableStyle(config.tableStyle) === normalizeTableStyle(tableStyle) &&
        config.symbolOrder === symbolOrder &&
        config.shuffleOnClick === shuffleOnClick
      );
    };

    const base = history.filter(matches);
    if (!lastResult || !matches(lastResult)) return base;
    const exists = base.some(item => item.id === lastResult.id);
    return exists ? base : [lastResult, ...base];
  }, [gridSize, history, lastResult, shuffleOnClick, symbolOrder, tableStyle, tableType]);

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
      setTrainingMode('default');
    }
  }, [trainingMode, canUseTargetedMode]);

  const generatedefaultGrid = (size: number) => {
    const count = size * size;
    return shuffleNumbers(Array.from({ length: count }, (_, i) => i + 1));
  };

  const generateTargetedGrid = (size: number) => {
    const nums = generatedefaultGrid(size);
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
        : generatedefaultGrid(gridSize);
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
    setSuccessCell(null);
    setBoardLayoutSeed(prev => prev + 1);
    setGameState('countdown');

    mousePathRef.current = [];
    clicksRef.current = [];
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (gameState !== 'playing' || !startTime || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const t = Date.now() - startTime;

    const last = mousePathRef.current[mousePathRef.current.length - 1];
    if (!last || t - last.t > 20) {
      mousePathRef.current.push({ x, y, t });
    }
  };

  useEffect(() => {
    let timeout: number;
    if (gameState === 'countdown') {
      if (countdownValue > 0) {
        timeout = window.setTimeout(() => {
          setCountdownValue(v => v - 1);
        }, 1000);
      } else {
        setStartTime(Date.now());
        setCurrentTime(0);
        setGameState('playing');
        playSound('click');
      }
    }
    return () => clearTimeout(timeout);
  }, [countdownValue, gameState, playSound]);

  useEffect(() => {
    if (gameState === 'playing' && startTime) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 10);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, startTime]);

  const handleCellClick = (number: number, index: number) => {
    if (gameState !== 'playing') return;
    if (currentTarget === null || !startTime) return;

    const time = Date.now() - startTime;
    const trackedNumber =
      tableType === 'gorbov-schulte'
        ? (gorbovSymbolById.get(number)?.value ?? number)
        : number;

    if (number === currentTarget) {
      playSound('click');
      setSuccessCell(number);
      setTimeout(() => setSuccessCell(null), 140);

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
      <SchulteMenuView
        showInsights={showInsights}
        onShowInsightsChange={setShowInsights}
        history={history}
        roundEvents={roundEvents}
        gridSize={gridSize}
        currentConfigKey={currentConfigKey}
        allPresets={allPresets}
        activePreset={activePreset}
        activeCustomPreset={activeCustomPreset}
        onApplyPreset={applyPreset}
        onSavePreset={saveCurrentPreset}
        onDeleteCustomPreset={deleteCustomPreset}
        tableTypeLabel={tableTypeLabel}
        tableStyleLabel={tableStyleLabel}
        symbolOrderLabel={symbolOrderLabel}
        trainingLabel={trainingLabel}
        shuffleOnClick={shuffleOnClick}
        trainingMode={trainingMode}
        tableType={tableType}
        tableStyle={tableStyle}
        symbolOrder={symbolOrder}
        canUseTargetedMode={canUseTargetedMode}
        showAdvancedSettings={showAdvancedSettings}
        onToggleAdvancedSettings={() => setShowAdvancedSettings(prev => !prev)}
        onGridSizeChange={setGridSize}
        onTableTypeChange={setTableType}
        onTableStyleChange={setTableStyle}
        onSymbolOrderChange={setSymbolOrder}
        onShuffleOnClickChange={setShuffleOnClick}
        onTrainingModeChange={setTrainingMode}
        stats={stats}
        onStart={() => startGame('menu')}
      />
    );
  }

  return (
    <SchulteBoard
      gameState={gameState === 'countdown' ? 'countdown' : 'playing'}
      currentTime={currentTime}
      trainingMode={trainingMode}
      canUseTargetedMode={canUseTargetedMode}
      onReset={() => startGame('reset')}
      countdownValue={countdownValue}
      containerRef={containerRef}
      onPointerMove={handlePointerMove}
      isVoronoiStyle={isVoronoiStyle}
      gridSize={gridSize}
      numbers={numbers}
      voronoiCells={voronoiCells}
      errorCell={errorCell}
      successCell={successCell}
      tableType={tableType}
      tableStyle={tableStyle}
      gorbovSymbolById={gorbovSymbolById}
      onCellPointerDown={handleCellClick}
      getSymbolLabel={getSymbolLabel}
      currentTarget={currentTarget}
    />
  );
}
