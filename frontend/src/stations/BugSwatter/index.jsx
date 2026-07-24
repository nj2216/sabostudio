/**
 * frontend/src/stations/BugSwatter/index.jsx
 * 🦟 Bug Swatter
 *
 * Tap 5 fast-moving mosquitoes bouncing around the screen.
 */

import { useEffect, useRef, useState } from 'react';

const TOTAL_BUGS = 5;

export default function BugSwatter({ isControlling = true, onSolve }) {
  const [bugs, setBugs] = useState(() =>
    Array.from({ length: TOTAL_BUGS }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      vx: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
      vy: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
      swatted: false,
    }))
  );

  const [swatCount, setSwatCount] = useState(0);
  const [solved, setSolved] = useState(false);

  // Bounce bugs around the canvas box
  useEffect(() => {
    if (solved) return;

    const interval = setInterval(() => {
      setBugs((prev) =>
        prev.map((b) => {
          if (b.swatted) return b;
          let nx = b.x + b.vx;
          let ny = b.y + b.vy;
          let nvx = b.vx;
          let nvy = b.vy;

          if (nx <= 5 || nx >= 90) nvx = -nvx;
          if (ny <= 5 || ny >= 85) nvy = -nvy;

          return { ...b, x: Math.max(5, Math.min(90, nx)), y: Math.max(5, Math.min(85, ny)), vx: nvx, vy: nvy };
        })
      );
    }, 60);

    return () => clearInterval(interval);
  }, [solved]);

  function swatBug(id) {
    if (!isControlling || solved) return;
    setBugs((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, swatted: true } : b));
      const count = next.filter((b) => b.swatted).length;
      setSwatCount(count);
      if (count >= TOTAL_BUGS) {
        setSolved(true);
        onSolve?.(100, 'PESTS CLEARED');
      }
      return next;
    });
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-teal-500/30 pb-2">
        <h2 className="text-teal-400 font-extrabold text-sm tracking-wider uppercase">🦟 BACKLOT GARDEN // BUG SWATTER</h2>
        <p className="text-[10px] text-slate-400 mt-1">Tap/click all 5 bouncing mosquitoes to swat them!</p>
      </div>

      {solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">💥🦟</span>
          <p className="text-neon-green font-extrabold text-lg">ALL PESTS SWAT-ELIMINATED!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full py-2">
          <div className="text-xs font-bold text-teal-300">
            PESTS SWAT-DOWN: {swatCount} / {TOTAL_BUGS}
          </div>

          {/* Swatting Screen Area */}
          <div className="w-full max-w-sm h-48 bg-slate-900 border-2 border-teal-500/40 rounded-xl relative overflow-hidden">
            {bugs.map((b) => (
              <button
                key={b.id}
                onClick={() => swatBug(b.id)}
                disabled={b.swatted || !isControlling}
                className={`absolute text-2xl transition-transform active:scale-75 ${b.swatted ? 'opacity-20 pointer-events-none' : 'hover:scale-125 cursor-pointer'}`}
                style={{ left: `${b.x}%`, top: `${b.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {b.swatted ? '💥' : '🦟'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
