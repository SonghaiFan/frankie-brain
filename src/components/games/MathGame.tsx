import React, { useState, useEffect, useRef, useMemo } from 'react';
import { History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GameProps, GameResult, Difficulty } from '../../types';
import { ResultScreen } from '../ResultScreen';

type MathOperation = '+' | '-' | '*' | '/';

interface MathProblem {
  id: string;
  question: string;
  answer: number;
  options: number[];
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

  const question = `${num1} ${operation} ${num2}`;
  
  // Generate options
  const options = new Set<number>();
  options.add(answer);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const wrong = answer + offset;
    if (wrong !== answer && wrong > 0) options.add(wrong);
  }

  return {
    id: crypto.randomUUID(),
    question,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
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
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Stats
  const stats = useMemo(() => {
    const relevant = history.filter(h => h.difficulty === difficulty);
    if (!relevant.length) return { best: null, average: null, data: [] };
    
    const scores = relevant.map(r => r.score);
    const best = Math.max(...scores); // Higher is better for math
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const data = relevant.slice(0, 20).reverse().map((r, i) => ({
      index: i,
      value: r.score,
      date: r.date
    }));

    return { best, average, data };
  }, [history, difficulty]);

  const startGame = () => {
    setScore(0);
    setMistakes(0);
    setTimeLeft(60);
    setProblem(generateMathProblem(difficulty));
    setGameState('playing');
    playSound('click');
  };

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

  const finishGame = (finalScore: number, finalMistakes: number) => {
    const result: GameResult = {
      id: crypto.randomUUID(),
      gameType: 'math',
      score: finalScore,
      mistakes: finalMistakes,
      difficulty,
      date: Date.now()
    };
    onComplete(result);
    setLastResult(result);
    setGameState('finished');
    playSound('win');
    
    if (!stats.best || finalScore > stats.best) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#333', '#ea580c', '#e5e5e5']
      });
    }
  };

  const handleAnswer = (selected: number) => {
    if (!problem) return;
    
    if (selected === problem.answer) {
      playSound('click');
      setScore(prev => prev + 1);
      setProblem(generateMathProblem(difficulty));
    } else {
      playSound('error');
      setMistakes(prev => prev + 1);
      setProblem(generateMathProblem(difficulty));
    }
  };

  if (gameState === 'finished' && lastResult) {
    return (
      <ResultScreen 
        result={lastResult} 
        average={stats.average} 
        best={stats.best}
        onMenu={() => setGameState('menu')}
        onReplay={startGame}
        isRecord={!stats.best || lastResult.score > stats.best}
        unit=""
      />
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-semibold text-[#111]">Settings</h2>
           <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-[#e0e0e0] rounded-full">
             <History className="w-5 h-5 text-[#666]" />
           </button>
        </div>

        {showHistory ? (
          <div className="flex-1">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#888] mb-4">History ({difficulty})</h3>
             {stats.data.length > 0 ? (
               <>
                 <div className="h-40 w-full mb-6 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                        <XAxis dataKey="index" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip 
                          contentStyle={{ borderRadius: '4px', border: '1px solid #e0e0e0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '12px', fontFamily: 'monospace' }}
                          labelStyle={{ display: 'none' }}
                          formatter={(value: number) => [`${value}`, 'Score']}
                        />
                        <Line 
                          type="step" 
                          dataKey="value" 
                          stroke="#111" 
                          strokeWidth={1.5} 
                          dot={{ r: 2, fill: '#111' }} 
                          activeDot={{ r: 4, fill: '#ea580c' }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="space-y-px bg-[#e0e0e0] border border-[#e0e0e0] rounded-sm overflow-hidden">
                    {history.filter(h => h.difficulty === difficulty).slice(0, 10).map(r => (
                      <div key={r.id} className="flex justify-between p-3 bg-[#f4f4f4] text-xs">
                        <span className="text-[#888]">{format(r.date, 'MM/dd HH:mm')}</span>
                        <span className="font-mono font-medium">{r.score} pts</span>
                      </div>
                    ))}
                 </div>
               </>
             ) : (
               <p className="text-center text-[#888] text-sm mt-8">No games played yet.</p>
             )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-4 block text-center">
                Difficulty
              </label>
              <div className="flex justify-center gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-full font-medium text-xs uppercase tracking-wider transition-all duration-200 ${
                      difficulty === d ? 'bg-[#111] text-white' : 'bg-[#e0e0e0] text-[#666]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-[#e0e0e0] border border-[#e0e0e0] rounded-md overflow-hidden">
              <div className="bg-[#f4f4f4] p-4 text-left">
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Best Score</div>
                <div className="font-mono font-medium text-lg text-[#111]">
                  {stats.best !== null ? stats.best : '--'}
                </div>
              </div>
              <div className="bg-[#f4f4f4] p-4 text-left">
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1">Avg Score</div>
                <div className="font-mono font-medium text-lg text-[#111]">
                  {stats.average !== null ? Math.round(stats.average) : '--'}
                </div>
              </div>
            </div>

            <button onClick={startGame} className="w-full py-4 bg-[#ea580c] text-white rounded-[4px] font-medium text-sm uppercase tracking-widest shadow-sm active:translate-y-px">
              Start (60s)
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="p-4 flex justify-between items-center border-b border-[#e0e0e0] bg-[#f4f4f4]">
         <div className="text-xl font-mono font-medium text-[#111] tabular-nums">{timeLeft}s</div>
         <div className="text-sm font-medium text-[#666] uppercase tracking-wider">Score: {score}</div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f4f4f4]">
        <div className="text-5xl font-medium text-[#111] mb-12 tracking-tight">{problem?.question}</div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {problem?.options.map((opt, i) => (
            <button
              key={i}
              onMouseDown={() => handleAnswer(opt)}
              className="py-6 bg-[#e0e0e0] hover:bg-[#dcdcdc] active:bg-[#111] active:text-white text-[#111] text-2xl font-medium rounded-[4px] transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
