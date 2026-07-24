/**
 * frontend/src/stations/EditingBay/index.jsx
 *
 * Editing Bay station — two modules:
 *   1. Timeline Reorder — drag video clips into the correct order
 *   2. Sync Rhythm      — tap a button in time with a beat indicator
 *
 * Props:
 *   isControlling — boolean
 *   onSolve       — () => void
 */

import { useEffect, useRef, useState } from 'react';

// ── Module 1: Timeline Reorder ─────────────────────────────────────────────

const CLIP_LABELS = [
  ['INTRO', 'MONTAGE', 'CLIMAX', 'CREDITS'],
  ['COLD OPEN', 'ACT 1', 'ACT 2', 'FINALE'],
  ['TEASER', 'REVEAL', 'TWIST', 'OUTRO'],
];

function TimelineReorder({ isControlling, onSolve }) {
  const [correct] = useState(() => CLIP_LABELS[Math.floor(Math.random() * CLIP_LABELS.length)]);
  const [clips, setClips] = useState(() => [...correct].sort(() => Math.random() - 0.5));
  const [dragging, setDragging] = useState(null);
  const [solved, setSolved] = useState(false);

  function startDrag(idx) {
    if (!isControlling || solved) return;
    setDragging(idx);
  }

  function dropOn(idx) {
    if (dragging === null || dragging === idx) { setDragging(null); return; }
    setClips((prev) => {
      const next = [...prev];
      [next[dragging], next[idx]] = [next[idx], next[dragging]];
      if (JSON.stringify(next) === JSON.stringify(correct)) {
        setSolved(true);
        onSolve?.();
      }
      return next;
    });
    setDragging(null);
  }

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-1">
        Arrange clips in order: <span className="text-purple-400">{correct.join(' → ')}</span>
      </p>
      <p className="text-xs text-gray-500 mb-2">Click two clips to swap them</p>
      {solved ? (
        <p className="text-green-400 text-sm font-bold">✅ Cut complete!</p>
      ) : (
        <div className="flex gap-1">
          {clips.map((c, i) => (
            <button
              key={i}
              onClick={() => dragging === null ? startDrag(i) : dropOn(i)}
              disabled={!isControlling}
              className="flex-1 py-2 rounded text-xs font-bold transition-all disabled:opacity-40"
              style={{
                background: dragging === i ? '#7c3aed' : '#333',
                color: dragging === i ? '#fff' : '#ccc',
                border: dragging === i ? '1px solid #a855f7' : '1px solid #444',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Module 2: Sync Rhythm ──────────────────────────────────────────────────

const BEAT_INTERVAL_MS = 800;
const TOTAL_BEATS = 8;
const HIT_WINDOW_MS = 200;

function SyncRhythm({ isControlling, onSolve }) {
  const [beatNum, setBeatNum] = useState(0);
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [flash, setFlash] = useState(null); // 'hit' | 'miss'
  const beatAtRef = useRef(null);
  const scoreRef = useRef(0);

  function startRhythm() {
    if (!isControlling || active || solved) return;
    setActive(true);
    setBeatNum(0);
    setScore(0);
    scoreRef.current = 0;
    let beat = 0;

    const id = setInterval(() => {
      beat++;
      setBeatNum(beat);
      beatAtRef.current = Date.now();
      if (beat >= TOTAL_BEATS) {
        clearInterval(id);
        setTimeout(() => {
          setActive(false);
          if (scoreRef.current >= Math.ceil(TOTAL_BEATS * 0.75)) {
            setSolved(true);
            onSolve?.();
          }
        }, BEAT_INTERVAL_MS);
      }
    }, BEAT_INTERVAL_MS);
  }

  function tap() {
    if (!isControlling || !active || solved) return;
    const now = Date.now();
    const beatAt = beatAtRef.current ?? 0;
    const diff = Math.abs(now - beatAt);
    if (diff <= HIT_WINDOW_MS) {
      setFlash('hit');
      setScore((s) => { scoreRef.current = s + 1; return s + 1; });
    } else {
      setFlash('miss');
    }
    setTimeout(() => setFlash(null), 200);
  }

  // Keyboard tap — use refs to avoid stale closures
  const activeRef = useRef(active);
  const solvedRef = useRef(solved);
  const isControllingRef = useRef(isControlling);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { solvedRef.current = solved; }, [solved]);
  useEffect(() => { isControllingRef.current = isControlling; }, [isControlling]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (!isControllingRef.current || !activeRef.current || solvedRef.current) return;
      const now = Date.now();
      const beatAt = beatAtRef.current ?? 0;
      const diff = Math.abs(now - beatAt);
      if (diff <= HIT_WINDOW_MS) {
        setFlash('hit');
        setScore((s) => { scoreRef.current = s + 1; return s + 1; });
      } else {
        setFlash('miss');
      }
      setTimeout(() => setFlash(null), 200);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="p-3">
      <p className="text-xs text-gray-400 mb-2">
        {solved ? '🎵 Perfect sync!' : active ? `Beat ${beatNum}/${TOTAL_BEATS} — Hits: ${score}` : 'Tap the beat when the indicator flashes'}
      </p>

      {/* Beat indicator */}
      <div
        className="h-8 rounded mb-3 transition-all duration-75 flex items-center justify-center text-sm font-bold"
        style={{
          background: active && beatAtRef.current && Date.now() - beatAtRef.current < 200
            ? '#facc15' : '#1a1a1a',
          color: '#fff',
        }}
      >
        {active ? '●' : solved ? '✅' : '○'}
      </div>

      {solved ? (
        <p className="text-green-400 text-sm font-bold text-center">🎬 Synced!</p>
      ) : active ? (
        <button
          onClick={tap}
          disabled={!isControlling}
          className="w-full py-3 rounded-xl font-extrabold text-lg transition-all disabled:opacity-40"
          style={{
            background: flash === 'hit' ? '#16a34a' : flash === 'miss' ? '#b91c1c' : '#4f46e5',
            color: '#fff',
          }}
        >
          {flash === 'hit' ? '✅ HIT' : flash === 'miss' ? '❌ MISS' : '🥁 TAP'}
        </button>
      ) : (
        <button
          onClick={startRhythm}
          disabled={!isControlling}
          className="w-full py-2 rounded font-bold text-sm disabled:opacity-40"
          style={{ background: '#4f46e5', color: '#fff' }}
        >
          ▶ Start Rhythm
        </button>
      )}
    </div>
  );
}

// ── EditingBay wrapper ─────────────────────────────────────────────────────

export default function EditingBay({ isControlling = true, onSolve }) {
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
        <h2 className="font-extrabold text-purple-400 text-sm tracking-wider">🎬 EDITING BAY</h2>
        <div className="flex gap-1">
          {moduleSolved.map((s, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${s ? 'bg-green-400' : 'bg-gray-600'}`} />
          ))}
        </div>
      </div>

      {allSolved ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-green-400 font-extrabold text-lg">🎥 PICTURE LOCK!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          <div className={moduleSolved[0] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 1 — Timeline</p>
            <TimelineReorder isControlling={isControlling} onSolve={() => handleModuleSolve(0)} />
          </div>
          <div className={moduleSolved[1] ? 'opacity-50 pointer-events-none' : ''}>
            <p className="px-3 pt-2 text-xs text-gray-500 uppercase tracking-wider">Module 2 — Sync Rhythm</p>
            <SyncRhythm isControlling={isControlling} onSolve={() => handleModuleSolve(1)} />
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
