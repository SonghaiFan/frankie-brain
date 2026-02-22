import React, { useMemo } from 'react';
import { Difficulty, GameResult, MathOperation } from '../types';
import { HistoryStepChart } from './charts/HistoryStepChart';
import { Label, Mono, SubHeading, Text } from './ui/Typography';

interface MathStatsProps {
  history: GameResult[];
  difficulty: Difficulty;
  showTitle?: boolean;
  className?: string;
}

const OP_ORDER: MathOperation[] = ['+', '-', '*', '/'];
const OP_LABEL: Record<MathOperation, string> = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};

export const MathStats: React.FC<MathStatsProps> = ({ history, difficulty, showTitle = true, className = '' }) => {
  const stats = useMemo(() => {
    const relevant = history.filter(h => h.gameType === 'math' && h.difficulty === difficulty);
    if (relevant.length === 0) return null;

    const attempts = relevant.flatMap(item => item.mathTrackingData?.attempts ?? []);
    const scoreHistory = relevant.slice(0, 20).reverse().map((item, index) => ({
      index,
      value: item.score
    }));

    if (attempts.length === 0) {
      return {
        relevantCount: relevant.length,
        scoreHistory,
        attempts: [],
        opStats: [],
        overallAccuracy: 0,
        avgCorrectMs: null as number | null
      };
    }

    const opMap = new Map<MathOperation, { attempts: number; correct: number; correctMsTotal: number }>(
      OP_ORDER.map(op => [op, { attempts: 0, correct: 0, correctMsTotal: 0 }])
    );

    attempts.forEach(attempt => {
      const bucket = opMap.get(attempt.operation);
      if (!bucket) return;
      bucket.attempts += 1;
      if (attempt.isCorrect) {
        bucket.correct += 1;
        bucket.correctMsTotal += attempt.responseTime;
      }
    });

    const opStats = OP_ORDER.map(op => {
      const bucket = opMap.get(op)!;
      const accuracy = bucket.attempts > 0 ? (bucket.correct / bucket.attempts) * 100 : 0;
      const avgCorrectMs = bucket.correct > 0 ? bucket.correctMsTotal / bucket.correct : null;
      return {
        op,
        attempts: bucket.attempts,
        correct: bucket.correct,
        accuracy,
        avgCorrectMs
      };
    }).filter(item => item.attempts > 0);

    const totalAttempts = attempts.length;
    const totalCorrect = attempts.filter(item => item.isCorrect).length;
    const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    const avgCorrectMs = totalCorrect > 0
      ? attempts.filter(item => item.isCorrect).reduce((sum, item) => sum + item.responseTime, 0) / totalCorrect
      : null;

    return {
      relevantCount: relevant.length,
      scoreHistory,
      attempts,
      opStats,
      overallAccuracy,
      avgCorrectMs
    };
  }, [history, difficulty]);

  if (!stats) {
    return (
      <div className="p-6 sm:p-8 text-center">
        <Text>No games played for this difficulty yet.</Text>
      </div>
    );
  }

  const maxAvgMs = Math.max(...stats.opStats.map(item => item.avgCorrectMs ?? 0), 1);
  const formatMs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 p-4 sm:p-6 bg-surface ${className}`}>
      {showTitle ? (
        <div>
          <SubHeading>Quick Math Insights</SubHeading>
          <Label>Based on {stats.relevantCount} games</Label>
        </div>
      ) : null}

      {stats.scoreHistory.length > 0 ? (
        <div>
          <Label className="mb-3 block">Score History</Label>
          <div className="h-36 sm:h-40 w-full min-w-0 -ml-2">
            <HistoryStepChart
              data={stats.scoreHistory}
              formatValue={value => `${Math.round(value)}`}
              seriesLabel="Score"
            />
          </div>
        </div>
      ) : null}

      {stats.attempts.length === 0 ? (
        <Text>Detailed per-operation analytics will appear after you play new rounds.</Text>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px bg-secondary border border-secondary rounded-md overflow-hidden">
            <div className="bg-surface p-3 sm:p-4 text-left">
              <Label className="mb-1 block">Accuracy</Label>
              <Mono className="text-base sm:text-lg font-medium">{stats.overallAccuracy.toFixed(1)}%</Mono>
            </div>
            <div className="bg-surface p-3 sm:p-4 text-left">
              <Label className="mb-1 block">Avg Solve</Label>
              <Mono className="text-base sm:text-lg font-medium">
                {stats.avgCorrectMs !== null ? formatMs(stats.avgCorrectMs) : '--'}
              </Mono>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Operation Accuracy</Label>
            <div className="space-y-3">
              {stats.opStats.map(item => (
                <div key={`acc-${item.op}`} className="rounded-sm border border-secondary bg-surface p-2.5 sm:p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Mono className="text-sm font-semibold">{OP_LABEL[item.op]}</Mono>
                    <Mono className="text-xs text-ink-light">{item.correct}/{item.attempts}</Mono>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-normal)] ease-[var(--ease-standard)]"
                      style={{ width: `${Math.max(6, item.accuracy)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-right">
                    <Mono className="text-[11px] text-ink-light">{item.accuracy.toFixed(1)}%</Mono>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Avg Solve Time (Correct Only)</Label>
            <div className="space-y-3">
              {stats.opStats.map(item => (
                <div key={`time-${item.op}`} className="rounded-sm border border-secondary bg-surface p-2.5 sm:p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Mono className="text-sm font-semibold">{OP_LABEL[item.op]}</Mono>
                    <Mono className="text-xs text-ink-light">
                      {item.avgCorrectMs !== null ? formatMs(item.avgCorrectMs) : '--'}
                    </Mono>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-ink transition-[width] duration-[var(--motion-normal)] ease-[var(--ease-standard)]"
                      style={{ width: `${item.avgCorrectMs !== null ? Math.max(6, (item.avgCorrectMs / maxAvgMs) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
