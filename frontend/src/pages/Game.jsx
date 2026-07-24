/**
 * frontend/src/pages/Game.jsx
 *
 * Main game screen for Sabotage Studio — Points-based Task & Sabotage mode.
 *
 * Features:
 *   - Renders "The Lot" top-down map with LotCanvas (WASD movement).
 *   - Every player completes tasks at station terminals to earn +100 PTS.
 *   - Leaderboard tracks player points in real-time.
 *   - Every player can open the Sabotage Shop to spend points on sabotages against opponents.
 *   - Control Swap Sabotage: Swaps control inputs of two players while keeping camera locked to each player's avatar.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LotCanvas from '../map/LotCanvas.jsx';
import { useTaskZoneTrigger } from '../map/useTaskZoneTrigger.js';
import { usePlayerMovement } from '../lib/playerMovement.js';
import { applySabotageEffectLocally, createSabotageBroadcaster, useSabotageReceiver } from '../sabotage/SabotageDeck.js';
import { ALL_EFFECTS } from '../sabotage/SabotageEffect.js';
import { sendMessage } from '../lib/peer.js';
import WireCutter from '../stations/WireCutter/index.jsx';
import PattyFlipper from '../stations/PattyFlipper/index.jsx';
import FrequencyTuner from '../stations/FrequencyTuner/index.jsx';
import LaneWeaver from '../stations/LaneWeaver/index.jsx';
import ChemicalMix from '../stations/ChemicalMix/index.jsx';
import SafeCracker from '../stations/SafeCracker/index.jsx';
import BugSwatter from '../stations/BugSwatter/index.jsx';
import EspressoRush from '../stations/EspressoRush/index.jsx';
import RocketLaunch from '../stations/RocketLaunch/index.jsx';
import KeyDuplicator from '../stations/KeyDuplicator/index.jsx';
import layout from '../map/lotLayout.json';

// ── Station component map ──────────────────────────────────────────────────

const STATION_COMPONENTS = {
  'bomb-set':      WireCutter,
  'patty-flipper': PattyFlipper,
  'radio-booth':   FrequencyTuner,
  'lane-weaver':   LaneWeaver,
  'chem-lab':      ChemicalMix,
  'safe-vault':    SafeCracker,
  'bug-swat':      BugSwatter,
  'espresso-bar':  EspressoRush,
  'rocket-launch': RocketLaunch,
  'key-shop':      KeyDuplicator,
};

// Build walkable rectangles from map layout (rooms + corridors)
const WALKABLE_RECTS = [
  ...layout.rooms.map((r) => r.bounds),
  ...layout.corridors.map((c) => c.bounds),
];

/** Palette cycling for player avatar colours */
const PLAYER_COLOURS = [
  'text-purple-400', 'text-blue-400', 'text-green-400', 'text-yellow-400',
  'text-red-400', 'text-pink-400', 'text-teal-400', 'text-orange-400',
];

// ── Studio Crisis overlay ──────────────────────────────────────────────────

const CRISIS_MESSAGES = {
  'power-outage': {
    title: '⚡ POWER OUTAGE CRISIS',
    body: 'Emergency power active. All operators: vision restricted for 8 seconds!',
    colour: '#ffb703',
  },
  'fire-alarm': {
    title: '🔥 FIRE ALARM ALERT',
    body: 'CRITICAL HAZARD! Vacate immediately and return to safety!',
    colour: '#ff0055',
  },
  'take-too-many': {
    title: '🎬 EMERGENCY RESHOOT',
    body: 'Sabotage threshold exceeded! Execute emergency reshoot sequence.',
    colour: '#9d4edd',
  },
};

function StudioCrisisOverlay({ type, onDismiss }) {
  const info = CRISIS_MESSAGES[type];
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        className="hud-container hud-cut-corner max-w-md w-full p-6 text-center shadow-[0_0_40px_rgba(255,0,85,0.4)] flex flex-col items-center gap-4"
        style={{ borderColor: info.colour }}
      >
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-slate-400">
          <span className="w-2 h-2 rounded-full animate-ping" style={{ background: info.colour }} />
          STUDIO CRISIS MATRIX TRIGGERED
        </div>
        <h2 className="font-head text-2xl font-extrabold tracking-wider" style={{ color: info.colour }}>
          {info.title}
        </h2>
        <p className="font-sub text-slate-200 text-sm leading-relaxed">{info.body}</p>
        <button
          onClick={onDismiss}
          className="fire-button mt-2"
          style={{ background: info.colour, color: '#000' }}
        >
          ACKNOWLEDGE & DISMISS
        </button>
      </div>
    </div>
  );
}

