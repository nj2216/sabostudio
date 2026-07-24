/**
 * frontend/src/stations/BombSet/index.jsx
 *
 * Bomb Set station — three interlocking modules:
 *   1. Wire Cutter  — click the correct wire
 *   2. Keypad Code  — enter a 4-digit code by pressing the right buttons
 *   3. Symbol Match — match symbols to the reference panel
 *
 * Props:
 *   isControlling — boolean  (true if this player's inputs affect this station)
 *   onSolve       — () => void
 */

import { useRef, useState } from 'react';

// ── Module 1: Wire Cutter ──────────────────────────────────────────────────

const WIRE_COLOURS = ['red', 'blue', 'yellow', 'white', 'green'];
function randomWireColour() {
  return WIRE_COLOURS[Math.floor(Math.random() * WIRE_COLOURS.length)];
}

function WireCutter({ isControlling, onSolve }) {
  const [wires] = useState(() =>
    Array.from({ length: 5 }, (_, i) => ({ id: i, colour: randomWireColour(), cut: false }))
  );
  const [wireState, setWireState] = useState(wires);
  // The correct wire is the first red one, or if no red, the last one
  const [target] = useState(() => {
    const red = wires.findIndex((w) => w.colour === 'red');
    return red >= 0 ? red : wires.length - 1;
  });
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);

  function cutWire(id) {
    if (!isControlling || solved || failed) return;
    if (id === target) {
      setWireState((prev) => prev.map((w) => (w.id === id ? { ...w, cut: true } : w)));
      setSolved(true);
      onSolve?.();
    } else {
      setWireState((prev) => prev.map((w) => (w.id === id ? { ...w, cut: true } : w)));
      setFailed(true);
    }
  }

  const colourMap = {
    red: '#ef4444', blue: '#3b82f6', yellow: '#eab308',
    white: '#f5f5f5', green: '#22c55e',
  };

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-2">
        {solved ? '✅ Defused!' : failed ? '💥 Wrong wire! Station failed.' : 'Cut the correct wire'}
      </p>
      <div className="space-y-1">
        {wireState.map((w) => (
          <button
            key={w.id}
            onClick={() => cutWire(w.id)}
            disabled={w.cut || solved || failed || !isControlling}
            className="w-full h-5 rounded cursor-pointer transition-opacity disabled:cursor-default"
            style={{
              background: w.cut
                ? 'transparent'
                : colourMap[w.colour],
              border: w.cut ? '1px dashed #555' : 'none',
              opacity: w.cut ? 0.3 : 1,
              position: 'relative',
            }}
          >
            {w.cut && <span className="text-xs text-gray-600">— cut —</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Module 2: Keypad Code ──────────────────────────────────────────────────

function KeypadCode({ isControlling, onSolve }) {
  const [target] = useState(() =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('')
  );
  const [entry, setEntry] = useState('');
  const [solved, setSolved] = useState(false);
  const [flash, setFlash] = useState(null);

  function pressDigit(d) {
    if (!isControlling || solved) return;
    const next = entry + d;
    setEntry(next);
    if (next.length === 4) {
      if (next === target) {
        setSolved(true);
        setFlash('correct');
        onSolve?.();
      } else {
        setFlash('wrong');
        setTimeout(() => { setEntry(''); setFlash(null); }, 600);
      }
    }
  }

  function pressBack() {
    if (!isControlling || solved) return;
    setEntry((e) => e.slice(0, -1));
  }

  const bg = flash === 'correct' ? '#14532d' : flash === 'wrong' ? '#7f1d1d' : '#111';

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-2">Enter the 4-digit code: <span className="text-yellow-400 font-mono">{target.split('').map(() => '?').join(' ')}</span></p>
      <div
        className="text-center font-mono text-2xl font-bold mb-3 rounded p-2 tracking-widest"
        style={{ background: bg, color: solved ? '#4ade80' : '#fff', transition: 'background 0.2s' }}
      >
        {entry.padEnd(4, '·')}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[1,2,3,4,5,6,7,8,9,'⌫',0,'⏎'].map((d, i) => (
          <button
            key={i}
            onClick={() => {
              if (d === '⌫') pressBack();
              else if (d === '⏎') {/* already auto-submits */}
              else pressDigit(String(d));
            }}
            disabled={solved || !isControlling}
            className="py-1 rounded text-sm font-bold disabled:opacity-40 transition-colors"
            style={{ background: '#333', color: '#fff' }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Module 3: Symbol Match ─────────────────────────────────────────────────

const SYMBOLS = ['★', '▲', '●', '■', '♦', '✿', '⬟', '⊕'];

function SymbolMatch({ isControlling, onSolve }) {
  const [targets] = useState(() =>
    Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
  );
  const [choices] = useState(() =>
    [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, 6)
  );
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState(false);

  function pick(sym) {
    if (!isControlling || solved) return;
    const next = [...selected, sym];
    setSelected(next);
    if (next.length === targets.length) {
      if (JSON.stringify(next) === JSON.stringify(targets)) {
        setSolved(true);
        onSolve?.();
      } else {
        setTimeout(() => setSelected([]), 500);
      }
    }
  }

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-1">Match the sequence:</p>
      <div className="flex gap-2 mb-3 justify-center">
        {targets.map((s, i) => (
          <div key={i} className="w-8 h-8 rounded border border-yellow-600 flex items-center justify-center text-yellow-400 font-bold text-lg">
            {s}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-3 justify-center">
        {selected.map((s, i) => (
          <div key={i} className="w-8 h-8 rounded border border-blue-500 flex items-center justify-center text-blue-300 font-bold text-lg">
            {s}
          </div>
        ))}
        {Array.from({ length: targets.length - selected.length }, (_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8 rounded border border-gray-600" />
        ))}
      </div>
      {solved ? (
        <p className="text-center text-green-400 text-sm font-bold">✅ Matched!</p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {choices.map((s, i) => (
            <button
              key={i}
              onClick={() => pick(s)}
              disabled={!isControlling}
              className="py-2 rounded text-lg font-bold disabled:opacity-40 transition-colors"
              style={{ background: '#333', color: '#fff' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BombSet wrapper ────────────────────────────────────────────────────────

export default function BombSet({ isControlling = true, onSolve }) {
  const [moduleSolved, setModuleSolved] = useState([false, false, false]);
  const containerRef = useRef(null);

  const handleModuleSolve = (i) => {
    setModuleSolved((prev) => {
      const next = [...prev];
      next[i] = true;
      if (next.every(Boolean)) onSolve?.();
      return next;
    });
  };

  const allSolved = moduleSolved.every(Boolean);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-gray-950 text-white rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <h2 className="font-extrabold text-red-400 text-sm tracking-wider">💣 BOMB SET</h2>
        <div className="flex gap-1">
          {moduleSolved.map((s, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${s ? 'bg-green-400' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {allSolved ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-green-400 font-extrabold text-lg">💥 DEFUSED!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {/* Module 1: Wires */}
          <div className={moduleSolved[0] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 1 — Wire Cutter</p>
            <WireCutter isControlling={isControlling} onSolve={() => handleModuleSolve(0)} />
          </div>
          {/* Module 2: Keypad */}
          <div className={moduleSolved[1] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 2 — Keypad</p>
            <KeypadCode isControlling={isControlling} onSolve={() => handleModuleSolve(1)} />
          </div>
          {/* Module 3: Symbols */}
          <div className={moduleSolved[2] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 3 — Symbol Match</p>
            <SymbolMatch isControlling={isControlling} onSolve={() => handleModuleSolve(2)} />
          </div>
        </div>
      )}

      {!isControlling && (
        <div className="absolute inset-0 rounded-xl flex items-end justify-center pb-2 pointer-events-none">
          <span className="text-xs text-yellow-400 bg-gray-900 px-2 py-1 rounded opacity-80">
            👁️ Viewing only — your inputs control another station
          </span>
        </div>
      )}
    </div>
  );
}
