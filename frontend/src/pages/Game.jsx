/**
 * frontend/src/pages/Game.jsx
 *
 * Main game screen for Sabotage Studio.
 *
 * Responsibilities:
 *   - Renders "The Lot" map with LotCanvas (free-roam WASD movement).
 *   - Manages the station-swap engine (useStationSwap + startSwapScheduler).
 *   - Opens station overlays when a player enters a task room and presses E.
 *   - Applies sabotage effects received from the host (useSabotageReceiver).
 *   - Host shows a Director HUD: Director Tokens + sabotage controls.
 *   - Handles Studio Crisis co-op events (power-outage, fire-alarm).
 *
 * Props:
 *   peer          — import('peerjs').Peer
 *   playerId      — string
 *   playerName    — string
 *   isHost        — boolean
 *   players       — [{ id, name, isHost, peerId }]
 *   conn          — DataConnection | null   (guest's connection to host; null for host)
 *   broadcast     — Function | null         (host's broadcast fn; null for guest)
 *   connections   — Map | null              (host's connections map; null for guest)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LotCanvas from '../map/LotCanvas.jsx';
import { useTaskZoneTrigger } from '../map/useTaskZoneTrigger.js';
import { usePlayerMovement } from '../lib/playerMovement.js';
import { startSwapScheduler, useStationSwap } from '../lib/stationSwap.js';
import { createSabotageDeck, useSabotageReceiver } from '../sabotage/SabotageDeck.js';
import { ALL_EFFECTS } from '../sabotage/SabotageEffect.js';
import BombSet from '../stations/BombSet/index.jsx';
import Kitchen from '../stations/Kitchen/index.jsx';
import TestTrack from '../stations/TestTrack/index.jsx';
import RadioBooth from '../stations/RadioBooth/index.jsx';
import EditingBay from '../stations/EditingBay/index.jsx';
import layout from '../map/lotLayout.json';

// ── Station component map ──────────────────────────────────────────────────

const STATION_COMPONENTS = {
  'bomb-set':    BombSet,
  'kitchen':     Kitchen,
  'test-track':  TestTrack,
  'radio-booth': RadioBooth,
  'editing-bay': EditingBay,
};

// IDs of rooms that have a task
const TASK_STATION_IDS = Object.keys(STATION_COMPONENTS);

// Build walkable rectangles from map layout (rooms + corridors)
const WALKABLE_RECTS = [
  ...layout.rooms.map((r) => r.bounds),
  ...layout.corridors.map((c) => c.bounds),
];

/** Palette cycling for player avatar colours — defined at module scope to avoid recreation on each render. */
const PLAYER_COLOURS = [
  'text-purple-400', 'text-blue-400', 'text-green-400', 'text-yellow-400',
  'text-red-400', 'text-pink-400', 'text-teal-400', 'text-orange-400',
];

// ── Studio Crisis overlay ──────────────────────────────────────────────────

const CRISIS_MESSAGES = {
  'power-outage': {
    title: '⚡ POWER OUTAGE!',
    body: 'Emergency power only. All players: tap together on the countdown or the whole lobby loses points!',
    colour: '#facc15',
  },
  'fire-alarm': {
    title: '🔥 FIRE ALARM!',
    body: "GET OUT! Everyone return to Craft Services immediately or your task won't count!",
    colour: '#ef4444',
  },
  'take-too-many': {
    title: '🎬 RESHOOT!',
    body: "Too many sabotages! Everyone must complete a quick co-op reshoot to reset the tension.",
    colour: '#a855f7',
  },
};

function StudioCrisisOverlay({ type, onDismiss }) {
  const info = CRISIS_MESSAGES[type];
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="max-w-sm w-full rounded-2xl p-6 text-center shadow-2xl"
        style={{ background: '#111', border: `2px solid ${info.colour}` }}
      >
        <p className="text-2xl font-extrabold mb-2" style={{ color: info.colour }}>
          {info.title}
        </p>
        <p className="text-gray-300 text-sm mb-4">{info.body}</p>
        <button
          onClick={onDismiss}
          className="px-6 py-2 rounded-xl font-bold text-black"
          style={{ background: info.colour }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

// ── Swap countdown banner ──────────────────────────────────────────────────

function SwapCountdown({ countdown, viewingStationId, controllingStationId }) {
  const secs = Math.ceil(countdown / 1000);
  const urgent = secs <= 5 && secs > 0;

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: urgent ? '#7f1d1d' : '#1a1a1a', transition: 'background 0.3s' }}
    >
      <span className="text-gray-400">
        👁️ <span className="text-white">{viewingStationId ?? '—'}</span>
        {' '}|{' '}
        🎮 <span className="text-white">{controllingStationId ?? '—'}</span>
      </span>
      {countdown > 0 && (
        <span className={urgent ? 'text-red-400 font-bold animate-pulse' : 'text-gray-500'}>
          Swap in {secs}s
        </span>
      )}
    </div>
  );
}

