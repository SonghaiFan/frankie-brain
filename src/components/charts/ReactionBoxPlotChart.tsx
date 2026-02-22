import React from 'react';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { Line } from '@visx/shape';

interface ReactionBoxPlotChartProps {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  p90: number;
  formatValue: (value: number) => string;
}

const CHART_MARGIN = { top: 8, right: 12, bottom: 22, left: 12 };

export const ReactionBoxPlotChart: React.FC<ReactionBoxPlotChartProps> = ({
  min,
  q1,
  median,
  q3,
  max,
  mean,
  p90,
  formatValue
}) => {
  return (
    <div className="relative h-full w-full min-w-0">
      <ParentSize debounceTime={0}>
        {({ width, height }) => {
          if (width <= 0 || height <= 0) return null;

          const innerWidth = Math.max(width - CHART_MARGIN.left - CHART_MARGIN.right, 1);
          const innerHeight = Math.max(height - CHART_MARGIN.top - CHART_MARGIN.bottom, 1);
          const centerY = innerHeight / 2;
          const boxHeight = Math.min(24, Math.max(innerHeight - 10, 12));
          const boxTop = centerY - boxHeight / 2;

          let domainMin = min;
          let domainMax = max;
          if (domainMax <= domainMin) {
            const pad = Math.max(Math.abs(domainMin) * 0.1, 1);
            domainMin -= pad;
            domainMax += pad;
          }

          const xScale = scaleLinear<number>({
            domain: [domainMin, domainMax],
            range: [0, innerWidth]
          });

          const xMin = xScale(min);
          const xQ1 = xScale(q1);
          const xMedian = xScale(median);
          const xQ3 = xScale(q3);
          const xMax = xScale(max);
          const xMean = xScale(mean);
          const xP90 = xScale(p90);

          return (
            <svg width={width} height={height} aria-label="Reaction time box plot">
              <Group left={CHART_MARGIN.left} top={CHART_MARGIN.top}>
                <Line from={{ x: xMin, y: centerY }} to={{ x: xMax, y: centerY }} stroke="#8a8a8a" strokeWidth={1.5} />
                <Line from={{ x: xMin, y: centerY - 8 }} to={{ x: xMin, y: centerY + 8 }} stroke="#8a8a8a" strokeWidth={1.5} />
                <Line from={{ x: xMax, y: centerY - 8 }} to={{ x: xMax, y: centerY + 8 }} stroke="#8a8a8a" strokeWidth={1.5} />

                <rect
                  x={Math.min(xQ1, xQ3)}
                  y={boxTop}
                  width={Math.max(Math.abs(xQ3 - xQ1), 2)}
                  height={boxHeight}
                  fill="rgba(0,47,167,0.18)"
                  stroke="#002FA7"
                  strokeWidth={1.5}
                  rx={4}
                />
                <Line from={{ x: xMedian, y: boxTop }} to={{ x: xMedian, y: boxTop + boxHeight }} stroke="#002FA7" strokeWidth={2} />

                <Line
                  from={{ x: xP90, y: boxTop - 6 }}
                  to={{ x: xP90, y: boxTop + boxHeight + 6 }}
                  stroke="#4b5563"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle cx={xMean} cy={centerY} r={4} fill="#ffffff" stroke="#002FA7" strokeWidth={2} />

                <text x={xMin} y={innerHeight + 14} textAnchor="start" fill="#8a8a8a" fontSize={10}>
                  Min {formatValue(min)}
                </text>
                <text x={xMedian} y={innerHeight + 14} textAnchor="middle" fill="#8a8a8a" fontSize={10}>
                  Median {formatValue(median)}
                </text>
                <text x={xMax} y={innerHeight + 14} textAnchor="end" fill="#8a8a8a" fontSize={10}>
                  Max {formatValue(max)}
                </text>
              </Group>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
};
