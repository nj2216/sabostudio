/**
 * frontend/src/stations/RocketLaunch/index.jsx
 * 🚀 Rocket Launch Sequence
 *
 * Flip 4 toggles into the "ON" position and flip open the safety cover
 * over the big red button, then press LAUNCH.
 */

import { useState } from 'react';

export default function RocketLaunch({ isControlling = true, onSolve }) {
  const [toggles, setToggles] = useState([false, false, false, false]);
  const [coverOpen, setCoverOpen] = useState(false);
  const [launched, setLaunched] = useState(false);

  function toggleSwitch(idx) {
    if (!isControlling || launched) return;
    setToggles((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }

  function toggleCover() {
    if (!isControlling || launched) return;
    setCoverOpen((prev) => !prev);
  }

  function pressLaunch() {
    if (!isControlling || launched) return;
    if (!toggles.every(Boolean) || !coverOpen) return;
    setLaunched(true);
    onSolve?.(100, 'ROCKET LAUNCHED');
  }

  const allTogglesOn = toggles.every(Boolean);

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-red-500/30 pb-2">
        <h2 className="text-red-400 font-extrabold text-sm tracking-wider uppercase">🚀 COMMAND CENTER // ROCKET LAUNCH</h2>
        <p className="text-[10px] text-slate-400 mt-1">Flip all 4 toggles ON, open safety cover, and press BIG RED BUTTON!</p>
      </div>

      {launched ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 animate-pulse">
          <span className="text-5xl">🚀🔥</span>
          <p className="text-neon-green font-extrabold text-lg">ROCKET LAUNCHED INTO ORBIT!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full py-2">
          {/* 4 Toggles */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
            {toggles.map((isOn, i) => (
              <button
                key={i}
                onClick={() => toggleSwitch(i)}
                disabled={!isControlling}
                className={`py-3 rounded-lg font-extrabold text-xs flex flex-col items-center justify-center gap-1 border transition-all ${
                  isOn
                    ? 'bg-green-950 border-neon-green text-neon-green shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                <span>SYS 0{i + 1}</span>
                <span>{isOn ? '🟢 ON' : '🔴 OFF'}</span>
              </button>
            ))}
          </div>

          {/* Safety Cover & Big Red Button */}
          <div className="w-48 h-32 bg-slate-900 border-2 border-slate-700 rounded-xl flex flex-col items-center justify-center relative overflow-hidden p-2">
            {/* Big Red Button */}
            <button
              onClick={pressLaunch}
              disabled={!isControlling || !allTogglesOn || !coverOpen}
              className={`w-20 h-20 rounded-full font-extrabold text-xs shadow-2xl transition-transform active:scale-90 flex items-center justify-center ${
                allTogglesOn && coverOpen
                  ? 'bg-red-600 border-4 border-red-400 text-white animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer'
                  : 'bg-red-950 border-2 border-red-900 text-red-700 opacity-60 cursor-not-allowed'
              }`}
            >
              LAUNCH!
            </button>

            {/* Safety Cover Latch */}
            {!coverOpen && (
              <div
                onClick={toggleCover}
                className="absolute inset-0 bg-yellow-500/90 border-2 border-yellow-600 flex flex-col items-center justify-center cursor-pointer text-black font-extrabold text-xs text-center p-2 z-20 shadow-lg hover:bg-yellow-400"
              >
                <span>⚠️ SAFETY COVER CLOSED</span>
                <span className="text-[9px] mt-1 bg-black text-yellow-300 px-2 py-0.5 rounded">CLICK TO FLIP OPEN</span>
              </div>
            )}
          </div>

          {coverOpen && (
            <button
              onClick={toggleCover}
              disabled={!isControlling}
              className="text-[10px] text-yellow-400 underline"
            >
              Close Safety Cover
            </button>
          )}
        </div>
      )}
    </div>
  );
}