// ── Director HUD ───────────────────────────────────────────────────────────

function DirectorHUD({ deck, players, onCrisis }) {
  const [tokens, setTokens] = useState(deck.tokensLeft);
  const [selectedEffect, setSelectedEffect] = useState(ALL_EFFECTS[0]?.id ?? '');
  const [selectedTarget, setSelectedTarget] = useState(players[0]?.id ?? '');

  function fire() {
    if (!selectedEffect || !selectedTarget) return;
    const ok = deck.fire(selectedEffect, selectedTarget, 'any');
    if (ok) setTokens(deck.tokensLeft);
  }

  return (
    <div className="bg-gray-900 border border-yellow-700 rounded-xl p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-extrabold text-yellow-400 text-sm">🎬 Director HUD</h3>
        <span className="text-yellow-300 font-bold">
          {tokens} Token{tokens !== 1 ? 's' : ''} left
        </span>
      </div>

      {/* Effect picker */}
      <div className="mb-2">
        <label className="text-gray-400 block mb-1">Sabotage Effect</label>
        <select
          value={selectedEffect}
          onChange={(e) => setSelectedEffect(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
        >
          {ALL_EFFECTS.map((e) => (
            <option key={e.id} value={e.id}>
              [{e.category}] {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Target picker */}
      <div className="mb-2">
        <label className="text-gray-400 block mb-1">Target Player</label>
        <select
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
        >
          {players.filter((p) => !p.isHost).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={fire}
        disabled={tokens <= 0}
        className="w-full py-1.5 rounded font-bold text-black disabled:opacity-40 mb-2"
        style={{ background: '#facc15' }}
      >
        🎯 Fire Token ({tokens} left)
      </button>

      {/* Studio Crisis buttons */}
      <div className="border-t border-gray-700 pt-2">
        <p className="text-gray-500 mb-1">Studio Crisis</p>
        <div className="flex gap-1 flex-wrap">
          {Object.keys(CRISIS_MESSAGES).map((type) => (
            <button
              key={type}
              onClick={() => onCrisis(type)}
              className="px-2 py-1 rounded text-white text-xs"
              style={{ background: '#4a1d96' }}
            >
              {CRISIS_MESSAGES[type].title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Game component ─────────────────────────────────────────────────────────

export default function Game({
  peer,
  playerId,
  playerName,
  isHost,
  players,
  conn,
  broadcast,
  // connections — reserved for future host-migration use
  onMessage,
  swapSettings,
}) {
  // ── Station overlay ──────────────────────────────────────────────────────
  const [activeStationId, setActiveStationId] = useState(null);
  const stationElRef = useRef(null);

  // ── Blackout / vent seal (Director map effects) ──────────────────────────
  const [blackout, setBlackout] = useState(false);
  const [ventSealed] = useState(false);
  const [lockedRooms] = useState([]);

  // ── Studio Crisis ────────────────────────────────────────────────────────
  const [crisis, setCrisis] = useState(null);

  // ── Player movement ──────────────────────────────────────────────────────
  const { localPos, allPositions, setBroadcast, receiveGuestMove } = usePlayerMovement({
    playerId,
    isHost,
    conn,
    initialPos: layout.spawnPoint,
    walkableRects: WALKABLE_RECTS,
  });

  // Give movement hook access to broadcast fn
  useEffect(() => {
    if (isHost && broadcast) setBroadcast(broadcast);
  }, [isHost, broadcast, setBroadcast]);

  // ── Task zone trigger ────────────────────────────────────────────────────
  const { nearbyRoom } = useTaskZoneTrigger({
    localPos,
    rooms: layout.rooms,
    onEnterRoom: useCallback((roomId, stationId) => {
      if (stationId) setActiveStationId(stationId);
    }, []),
  });

  // ── Station swap (client hook) ───────────────────────────────────────────
  const { viewingStationId, controllingStationId, countdown, setHostMapping } = useStationSwap(
    isHost ? null : conn,
    playerId,
    null,
  );

  // ── Station swap (host) ──────────────────────────────────────────────────
  const swapSchedulerRef = useRef(null);

  useEffect(() => {
    if (!isHost) return;
    const playerIds = players.map((p) => p.id);
    const { stop, triggerNow } = startSwapScheduler(
      broadcast,
      playerIds,
      TASK_STATION_IDS,
      swapSettings?.minMs,
      swapSettings?.maxMs,
      (mapping, delay) => {
        setHostMapping(mapping[playerId], delay);
      }
    );
    swapSchedulerRef.current = { stop, triggerNow };
    return () => stop();
  }, [isHost, broadcast, players, swapSettings, playerId, setHostMapping]);

  // ── Sabotage receiver (guests) ───────────────────────────────────────────
  const sabotageCallbacks = useMemo(() => ({
    onEarlySwap: () => swapSchedulerRef.current?.triggerNow(),
    onCrisis: (type) => setCrisis(type),
  }), []);

  useSabotageReceiver(isHost ? null : conn, playerId, stationElRef, sabotageCallbacks);

  // ── Director deck (host) ─────────────────────────────────────────────────
  const deckRef = useRef(null);
  if (isHost && !deckRef.current && broadcast) {
    deckRef.current = createSabotageDeck(broadcast);
  }

  // ── Host: handle guest messages (player-move + any future types) ─────────
  useEffect(() => {
    if (!isHost || !onMessage) return;

    onMessage('player-move', (conn, payload) => {
      const canonicalId = players.find(p => p.peerId === conn.peer)?.id;
      if (canonicalId) {
        receiveGuestMove(canonicalId, payload);
      }
    });
  }, [isHost, onMessage, players, receiveGuestMove]);

  // ── Director map effects via crisis / lockdown ───────────────────────────
  function handleCrisis(type) {
    if (broadcast) broadcast({ type: 'studio-crisis', payload: { type } });
    setCrisis(type);
    if (type === 'fire-alarm') {
      // Visual: blackout + fire alarm crisis — handled client-side in overlay
    }
    if (type === 'power-outage') {
      setBlackout(true);
      setTimeout(() => setBlackout(false), 8000);
    }
  }

  // ── Active station component ─────────────────────────────────────────────
  const StationComp = activeStationId ? STATION_COMPONENTS[activeStationId] : null;
  // A player controls the active station if:
  //   (1) no active station — default, nothing to control
  //   (2) the swap mapping says this player controls this exact station
  //   (3) the host has no explicit controlling assignment yet (initial state)
  const isControllingActive =
    !activeStationId ||
    controllingStationId === activeStationId ||
    (!controllingStationId && isHost);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-purple-400 font-extrabold">🎮 Sabotage Studio</span>
          {isHost && <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">DIRECTOR</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{playerName}</span>
          <span>|</span>
          <span>{players.length} player{players.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Swap status bar */}
      <div className="px-4 py-1 bg-gray-950 border-b border-gray-800 flex-shrink-0">
        <SwapCountdown
          countdown={countdown}
          viewingStationId={viewingStationId}
          controllingStationId={controllingStationId}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 p-4 overflow-auto">
        {/* Map column */}
        <div className="flex-shrink-0">
          <LotCanvas
            allPositions={allPositions}
            localPlayerId={playerId}
            players={players}
            nearbyRoom={nearbyRoom}
            lockedRooms={lockedRooms}
            blackout={blackout}
            ventSealed={ventSealed}
            controllingStationId={controllingStationId}
          />
          <p className="text-center text-xs text-gray-600 mt-1">
            WASD / ↑↓←→ · E to enter station
          </p>
        </div>

        {/* Right column: station + director HUD */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {/* Station overlay */}
          {activeStationId ? (
            <div className="relative flex-1" ref={stationElRef}>
              {/* Close button */}
              <button
                onClick={() => setActiveStationId(null)}
                className="absolute top-2 right-2 z-10 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                ✕ Leave station
              </button>
              {StationComp && (
                <StationComp
                  isControlling={isControllingActive}
                  onSolve={() => console.log(`[Game] Station ${activeStationId} solved by ${playerId}`)}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-xl border border-gray-800 text-gray-600 text-sm">
              Walk to a station and press <kbd className="mx-1 px-1.5 py-0.5 bg-gray-800 rounded text-gray-300 font-mono text-xs">E</kbd> to enter
            </div>
          )}

          {/* Director HUD (host only) */}
          {isHost && deckRef.current && (
            <DirectorHUD
              deck={deckRef.current}
              players={players}
              onCrisis={handleCrisis}
            />
          )}

          {/* Player list sidebar */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs">
            <p className="text-gray-500 mb-2 font-semibold uppercase tracking-wider">Players</p>
            <ul className="space-y-1">
              {players.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-current ${PLAYER_COLOURS[i % PLAYER_COLOURS.length]}`} />
                  <span className={p.id === playerId ? 'font-bold text-white' : 'text-gray-300'}>
                    {p.name} {p.isHost ? '👑' : ''} {p.id === playerId ? '(you)' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Studio Crisis overlay */}
      {crisis && (
        <StudioCrisisOverlay type={crisis} onDismiss={() => setCrisis(null)} />
      )}
    </div>
  );
}
