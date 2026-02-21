import React, { useMemo, useState } from 'react';
import { curveStepAfter } from '@visx/curve';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scalePoint } from '@visx/scale';
import { LinePath } from '@visx/shape';

export interface HistoryPoint {
  index: number;
  value: number;
}

interface HistoryStepChartProps {
  data: HistoryPoint[];
  formatValue: (value: number) => string;
  seriesLabel: string;
}

const CHART_MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };

export const HistoryStepChart: React.FC<HistoryStepChartProps> = ({ data, formatValue, seriesLabel }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
          const minValue = Math.min(...values);
          const maxValue = Math.max(...values);
          const span = maxValue - minValue;
          const pad = span > 0 ? span * 0.1 : Math.max(Math.abs(maxValue) * 0.1, 1);

          const xScale = scalePoint<number>({
            domain: data.map(d => d.index),
            range: [0, innerWidth],
            padding: 0.5
          });

          const yScale = scaleLinear<number>({
            domain: [minValue - pad, maxValue + pad],
            range: [innerHeight, 0],
            nice: true
          });

          const points = data.map((datum, i) => ({
            datum,
            index: i,
            x: xScale(datum.index) ?? 0,
            y: yScale(datum.value)
          }));

          const activePoint = safeHoveredIndex === null ? null : points[safeHoveredIndex];

          return (
            <>
              <svg width={width} height={height} aria-label={`${seriesLabel} history`}>
                <Group left={CHART_MARGIN.left} top={CHART_MARGIN.top}>
                  <GridRows
                    scale={yScale}
                    width={innerWidth}
                    numTicks={4}
                    stroke="#e0e0e0"
                    strokeDasharray="3 3"
                  />
                  <LinePath
                    data={data}
                    x={d => xScale(d.index) ?? 0}
                    y={d => yScale(d.value)}
                    curve={curveStepAfter}
                    stroke="#111"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  {points.map(point => (
                    <circle
                      key={`${point.datum.index}-${point.index}`}
                      cx={point.x}
                      cy={point.y}
                      r={activePoint?.index === point.index ? 4 : 2}
                      fill={activePoint?.index === point.index ? '#002FA7' : '#111'}
                    />
                  ))}
                  {points.map(point => (
                    <circle
                      key={`hit-${point.datum.index}-${point.index}`}
                      cx={point.x}
                      cy={point.y}
                      r={12}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(point.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onTouchStart={() => setHoveredIndex(point.index)}
                      onTouchEnd={() => setHoveredIndex(null)}
                    />
                  ))}
                </Group>
              </svg>
              {activePoint && (
                <div
                  className="pointer-events-none absolute z-10 rounded border border-[#e0e0e0] bg-white px-2 py-1 font-mono text-[12px] shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
                  style={{
                    left: activePoint.x + CHART_MARGIN.left,
                    top: activePoint.y + CHART_MARGIN.top,
                    transform: 'translate(8px, -110%)'
                  }}
                >
                  <span>{formatValue(activePoint.datum.value)}</span>
                  <span className="ml-1 text-ink-light">{seriesLabel}</span>
                </div>
              )}
            </>
          );
        }}
      </ParentSize>
    </div>
  );
};
