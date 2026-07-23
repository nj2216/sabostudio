/**
 * StudioCrisis — full-screen co-op event overlay.
 * All players must click the big red button simultaneously.
 */

import { useState, useEffect } from 'react';
import { CRISIS_DURATION } from '../lib/gameEngine.js';

export default function StudioCrisis({ onCrisisClick, totalPlayers, clickCount }) {
  const [timeLeft, setTimeLeft] = useState(CRISIS_DURATION);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 100));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  function handleClick() {
    if (clicked) return;
    setClicked(true);
    onCrisisClick();
  }

  return (
    <div className="fixed inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-center gap-6 animate-pulse-border">
      {/* Warning header */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-red-400 animate-pulse">
          🚨 STUDIO CRISIS! 🚨
        </h1>
        <p className="text-white text-lg mt-2">
          Everyone must press the button!
        </p>
        <p className="text-red-300 text-sm mt-1">
          Time: {(timeLeft / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Big red button */}
      <button
        onClick={handleClick}
        disabled={clicked}
        className={`w-48 h-48 rounded-full font-extrabold text-2xl transition-all duration-200 ${
          clicked
            ? 'bg-green-600 text-white cursor-not-allowed scale-95'
            : 'bg-red-600 hover:bg-red-500 active:scale-90 text-white shadow-[0_0_40px_rgba(239,68,68,0.6)] animate-pulse'
        }`}
      >
        {clicked ? '✓ PRESSED!' : '🔴 PRESS!'}
      </button>

      {/* Progress */}
      <div className="text-center">
        <p className="text-white text-lg">
          {clickCount ?? 0} / {totalPlayers} players pressed
        </p>
        <div className="w-64 h-3 bg-gray-800 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300 rounded-full"
            style={{ width: `${((clickCount ?? 0) / totalPlayers) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