// ── Control Swap Warning Banner ──────────────────────────────────────────────

function ControlSwapBanner({ targetName, remainingSecs }) {
  return (
    <div className="hud-container flex items-center justify-between px-4 py-2 text-xs font-mono border-x-0 border-t-0 border-b-neon-amber bg-amber-950/90 text-amber-200 shadow-[0_0_20px_rgba(255,183,3,0.4)] animate-pulse">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔄</span>
        <div>
          <span className="font-bold text-white uppercase">CONTROL SWAP ACTIVE!</span>
          <span className="ml-2 text-amber-300">You are controlling <b className="text-white underline">{targetName}</b>'s movement!</span>
        </div>
      </div>
      <div className="font-bold text-neon-amber">
        REVERT IN: {remainingSecs}S
      </div>
    </div>
  );
}

// ── Sabotage Shop Modal ─────────────────────────────────────────────────────

function SabotageShopModal({ points, players, localPlayerId, onFireSabotage, onClose }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedEffect, setSelectedEffect] = useState(ALL_EFFECTS[0]?.id ?? '');

  const opponents = useMemo(() => players.filter((p) => p.id !== localPlayerId), [players, localPlayerId]);
  const [selectedTarget, setSelectedTarget] = useState(opponents[0]?.id ?? '');

  // Keep target valid if players list updates
  useEffect(() => {
    if (!opponents.some((p) => p.id === selectedTarget) && opponents.length > 0) {
      setSelectedTarget(opponents[0].id);
    }
  }, [opponents, selectedTarget]);

  const categories = ['ALL', 'VISUAL', 'INPUT', 'SOCIAL', 'STRUCTURAL'];
  const filteredEffects = ALL_EFFECTS.filter(
    (e) => activeTab === 'ALL' || e.category.toUpperCase() === activeTab
  );

  const currentEffectObj = ALL_EFFECTS.find((e) => e.id === selectedEffect);
  const cost = currentEffectObj?.cost ?? 50;
  const canAfford = points >= cost;

  function fire() {
    if (!selectedEffect) return;
    onFireSabotage(selectedEffect, selectedTarget);
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="hud-container hud-cut-corner max-w-xl w-full p-0 shadow-[0_0_50px_rgba(0,243,255,0.25)] border-neon-cyan/50 flex flex-col max-h-[90vh]">
        <div className="container-header py-3 px-4 flex items-center justify-between">
          <div className="container-title font-mono text-sm text-neon-cyan flex items-center gap-2">
            <span className="status-indicator bg-neon-cyan shadow-[0_0_8px_var(--neon-cyan)]" />
            ⚡ SABOTAGE CONSOLE & SHOP
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-xs text-neon-amber bg-amber-950/60 border border-neon-amber/40 px-3 py-1 font-bold rounded">
              YOUR POINTS: {points} PTS
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white font-mono text-sm">
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`tab-btn text-xs py-1 px-3 ${activeTab === cat ? 'active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sabotage Effect Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredEffects.map((eff) => {
              const effCost = eff.cost ?? 50;
              const isSelected = selectedEffect === eff.id;
              const isAffordable = points >= effCost;

              return (
                <div
                  key={eff.id}
                  onClick={() => setSelectedEffect(eff.id)}
                  className={`p-2.5 border rounded cursor-pointer transition-all flex flex-col justify-between text-xs ${isSelected ? 'bg-cyan-950/40 border-neon-cyan shadow-[0_0_12px_rgba(0,243,255,0.3)] text-white' : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="truncate">{eff.name}</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${isAffordable ? 'bg-amber-950/80 text-neon-amber border border-neon-amber/40' : 'bg-slate-800 text-slate-500'}`}>
                      {effCost} PTS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                    {eff.description || 'Apply sabotage disruption against opponent.'}
                  </p>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span className="uppercase">{eff.category}</span>
                    <span>{eff.durationMs ? `${eff.durationMs / 1000}S DURATION` : 'INSTANT'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Target Selection */}
          <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-3">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">
              SELECT TARGET OPPONENT
            </span>
            {opponents.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No opponents connected — wait for other players to join.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {opponents.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedTarget(p.id)}
                    className={`p-2 border rounded transition-all cursor-pointer flex items-center gap-2 text-xs ${selectedTarget === p.id ? 'bg-amber-950/40 border-neon-amber text-white shadow-[0_0_10px_rgba(255,183,3,0.2)]' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center font-head font-bold text-[10px] ${selectedTarget === p.id ? 'bg-neon-amber text-black' : 'bg-slate-800 text-slate-300'}`}>
                      {p.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="font-semibold truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fire Sabotage Button */}
          <button
            onClick={fire}
            disabled={!canAfford || !selectedEffect || (selectedEffect !== 'controlSwap' && opponents.length > 0 && !selectedTarget)}
            className={`fire-button mt-1 py-3 text-xs tracking-wider font-bold uppercase transition-all ${canAfford ? 'bg-neon-red text-white shadow-[0_0_20px_rgba(255,0,85,0.4)] hover:brightness-110' : 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700'}`}
          >
            {canAfford ? `🎯 EXECUTE SABOTAGE (${cost} PTS)` : `❌ NEED ${cost} PTS (HAVE ${points} PTS)`}
          </button>
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
  onMessage,
}) {
  // ── Station overlay state & Escape key handler ────────────────────────────
  const [activeStationId, setActiveStationId] = useState(null);
  const stationElRef = useRef(null);

  // ── Points & Scores State ─────────────────────────────────────────────────
  const [scores, setScores] = useState(() => {
    const init = {};
    players.forEach((p) => { init[p.id] = 0; });
    return init;
  });
  const scoresRef = useRef(scores);
  useEffect(() => { scoresRef.current = scores; }, [scores]);

  // Keep scores updated when new players arrive
  useEffect(() => {
    setScores((prev) => {
      const updated = { ...prev };
      players.forEach((p) => {
        if (updated[p.id] === undefined) updated[p.id] = 0;
      });
      return updated;
    });
  }, [players]);

  // ── Toast Notification state ──────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  function showToast(msg, duration = 3000) {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }

  // ── UI Overlay Toggles ────────────────────────────────────────────────────
  const [showSabotageShop, setShowSabotageShop] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

  // ── Blackout / Map Crisis state ──────────────────────────────────────────
  const [blackout, setBlackout] = useState(false);
  const [crisis, setCrisis] = useState(null);

  // ── Control Swap state ────────────────────────────────────────────────────
  const [controlTargetId, setControlTargetId] = useState(null);
  const [controlSwapInfo, setControlSwapInfo] = useState(null);
  const controlSwapTimerRef = useRef(null);

  // Close station terminal on ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && activeStationId) {
        setActiveStationId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStationId]);

  // ── Player movement ──────────────────────────────────────────────────────
  const { localPos, allPositions, setBroadcast, receiveGuestMove } = usePlayerMovement({
    playerId,
    controlTargetId,
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
      if (stationId && !activeStationId) {
        setActiveStationId(stationId);
      }
    }, [activeStationId]),
  });

  // ── Stage & Terminal Refs ────────────────────────────────────────────────
  const stageRef = useRef(null);
  const hostActiveEffects = useRef(new Map());

  const getTargetEl = useCallback(
    () => stationElRef.current || stageRef.current || document.body,
    []
  );

  // ── Control Swap Trigger Handler ─────────────────────────────────────────
  const handleControlSwapEvent = useCallback(
    ({ playerAId, playerBId, playerAName, playerBName, durationMs }) => {
      let targetId = null;
      let targetName = null;

      if (playerId === playerAId) {
        targetId = playerBId;
        targetName = playerBName;
      } else if (playerId === playerBId) {
        targetId = playerAId;
        targetName = playerAName;
      }

      if (targetId) {
        setControlTargetId(targetId);
        showToast(`🔄 CONTROL SWAP! You are controlling ${targetName}!`, 4000);

        let remaining = Math.ceil(durationMs / 1000);
        setControlSwapInfo({ targetName, remainingSecs: remaining });

        if (controlSwapTimerRef.current) clearInterval(controlSwapTimerRef.current);
        controlSwapTimerRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clearInterval(controlSwapTimerRef.current);
            setControlTargetId(null);
            setControlSwapInfo(null);
            showToast('🔄 Control Swap ended. Controls restored to normal.');
          } else {
            setControlSwapInfo({ targetName, remainingSecs: remaining });
          }
        }, 1000);
      } else {
        showToast(`⚡ Control Swap activated between ${playerAName} and ${playerBName}!`);
      }
    },
    [playerId]
  );

  // ── Sabotage Receiver Callbacks ──────────────────────────────────────────
  const sabotageCallbacks = useMemo(
    () => ({
      onControlSwap: handleControlSwapEvent,
      onCrisis: (type) => {
        setCrisis(type);
        if (type === 'power-outage') {
          setBlackout(true);
          setTimeout(() => setBlackout(false), 8000);
        }
      },
      onSabotageApplied: (payload) => {
        if (payload?.targetPlayerId === playerId) {
          showToast(`⚠️ Sabotage applied to you by ${payload.buyerName || 'an opponent'}!`);
        }
      },
    }),
    [handleControlSwapEvent, playerId]
  );

  // ── Sabotage Broadcaster (Host) ──────────────────────────────────────────
  const sabotageBroadcasterRef = useRef(null);
  useEffect(() => {
    if (isHost && broadcast) {
      sabotageBroadcasterRef.current = createSabotageBroadcaster(
        broadcast,
        () => scoresRef.current,
        setScores,
        players,
        (payload) => {
          if (payload.targetPlayerId === playerId) {
            showToast(`⚠️ Sabotage applied to you by ${payload.buyerName || 'an opponent'}!`);
            applySabotageEffectLocally(payload, getTargetEl, hostActiveEffects.current, sabotageCallbacks);
          }
        },
        handleControlSwapEvent
      );
    }
  }, [isHost, broadcast, players, playerId, getTargetEl, sabotageCallbacks, handleControlSwapEvent]);

  useSabotageReceiver(isHost ? null : conn, playerId, getTargetEl, sabotageCallbacks);

  // ── Network Messages (Host side) ──────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !onMessage) return;

    // Handle guest movement
    onMessage('player-move', (conn, payload) => {
      const canonicalSenderId = players.find((p) => p.peerId === conn.peer)?.id;
      if (!canonicalSenderId) return;

      const targetId = payload?.targetId || canonicalSenderId;
      const pos = payload?.pos || payload;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        receiveGuestMove(targetId, pos);
      }
    });

    // Handle task completions from guests
    onMessage('task-complete', (conn, payload) => {
      const canonicalId = payload?.playerId || players.find((p) => p.peerId === conn.peer)?.id;
      const pts = payload?.pts || 100;
      if (canonicalId) {
        setScores((prev) => {
          const updated = { ...prev, [canonicalId]: (prev[canonicalId] ?? 0) + pts };
          broadcast?.({ type: 'score-update', payload: { scores: updated } });
          return updated;
        });
      }
    });

    // Handle sabotage purchases from guests
    onMessage('buy-sabotage', (conn, payload) => {
      const buyerId = players.find((p) => p.peerId === conn.peer)?.id;
      if (buyerId && sabotageBroadcasterRef.current) {
        sabotageBroadcasterRef.current.fireSabotage(
          buyerId,
          payload.effectId,
          payload.targetPlayerId,
          payload.stationId
        );
      }
    });
  }, [isHost, onMessage, players, receiveGuestMove, broadcast]);

  // ── Network Messages (Guest side) ─────────────────────────────────────────
  useEffect(() => {
    if (isHost || !conn) return;

    function handleData(raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }

      if (msg.type === 'score-update') {
        if (msg.payload?.scores) {
          setScores(msg.payload.scores);
        }
      }
      if (msg.type === 'control-swap') {
        handleControlSwapEvent(msg.payload);
      }
    }

    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [isHost, conn, handleControlSwapEvent]);

  // ── Task Solve Action ────────────────────────────────────────────────────
  function handleTaskSolve(pts = 100) {
    showToast(`🎯 TASK COMPLETED! +${pts} POINTS AWARDED!`);

    setScores((prev) => {
      const current = prev[playerId] ?? 0;
      const updated = { ...prev, [playerId]: current + pts };

      if (isHost && broadcast) {
        broadcast({ type: 'score-update', payload: { scores: updated } });
      } else if (conn) {
        sendMessage(conn, 'task-complete', { playerId, pts, stationId: activeStationId });
      }

      return updated;
    });

    // Close terminal after brief delay so defused message renders
    setTimeout(() => {
      setActiveStationId(null);
    }, 1200);
  }

  // ── Sabotage Purchase Action ─────────────────────────────────────────────
  function handleFireSabotage(effectId, targetPlayerId) {
    if (isHost && sabotageBroadcasterRef.current) {
      const ok = sabotageBroadcasterRef.current.fireSabotage(
        playerId,
        effectId,
        targetPlayerId,
        activeStationId || 'any'
      );
      if (ok) {
        showToast('🎯 Sabotage executed successfully!');
        setShowSabotageShop(false);
      } else {
        showToast('❌ Not enough points!');
      }
    } else if (!isHost && conn) {
      const effObj = ALL_EFFECTS.find((e) => e.id === effectId);
      const cost = effObj?.cost ?? 50;
      if ((scores[playerId] ?? 0) < cost) {
        showToast('❌ Not enough points!');
        return;
      }

      sendMessage(conn, 'buy-sabotage', {
        buyerId: playerId,
        effectId,
        targetPlayerId,
        stationId: activeStationId || 'any',
      });
      showToast('🎯 Sabotage request sent!');
      setShowSabotageShop(false);
    }
  }

  // ── Active station component ─────────────────────────────────────────────
  const StationComp = activeStationId ? STATION_COMPONENTS[activeStationId] : null;

  const myPoints = scores[playerId] ?? 0;

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 bg-bg-void relative z-10">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 z-50 bg-slate-900 border border-neon-cyan text-neon-cyan px-4 py-2 font-mono text-xs font-bold rounded shadow-[0_0_20px_rgba(0,243,255,0.4)] animate-bounce">
          {toast}
        </div>
      )}

      {/* ── Single 16:9 Among Us Stage Container ────────────────────────────── */}
      <div className="w-full max-w-5xl aspect-video relative hud-container hud-cut-corner overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,243,255,0.15)] border-neon-cyan/40" ref={stageRef}>
        
        {/* Layer 0: Main Camera Feed Viewport (Map Canvas) */}
        <div className="absolute inset-0 w-full h-full z-0">
          <LotCanvas
            allPositions={allPositions}
            localPlayerId={playerId}
            players={players}
            nearbyRoom={nearbyRoom}
            lockedRooms={[]}
            blackout={blackout}
            ventSealed={false}
          />
        </div>

        {/* Layer 10: Top HUD Navigation & Leaderboard Bar */}
        <div className="absolute top-0 inset-x-0 z-10 flex flex-col">
          <div className="top-hud py-1.5 px-4 bg-slate-950/90 border-b border-neon-cyan/20 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="brand-logo text-base">
                SABOTAGE <span>STUDIO</span>
              </h1>
              <div className="flex items-center gap-1.5 font-mono text-[9px] text-neon-red font-bold">
                <span className="w-2 h-2 rounded-full bg-neon-red animate-ping" />
                CAM-01 ● LIVE
              </div>
            </div>

            {/* Live Player Score HUD Pill */}
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs text-neon-amber bg-amber-950/80 border border-neon-amber/50 px-3 py-1 font-bold rounded flex items-center gap-2">
                <span>⭐ MY POINTS:</span>
                <span className="text-white text-sm font-extrabold">{myPoints} PTS</span>
              </div>

              <div className="font-mono text-[10px] text-slate-300 hidden sm:block">
                OPERATOR: <b className="text-neon-cyan">{playerName}</b> {isHost ? '👑' : ''}
              </div>
            </div>
          </div>

          {/* Control Swap Active Warning Bar */}
          {controlSwapInfo && (
            <ControlSwapBanner
              targetName={controlSwapInfo.targetName}
              remainingSecs={controlSwapInfo.remainingSecs}
            />
          )}
        </div>

        {/* Layer 10: Bottom Controls Bar & Action Prompts */}
        <div className="absolute bottom-3 inset-x-4 z-10 flex items-center justify-between pointer-events-none">
          {/* Controls Hints */}
          <div className="pointer-events-auto bg-slate-950/80 border border-slate-800 backdrop-blur-sm px-3 py-1.5 font-mono text-[10px] text-slate-400 flex items-center gap-3">
            <span>NAV: <b className="text-white">WASD / ARROWS</b></span>
            <span>TASK TERMINAL: <b className="text-neon-cyan">KEY E</b></span>
          </div>

          {/* Station Enter Action Prompt */}
          {nearbyRoom && nearbyRoom.stationId && !activeStationId && (
            <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-0">
              <button
                onClick={() => setActiveStationId(nearbyRoom.stationId)}
                className="btn-cyan font-head text-xs tracking-wider py-2 px-5 animate-bounce shadow-[0_0_25px_rgba(0,243,255,0.6)] flex items-center gap-2"
              >
                <span>⚡ START TASK: {nearbyRoom.name.toUpperCase()}</span>
                <span className="bg-black text-neon-cyan px-2 py-0.5 font-mono text-[11px] font-bold border border-neon-cyan">
                  PRESS E
                </span>
              </button>
            </div>
          )}

          {/* Floating UI Buttons */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setShowRoster((prev) => !prev)}
              className={`icon-btn font-mono text-xs flex items-center gap-1.5 ${showRoster ? 'border-neon-cyan bg-neon-cyan/20 text-white' : ''}`}
            >
              📊 LEADERBOARD ({players.length})
            </button>

            <button
              onClick={() => setShowSabotageShop((prev) => !prev)}
              className="fire-button font-mono text-xs py-1.5 px-3 bg-neon-red text-white font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,0,85,0.4)]"
            >
              ⚡ SABOTAGE SHOP ({myPoints} PTS)
            </button>
          </div>
        </div>

        {/* Layer 30: Floating Leaderboard Panel */}
        {showRoster && (
          <div className="absolute top-16 right-4 z-30 w-72 hud-container hud-cut-corner p-0 shadow-[0_0_25px_rgba(0,243,255,0.2)] animate-fadeIn">
            <div className="container-header py-1.5 px-3 flex items-center justify-between">
              <div className="container-title text-xs font-mono text-neon-cyan">
                🏆 LIVE OPERATOR RANKINGS
              </div>
              <button onClick={() => setShowRoster(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <div className="p-3 max-h-56 overflow-y-auto">
              <ul className="flex flex-col gap-1.5">
                {[...players]
                  .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
                  .map((p, rank) => (
                    <li
                      key={p.id}
                      className={`p-2 bg-slate-900/80 border flex items-center justify-between text-xs font-mono rounded ${p.id === playerId ? 'border-neon-cyan text-white' : 'border-slate-800 text-slate-400'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-500 w-4">#{rank + 1}</span>
                        <div className={`w-2.5 h-2.5 rounded-full bg-current ${PLAYER_COLOURS[rank % PLAYER_COLOURS.length]}`} />
                        <span className="truncate max-w-[100px]">{p.name}</span>
                        {p.id === playerId && <span className="text-[9px] text-neon-cyan font-bold">(YOU)</span>}
                      </div>
                      <span className="font-bold text-neon-amber">{scores[p.id] ?? 0} PTS</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {/* Layer 40: Station Minigame Terminal Overlay */}
        {activeStationId && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="hud-container hud-cut-corner max-w-xl w-full max-h-[92%] flex flex-col p-0 border-neon-cyan shadow-[0_0_50px_rgba(0,243,255,0.35)] relative" ref={stationElRef}>
              <div className="container-header py-2 px-4 flex items-center justify-between">
                <div className="container-title font-mono text-xs text-neon-cyan">
                  <span className="status-indicator" />
                  STATION TERMINAL // {activeStationId.toUpperCase()}
                </div>
                <button
                  onClick={() => setActiveStationId(null)}
                  className="icon-btn font-mono text-xs border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black font-bold"
                >
                  ✕ LEAVE TERMINAL [ESC]
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto flex flex-col items-center justify-center bg-slate-950/60">
                {StationComp && (
                  <StationComp
                    isControlling={true}
                    onSolve={handleTaskSolve}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layer 45: Sabotage Shop Modal */}
      {showSabotageShop && (
        <SabotageShopModal
          points={myPoints}
          players={players}
          localPlayerId={playerId}
          onFireSabotage={handleFireSabotage}
          onClose={() => setShowSabotageShop(false)}
        />
      )}

      {/* Layer 50: Studio Crisis emergency modal */}
      {crisis && (
        <StudioCrisisOverlay type={crisis} onDismiss={() => setCrisis(null)} />
      )}
    </div>
  );
}
