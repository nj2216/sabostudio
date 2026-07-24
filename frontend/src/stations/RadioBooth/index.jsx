/**
 * frontend/src/stations/RadioBooth/index.jsx
 *
 * Radio Booth station — two modules:
 *   1. Frequency Tuning — drag a slider to the target frequency
 *   2. Fader Balance    — balance left/right audio faders to a target mix
 *
 * Props:
 *   isControlling — boolean
 *   onSolve       — () => void
 */

import { useRef, useState } from 'react';

// ── Module 1: Frequency Tuning ─────────────────────────────────────────────

function FrequencyTuning({ isControlling, onSolve }) {
  const [target] = useState(() => Math.floor(Math.random() * 871) + 88); // 88–958 (game mechanic, not real broadcast bands)
  const [freq, setFreq] = useState(500);
  const [solved, setSolved] = useState(false);
  const TOLERANCE = 5;

  function tune(delta) {
    if (!isControlling || solved) return;
    const next = Math.max(50, Math.min(1000, freq + delta));
    setFreq(next);
    if (Math.abs(next - target) <= TOLERANCE) {
      setSolved(true);
      onSolve?.();
    }
  }

  const pct = ((freq - 50) / 950) * 100;
  const targetPct = ((target - 50) / 950) * 100;
  const diff = Math.abs(freq - target);
  const hot = diff < 20;

  return (
    <div className="p-3">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-gray-400">Target: <span className="text-cyan-400 font-bold">{target} MHz</span></span>
        <span className={`font-bold ${hot ? 'text-yellow-400' : 'text-gray-400'}`}>
          {hot ? '🔥 Getting warm…' : `Current: ${freq} MHz`}
        </span>
      </div>

      {/* Track */}
      <div className="relative h-4 rounded-full mb-3 cursor-pointer select-none" style={{ background: '#222' }}>
        <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-500" style={{ left: `${targetPct}%` }} />
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full transition-all duration-75"
          style={{ left: `${pct}%`, background: hot ? '#facc15' : '#a855f7' }}
        />
      </div>

      {solved ? (
        <p className="text-green-400 text-sm font-bold text-center">📻 Locked on!</p>
      ) : (
        <div className="flex flex-wrap gap-1 justify-center">
          {[-50, -10, -1, +1, +10, +50].map((d) => (
            <button
              key={d}
              onClick={() => tune(d)}
              disabled={!isControlling}
              className="px-2 py-1 text-xs rounded font-bold disabled:opacity-40"
              style={{ background: d < 0 ? '#1e40af' : '#7e22ce', color: '#fff' }}
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Module 2: Fader Balance ────────────────────────────────────────────────

function FaderBalance({ isControlling, onSolve }) {
  // Target L/R mix, e.g. L:70 R:50
  const [targetL] = useState(() => 30 + Math.floor(Math.random() * 60));
  const [targetR] = useState(() => 30 + Math.floor(Math.random() * 60));
  const [faderL, setFaderL] = useState(50);
  const [faderR, setFaderR] = useState(50);
  const [solved, setSolved] = useState(false);
  const TOLERANCE = 5;

  function adjust(side, delta) {
    if (!isControlling || solved) return;
    const setter = side === 'L' ? setFaderL : setFaderR;
    const current = side === 'L' ? faderL : faderR;
    const next = Math.max(0, Math.min(100, current + delta));
    setter(next);

    const newL = side === 'L' ? next : faderL;
    const newR = side === 'R' ? next : faderR;
    if (Math.abs(newL - targetL) <= TOLERANCE && Math.abs(newR - targetR) <= TOLERANCE) {
      setSolved(true);
      onSolve?.();
    }
  }

  function Fader({ label, value, target: t, onUp, onDown }) {
    const pct = value;
    const targetPct = t;
    const hot = Math.abs(value - t) < 10;
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-400">{label}</span>
        <button onClick={onUp} disabled={!isControlling || solved} className="text-xs px-2 py-0.5 rounded bg-gray-700 disabled:opacity-40">▲</button>
        <div className="relative w-4 rounded-full" style={{ height: 80, background: '#222' }}>
          {/* Target line */}
          <div className="absolute w-full h-0.5 bg-cyan-500" style={{ top: `${100 - targetPct}%` }} />
          {/* Current fill */}
          <div
            className="absolute bottom-0 w-full rounded-full transition-all duration-75"
            style={{ height: `${pct}%`, background: hot ? '#facc15' : '#7c3aed' }}
          />
        </div>
        <button onClick={onDown} disabled={!isControlling || solved} className="text-xs px-2 py-0.5 rounded bg-gray-700 disabled:opacity-40">▼</button>
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </div>
    );
  }

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-3">Balance the faders to hit the target lines:</p>
      {solved ? (
        <p className="text-green-400 text-sm font-bold text-center">🎚️ Mixed!</p>
      ) : (
        <div className="flex justify-center gap-8">
          <Fader
            label="L"
            value={faderL}
            target={targetL}
            onUp={() => adjust('L', 5)}
            onDown={() => adjust('L', -5)}
          />
          <Fader
            label="R"
            value={faderR}
            target={targetR}
            onUp={() => adjust('R', 5)}
            onDown={() => adjust('R', -5)}
          />
        </div>
      )}
    </div>
  );
}

// ── RadioBooth wrapper ─────────────────────────────────────────────────────

export default function RadioBooth({ isControlling = true, onSolve }) {
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
        <h2 className="font-extrabold text-cyan-400 text-sm tracking-wider">📻 RADIO BOOTH</h2>
        <div className="flex gap-1">
          {moduleSolved.map((s, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${s ? 'bg-green-400' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {allSolved ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-green-400 font-extrabold text-lg">📡 ON AIR!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          <div className={moduleSolved[0] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 1 — Frequency</p>
            <FrequencyTuning isControlling={isControlling} onSolve={() => handleModuleSolve(0)} />
          </div>
          <div className={moduleSolved[1] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 2 — Fader Balance</p>
            <FaderBalance isControlling={isControlling} onSolve={() => handleModuleSolve(1)} />
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
