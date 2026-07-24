/**
 * frontend/src/stations/Kitchen/index.jsx
 *
 * Kitchen station — two modules:
 *   1. Ingredient Sequencing — click ingredients in the correct order
 *   2. Stove Dial Match      — rotate a dial to hit the target temperature
 *
 * Props:
 *   isControlling — boolean
 *   onSolve       — () => void
 */

import { useRef, useState } from 'react';

// ── Module 1: Ingredient Sequencing ───────────────────────────────────────

const ALL_INGREDIENTS = ['🥚', '🧄', '🫑', '🧅', '🍅', '🫙', '🧂', '🥩'];

function IngredientSequencing({ isControlling, onSolve }) {
  const [sequence] = useState(() => {
    const shuffled = [...ALL_INGREDIENTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  });
  const [available] = useState(() =>
    [...ALL_INGREDIENTS].sort(() => Math.random() - 0.5).slice(0, 6)
  );
  const [entered, setEntered] = useState([]);
  const [solved, setSolved] = useState(false);

  function add(ing) {
    if (!isControlling || solved) return;
    const next = [...entered, ing];
    setEntered(next);
    if (next.length === sequence.length) {
      if (JSON.stringify(next) === JSON.stringify(sequence)) {
        setSolved(true);
        onSolve?.();
      } else {
        setTimeout(() => setEntered([]), 600);
      }
    }
  }

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-2">Add ingredients in order:</p>
      <div className="flex gap-1 mb-3">
        {sequence.map((s, i) => (
          <div key={i} className="w-8 h-8 rounded border border-orange-700 flex items-center justify-center text-base">
            {s}
          </div>
        ))}
      </div>
      {/* Current entry */}
      <div className="flex gap-1 mb-3">
        {entered.map((s, i) => (
          <div key={i} className="w-8 h-8 rounded border border-green-600 flex items-center justify-center text-base">{s}</div>
        ))}
        {Array.from({ length: sequence.length - entered.length }, (_, i) => (
          <div key={`e-${i}`} className="w-8 h-8 rounded border border-gray-700" />
        ))}
      </div>
      {solved ? (
        <p className="text-green-400 text-sm font-bold">✅ Perfect dish!</p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {available.map((ing, i) => (
            <button
              key={i}
              onClick={() => add(ing)}
              disabled={!isControlling}
              className="py-2 rounded text-xl disabled:opacity-40"
              style={{ background: '#333' }}
            >
              {ing}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Module 2: Stove Dial Match ─────────────────────────────────────────────

function StoveDialMatch({ isControlling, onSolve }) {
  const [target] = useState(() => Math.floor(Math.random() * 300) + 100); // 100–400°C
  const [current, setCurrent] = useState(200);
  const [solved, setSolved] = useState(false);
  const TOLERANCE = 10;

  function adjust(delta) {
    if (!isControlling || solved) return;
    const next = Math.max(0, Math.min(500, current + delta));
    setCurrent(next);
    if (Math.abs(next - target) <= TOLERANCE) {
      setSolved(true);
      onSolve?.();
    }
  }

  const pct = (current / 500) * 100;
  const targetPct = (target / 500) * 100;
  const isClose = Math.abs(current - target) <= 30;

  return (
    <div className="p-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Target: <span className="text-orange-400 font-bold">{target}°</span></span>
        <span>Current: <span className={`font-bold ${isClose ? 'text-yellow-400' : 'text-white'}`}>{current}°</span></span>
      </div>
      {/* Dial track */}
      <div className="relative h-4 rounded-full mb-3" style={{ background: '#222' }}>
        {/* Target marker */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400" style={{ left: `${targetPct}%` }} />
        {/* Current marker */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full"
          style={{ left: `${pct}%`, background: isClose ? '#facc15' : '#3b82f6', transition: 'left 0.1s' }}
        />
      </div>
      {solved ? (
        <p className="text-green-400 text-sm font-bold text-center">🔥 Perfect temp!</p>
      ) : (
        <div className="flex gap-2 justify-center">
          {[-50, -10, -1, +1, +10, +50].map((d) => (
            <button
              key={d}
              onClick={() => adjust(d)}
              disabled={!isControlling}
              className="px-2 py-1 text-xs rounded font-bold disabled:opacity-40"
              style={{ background: d < 0 ? '#1e3a8a' : '#7f1d1d', color: '#fff' }}
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kitchen wrapper ────────────────────────────────────────────────────────

export default function Kitchen({ isControlling = true, onSolve }) {
  const containerRef = useRef(null);
  const [moduleSolved, setModuleSolved] = useState([false, false]);

  function handleModuleSolve(i) {
    setModuleSolved((prev) => {
      const next = [...prev];
      next[i] = true;
      if (next.every(Boolean)) onSolve?.();
      return next;
    });
  }

  const allSolved = moduleSolved.every(Boolean);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-gray-950 text-white rounded-xl relative">
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <h2 className="font-extrabold text-orange-400 text-sm tracking-wider">🍳 KITCHEN</h2>
        <div className="flex gap-1">
          {moduleSolved.map((s, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${s ? 'bg-green-400' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {allSolved ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-green-400 font-extrabold text-lg">🍽️ SERVICE!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          <div className={moduleSolved[0] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 1 — Ingredients</p>
            <IngredientSequencing isControlling={isControlling} onSolve={() => handleModuleSolve(0)} />
          </div>
          <div className={moduleSolved[1] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 2 — Stove Dial</p>
            <StoveDialMatch isControlling={isControlling} onSolve={() => handleModuleSolve(1)} />
          </div>
        </div>
      )}

      {!isControlling && (
        <div className="absolute inset-0 rounded-xl flex items-end justify-center pb-2 pointer-events-none">
          <span className="text-xs text-yellow-400 bg-gray-900 px-2 py-1 rounded opacity-80">
            👁️ Viewing only
          </span>
        </div>
      )}
    </div>
  );
}
