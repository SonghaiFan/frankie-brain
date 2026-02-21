import React, { useMemo, useState } from 'react';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';

export interface NumberBarDatum {
  number: number;
  avg: number;
}

interface NumberBarChartProps {
  data: NumberBarDatum[];
  formatValue: (value: number) => string;
}

const CHART_MARGIN = { top: 8, right: 8, bottom: 24, left: 8 };

export const NumberBarChart: React.FC<NumberBarChartProps> = ({ data, formatValue }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const safeHoveredIndex = useMemo(() => {
    if (hoveredIndex === null) return null;
    return hoveredIndex >= 0 && hoveredIndex < data.length ? hoveredIndex : null;
  }, [data.length, hoveredIndex]);

  const topFiveNumberSet = useMemo(() => {
    const top = [...data]
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(d => d.number);
    return new Set(top);
  }, [data]);

  return (
    <div className="relative h-full w-full min-w-0">
      <ParentSize debounceTime={0}>
        {({ width, height }) => {
          if (width <= 0 || height <= 0 || data.length === 0) return null;

          const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 1);
          const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 1);
          const maxValue = Math.max(...data.map(d => d.avg), 0);
          const domainMax = maxValue > 0 ? maxValue * 1.05 : 1;
          const tickStep = data.length > 40 ? 4 : data.length > 20 ? 2 : 1;

          const xScale = scaleBand<string>({
            domain: data.map(d => String(d.number)),
            range: [0, innerWidth],
            padding: 0.2
          });

          const yScale = scaleLinear<number>({
            domain: [0, domainMax],
            range: [innerHeight, 0],
            nice: true
          });

          const bars = data.map((datum, i) => {
            const x = xScale(String(datum.number)) ?? 0;
            const y = yScale(datum.avg);
            return {
              datum,
              index: i,
              x,
              y,
              width: xScale.bandwidth(),
              height: Math.max(innerHeight - y, 0)
            };
          });

          const activeBar = safeHoveredIndex === null ? null : bars[safeHoveredIndex];

          return (
            <>
              <svg width={width} height={height} aria-label="Average time per number">
                <Group left={CHART_MARGIN.left} top={CHART_MARGIN.top}>
                  {bars.map(bar => (
                    <Bar
                      key={`bar-${bar.datum.number}-${bar.index}`}
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill="var(--color-primary)"
                      rx={2}
                    />
                  ))}

                  {bars.map(bar => (
                    <Bar
                      key={`hit-${bar.datum.number}-${bar.index}`}
                      x={bar.x}
                      y={0}
                      width={bar.width}
                      height={innerHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(bar.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onTouchStart={() => setHoveredIndex(bar.index)}
                      onTouchEnd={() => setHoveredIndex(null)}
                    />
                  ))}

                  {bars.map(bar => {
                    if (bar.index % tickStep !== 0) return null;
                    return (
                      <text
                        key={`tick-${bar.datum.number}-${bar.index}`}
                        x={bar.x + bar.width / 2}
                        y={innerHeight + 12}
                        textAnchor="middle"
                        fill="#8a8a8a"
                        fontSize={10}
                      >
                        {bar.datum.number}
                      </text>
                    );
                  })}

                  {bars.map(bar => {
                    if (!topFiveNumberSet.has(bar.datum.number)) return null;
                    return (
                      <text
                        key={`top-${bar.datum.number}-${bar.index}`}
                        x={bar.x + bar.width / 2}
                        y={Math.max(bar.y - 4, 8)}
                        textAnchor="middle"
                        fill="#111"
                        fontSize={10}
                        fontWeight={600}
                      >
                        {bar.datum.number}
                      </text>
                    );
                  })}
                </Group>
              </svg>
              {activeBar && (
                <div
                  className="pointer-events-none absolute z-10 rounded border border-[#e0e0e0] bg-white px-2 py-1 text-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                  style={{
                    left: activeBar.x + activeBar.width / 2 + CHART_MARGIN.left,
                    top: activeBar.y + CHART_MARGIN.top,
                    transform: 'translate(-50%, -110%)'
                  }}
                >
                  <span>{formatValue(activeBar.datum.avg)}</span>
                  <span className="ml-1 text-ink-light">Avg Time</span>
                </div>
              )}
            </>
          );
        }}
      </ParentSize>
    </div>
  );
};
