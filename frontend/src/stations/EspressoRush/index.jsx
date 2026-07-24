/**
 * frontend/src/stations/EspressoRush/index.jsx
 * ☕ Espresso Rush
 *
 * 3-step sequence:
 * Step 1: Grind Beans (Rapid tap 8 times)
 * Step 2: Pull Shot (Hold button until gauge turns green)
 * Step 3: Steam Milk (Click when indicator hits target zone)
 */

import { useEffect, useRef, useState } from 'react';

export default function EspressoRush({ isControlling = true, onSolve }) {
  const [step, setStep] = useState(1); // 1 = Grind, 2 = Pull Shot, 3 = Steam Milk, 4 = Solved
  const [grindCount, setGrindCount] = useState(0); // 0..8
  const [pullLevel, setPullLevel] = useState(0); // 0..100
  const [pulling, setPulling] = useState(false);
  const [steamPos, setSteamPos] = useState(20); // 0..100
  const [steamDir, setSteamDir] = useState(1);
  const [solved, setSolved] = useState(false);

  // Step 1: Rapid Grind
  function handleGrind() {
    if (!isControlling || step !== 1) return;
    const next = grindCount + 1;
    setGrindCount(next);
    if (next >= 8) {
      setStep(2);
    }
  }

  // Step 2: Pull Shot Hold
  const pullRef = useRef(pullLevel);
  useEffect(() => { pullRef.current = pullLevel; }, [pullLevel]);

  useEffect(() => {
    if (!pulling || step !== 2) return;
    const interval = setInterval(() => {
      setPullLevel((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          setPulling(false);
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [pulling, step]);

  function startPull() {
    if (!isControlling || step !== 2) return;
    setPulling(true);
  }

  function stopPull() {
    if (!pulling || step !== 2) return;
    setPulling(false);
    if (pullRef.current >= 75 && pullRef.current <= 95) {
      setStep(3);
    } else {
      setPullLevel(0); // reset shot pull if released too early
    }
  }

  // Step 3: Steam Needle Oscillate
  useEffect(() => {
    if (step !== 3 || solved) return;
    const interval = setInterval(() => {
      setSteamPos((pos) => {
        let next = pos + steamDir * 6;
        if (next >= 95 || next <= 5) setSteamDir((d) => -d);
        return Math.max(5, Math.min(95, next));
      });
    }, 60);
    return () => clearInterval(interval);
  }, [step, steamDir, solved]);

  function stopSteam() {
    if (!isControlling || step !== 3 || solved) return;
    if (steamPos >= 40 && steamPos <= 75) {
      setStep(4);
      setSolved(true);
      onSolve?.(100, 'ESPRESSO SERVED');
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-amber-500/30 pb-2">
        <h2 className="text-amber-400 font-extrabold text-sm tracking-wider uppercase">☕ ESPRESSO BAR // ESPRESSO RUSH</h2>
        <p className="text-[10px] text-slate-400 mt-1">Grind Beans → Pull Shot → Steam Milk!</p>
      </div>

      {solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">☕</span>
          <p className="text-neon-green font-extrabold text-lg">TRIPLE-SHOT LATTE SERVED!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full py-4">
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded text-[10px] font-bold border ${step === 1 ? 'bg-amber-950 border-amber-400 text-amber-300 animate-pulse' : step > 1 ? 'bg-green-950 border-neon-green text-neon-green' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              1. GRIND ({grindCount}/8)
            </div>
            <div className={`px-2.5 py-1 rounded text-[10px] font-bold border ${step === 2 ? 'bg-amber-950 border-amber-400 text-amber-300 animate-pulse' : step > 2 ? 'bg-green-950 border-neon-green text-neon-green' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              2. PULL SHOT
            </div>
            <div className={`px-2.5 py-1 rounded text-[10px] font-bold border ${step === 3 ? 'bg-amber-950 border-amber-400 text-amber-300 animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
              3. STEAM MILK
            </div>
          </div>

          {/* Active Step Interface */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl animate-bounce">🫘</span>
              <button
                onClick={handleGrind}
                disabled={!isControlling}
                className="px-6 py-4 bg-amber-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider hover:bg-amber-600 active:scale-95"
              >
                🫘 RAPID TAP TO GRIND BEANS ({grindCount}/8)
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-4 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-75 ${pullLevel >= 75 && pullLevel <= 95 ? 'bg-neon-green' : 'bg-amber-500'}`}
                  style={{ width: `${pullLevel}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                  PRESSURE: {pullLevel}% (TARGET 75-95%)
                </div>
              </div>
              <button
                onMouseDown={startPull}
                onMouseUp={stopPull}
                onMouseLeave={stopPull}
                onTouchStart={startPull}
                onTouchEnd={stopPull}
                disabled={!isControlling}
                className="w-full py-4 bg-amber-600 text-white font-extrabold rounded-xl text-xs uppercase hover:bg-amber-500"
              >
                ☕ HOLD TO PULL SHOT
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <div className="w-full h-4 bg-slate-900 border border-slate-800 rounded-full relative overflow-hidden">
                <div className="absolute inset-y-0 left-[40%] width-[35%] bg-neon-green/30 border-x border-neon-green z-10" />
                <div
                  className="absolute inset-y-0 w-2 bg-yellow-400 rounded-full transition-all duration-75"
                  style={{ left: `${steamPos}%` }}
                />
              </div>
              <button
                onClick={stopSteam}
                disabled={!isControlling}
                className="w-full py-4 bg-neon-green text-black font-extrabold rounded-xl text-xs uppercase hover:brightness-110 animate-bounce"
              >
                🥛 STOP STEAM AT GREEN ZONE!
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
