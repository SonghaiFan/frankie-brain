import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GameResult } from '../types';
import { SubHeading, Label, Mono, Text } from './ui/Typography';
import { formatTime } from './GameShell';

interface SchulteStatsProps {
  history: GameResult[];
  gridSize: number;
  showTitle?: boolean;
  className?: string;
}

export const SchulteStats: React.FC<SchulteStatsProps> = ({ history, gridSize, showTitle = true, className = '' }) => {
  const formatDuration = (ms: number) => `${formatTime(ms)}s`;
  const getPositionLabel = (index: number) => {
    const row = Math.floor(index / gridSize) + 1;
    const col = (index % gridSize) + 1;
    return `R${row} C${col}`;
  };

  const stats = useMemo(() => {
    const relevant = history.filter(h => h.gridSize === gridSize && h.trackingData);
    if (relevant.length === 0) return null;

    const cellTimes: { [key: number]: number[] } = {};
    const numberTimes: { [key: number]: number[] } = {};

    relevant.forEach(game => {
      if (!game.trackingData) return;
      
      let lastTime = 0;
      // Sort clicks by number just in case, though they should be sequential
      const sortedClicks = [...game.trackingData.clicks].sort((a, b) => a.number - b.number);
      
      sortedClicks.forEach(click => {
        if (click.isError) return; // Skip error clicks for time calculation? Or include penalty? Let's skip for pure reaction time.
        
        const interval = click.time - lastTime;
        lastTime = click.time;

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

    // Find min/max for heatmap coloring
    const minCellTime = Math.min(...cellAverages.map(c => c.avg));
    const maxCellTime = Math.max(...cellAverages.map(c => c.avg));
    const overallCellTime = cellAverages.reduce((sum, item) => sum + item.avg, 0) / cellAverages.length;
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
      fastestCells,
      slowestCells,
      cellAverageMap,
      fastestRankMap,
      slowestRankMap,
      count: relevant.length
    };
  }, [history, gridSize]);

  if (!stats) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <Text>No detailed tracking data available for this grid size.</Text>
      </div>
    );
  }

  // Helper for heatmap color
  const getCellColor = (avg: number | undefined) => {
    if (avg === undefined) return 'var(--color-secondary)';
    // Normalize 0-1
    const t = (avg - stats.minCellTime) / (stats.maxCellTime - stats.minCellTime || 1);
    const opacity = 0.1 + (t * 0.9);
    return `rgba(0, 47, 167, ${opacity})`; // Klein Blue with opacity
  };

  const getCompactDuration = (ms: number) => `${(ms / 1000).toFixed(gridSize >= 8 ? 1 : 2)}s`;

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 p-4 sm:p-6 bg-surface ${className}`}>
      {showTitle && (
        <div className="flex justify-between items-center">
          <div>
            <SubHeading>Aggregated Stats</SubHeading>
            <Label>Based on {stats.count} games</Label>
          </div>
        </div>
      )}

      {/* Heatmap Section */}
      <div>
        <Label className="mb-3 block">Positional Heatmap (Avg Time per Cell)</Label>
        <div className="grid grid-cols-3 gap-px bg-secondary border border-secondary rounded-sm overflow-hidden mb-4">
          <div className="bg-surface p-2.5 sm:p-3 text-center">
            <Label className="block mb-1">Fastest</Label>
            <Mono className="text-xs sm:text-sm font-medium">{formatDuration(stats.minCellTime)}</Mono>
          </div>
          <div className="bg-surface p-2.5 sm:p-3 text-center">
            <Label className="block mb-1">Typical</Label>
            <Mono className="text-xs sm:text-sm font-medium">{formatDuration(stats.overallCellTime)}</Mono>
          </div>
          <div className="bg-surface p-2.5 sm:p-3 text-center">
            <Label className="block mb-1">Slowest</Label>
            <Mono className="text-xs sm:text-sm font-medium">{formatDuration(stats.maxCellTime)}</Mono>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest text-ink-lighter">Faster</span>
          <div
            className="h-2 flex-1 rounded-full border border-secondary"
            style={{ background: 'linear-gradient(90deg, rgba(0,47,167,0.15), rgba(0,47,167,1))' }}
          />
          <span className="text-[10px] uppercase tracking-widest text-ink-lighter">Slower</span>
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
                  {fastRank && (
                    <span className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-[8px] sm:text-[9px] font-bold leading-none px-1 py-0.5 rounded bg-white/90 text-primary">
                      F{fastRank}
                    </span>
                  )}
                  {slowRank && (
                    <span className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 text-[8px] sm:text-[9px] font-bold leading-none px-1 py-0.5 rounded bg-ink/90 text-white">
                      S{slowRank}
                    </span>
                  )}
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
        <div className="text-[10px] text-ink-light mt-2 max-w-xs mx-auto text-center">
          Badge legend: `F1~F3` fastest and `S1~S3` slowest. Value is shown in-cell.
        </div>
      </div>

      {/* Number Stats Section */}
      <div>
        <Label className="mb-4 block">Time per Number</Label>
        <div className="h-40 sm:h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.numberAverages}>
              <XAxis 
                dataKey="number" 
                tick={{ fontSize: 10 }} 
                interval={gridSize > 5 ? 1 : 0}
              />
              <YAxis 
                hide 
              />
              <Tooltip
                cursor={{ fill: 'var(--color-secondary)' }}
                contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                formatter={(value: number) => [formatDuration(value), 'Avg Time']}
              />
              <Bar dataKey="avg" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
