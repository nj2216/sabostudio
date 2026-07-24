/**
 * frontend/src/stations/KeyDuplicator/index.jsx
 * 🔑 Key Duplicator
 *
 * Operation-style maze task: Trace a jagged key outline with a cutter tool
 * from left to right without touching red boundary edges!
 */

import { useState } from 'react';

export default function KeyDuplicator({ isControlling = true, onSolve }) {
  const [progress, setProgress] = useState(0); // 0..5 checkpoints
  const [touchedWall, setTouchedWall] = useState(false);
  const [solved, setSolved] = useState(false);

  const checkpoints = [1, 2, 3, 4, 5];

  function hitCheckpoint(step) {
    if (!isControlling || solved || touchedWall) return;
    if (step === progress + 1) {
      setProgress(step);
      if (step === 5) {
        setSolved(true);
        onSolve?.(100, 'KEY DUPLICATED');
      }
    }
  }

  function handleBoundaryTouch() {
    if (!isControlling || solved) return;
    setTouchedWall(true);
    setProgress(0);
  }

  function retry() {
    setTouchedWall(false);
    setProgress(0);
    setSolved(false);
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-cyan-500/30 pb-2">
        <h2 className="text-cyan-400 font-extrabold text-sm tracking-wider uppercase">🔑 PROP SHOP // KEY DUPLICATOR</h2>
        <p className="text-[10px] text-slate-400 mt-1">Trace the key checkpoints 1 → 5 without touching red boundaries!</p>
      </div>

      {touchedWall ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <span className="text-5xl">⚡⚡</span>
          <p className="text-neon-red font-extrabold text-sm">BUZZ! TOUCHED RED EDGE BOUNDARY!</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-900 border border-red-500 text-white rounded text-xs font-bold"
          >
            🔄 RESTART KEY BLANK
          </button>
        </div>
      ) : solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">🔑</span>
          <p className="text-neon-green font-extrabold text-lg">KEY PERFECTLY DUPLICATED!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full py-2">
          {/* Key Tracing Canvas Maze Box */}
          <div
            onMouseEnter={handleBoundaryTouch}
            className="w-full max-w-md h-40 bg-slate-900 border-4 border-red-600/80 rounded-xl relative overflow-hidden flex items-center justify-between p-4"
          >
            {/* Jagged Key Groove Path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <path
                d="M 20 80 L 80 50 L 140 110 L 200 40 L 260 90 L 320 60 L 380 80"
                fill="none"
                stroke="#00f3ff"
                strokeWidth="20"
                strokeLinecap="round"
              />
            </svg>

            {/* Checkpoints Along Key Path */}
            {checkpoints.map((cp) => {
              const isPassed = cp <= progress;
              const isCurrent = cp === progress + 1;

              return (
                <button
                  key={cp}
                  onClick={(e) => {
                    e.stopPropagation();
                    hitCheckpoint(cp);
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    hitCheckpoint(cp);
                  }}
                  disabled={!isControlling || !isCurrent}
                  className={`w-10 h-10 rounded-full font-extrabold text-xs z-10 transition-all border-2 flex items-center justify-center ${
                    isPassed
                      ? 'bg-neon-green border-neon-green text-black'
                      : isCurrent
                      ? 'bg-yellow-400 border-yellow-300 text-black animate-bounce shadow-[0_0_15px_rgba(250,204,21,0.8)] cursor-pointer'
                      : 'bg-slate-800 border-slate-700 text-slate-500 opacity-40'
                  }`}
                >
                  {isPassed ? '✓' : cp}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-yellow-300 font-bold">
            PROGRESS: STEP {progress} / 5 COMPLETE
          </p>
        </div>
      )}
    </div>
  );
}
