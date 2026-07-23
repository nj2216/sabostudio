/**
 * Bomb Defuse mini-task.
 * Player must cut wires in the correct order by clicking them.
 * Progress increases with each correct wire cut.
 */

import { useState, useEffect, useCallback } from 'react';

const WIRE_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const WIRE_COUNT = 5;

export default function BombDefuse({ onProgress, onComplete, progress }) {
  const [wires, setWires] = useState([]);
  const [correctOrder, setCorrectOrder] = useState([]);
  const [cutIndex, setCutIndex] = useState(0);
  const [shake, setShake] = useState(false);

  // Initialize wires on mount or when progress resets to 0
  useEffect(() => {
    if (progress === 0) {
      const shuffled = [...WIRE_COLORS].sort(() => Math.random() - 0.5).slice(0, WIRE_COUNT);
      setWires(shuffled.map((color, i) => ({ id: i, color, cut: false })));
      // The "correct" order is shown as a hint sequence
      const order = [...Array(WIRE_COUNT).keys()].sort(() => Math.random() - 0.5);
      setCorrectOrder(order);
      setCutIndex(0);
    }
  }, [progress]);

  const handleCutWire = useCallback(
    (wireIndex) => {
      if (wires[wireIndex]?.cut) return;

      if (wireIndex === correctOrder[cutIndex]) {
        // Correct cut
        const newWires = wires.map((w, i) => (i === wireIndex ? { ...w, cut: true } : w));
        setWires(newWires);
        const newCutIndex = cutIndex + 1;
        setCutIndex(newCutIndex);

        const newProgress = Math.round((newCutIndex / WIRE_COUNT) * 100);
        onProgress(newProgress);

        if (newCutIndex >= WIRE_COUNT) {
          onComplete();
        }
      } else {
        // Wrong wire — shake and reset progress slightly
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    },
    [wires, correctOrder, cutIndex, onProgress, onComplete]
  );

  return (
    <div className={`flex flex-col items-center gap-4 ${shake ? 'animate-shake' : ''}`}>
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-red-400">💣 Defuse the Bomb!</h3>
        <p className="text-gray-400 text-sm">Cut wires in the correct order</p>
        {correctOrder.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Hint: {correctOrder.slice(cutIndex).map((i) => wires[i]?.color).join(' → ')}
          </p>
        )}
      </div>

      <div className="relative w-64 h-48 bg-gray-800 rounded-xl border-2 border-red-900 p-4 flex flex-col justify-between">
        {/* Timer display on bomb */}
        <div className="text-center text-red-500 font-mono text-2xl font-bold">
          {Math.round(progress)}%
        </div>

        {/* Wires */}
        <div className="flex flex-col gap-2">
          {wires.map((wire, i) => (
            <button
              key={wire.id}
              onClick={() => handleCutWire(i)}
              disabled={wire.cut}
              className={`h-3 rounded-full transition-all duration-200 ${
                wire.cut
                  ? 'opacity-30 cursor-not-allowed border-2 border-dashed border-gray-600'
                  : 'cursor-pointer hover:scale-105 hover:brightness-125'
              }`}
              style={{
                backgroundColor: wire.cut ? 'transparent' : wire.color,
                boxShadow: wire.cut ? 'none' : `0 0 8px ${wire.color}`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
