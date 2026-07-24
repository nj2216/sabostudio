/**
 * frontend/src/stations/PattyFlipper/index.jsx
 * 🍔 Patty Flipper
 *
 * Sear a burger patty on a grill.
 * 1. Sear side 1 (timer turns GREEN when ready to flip).
 * 2. Click to FLIP patty.
 * 3. Sear side 2 (timer turns GREEN when ready).
 * 4. Click / Drag to BUN when done.
 * If left too long, patty BURNS!
 */

import { useEffect, useRef, useState } from 'react';

export default function PattyFlipper({ isControlling = true, onSolve }) {
  const [side, setSide] = useState(1); // 1 = Side 1, 2 = Side 2, 3 = On Bun
  const [cookTime, setCookTime] = useState(0); // 0..100
  const [burnt, setBurnt] = useState(false);
  const [solved, setSolved] = useState(false);

  const cookTimeRef = useRef(0);
  useEffect(() => { cookTimeRef.current = cookTime; }, [cookTime]);

  useEffect(() => {
    if (solved || burnt || side === 3) return;

    const interval = setInterval(() => {
      setCookTime((prev) => {
        const next = prev + 4;
        if (next > 100) {
          setBurnt(true);
          return 100;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [side, burnt, solved]);

  function flipPatty() {
    if (!isControlling || burnt || solved) return;
    if (cookTime < 40) return; // flipped too early!

    if (side === 1) {
      setSide(2);
      setCookTime(0);
    } else if (side === 2) {
      if (cookTime >= 40 && cookTime <= 90) {
        setSide(3);
        setSolved(true);
        onSolve?.(100, 'PATTY PLATED');
      }
    }
  }

  function retry() {
    setSide(1);
    setCookTime(0);
    setBurnt(false);
    setSolved(false);
  }

  const isReady = cookTime >= 45 && cookTime <= 85;

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-amber-500/30 pb-2">
        <h2 className="text-amber-400 font-extrabold text-sm tracking-wider uppercase">🍔 BURGER GRILL // PATTY FLIPPER</h2>
        <p className="text-[10px] text-slate-400 mt-1">Flip when patty is golden green, don't let it burn!</p>
      </div>

      {burnt ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 animate-bounce">
          <span className="text-5xl">⬛</span>
          <p className="text-neon-red font-extrabold text-sm">CHARRED MESS! YOU BURNT THE PATTY!</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-amber-900 border border-amber-500 text-white rounded text-xs font-bold"
          >
            🔄 FRESH PATTY ON GRILL
          </button>
        </div>
      ) : solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">🍔</span>
          <p className="text-neon-green font-extrabold text-lg">PERFECT JUICY BURGER!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 w-full py-4">
          {/* Grill Surface */}
          <div className="w-48 h-32 bg-slate-900 border-2 border-slate-700 rounded-xl flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            {/* Heat Bars */}
            <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />
            
            {/* Patty */}
            <div
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-200 ${
                isReady
                  ? 'border-neon-green bg-amber-800 shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                  : cookTime > 85
                  ? 'border-red-600 bg-stone-900'
                  : 'border-amber-900 bg-amber-950'
              }`}
            >
              🥩
            </div>
            <span className="text-[9px] text-slate-400 mt-1 font-bold">
              {side === 1 ? 'SIDE 1 SEARING' : 'SIDE 2 SEARING'}
            </span>
          </div>

          {/* Sear Progress Gauge */}
          <div className="w-48 bg-slate-900 border border-slate-800 rounded-full h-4 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-150 ${isReady ? 'bg-neon-green' : cookTime > 85 ? 'bg-red-600' : 'bg-amber-500'}`}
              style={{ width: `${cookTime}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
              {isReady ? 'READY TO FLIP / PLATE!' : cookTime > 85 ? 'BURNING!' : 'COOKING...'}
            </div>
          </div>

          <button
            onClick={flipPatty}
            disabled={!isControlling}
            className={`w-48 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
              isReady
                ? 'bg-neon-green text-black animate-bounce font-extrabold'
                : 'bg-amber-600 text-white hover:bg-amber-500'
            }`}
          >
            {side === 1 ? '🔄 FLIP PATTY' : '🍔 SERVE TO BUN'}
          </button>
        </div>
      )}
    </div>
  );
}
