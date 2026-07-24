/**
 * frontend/src/stations/SafeCracker/index.jsx
 * 🔐 Safe Cracker
 *
 * Rotate combination dial clockwise/counter-clockwise until you hit click indicators,
 * then pull the vault open lever.
 */

import { useState } from 'react';

export default function SafeCracker({ isControlling = true, onSolve }) {
  const [combo] = useState(() => [
    Math.floor(Math.random() * 8) * 10 + 10,
    Math.floor(Math.random() * 8) * 10 + 10,
  ]); // e.g. [40, 70]
  const [step, setStep] = useState(0); // 0 = Dial 1, 1 = Dial 2, 2 = Ready for Lever
  const [dialPos, setDialPos] = useState(0); // 0..90 degrees (10 deg steps = 0..90)
  const [unlocked, setUnlocked] = useState(false);

  function rotate(dir) {
    if (!isControlling || unlocked) return;
    const next = Math.max(0, Math.min(100, dialPos + dir * 10));
    setDialPos(next);

    const target = combo[step];
    if (Math.abs(next - target) <= 5) {
      if (step === 0) {
        setStep(1);
      } else if (step === 1) {
        setStep(2);
      }
    }
  }

  function pullLever() {
    if (!isControlling || step < 2 || unlocked) return;
    setUnlocked(true);
    onSolve?.(100, 'SAFE UNLOCKED');
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-yellow-500/30 pb-2">
        <h2 className="text-yellow-400 font-extrabold text-sm tracking-wider uppercase">🔐 SAFE VAULT // SAFE CRACKER</h2>
        <p className="text-[10px] text-slate-400 mt-1">Rotate combination dial to hear the click, then pull the vault lever!</p>
      </div>

      {unlocked ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">🔓</span>
          <p className="text-neon-green font-extrabold text-lg">VAULT CRACKED & OPENED!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full py-4">
          {/* Combination Status Indicators */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded text-xs font-bold border ${step >= 1 ? 'bg-green-950 border-neon-green text-neon-green' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              TUMBLER 1: {step >= 1 ? 'LOCKED ✓' : `SEARCHING (${combo[0]})`}
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold border ${step >= 2 ? 'bg-green-950 border-neon-green text-neon-green' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
              TUMBLER 2: {step >= 2 ? 'LOCKED ✓' : step === 1 ? `SEARCHING (${combo[1]})` : 'WAITING'}
            </div>
          </div>

          {/* Rotary Dial Visual */}
          <div className="w-36 h-36 rounded-full bg-slate-900 border-4 border-yellow-600/60 flex items-center justify-center relative shadow-2xl">
            <div
              className="w-28 h-28 rounded-full bg-slate-800 border-2 border-yellow-500/40 flex items-center justify-center transition-transform duration-150"
              style={{ transform: `rotate(${dialPos * 3.6}deg)` }}
            >
              <div className="w-2 h-6 bg-yellow-400 rounded-full mb-10" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold text-yellow-300">
              {dialPos}
            </div>
          </div>

          {/* Dial Rotate Buttons & Lever */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => rotate(-1)}
              disabled={!isControlling}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl font-bold text-sm text-yellow-400 hover:bg-slate-700"
            >
              ↺ CCW
            </button>

            {step >= 2 ? (
              <button
                onClick={pullLever}
                disabled={!isControlling}
                className="px-6 py-3 bg-neon-green text-black font-extrabold rounded-xl text-xs uppercase animate-bounce shadow-lg"
              >
                🔓 PULL LEVER!
              </button>
            ) : (
              <button
                onClick={() => rotate(1)}
                disabled={!isControlling}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl font-bold text-sm text-yellow-400 hover:bg-slate-700"
              >
                ↻ CW
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
