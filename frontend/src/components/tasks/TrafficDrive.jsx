/**
 * Traffic Drive mini-task.
 * Player must navigate a car through oncoming traffic by tapping left/right.
 * Survive without crashing for a distance to complete.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const LANES = 3;
const TARGET_DISTANCE = 50; // obstacles to dodge
const OBSTACLE_INTERVAL = 800; // ms between obstacles

export default function TrafficDrive({ onProgress, onComplete, progress }) {
  const [playerLane, setPlayerLane] = useState(1); // 0, 1, 2
  const [obstacles, setObstacles] = useState([]); // {id, lane, y}
  const [dodged, setDodged] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const frameRef = useRef(null);
  const lastObstacleRef = useRef(0);
  const obstacleIdRef = useRef(0);

  useEffect(() => {
    if (progress === 0) {
      setPlayerLane(1);
      setObstacles([]);
      setDodged(0);
      setCrashed(false);
      lastObstacleRef.current = Date.now();
    }
  }, [progress]);

  // Game loop
  useEffect(() => {
    function gameLoop() {
      const now = Date.now();

      setObstacles((prev) => {
        // Move obstacles down
        let updated = prev.map((o) => ({ ...o, y: o.y + 3 }));

        // Spawn new obstacle
        if (now - lastObstacleRef.current > OBSTACLE_INTERVAL) {
          lastObstacleRef.current = now;
          obstacleIdRef.current++;
          const lane = Math.floor(Math.random() * LANES);
          updated.push({ id: obstacleIdRef.current, lane, y: 0 });
        }

        // Check collisions and count dodged
        const surviving = [];
        let newDodged = 0;
        for (const o of updated) {
          if (o.y > 90) {
            // Passed the player zone
            newDodged++;
          } else if (o.y >= 75 && o.y <= 90 && o.lane === playerLane) {
            // Collision!
            setCrashed(true);
            setTimeout(() => setCrashed(false), 300);
          } else {
            surviving.push(o);
          }
        }

        if (newDodged > 0) {
          setDodged((d) => {
            const total = d + newDodged;
            const prog = Math.min(100, Math.round((total / TARGET_DISTANCE) * 100));
            onProgress(prog);
            if (total >= TARGET_DISTANCE) {
              onComplete();
            }
            return total;
          });
        }

        return surviving;
      });

      frameRef.current = requestAnimationFrame(gameLoop);
    }

    frameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [playerLane, onProgress, onComplete]);

  const moveLeft = useCallback(() => {
    setPlayerLane((l) => Math.max(0, l - 1));
  }, []);

  const moveRight = useCallback(() => {
    setPlayerLane((l) => Math.min(LANES - 1, l + 1));
  }, []);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft();
      if (e.key === 'ArrowRight' || e.key === 'd') moveRight();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [moveLeft, moveRight]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-emerald-400">🚗 Drive Through Traffic!</h3>
        <p className="text-gray-400 text-sm">Dodge {TARGET_DISTANCE} cars to complete</p>
        <p className="text-xs text-gray-500">Dodged: {dodged}/{TARGET_DISTANCE}</p>
      </div>

      {/* Road */}
      <div className={`relative w-48 h-64 bg-gray-700 rounded-lg border-2 border-gray-600 overflow-hidden ${crashed ? 'border-red-500 animate-shake' : ''}`}>
        {/* Lane dividers */}
        <div className="absolute inset-0 flex">
          {[...Array(LANES - 1)].map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r-2 border-dashed border-gray-500"
            />
          ))}
          <div className="flex-1" />
        </div>

        {/* Obstacles */}
        {obstacles.map((o) => (
          <div
            key={o.id}
            className="absolute w-12 h-8 text-center text-2xl"
            style={{
              left: `${(o.lane / LANES) * 100 + 100 / LANES / 2 - 8}%`,
              top: `${o.y}%`,
              transition: 'top 0.05s linear',
            }}
          >
            🚙
          </div>
        ))}

        {/* Player car */}
        <div
          className="absolute bottom-4 w-12 h-8 text-center text-2xl transition-all duration-150"
          style={{
            left: `${(playerLane / LANES) * 100 + 100 / LANES / 2 - 8}%`,
          }}
        >
          🏎️
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={moveLeft}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-bold text-lg active:scale-95 transition-transform"
        >
          ← Left
        </button>
        <button
          onClick={moveRight}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-bold text-lg active:scale-95 transition-transform"
        >
          Right →
        </button>
      </div>
    </div>
  );
}
