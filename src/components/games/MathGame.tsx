import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChartNoAxesColumn, Settings } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { GameProps, GameResult, Difficulty, MathAttemptEvent, MathOperation } from '../../types';
import { ResultScreen } from '../ResultScreen';
import { Button } from '../ui/Button';
import { Label, Mono, SubHeading, Heading } from '../ui/Typography';
import { MathStats } from '../MathStats';
type QuestionTemplate = 'result' | 'operand1' | 'operand2';

interface MathProblem {
  id: string;
  question: string;
  answer: number;
  operation: MathOperation;
}

const generateMathProblem = (difficulty: Difficulty): MathProblem => {
  let num1, num2, answer, operation: MathOperation;
  const operations: MathOperation[] = ['+', '-', '*', '/'];
  
  // Select operation based on difficulty
  if (difficulty === 'easy') {
    operation = Math.random() > 0.5 ? '+' : '-';
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
  } else if (difficulty === 'medium') {
    operation = operations[Math.floor(Math.random() * 3)]; // +, -, *
    num1 = Math.floor(Math.random() * 50) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
  } else {
    operation = operations[Math.floor(Math.random() * 4)]; // +, -, *, /
    num1 = Math.floor(Math.random() * 100) + 1;
    num2 = Math.floor(Math.random() * 50) + 1;
  }

  // Adjust numbers for clean division and subtraction
  if (operation === '/') {
    answer = Math.floor(Math.random() * 12) + 2; // answer between 2 and 13
    num2 = Math.floor(Math.random() * 10) + 2;
    num1 = answer * num2;
  } else if (operation === '-') {
    if (num1 < num2) [num1, num2] = [num2, num1];
    answer = num1 - num2;
  } else if (operation === '*') {
    if (difficulty === 'medium') {
        num1 = Math.floor(Math.random() * 12) + 2;
        num2 = Math.floor(Math.random() * 12) + 2;
    } else {
        num1 = Math.floor(Math.random() * 20) + 2;
        num2 = Math.floor(Math.random() * 15) + 2;
    }
    answer = num1 * num2;
  } else {
    answer = num1 + num2;
  }

  const symbol = operation === '*' ? '×' : operation === '/' ? '÷' : operation;
  const templates: QuestionTemplate[] =
    difficulty === 'easy'
      ? ['result', 'operand2', 'result']
      : difficulty === 'medium'
        ? ['result', 'operand2', 'operand1']
        : ['operand2', 'operand1', 'result', 'operand2'];
  const template = templates[Math.floor(Math.random() * templates.length)];

  let question = '';
  if (template === 'operand1') {
    question = `? ${symbol} ${num2} = ${answer}`;
    answer = num1;
  } else if (template === 'operand2') {
    question = `${num1} ${symbol} ? = ${answer}`;
    answer = num2;
  } else {
    question = `${num1} ${symbol} ${num2} = ?`;
  }
  
  return {
    id: crypto.randomUUID(),
    question,
    answer,
    operation,
  };
};

