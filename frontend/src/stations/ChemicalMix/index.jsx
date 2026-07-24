/**
 * frontend/src/stations/ChemicalMix/index.jsx
 * 🧪 Chemical Mix
 *
 * Fill a beaker to an exact target line (80% - 90%) by holding down a pour button.
 * Overfilling (>95%) causes a chemical foam overflow explosion!
 */

import { useEffect, useRef, useState } from 'react';

export default function ChemicalMix({ isControlling = true, onSolve }) {
  const [level, setLevel] = useState(0); // 0..100
  const [pouring, setPouring] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [solved, setSolved] = useState(false);

  const levelRef = useRef(level);
  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    if (!pouring || solved || overflow) return;

    const interval = setInterval(() => {
      setLevel((prev) => {
        const next = prev + 3;
        if (next >= 96) {
          setOverflow(true);
          setPouring(false);
          return 100;
        }
        return next;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [pouring, solved, overflow]);

  function startPour() {
    if (!isControlling || solved || overflow) return;
    setPouring(true);
  }

  function stopPour() {
    if (!pouring || solved || overflow) return;
    setPouring(false);

    // Check if level is in optimal zone (80%..92%)
    if (levelRef.current >= 78 && levelRef.current <= 92) {
      setSolved(true);
      onSolve?.(100, 'CHEMICAL MIXED');
    }
  }

  function retry() {
    setLevel(0);
    setPouring(false);
    setOverflow(false);
    setSolved(false);
  }

  const isOptimal = level >= 78 && level <= 92;

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-purple-500/30 pb-2">
        <h2 className="text-purple-400 font-extrabold text-sm tracking-wider uppercase">🧪 CHEM LAB // CHEMICAL MIX</h2>
        <p className="text-[10px] text-slate-400 mt-1">Hold POUR button to fill beaker into the GREEN line target zone!</p>
      </div>

      {overflow ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <span className="text-5xl">🧪💥</span>
          <p className="text-neon-red font-extrabold text-sm">CHEMICAL OVERFLOW FOAM EXPLOSION!</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-purple-900 border border-purple-500 text-white rounded text-xs font-bold"
          >
            🔄 CLEAN BEAKER & RETRY
          </button>
        </div>
      ) : solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">🧪</span>
          <p className="text-neon-green font-extrabold text-lg">EXACT FORMULA MIXED!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full py-4">
          {/* Beaker Container */}
          <div className="w-32 h-44 bg-slate-900 border-4 border-slate-700 rounded-b-3xl relative overflow-hidden flex flex-col justify-end shadow-inner">
            {/* Target Line Zone (78% to 92%) */}
            <div className="absolute inset-x-0 bottom-[78%] top-[8%] bg-neon-green/20 border-y border-neon-green/60 flex items-center justify-center z-10">
              <span className="text-[8px] font-bold text-neon-green tracking-tighter">TARGET ZONE</span>
            </div>

            {/* Fluid Fill */}
            <div
              className={`w-full transition-all duration-75 ${
                overflow
                  ? 'bg-red-600'
                  : isOptimal
                  ? 'bg-neon-green'
                  : 'bg-purple-500'
              }`}
              style={{ height: `${level}%` }}
            />
          </div>

          {/* Level Gauge Display */}
          <div className="text-xs font-bold text-slate-300">
            VOLUME: <span className={isOptimal ? 'text-neon-green font-extrabold' : 'text-purple-400'}>{level}%</span> / TARGET 80-90%
          </div>

          {/* Pour Button */}
          <button
            onMouseDown={startPour}
            onMouseUp={stopPour}
            onMouseLeave={stopPour}
            onTouchStart={startPour}
            onTouchEnd={stopPour}
            disabled={!isControlling}
            className={`w-48 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all shadow-lg select-none ${
              pouring
                ? 'bg-purple-600 text-white scale-95'
                : 'bg-neon-purple text-black hover:brightness-110 animate-pulse'
            }`}
          >
            {pouring ? '🧪 POURING FLUID...' : '🧪 HOLD TO POUR'}
          </button>
        </div>
      )}
    </div>
  );
}
