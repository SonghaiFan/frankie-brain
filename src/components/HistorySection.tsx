import React from 'react';
import { HistoryPoint, HistoryStepChart } from './charts/HistoryStepChart';
import { Label } from './ui/Typography';

interface HistorySectionProps {
  label: string;
  data: HistoryPoint[];
  seriesLabel: string;
  formatValue: (value: number) => string;
  className?: string;
  chartClassName?: string;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  label,
  data,
  seriesLabel,
  formatValue,
  className = '',
  chartClassName = 'h-36 sm:h-40 w-full min-w-0 -ml-2'
}) => {
  if (data.length === 0) return null;

  return (
    <div className={className}>
      <Label className="mb-3 block">{label}</Label>
      <div className={chartClassName}>
        <HistoryStepChart
          data={data}
          formatValue={formatValue}
          seriesLabel={seriesLabel}
        />
      </div>
    </div>
  );
};
