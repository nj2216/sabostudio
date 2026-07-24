/**
 * frontend/src/stations/LaneWeaver/index.jsx
 * 🏎️ Lane Weaver
 *
 * Endlessly dodge oncoming traffic on a 3-lane road using simple
 * left/right taps to reach a target distance meter (10 dodges).
 */

import { useEffect, useRef, useState } from 'react';

const TRACK_LANES = 3;
const TARGET_DISTANCE = 10;

export default function LaneWeaver({ isControlling = true, onSolve }) {
  const [carLane, setCarLane] = useState(1); // 0, 1, 2
  const [obstacles, setObstacles] = useState([]);
  const [dodged, setDodged] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [solved, setSolved] = useState(false);

  const carLaneRef = useRef(carLane);
  useEffect(() => { carLaneRef.current = carLane; }, [carLane]);

  const nextId = useRef(0);

  useEffect(() => {
    if (solved || crashed) return;

    let count = 0;
    const spawnId = setInterval(() => {
      if (count >= TARGET_DISTANCE + 2) return;
      const lane = Math.floor(Math.random() * TRACK_LANES);
      const id = nextId.current++;
      count++;
      setObstacles((prev) => [...prev, { id, lane, y: 0 }]);
    }, 1000);

    const moveId = setInterval(() => {
      setObstacles((prev) => {
        const updated = prev.map((o) => ({ ...o, y: o.y + 10 }));
        const active = updated.filter((o) => o.y < 100);

        const collision = updated.some(
          (o) => o.y >= 75 && o.y <= 95 && o.lane === carLaneRef.current
        );

        if (collision) {
          setCrashed(true);
          clearInterval(moveId);
          clearInterval(spawnId);
          return [];
        }

        const passed = updated.filter((o) => o.y >= 100);
        if (passed.length > 0) {
          setDodged((d) => {
            const total = d + passed.length;
            if (total >= TARGET_DISTANCE) {
              setSolved(true);
              clearInterval(moveId);
              clearInterval(spawnId);
              onSolve?.(100, 'TRACK CLEARED');
            }
            return total;
          });
        }

        return active;
      });
    }, 70);

    return () => {
      clearInterval(spawnId);
      clearInterval(moveId);
    };
  }, [solved, crashed, onSolve]);

  function moveCar(dir) {
    if (!isControlling || solved || crashed) return;
    setCarLane((l) => Math.max(0, Math.min(TRACK_LANES - 1, l + dir)));
  }

  // Keyboard steer
  useEffect(() => {
    function onKey(e) {
      if (!isControlling || solved || crashed) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveCar(-1);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveCar(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isControlling, solved, crashed]);

  function retry() {
    setCrashed(false);
    setDodged(0);
    setObstacles([]);
    setCarLane(1);
  }

  const laneWidth = 100 / TRACK_LANES;

  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-4 bg-slate-950 text-white rounded-xl select-none font-mono">
      <div className="w-full text-center border-b border-green-500/30 pb-2">
        <h2 className="text-green-400 font-extrabold text-sm tracking-wider uppercase">🏎️ TEST TRACK // LANE WEAVER</h2>
        <p className="text-[10px] text-slate-400 mt-1">Tap ◀ / ▶ or A/D to dodge oncoming traffic!</p>
      </div>

      {crashed ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <span className="text-5xl">💥</span>
          <p className="text-neon-red font-extrabold text-sm">HEAD-ON COLLISION!</p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-900 border border-red-500 text-white rounded text-xs font-bold"
          >
            🔄 RESTART TRACK
          </button>
        </div>
      ) : solved ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6">
          <span className="text-5xl">🏎️</span>
          <p className="text-neon-green font-extrabold text-lg">TARGET DISTANCE REACHED!</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full py-2">
          {/* Distance Meter Bar */}
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-full h-4 overflow-hidden relative">
            <div
              className="h-full bg-neon-green transition-all duration-200"
              style={{ width: `${(dodged / TARGET_DISTANCE) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              DISTANCE: {dodged} / {TARGET_DISTANCE} VEHICLES DODGED
            </div>
          </div>

          {/* 3-Lane Road Track */}
          <div className="w-full max-w-xs h-40 bg-slate-900 border-2 border-slate-700 rounded-xl relative overflow-hidden">
            {/* Lane Dividers */}
            <div className="absolute inset-y-0 left-1/3 border-r border-dashed border-slate-700" />
            <div className="absolute inset-y-0 left-2/3 border-r border-dashed border-slate-700" />

            {/* Oncoming Traffic */}
            {obstacles.map((o) => (
              <div
                key={o.id}
                className="absolute text-center text-xl"
                style={{
                  left: `${o.lane * laneWidth}%`,
                  top: `${o.y}%`,
                  width: `${laneWidth}%`,
                }}
              >
                🚛
              </div>
            ))}

            {/* Player Car */}
            <div
              className="absolute text-center text-2xl transition-all duration-100"
              style={{
                left: `${carLane * laneWidth}%`,
                bottom: '10px',
                width: `${laneWidth}%`,
              }}
            >
              🏎️
            </div>
          </div>

          {/* Steer Controls */}
          <div className="flex gap-4">
            <button
              onClick={() => moveCar(-1)}
              disabled={!isControlling}
              className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold hover:bg-slate-700"
            >
              ◀ LEFT [A]
            </button>
            <button
              onClick={() => moveCar(1)}
              disabled={!isControlling}
              className="px-6 py-2 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold hover:bg-slate-700"
            >
              RIGHT [D] ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
