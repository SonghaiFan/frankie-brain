import React, { useMemo, useState, useId } from 'react';
import { curveMonotoneX } from '@visx/curve';
import { GridColumns, GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, Line, LinePath } from '@visx/shape';

export interface HistoryPoint {
  index: number;
  value: number;
}

export interface HistoryReferenceLine {
  value: number;
  label: string;
  color?: string;
  dashArray?: string;
}

interface HistoryStepChartProps {
  data: HistoryPoint[];
  formatValue: (value: number) => string;
  seriesLabel: string;
  referenceLines?: HistoryReferenceLine[];
}

const CHART_MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };

export const HistoryStepChart: React.FC<HistoryStepChartProps> = ({ data, formatValue, seriesLabel, referenceLines = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const areaGradientId = useId().replace(/:/g, '');

  const safeHoveredIndex = useMemo(() => {
    if (hoveredIndex === null) return null;
    return hoveredIndex >= 0 && hoveredIndex < data.length ? hoveredIndex : null;
  }, [data.length, hoveredIndex]);

  return (
    <div className="relative h-full w-full min-w-0">
      <ParentSize debounceTime={0}>
        {({ width, height }) => {
          if (width <= 0 || height <= 0 || data.length === 0) return null;

          const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 1);
          const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 1);
          const values = data.map(d => d.value);
          const lineValues = referenceLines.map(line => line.value).filter(value => Number.isFinite(value));
          const allValues = lineValues.length ? [...values, ...lineValues] : values;
          const minValue = Math.min(...allValues);
          const maxValue = Math.max(...allValues);
          const span = maxValue - minValue;
          const pad = span > 0 ? span * 0.12 : Math.max(Math.abs(maxValue) * 0.1, 1);

          const xScale = scaleLinear<number>({
            domain: [0, Math.max(data.length - 1, 1)],
            range: [0, innerWidth]
          });

          const yScale = scaleLinear<number>({
            domain: [minValue - pad, maxValue + pad],
            range: [innerHeight, 0],
            nice: true
          });

          const points = data.map((datum, i) => {
            const xIndex = data.length > 1 ? i : 0;
            return {
              datum,
              index: i,
              x: xScale(xIndex),
              y: yScale(datum.value)
            };
          });

          const activePoint = safeHoveredIndex === null ? null : points[safeHoveredIndex];

          const findClosestPointIndex = (localX: number) => {
            let bestIdx = 0;
            let bestDist = Number.POSITIVE_INFINITY;
            for (let i = 0; i < points.length; i += 1) {
              const dist = Math.abs(points[i].x - localX);
              if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
              }
            }
            return bestIdx;
          };

          const handleMove = (clientX: number, rect: DOMRect) => {
            const localX = Math.max(0, Math.min(innerWidth, clientX - rect.left - CHART_MARGIN.left));
            setHoveredIndex(findClosestPointIndex(localX));
          };

          return (
            <>
              <svg width={width} height={height} aria-label={`${seriesLabel} history`}>
                <defs>
                  <linearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#002FA7" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#002FA7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Group left={CHART_MARGIN.left} top={CHART_MARGIN.top}>
                  <GridRows
                    scale={yScale}
                    width={innerWidth}
                    numTicks={4}
                    stroke="#d6e0f5"
                    strokeDasharray="2 4"
                    pointerEvents="none"
                  />
                  <GridColumns
                    scale={xScale}
                    height={innerHeight}
                    numTicks={4}
                    stroke="#eef3ff"
                    strokeDasharray="2 6"
                    pointerEvents="none"
                  />
                  {referenceLines.map((line, idx) => {
                    const y = yScale(line.value);
                    if (!Number.isFinite(y) || y < 0 || y > innerHeight) return null;
                    const color = line.color ?? '#002FA7';
                    return (
                      <React.Fragment key={`reference-line-${idx}-${line.label}`}>
                        <Line
                          from={{ x: 0, y }}
                          to={{ x: innerWidth, y }}
                          stroke={color}
                          strokeWidth={1.25}
                          strokeDasharray={line.dashArray ?? '2 3'}
                          pointerEvents="none"
                        />
                        <text
                          x={innerWidth - 2}
                          y={Math.max(10, y - 4)}
                          textAnchor="end"
                          fill={color}
                          fontSize={10}
                          fontWeight={600}
                        >
                          {line.label}
                        </text>
                      </React.Fragment>
                    );
                  })}
                  <AreaClosed
                    data={points}
                    x={d => d.x}
                    y={d => d.y}
                    y0={innerHeight}
                    curve={curveMonotoneX}
                    fill={`url(#${areaGradientId})`}
                  />
                  <LinePath
                    data={points}
                    x={d => d.x}
                    y={d => d.y}
                    curve={curveMonotoneX}
                    stroke="#002FA7"
                    strokeWidth={2}
                    fill="none"
                  />
                  {activePoint ? (
                    <>
                      <Line
                        from={{ x: activePoint.x, y: 0 }}
                        to={{ x: activePoint.x, y: innerHeight }}
                        stroke="#7b9ae3"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        pointerEvents="none"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r={5}
                        fill="#002FA7"
                        stroke="#fff"
                        strokeWidth={2}
                        pointerEvents="none"
                      />
                    </>
                  ) : null}
                  <rect
                    x={0}
                    y={0}
                    width={innerWidth}
                    height={innerHeight}
                    fill="transparent"
                    onMouseMove={event => handleMove(event.clientX, event.currentTarget.getBoundingClientRect())}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onTouchStart={event => {
                      const touch = event.touches[0];
                      if (!touch) return;
                      handleMove(touch.clientX, event.currentTarget.getBoundingClientRect());
                    }}
                    onTouchMove={event => {
                      const touch = event.touches[0];
                      if (!touch) return;
                      handleMove(touch.clientX, event.currentTarget.getBoundingClientRect());
                    }}
                    onTouchEnd={() => setHoveredIndex(null)}
                  />
                </Group>
              </svg>
              {activePoint ? (
                <div
                  className="pointer-events-none absolute z-10 rounded-sm border border-[#d6e0f5] bg-white px-2 py-1 font-mono text-[12px] shadow-[0_4px_12px_rgba(0,47,167,0.12)]"
                  style={{
                    left: activePoint.x + CHART_MARGIN.left,
                    top: activePoint.y + CHART_MARGIN.top,
                    transform: 'translate(10px, -120%)'
                  }}
                >
                  <span className="text-ink">{formatValue(activePoint.datum.value)}</span>
                  <span className="ml-1 text-ink-light">{seriesLabel}</span>
                </div>
              ) : null}
            </>
          );
        }}
      </ParentSize>
    </div>
  );
};
