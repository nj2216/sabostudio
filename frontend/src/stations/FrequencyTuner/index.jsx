/**
 * frontend/src/stations/FrequencyTuner/index.jsx
 * 📻 Frequency Tuner
 *
 * Drag a dial left/right until an oscilloscope waveform matches
 * a faint background target wave, holding it steady for 3 seconds.
 */

import { useEffect, useRef, useState } from 'react';

export default function FrequencyTuner({ isControlling = true, onSolve }) {
  const [targetFreq] = useState(() => Math.floor(Math.random() * 80) + 20); // 20..100
  const [currentFreq, setCurrentFreq] = useState(50);
  const [holdSecs, setHoldSecs] = useState(0); // 0..3
  const [solved, setSolved] = useState(false);

  const currentRef = useRef(currentFreq);
  useEffect(() => { currentRef.current = currentFreq; }, [currentFreq]);

  const isMatched = Math.abs(currentFreq - targetFreq) <= 4;

  useEffect(() => {
    if (solved) return;

    const interval = setInterval(() => {
      if (Math.abs(currentRef.current - targetFreq) <= 4) {
        setHoldSecs((h) => {
          const next = h + 0.5;
          if (next >= 3) {
            setSolved(true);
            onSolve?.(100, 'FREQUENCY LOCKED');
          }
          return next;
        });
      } else {
        setHoldSecs(0);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [targetFreq, solved, onSolve]);

  function adjust(delta) {
    if (!isControlling || solved) return;
    setCurrentFreq((f) => Math.max(10, Math.min(110, f + delta)));
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-cyan-500/30 pb-2">
        <h2 className="text-cyan-400 font-extrabold text-sm tracking-wider uppercase">📻 SOUND STUDIO // FREQUENCY TUNER</h2>
        <p className="text-[10px] text-slate-400 mt-1">Match the waveform and hold steady for 3 seconds!</p>
      </div>

      {solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">📻</span>
          <p className="text-neon-green font-extrabold text-lg">SIGNAL LOCKED & BROADCASTING!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full py-4">
          {/* Oscilloscope Display */}
          <div className="w-full max-w-sm h-32 bg-slate-900 border-2 border-cyan-500/40 rounded-xl p-2 relative flex items-center justify-center overflow-hidden">
            {/* Target Faint Wave */}
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
              <path
                d={`M 0 64 Q 40 ${64 - targetFreq * 0.4} 80 64 T 160 64 T 240 64 T 320 64 T 400 64`}
                fill="none"
                stroke="#00f3ff"
                strokeWidth="3"
              />
            </svg>
            {/* Current Wave */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d={`M 0 64 Q 40 ${64 - currentFreq * 0.4} 80 64 T 160 64 T 240 64 T 320 64 T 400 64`}
                fill="none"
                stroke={isMatched ? '#22c55e' : '#f59e0b'}
                strokeWidth="2.5"
              />
            </svg>
            <div className="absolute top-2 right-2 text-[10px] text-cyan-400 font-bold">
              {isMatched ? '🟢 WAVE MATCHED' : '🟡 TUNING...'}
            </div>
          </div>

          {/* Hold Lock Progress Bar */}
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-full h-4 overflow-hidden relative">
            <div
              className="h-full bg-neon-green transition-all duration-300"
              style={{ width: `${(holdSecs / 3) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              HOLD STEADY: {holdSecs.toFixed(1)}S / 3.0S
            </div>
          </div>

          {/* Tuning Buttons / Slider */}
          <div className="flex items-center gap-2 w-full max-w-sm">
            <button
              onClick={() => adjust(-5)}
              disabled={!isControlling}
              className="px-3 py-2 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded font-bold text-xs"
            >
              ◀◀ -5
            </button>
            <input
              type="range"
              min="10"
              max="110"
              value={currentFreq}
              onChange={(e) => isControlling && setCurrentFreq(Number(e.target.value))}
              disabled={!isControlling}
              className="flex-1 accent-neon-cyan cursor-pointer"
            />
            <button
              onClick={() => adjust(5)}
              disabled={!isControlling}
              className="px-3 py-2 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded font-bold text-xs"
            >
              +5 ▶▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