export default function MathGame({ playSound, history, onComplete }: GameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const [successValue, setSuccessValue] = useState('');
  const [successOriginY, setSuccessOriginY] = useState<number | null>(null);
  const [isConfirmingSuccess, setIsConfirmingSuccess] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [inputFlash, setInputFlash] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const timerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const confirmUnlockTimerRef = useRef<number | null>(null);
  const wrongFlashTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef<MathAttemptEvent[]>([]);
  const problemShownAtRef = useRef<number>(performance.now());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredHistory = useMemo(
    () => history.filter(h => h.gameType === 'math' && h.difficulty === difficulty),
    [history, difficulty]
  );

  // Stats
  const stats = useMemo(() => {
    if (!filteredHistory.length) return { best: null, average: null, data: [] as Array<{ index: number; value: number }> };

    const scores = filteredHistory.map(r => r.score);
    const best = Math.max(...scores); // Higher is better for math
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    const data = filteredHistory.slice(0, 20).reverse().map((r, i) => ({
      index: i,
      value: r.score
    }));

    return { best, average, data };
  }, [filteredHistory]);

  const historyForResult = useMemo(() => {
    if (!lastResult || lastResult.gameType !== 'math' || lastResult.difficulty !== difficulty) {
      return filteredHistory;
    }
    const exists = filteredHistory.some(item => item.id === lastResult.id);
    return exists ? filteredHistory : [lastResult, ...filteredHistory];
  }, [filteredHistory, lastResult, difficulty]);

  const resultHistoryData = useMemo(
    () => historyForResult.slice(0, 20).reverse().map((item, index) => ({ index, value: item.score })),
    [historyForResult]
  );

  const startGame = () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (confirmUnlockTimerRef.current) clearTimeout(confirmUnlockTimerRef.current);
    if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
    setScore(0);
    setMistakes(0);
    setTimeLeft(60);
    setUserAnswer('');
    setShowSuccessPulse(false);
    setSuccessValue('');
    setSuccessOriginY(null);
    setIsConfirmingSuccess(false);
    setInputFlash(false);
    setWrongFlash(false);
    attemptsRef.current = [];
    problemShownAtRef.current = performance.now();
    setProblem(generateMathProblem(difficulty));
    setGameState('playing');
    playSound('click');
  };

  useEffect(() => {
    if (gameState === 'playing' && !isConfirmingSuccess) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [gameState, problem?.id, isConfirmingSuccess]);

  useEffect(() => {
    if (gameState === 'playing' && problem) {
      problemShownAtRef.current = performance.now();
    }
  }, [gameState, problem?.id]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            finishGame(score, mistakes);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, score, mistakes]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (confirmUnlockTimerRef.current) clearTimeout(confirmUnlockTimerRef.current);
      if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
    };
  }, []);

  const finishGame = (finalScore: number, finalMistakes: number) => {
    const result: GameResult = {
      id: crypto.randomUUID(),
      gameType: 'math',
      score: finalScore,
      mistakes: finalMistakes,
      difficulty,
      date: Date.now(),
      mathTrackingData: {
        attempts: [...attemptsRef.current]
      }
    };
    onComplete(result);
    setLastResult(result);
    setGameState('finished');
    playSound('win');

    const shouldReduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!shouldReduceMotion && (!stats.best || finalScore > stats.best)) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#002FA7', '#002380', '#e5e5e5']
      });
    }
  };

  if (gameState === 'finished' && lastResult) {
    return (
      <ResultScreen 
        result={lastResult} 
        average={stats.average} 
        best={stats.best}
        onMenu={() => {
          setShowInsights(false);
          setGameState('menu');
        }}
        onReplay={startGame}
        isRecord={!stats.best || lastResult.score > stats.best}
        unit=""
        historyData={resultHistoryData}
        historyLabel={`History (${difficulty})`}
      />
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-surface">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
           <SubHeading>{showInsights ? 'Insights' : 'Settings'}</SubHeading>
           <div
             className="inline-flex items-center rounded-full border border-secondary bg-secondary p-0.5"
             role="tablist"
             aria-label="Quick Math menu view switcher"
           >
             <button
               onClick={() => setShowInsights(false)}
               role="tab"
               aria-selected={!showInsights}
               className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                 !showInsights ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
               }`}
               title="Show Settings"
             >
               <Settings className="h-3.5 w-3.5" />
               <span>Settings</span>
             </button>
             <button
               onClick={() => setShowInsights(true)}
               role="tab"
               aria-selected={showInsights}
               className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                 showInsights ? 'bg-surface text-ink shadow-sm' : 'text-ink-light hover:text-ink'
               }`}
               title="Show Insights"
             >
               <ChartNoAxesColumn className="h-3.5 w-3.5" />
               <span>Insights</span>
             </button>
           </div>
        </div>

        {showInsights ? (
          <div className="flex-1 space-y-6">
            <MathStats history={history} difficulty={difficulty} showTitle={false} className="p-0 sm:p-0" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-6 sm:space-y-8">
            <div>
              <Label className="mb-4 block text-center">
                Difficulty
              </Label>
              <div className="flex justify-center gap-2 flex-wrap">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-3 sm:px-4 py-2 rounded-full font-medium text-[11px] sm:text-xs uppercase tracking-wider transition-[background-color,color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
                      difficulty === d ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-ink-light hover:bg-secondary-hover'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-secondary border border-secondary rounded-md overflow-hidden">
              <div className="bg-surface p-3 sm:p-4 text-left">
                <Label className="mb-1 block">Best Score</Label>
                <Mono className="text-base sm:text-lg font-medium">
                  {stats.best !== null ? stats.best : '--'}
                </Mono>
              </div>
              <div className="bg-surface p-3 sm:p-4 text-left">
                <Label className="mb-1 block">Avg Score</Label>
                <Mono className="text-base sm:text-lg font-medium">
                  {stats.average !== null ? Math.round(stats.average) : '--'}
                </Mono>
              </div>
            </div>

            <Button onClick={startGame} fullWidth size="lg">
              Start (60s)
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-surface">
      <div className="p-3 sm:p-4 flex justify-between items-center border-b border-secondary bg-surface">
         <Mono className="text-lg sm:text-xl font-medium tabular-nums">{timeLeft}s</Mono>
         <Label className="text-[9px] sm:text-[10px]">Score: {score}</Label>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 bg-surface">
        <div className="relative w-full max-w-sm">
          <div className="relative mb-8 min-h-[4.5rem] sm:min-h-[5rem]">
            <AnimatePresence mode="wait" initial={false}>
              {problem ? (
                <motion.div
                  key={problem.id}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: isConfirmingSuccess ? 0 : 1, y: isConfirmingSuccess ? 28 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isConfirmingSuccess ? { opacity: 0, y: -34 } : { opacity: 0, y: -8 }}
                  transition={{ duration: isConfirmingSuccess ? 0.24 : 0.16, ease: [0.2, 0, 0, 1] }}
                >
                  <Heading className="text-4xl sm:text-5xl text-center">{problem.question}</Heading>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={userAnswer}
            disabled={isConfirmingSuccess}
            onBlur={() => {
              if (gameState === 'playing' && !isConfirmingSuccess) {
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              if (!/^\d*$/.test(value)) return;
              setUserAnswer(value);
              if (isConfirmingSuccess) return;
              if (!problem || value === '') return;
              const answerText = String(problem.answer);
              const parsedInput = Number.parseInt(value, 10);
              const elapsed = Math.max(0, Math.round(performance.now() - problemShownAtRef.current));

              if (value === answerText) {
                attemptsRef.current.push({
                  question: problem.question,
                  operation: problem.operation,
                  expected: problem.answer,
                  input: Number.isNaN(parsedInput) ? null : parsedInput,
                  responseTime: elapsed,
                  isCorrect: true,
                  at: Date.now()
                });
                playSound('success');
                setScore(prev => prev + 1);
                setInputFlash(true);
                setWrongFlash(false);
                setSuccessValue(answerText);
                setSuccessOriginY(
                  inputRef.current ? inputRef.current.offsetTop + (inputRef.current.offsetHeight / 2) : null
                );
                setIsConfirmingSuccess(true);
                setPulseKey(prev => prev + 1);
                setShowSuccessPulse(true);
                if (successTimerRef.current) clearTimeout(successTimerRef.current);
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                if (confirmUnlockTimerRef.current) clearTimeout(confirmUnlockTimerRef.current);
                if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
                successTimerRef.current = window.setTimeout(() => {
                  setShowSuccessPulse(false);
                  setSuccessValue('');
                  setSuccessOriginY(null);
                }, 340);
                flashTimerRef.current = window.setTimeout(() => setInputFlash(false), 180);
                setProblem(generateMathProblem(difficulty));
                setUserAnswer('');
                confirmUnlockTimerRef.current = window.setTimeout(() => {
                  setIsConfirmingSuccess(false);
                }, 340);
                return;
              }

              if (!answerText.startsWith(value)) {
                attemptsRef.current.push({
                  question: problem.question,
                  operation: problem.operation,
                  expected: problem.answer,
                  input: Number.isNaN(parsedInput) ? null : parsedInput,
                  responseTime: elapsed,
                  isCorrect: false,
                  at: Date.now()
                });
                playSound('error');
                setMistakes(prev => prev + 1);
                setUserAnswer('');
                setInputFlash(false);
                setWrongFlash(true);
                problemShownAtRef.current = performance.now();
                if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
                wrongFlashTimerRef.current = window.setTimeout(() => setWrongFlash(false), 170);
              }
            }}
            className={`w-full border-0 border-b-2 px-2 py-3 text-center text-4xl sm:text-5xl font-medium tabular-nums text-ink bg-transparent outline-none transition-[border-color,color] duration-[var(--motion-fast)] ease-[var(--ease-standard)] ${
              wrongFlash
                ? 'border-[var(--color-error)] math-input-shake'
                : inputFlash
                  ? 'border-primary'
                  : 'border-secondary focus:border-primary'
            }`}
            placeholder="?"
            autoComplete="off"
            aria-label="Type your answer"
          />
          <AnimatePresence>
            {showSuccessPulse ? (
              <motion.div
                key={pulseKey}
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl font-semibold tabular-nums text-primary"
                style={{ top: successOriginY !== null ? `${successOriginY}px` : '50%' }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 1, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [0, 0, 0],
                  y: [0, -18, -52],
                  scale: [0.96, 1.04, 0.9],
                  rotate: [0, 0, 0]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
              >
                {successValue}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
