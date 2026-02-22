import React, { useMemo } from 'react';
import { GameResult, SchulteRoundEvent } from '../types';
import { SubHeading, Label, Mono, Text } from './ui/Typography';
import { formatTime } from './GameShell';
import { NumberBarChart } from './charts/NumberBarChart';
import { HistoryStepChart } from './charts/HistoryStepChart';
import { createDefaultSchulteConfig, getResultSchulteConfigKey, getSchulteConfigKey } from '../utils/schulteConfig';

interface SchulteStatsProps {
  history: GameResult[];
  roundEvents?: SchulteRoundEvent[];
  gridSize: number;
  configKey?: string;
  showTitle?: boolean;
  className?: string;
}

const getQuantile = (sorted: number[], q: number): number => {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + (next - sorted[base]) * rest;
};

export const SchulteStats: React.FC<SchulteStatsProps> = ({ history, roundEvents = [], gridSize, configKey, showTitle = true, className = '' }) => {
  const formatDuration = (ms: number) => `${formatTime(ms)}s`;
  const getPositionLabel = (index: number) => {
    const row = Math.floor(index / gridSize) + 1;
    const col = (index % gridSize) + 1;
    return `R${row} C${col}`;
  };

  const gridHistory = useMemo(
    () =>
      history.filter(h => {
        if (h.gameType !== 'schulte' || h.gridSize !== gridSize) return false;
        if (!configKey) return true;
        return getResultSchulteConfigKey(h) === configKey;
      }),
    [configKey, history, gridSize]
  );

  const historyData = useMemo(
    () =>
      gridHistory.slice(0, 20).reverse().map((item, index) => ({
        index,
        value: parseFloat((item.score / 1000).toFixed(2))
      })),
    [gridHistory]
  );

  const roundOutcome = useMemo(() => {
    const fallbackLegacyKey = getSchulteConfigKey(createDefaultSchulteConfig(gridSize));
    const scoped = roundEvents.filter(event => {
      if (event.gridSize !== gridSize) return false;
      if (!configKey) return true;
      if (event.configKey) return event.configKey === configKey;
      return configKey === fallbackLegacyKey;
    });
    const completed = scoped.filter(event => event.status === 'completed').length;
    const abandoned = scoped.filter(event => event.status === 'abandoned').length;
    const started = completed + abandoned;
    return {
      completed,
      abandoned,
      started,
      completionRate: started ? completed / started : null,
      abandonmentRate: started ? abandoned / started : null
    };
  }, [configKey, gridSize, roundEvents]);

  const stats = useMemo(() => {
    const relevant = gridHistory.filter(h => h.trackingData);
    if (relevant.length === 0) return null;

    const cellTimes: { [key: number]: number[] } = {};
    const numberTimes: { [key: number]: number[] } = {};
    const reactionIntervals: number[] = [];

    relevant.forEach(game => {
      if (!game.trackingData) return;
      
      let lastTime = 0;
      // Sort clicks by number just in case, though they should be sequential
      const sortedClicks = [...game.trackingData.clicks].sort((a, b) => a.number - b.number);
      
      sortedClicks.forEach(click => {
        if (click.isError) return; // Skip error clicks for time calculation? Or include penalty? Let's skip for pure reaction time.
        
        const interval = click.time - lastTime;
        lastTime = click.time;
        reactionIntervals.push(interval);

        // Record for Cell Index
        if (!cellTimes[click.cellIndex]) cellTimes[click.cellIndex] = [];
        cellTimes[click.cellIndex].push(interval);

        // Record for Number
        if (!numberTimes[click.number]) numberTimes[click.number] = [];
        numberTimes[click.number].push(interval);
      });
    });

    // Calculate Averages
    const cellAverages = Object.keys(cellTimes).map(idx => {
      const times = cellTimes[parseInt(idx)];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      return { index: parseInt(idx), avg };
    });

    const numberAverages = Object.keys(numberTimes).map(num => {
      const times = numberTimes[parseInt(num)];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      return { number: parseInt(num), avg };
    });

    if (cellAverages.length === 0 || reactionIntervals.length === 0) {
      return null;
    }

    // Find min/max for heatmap coloring
    const minCellTime = Math.min(...cellAverages.map(c => c.avg));
    const maxCellTime = Math.max(...cellAverages.map(c => c.avg));
    const overallCellTime = cellAverages.reduce((sum, item) => sum + item.avg, 0) / cellAverages.length;
    const sortedIntervals = [...reactionIntervals].sort((a, b) => a - b);
    const minReaction = sortedIntervals[0];
    const maxReaction = sortedIntervals[sortedIntervals.length - 1];
    const meanReaction = reactionIntervals.reduce((sum, value) => sum + value, 0) / reactionIntervals.length;
    const q1Reaction = getQuantile(sortedIntervals, 0.25);
    const medianReaction = getQuantile(sortedIntervals, 0.5);
    const q3Reaction = getQuantile(sortedIntervals, 0.75);
    const p90Reaction = getQuantile(sortedIntervals, 0.9);
    const fastestCells = [...cellAverages].sort((a, b) => a.avg - b.avg).slice(0, 3);
    const slowestCells = [...cellAverages].sort((a, b) => b.avg - a.avg).slice(0, 3);
    const cellAverageMap = new Map(cellAverages.map(item => [item.index, item.avg]));
    const fastestRankMap = new Map(fastestCells.map((cell, idx) => [cell.index, idx + 1]));
    const slowestRankMap = new Map(slowestCells.map((cell, idx) => [cell.index, idx + 1]));

    return {
      cellAverages,
      numberAverages,
      minCellTime,
      maxCellTime,
      overallCellTime,
      minReaction,
      q1Reaction,
      meanReaction,
      medianReaction,
      q3Reaction,
      maxReaction,
      p90Reaction,
      fastestCells,
      slowestCells,
      cellAverageMap,
      fastestRankMap,
      slowestRankMap,
      count: relevant.length,
      sampleCount: reactionIntervals.length
    };
  }, [gridHistory, gridSize]);

  if (!gridHistory.length) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <Text>No games played for this grid size yet.</Text>
      </div>
    );
  }

  const getCellColor = (avg: number | undefined) => {
    if (!stats || avg === undefined) return 'var(--color-secondary)';
    const t = (avg - stats.minCellTime) / (stats.maxCellTime - stats.minCellTime || 1);
    const opacity = 0.1 + (t * 0.9);
    return `rgba(0, 47, 167, ${opacity})`;
  };

  const getCompactDuration = (ms: number) => `${(ms / 1000).toFixed(gridSize >= 8 ? 1 : 2)}s`;

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 p-4 sm:p-6 bg-surface ${className}`}>
      {showTitle && (
        <div className="flex justify-between items-center">
          <div>
            <SubHeading>Aggregated Stats</SubHeading>
            <Label>Based on {gridHistory.length} games</Label>
          </div>
        </div>
      )}

      <div>
        <Label className="mb-3 block">History ({gridSize}x{gridSize})</Label>
        <div className="h-36 sm:h-40 w-full min-w-0 -ml-2">
          <HistoryStepChart
            data={historyData}
            formatValue={value => `${value.toFixed(2)}s`}
            seriesLabel="Time"
          />
        </div>
      </div>

 

      {stats ? (
        <>
          {/* Heatmap Section */}
          <div>
            <Label className="mb-3 block">Positional Heatmap (Avg Time per Cell)</Label>
            <div className="mb-3 space-y-1.5">
              <div
                className="h-2 flex-1 rounded-full border border-secondary"
                style={{ background: 'linear-gradient(90deg, rgba(0,47,167,0.15), rgba(0,47,167,1))' }}
              />
              <div className="grid grid-cols-3 text-[10px] uppercase tracking-widest text-ink-lighter">
                <span className="text-left">
                  Fastest {formatDuration(stats.minCellTime)}
                </span>
                <span className="text-center">
                  Typical {formatDuration(stats.overallCellTime)}
                </span>
                <span className="text-right">
                  Slowest {formatDuration(stats.maxCellTime)}
                </span>
              </div>
            </div>
            <div className="flex justify-center">
              <div
                className={`w-full max-w-xs aspect-square grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary`}
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                  const avg = stats.cellAverageMap.get(idx);
                  const color = getCellColor(avg);
                  const fastRank = stats.fastestRankMap.get(idx);
                  const slowRank = stats.slowestRankMap.get(idx);
                  const showInlineValue = avg !== undefined && (fastRank || slowRank);

                  return (
                    <div
                      key={idx}
                      className="relative"
                      style={{ backgroundColor: color }}
                      title={avg === undefined ? `${getPositionLabel(idx)}: no data yet` : `${getPositionLabel(idx)}: ${formatDuration(avg)}`}
                    >
                      {showInlineValue && (
                        <span className={`absolute inset-0 flex items-center justify-center text-[9px] sm:text-[10px] font-semibold ${slowRank ? 'text-white' : 'text-ink'}`}>
                          {getCompactDuration(avg)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Number Stats Section */}
          <div>
            <Label className="mb-4 block">Time per Number</Label>
            <div className="h-40 sm:h-48 w-full min-w-0">
              <NumberBarChart data={stats.numberAverages} formatValue={formatDuration} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-sm border border-secondary bg-surface p-4 sm:p-5">
          <Text>
            Detailed heatmap and per-number analytics need games with tracking data.
            Play a new round to populate these insights.
          </Text>
          <div className="mt-2">
            <Label>Tracking Games: 0</Label>
          </div>
        </div>
      )}
    </div>
  );
};
