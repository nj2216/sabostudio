/**
 * frontend/src/stations/TestTrack/index.jsx
 *
 * Test Track station — two modules:
 *   1. Gear Shift QTE — press the correct gear at the right moment
 *   2. Obstacle Dodge — steer a car left/right to avoid oncoming obstacles
 *
 * Props:
 *   isControlling — boolean
 *   onSolve       — () => void
 */

import { useEffect, useRef, useState } from 'react';

// ── Module 1: Gear Shift QTE ───────────────────────────────────────────────

const GEARS = ['1', '2', '3', '4', '5', 'R'];
/** Number of forward gears (excludes 'R') — used for random sequence generation. */
const FORWARD_GEARS_COUNT = GEARS.length - 1;

function GearShiftQTE({ isControlling, onSolve }) {
  const [sequence] = useState(() =>
    Array.from({ length: 5 }, () => GEARS[Math.floor(Math.random() * FORWARD_GEARS_COUNT)])
  ); // forward gears only
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);

  function shiftGear(g) {
    if (!isControlling || solved || wrong) return;
    if (g === sequence[step]) {
      const next = step + 1;
      if (next === sequence.length) {
        setSolved(true);
        onSolve?.();
      } else {
        setStep(next);
      }
    } else {
      setWrong(true);
      setTimeout(() => { setStep(0); setWrong(false); }, 700);
    }
  }

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-2">Shift through gears in order:</p>
      {/* Sequence display */}
      <div className="flex gap-1 mb-3 justify-center">
        {sequence.map((g, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded border flex items-center justify-center text-sm font-bold"
            style={{
              borderColor: i < step ? '#22c55e' : i === step ? '#facc15' : '#555',
              color: i < step ? '#22c55e' : i === step ? '#facc15' : '#888',
              background: i === step ? 'rgba(250,204,21,0.1)' : 'transparent',
            }}
          >
            {g}
          </div>
        ))}
      </div>
      {solved ? (
        <p className="text-green-400 text-sm font-bold text-center">🏁 Perfect shift!</p>
      ) : wrong ? (
        <p className="text-red-400 text-sm text-center">❌ Wrong gear! Restart.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {GEARS.map((g) => (
            <button
              key={g}
              onClick={() => shiftGear(g)}
              disabled={!isControlling}
              className={`py-2 rounded font-bold text-sm disabled:opacity-40 transition-colors ${
                sequence[step] === g ? 'ring-1 ring-yellow-400' : ''
              }`}
              style={{ background: '#333', color: '#fff' }}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Module 2: Obstacle Dodge ───────────────────────────────────────────────

const TRACK_LANES = 5;
const OBSTACLE_INTERVAL = 1200;
const TOTAL_OBSTACLES = 8;

function ObstacleDodge({ isControlling, onSolve }) {
  const [carLane, setCarLane] = useState(2); // 0–4
  const [obstacles, setObstacles] = useState([]); // { id, lane, y }
  const [dodged, setDodged] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [solved, setSolved] = useState(false);
  const nextId = useRef(0);
  const activeRef = useRef(false);

  const carLaneRef = useRef(carLane);
  useEffect(() => { carLaneRef.current = carLane; }, [carLane]);

  // Start spawning obstacles
  useEffect(() => {
    if (solved || crashed) return;
    activeRef.current = true;
    let spawned = 0;

    const spawnId = setInterval(() => {
      if (spawned >= TOTAL_OBSTACLES) {
        clearInterval(spawnId);
        return;
      }
      const lane = Math.floor(Math.random() * TRACK_LANES);
      const id = nextId.current++;
      spawned++;
      setObstacles((prev) => [...prev, { id, lane, y: 0 }]);
    }, OBSTACLE_INTERVAL);

    // Move obstacles down
    const moveId = setInterval(() => {
      setObstacles((prev) => {
        const updated = prev.map((o) => ({ ...o, y: o.y + 8 }));
        const active = updated.filter((o) => o.y < 100);

        // Check collision (obstacle near bottom = within car zone)
        const collision = updated.some(
          (o) => o.y >= 82 && o.y <= 98 && o.lane === carLaneRef.current,
        );

        if (collision) {
          setCrashed(true);
          clearInterval(moveId);
          clearInterval(spawnId);
          return [];
        }

        // Count dodged (fell off screen)
        const passed = updated.filter((o) => o.y >= 100);
        if (passed.length > 0) {
          setDodged((d) => {
            const total = d + passed.length;
            if (total >= TOTAL_OBSTACLES) {
              setSolved(true);
              clearInterval(moveId);
              clearInterval(spawnId);
              onSolve?.();
            }
            return total;
          });
        }

        return active;
      });
    }, 80);

    return () => {
      clearInterval(spawnId);
      clearInterval(moveId);
    };
  }, [onSolve, solved, crashed]);

  function moveCar(dir) {
    if (!isControlling || solved || crashed) return;
    setCarLane((l) => Math.max(0, Math.min(TRACK_LANES - 1, l + dir)));
  }

  // Keyboard control — use refs to avoid stale closure
  const isControllingRef = useRef(isControlling);
  const solvedRef = useRef(solved);
  const crashedRef = useRef(crashed);
  useEffect(() => { isControllingRef.current = isControlling; }, [isControlling]);
  useEffect(() => { solvedRef.current = solved; }, [solved]);
  useEffect(() => { crashedRef.current = crashed; }, [crashed]);

  useEffect(() => {
    function onKey(e) {
      if (!isControllingRef.current || solvedRef.current || crashedRef.current) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft')
        setCarLane((l) => Math.max(0, l - 1));
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight')
        setCarLane((l) => Math.min(TRACK_LANES - 1, l + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const laneW = 100 / TRACK_LANES;

  return (
    <div className="p-3">
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>Dodge: {dodged}/{TOTAL_OBSTACLES}</span>
        <span>{isControlling ? 'A/D or ← → to steer' : '👁️ Viewing'}</span>
      </div>
      {/* Track */}
      <div
        className="relative overflow-hidden rounded border border-gray-700"
        style={{ height: 120, background: '#1a1a1a' }}
      >
        {/* Lane lines */}
        {Array.from({ length: TRACK_LANES - 1 }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{ left: `${(i + 1) * laneW}%`, width: 1, background: '#333' }}
          />
        ))}

        {/* Obstacles */}
        {obstacles.map((o) => (
          <div
            key={o.id}
            className="absolute text-center"
            style={{
              left: `${o.lane * laneW}%`,
              top: `${o.y}%`,
              width: `${laneW}%`,
              fontSize: 18,
            }}
          >
            🪨
          </div>
        ))}

        {/* Car */}
        <div
          className="absolute text-center transition-all duration-75"
          style={{
            left: `${carLane * laneW}%`,
            bottom: 4,
            width: `${laneW}%`,
            fontSize: 18,
          }}
        >
          🏎️
        </div>

        {crashed && (
          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center text-white font-bold text-sm">
            💥 CRASHED
          </div>
        )}
        {solved && (
          <div className="absolute inset-0 bg-green-900/70 flex items-center justify-center text-white font-bold text-sm">
            🏁 CLEARED!
          </div>
        )}
      </div>
      {/* Manual steer buttons */}
      <div className="flex gap-2 mt-2 justify-center">
        <button
          onClick={() => moveCar(-1)}
          disabled={!isControlling || solved || crashed}
          className="px-4 py-1 rounded font-bold text-white disabled:opacity-40"
          style={{ background: '#1e3a8a' }}
        >
          ◀
        </button>
        <button
          onClick={() => moveCar(1)}
          disabled={!isControlling || solved || crashed}
          className="px-4 py-1 rounded font-bold text-white disabled:opacity-40"
          style={{ background: '#1e3a8a' }}
        >
          ▶
        </button>
      </div>
    </div>
  );
}

// ── TestTrack wrapper ──────────────────────────────────────────────────────

export default function TestTrack({ isControlling = true, onSolve }) {
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
        <h2 className="font-extrabold text-green-400 text-sm tracking-wider">🏎️ TEST TRACK</h2>
        <div className="flex gap-1">
          {moduleSolved.map((s, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${s ? 'bg-green-400' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {allSolved ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-green-400 font-extrabold text-lg">🏁 TRACK CLEARED!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          <div className={moduleSolved[0] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 1 — Gear Shift</p>
            <GearShiftQTE isControlling={isControlling} onSolve={() => handleModuleSolve(0)} />
          </div>
          <div className={moduleSolved[1] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 2 — Obstacle Dodge</p>
            <ObstacleDodge isControlling={isControlling} onSolve={() => handleModuleSolve(1)} />
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
