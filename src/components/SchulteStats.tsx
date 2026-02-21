import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GameResult } from '../types';
import { SubHeading, Label, Mono, Text } from './ui/Typography';
import { formatTime } from './GameShell';

interface SchulteStatsProps {
  history: GameResult[];
  gridSize: number;
  onClose: () => void;
}

export const SchulteStats: React.FC<SchulteStatsProps> = ({ history, gridSize, onClose }) => {
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

    return { cellAverages, numberAverages, minCellTime, maxCellTime, count: relevant.length };
  }, [history, gridSize]);

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <Text>No detailed tracking data available for this grid size.</Text>
      </div>
    );
  }

  // Helper for heatmap color
  const getCellColor = (avg: number) => {
    // Normalize 0-1
    const t = (avg - stats.minCellTime) / (stats.maxCellTime - stats.minCellTime || 1);
    // Interpolate from Green (fast) to Red (slow)
    // Or maybe White to Blue (Heatmap style)
    // Let's use opacity of a red overlay for "hot/slow" spots?
    // Or standard heatmap: Blue (fast) -> Red (slow)
    
    // Simple approach: Opacity of primary color
    // Fast = High Opacity? No, usually Hot = Red.
    // Let's do: Fast = Green/Blue, Slow = Red/Orange.
    
    // Let's stick to the app theme.
    // Fast = Light Blue (or transparent), Slow = Dark Blue (Primary)
    // So higher time = higher opacity of Primary color.
    
    const opacity = 0.1 + (t * 0.9);
    return `rgba(0, 47, 167, ${opacity})`; // Klein Blue with opacity
  };

  return (
    <div className="flex flex-col gap-8 p-6 bg-surface">
      <div className="flex justify-between items-center">
        <div>
          <SubHeading>Aggregated Stats</SubHeading>
          <Label>Based on {stats.count} games</Label>
        </div>
      </div>

      {/* Heatmap Section */}
      <div>
        <Label className="mb-4 block">Positional Heatmap (Avg Time)</Label>
        <div className="flex justify-center">
          <div 
            className={`w-full max-w-xs aspect-square grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary`}
            style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
              const cellStat = stats.cellAverages.find(c => c.index === idx);
              const avg = cellStat?.avg || 0;
              const color = getCellColor(avg);
              
              return (
                <div
                  key={idx}
                  className="flex items-center justify-center relative group"
                  style={{ backgroundColor: color }}
                >
                  <span className={`text-[10px] font-medium ${avg > (stats.maxCellTime + stats.minCellTime)/2 ? 'text-white' : 'text-ink'}`}>
                    {Math.round(avg)}
                  </span>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-ink text-white text-[10px] p-1 rounded whitespace-nowrap z-10">
                    Avg: {formatTime(avg)}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-ink-light mt-2 max-w-xs mx-auto">
          <span>Fastest: {formatTime(stats.minCellTime)}s</span>
          <span>Slowest: {formatTime(stats.maxCellTime)}s</span>
        </div>
      </div>

      {/* Number Stats Section */}
      <div>
        <Label className="mb-4 block">Time per Number</Label>
        <div className="h-48 w-full">
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
                formatter={(value: number) => [`${formatTime(value)}s`, 'Avg Time']}
              />
              <Bar dataKey="avg" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
