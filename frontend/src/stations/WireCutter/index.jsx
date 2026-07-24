/**
 * frontend/src/stations/WireCutter/index.jsx
 * 💣 Wire Cutter (The Bomb)
 *
 * Rule-based wire sniping task:
 * Read the rule prompt on screen (e.g. "Cut RED, then GREEN, NEVER BLUE!").
 * Snip wires in correct order. Cutting the wrong wire explodes!
 */

import { useState } from 'react';

const WIRE_RULES = [
  { rule: 'Cut RED first, then GREEN. NEVER cut BLUE!', correctOrder: ['red', 'green'], forbidden: 'blue' },
  { rule: 'Cut YELLOW first, then RED. NEVER cut GREEN!', correctOrder: ['yellow', 'red'], forbidden: 'green' },
  { rule: 'Cut BLUE first, then YELLOW. NEVER cut RED!', correctOrder: ['blue', 'yellow'], forbidden: 'red' },
];

export default function WireCutter({ isControlling = true, onSolve }) {
  const [ruleObj] = useState(() => WIRE_RULES[Math.floor(Math.random() * WIRE_RULES.length)]);
  const [wires, setWires] = useState([
    { id: 'red', color: '#ef4444', label: 'RED', cut: false },
    { id: 'blue', color: '#3b82f6', label: 'BLUE', cut: false },
    { id: 'green', color: '#22c55e', label: 'GREEN', cut: false },
    { id: 'yellow', color: '#eab308', label: 'YELLOW', cut: false },
  ]);
  const [cutHistory, setCutHistory] = useState([]);
  const [exploded, setExploded] = useState(false);
  const [solved, setSolved] = useState(false);

  function handleCut(wireId) {
    if (!isControlling || solved || exploded) return;

    if (wireId === ruleObj.forbidden) {
      setExploded(true);
      return;
    }

    const nextHistory = [...cutHistory, wireId];
    setCutHistory(nextHistory);
    setWires((prev) => prev.map((w) => (w.id === wireId ? { ...w, cut: true } : w)));

    // Check if next cut matches expected step
    const expectedStep = ruleObj.correctOrder[cutHistory.length];
    if (wireId !== expectedStep) {
      setExploded(true);
      return;
    }

    if (nextHistory.length === ruleObj.correctOrder.length) {
      setSolved(true);
      onSolve?.(100, 'BOMB DEFUSED');
    }
  }

  function retry() {
    setExploded(false);
    setSolved(false);
    setCutHistory([]);
    setWires((prev) => prev.map((w) => ({ ...w, cut: false })));
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-red-500/30 pb-2">
        <h2 className="text-red-400 font-extrabold text-sm tracking-wider uppercase">💣 BOMB DEFUSAL // WIRE CUTTER</h2>
        <div className="mt-2 bg-red-950/60 border border-red-500/40 p-2 rounded text-xs text-red-200 font-bold">
          RULE: {ruleObj.rule}
        </div>
      </div>

      {exploded ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 animate-pulse">
          <span className="text-5xl">💥</span>
          <p className="text-neon-red font-extrabold text-base">BOOM! YOU CUT THE WRONG WIRE!</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-900 border border-red-500 text-white rounded text-xs font-bold hover:bg-red-800"
          >
            🔄 RESTART DEFUSAL
          </button>
        </div>
      ) : solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">✅</span>
          <p className="text-neon-green font-extrabold text-lg">BOMB DEFUSED!</p>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-3 py-4">
          {wires.map((w) => (
            <button
              key={w.id}
              onClick={() => handleCut(w.id)}
              disabled={w.cut || !isControlling}
              className={`w-full py-3 rounded font-bold text-sm transition-all flex items-center justify-between px-4 border ${w.cut ? 'opacity-30 border-slate-700 bg-transparent' : 'hover:scale-[1.02]'}`}
              style={{
                backgroundColor: w.cut ? 'transparent' : w.color,
                borderColor: w.color,
                color: '#fff',
                textShadow: '0 1px 2px #000',
              }}
            >
              <span>{w.label} WIRE</span>
              <span>{w.cut ? '✂️ SNIPPED' : '✂️ CUT'}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-500">Read the rule carefully before sniping!</p>
    </div>
  );
}
