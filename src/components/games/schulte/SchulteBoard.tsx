import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, RotateCcw } from 'lucide-react';
import { SchulteTableStyle, SchulteTableType, SchulteTrainingMode } from '../../../types';
import { formatTime } from '../../GameShell';
import { Button } from '../../ui/Button';
import { Label, Mono } from '../../ui/Typography';
import { GorbovSymbol, VoronoiCell } from './schulteCore';

interface SchulteBoardProps {
  gameState: 'countdown' | 'playing';
  currentTime: number;
  trainingMode: SchulteTrainingMode;
  canUseTargetedMode: boolean;
  onReset: () => void;
  countdownValue: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPointerMove: (e: React.PointerEvent) => void;
  isVoronoiStyle: boolean;
  gridSize: number;
  numbers: number[];
  voronoiCells: VoronoiCell[];
  errorCell: number | null;
  successCell: number | null;
  tableType: SchulteTableType;
  tableStyle: SchulteTableStyle;
  gorbovSymbolById: Map<number, GorbovSymbol>;
  onCellPointerDown: (number: number, index: number) => void;
  getSymbolLabel: (id: number) => string;
  currentTarget: number | null;
}

export const SchulteBoard: React.FC<SchulteBoardProps> = ({
  gameState,
  currentTime,
  trainingMode,
  canUseTargetedMode,
  onReset,
  countdownValue,
  containerRef,
  onPointerMove,
  isVoronoiStyle,
  gridSize,
  numbers,
  voronoiCells,
  errorCell,
  successCell,
  tableType,
  tableStyle,
  gorbovSymbolById,
  onCellPointerDown,
  getSymbolLabel,
  currentTarget
}) => {
  const isRoundStyle = tableStyle === 'round';
  const isColoredStyle = tableStyle === 'colored';

  const getColoredCellStyle = (num: number): React.CSSProperties => {
    if (numbers.length <= 1) {
      return { backgroundColor: 'hsl(219 45% 82%)', color: 'var(--color-ink)' };
    }
    const normalized = (num - 1) / (numbers.length - 1);
    const saturation = 30 + normalized * 60;
    const lightness = 90 - normalized * 30;
    return {
      backgroundColor: `hsl(219 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`,
      color: lightness < 66 ? '#ffffff' : 'var(--color-ink)'
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface relative">
      <div className="relative p-3 sm:p-4 flex justify-center border-b border-secondary bg-surface">
        <div className="flex items-center gap-2">
          <Mono className="text-xl sm:text-2xl font-medium tabular-nums">{formatTime(currentTime)}</Mono>
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
          onClick={onReset}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 sm:right-4 sm:px-3"
          aria-label="Reset current round"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="text-[10px] sm:text-xs">Reset</span>
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 bg-surface relative overflow-hidden">
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
            onPointerMove={onPointerMove}
            className={`${isVoronoiStyle ? 'w-full h-full relative bg-secondary border border-secondary overflow-hidden' : `w-full h-full grid ${gridSize >= 8 ? 'gap-px' : 'gap-1'} bg-secondary border border-secondary`} transition-[filter,opacity,transform] duration-[var(--motion-normal)] ease-[var(--ease-standard)]
              ${gameState === 'countdown' ? 'blur-md opacity-40 scale-95' : 'blur-0 opacity-100 scale-100'}
            `}
            style={isVoronoiStyle ? undefined : { gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {isVoronoiStyle ? (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="h-full w-full touch-manipulation"
                style={{ pointerEvents: gameState === 'countdown' ? 'none' : 'auto' }}
              >
                {numbers.map((num, index) => {
                  const cell = voronoiCells[index];
                  if (!cell) return null;

                  const isError = errorCell === num;
                  const isSuccess = successCell === num;
                  const isGorbov = tableType === 'gorbov-schulte';
                  const gorbovSymbol = gorbovSymbolById.get(num);
                  const isGorbovBlack = isGorbov && gorbovSymbol?.tone === 'black';
                  const fillColor = isError
                    ? 'var(--color-error)'
                    : isSuccess
                      ? 'var(--color-primary)'
                      : isGorbovBlack
                        ? '#000000'
                        : 'var(--color-surface)';
                  const textColor = isError || isSuccess || isGorbovBlack ? '#ffffff' : 'var(--color-ink)';
                  const fontSize = gridSize >= 8 ? 3.7 : gridSize >= 6 ? 4.6 : 5.5;

                  return (
                    <g key={num} onPointerDown={() => onCellPointerDown(num, index)} style={{ cursor: 'pointer' }}>
                      <polygon
                        points={cell.pointsAttr}
                        fill={fillColor}
                        stroke="var(--color-secondary)"
                        strokeWidth={0.45}
                        vectorEffect="non-scaling-stroke"
                        style={{ transition: 'fill var(--motion-fast) var(--ease-standard)' }}
                      />
                      <text
                        x={(cell.centroid.x * 100).toFixed(3)}
                        y={(cell.centroid.y * 100).toFixed(3)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize}
                        fontWeight="600"
                        fill={textColor}
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {getSymbolLabel(num)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              numbers.map((num, index) => {
                const isError = errorCell === num;
                const isSuccess = successCell === num;
                const isGorbov = tableType === 'gorbov-schulte';
                const gorbovSymbol = gorbovSymbolById.get(num);
                const isGorbovBlack = isGorbov && gorbovSymbol?.tone === 'black';
                const shapeClass = isRoundStyle ? 'rounded-full border border-secondary m-0.5' : '';
                const colorStateClass = isError
                  ? 'bg-[var(--color-error)] text-white'
                  : isSuccess
                    ? 'bg-primary text-white'
                    : isGorbovBlack
                      ? 'bg-black text-white hover:brightness-95 active:brightness-90'
                      : isGorbov
                        ? 'bg-surface text-ink hover:bg-secondary active:brightness-95'
                        : isColoredStyle
                          ? 'hover:brightness-95 active:brightness-90'
                          : 'bg-surface hover:bg-secondary text-ink active:brightness-95';
                const coloredStyle =
                  !isError && !isSuccess && !isGorbov && isColoredStyle
                    ? getColoredCellStyle(num)
                    : undefined;

                return (
                  <button
                    key={num}
                    onPointerDown={() => onCellPointerDown(num, index)}
                    disabled={gameState === 'countdown'}
                    className={`
                      ${shapeClass}
                      ${colorStateClass}
                      font-medium flex items-center justify-center transition-colors touch-manipulation
                      ${gridSize >= 8 ? 'text-sm sm:text-lg' : gridSize >= 6 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}
                    `}
                    style={coloredStyle}
                  >
                    {getSymbolLabel(num)}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 border-t border-secondary bg-surface flex justify-center items-center gap-2">
        <Label>Find</Label>
        {tableType === 'gorbov-schulte' && currentTarget !== null && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              gorbovSymbolById.get(currentTarget)?.tone === 'black'
                ? 'bg-black text-white'
                : 'border border-secondary bg-surface text-ink'
            }`}
          >
            {gorbovSymbolById.get(currentTarget)?.tone === 'black' ? 'Black' : 'White'}
          </span>
        )}
        <span className="text-lg sm:text-xl font-bold">
          {currentTarget !== null ? getSymbolLabel(currentTarget) : '--'}
        </span>
      </div>
    </div>
  );
};
