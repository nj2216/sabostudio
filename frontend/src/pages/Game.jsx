/**
 * frontend/src/pages/Game.jsx
 *
 * Final Cut — Asymmetric Horror Game Screen
 *
 * Game phases:
 *   1. Pre-Production (15s) — Director locked in booth, Talent scatter
 *   2. Rolling (main) — Talent complete stations, Director hunts & downs
 *   3. Wrap-Up — 5 stations complete, exit gates power on
 *
 * Kill & Death mechanics:
 *   - Director attack downs Talent (alive -> downed / crawling)
 *   - Director picks up downed Talent (downed -> carried)
 *   - Director mounts carried Talent on Mark (carried -> on-mark)
 *   - 60s Wrap Timer counts down on Mark (0s -> wrapped / DEAD)
 *   - Teammates revive downed (Hold E 3s) or rescue from Mark (Hold E 3s)
 *   - Exit Gate opening (Hold E 4s) & Escape trigger
 *   - End Match Summary screen (Director Win vs Talent Escape)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LotCanvas from '../map/LotCanvas.jsx';
import { useTaskZoneTrigger } from '../map/useTaskZoneTrigger.js';
import { usePlayerMovement } from '../lib/playerMovement.js';
import { createDirectorBroadcaster, applyAbilityLocally, useAbilityReceiver } from '../sabotage/DirectorAbilities.js';
import { DIRECTOR_ABILITIES, ABILITY_CATEGORIES } from '../sabotage/DirectorKit.js';
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

const WALKABLE_RECTS = [
  ...layout.rooms.map((r) => r.bounds),
  ...layout.corridors.map((c) => c.bounds),
];

const PRE_PRODUCTION_DURATION = 15_000; // 15 seconds
const WRAP_TIMER_DURATION = 60; // 60 seconds
const CHASE_RANGE = 25; // pixels — melee range for downing Talent
const TERROR_RADIUS = 200; // pixels — heartbeat audio range
const HOLD_ACTION_DURATION = 3000; // 3 seconds for revive / rescue
const GATE_HOLD_DURATION = 4000;   // 4 seconds to open exit gate

// ── PA Announcement Component ─────────────────────────────────────────────

function PABar({ message }) {
  if (!message) return null;
  return (
    <div className="pa-bar animate-fadeIn" key={message}>
      {message}
    </div>
  );
}

// ── Director Ability Panel ────────────────────────────────────────────────

function DirectorAbilityPanel({ onUseAbility, getCooldownRemaining, targetTalent, talents }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedAbility, setSelectedAbility] = useState(DIRECTOR_ABILITIES[0]?.id ?? '');
  const [selectedTarget, setSelectedTarget] = useState(targetTalent || talents[0]?.id || '');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (targetTalent) setSelectedTarget(targetTalent);
  }, [targetTalent]);

  const filtered = DIRECTOR_ABILITIES.filter(
    (a) => activeTab === 'ALL' || a.category.toUpperCase() === activeTab
  );

  function handleFire() {
    if (!selectedAbility || !selectedTarget) return;
    onUseAbility(selectedAbility, selectedTarget);
  }

  return (
    <div className="absolute top-16 left-4 z-30 w-80 hud-container hud-cut-corner p-0 director-hud animate-fadeIn" style={{ maxHeight: '75vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="container-header py-2 px-3 flex items-center justify-between">
        <div className="container-title" style={{ fontSize: '12px' }}>
          🎬 DIRECTOR'S KIT
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3 overflow-y-auto" style={{ flex: 1 }}>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {ABILITY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
              style={{ fontSize: '9px', padding: '6px 8px', flex: 'none', minWidth: 'auto' }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
          {filtered.map((ability) => {
            const cooldown = getCooldownRemaining(ability.id);
            const isReady = cooldown <= 0;
            const isSelected = selectedAbility === ability.id;
            const isSignature = ability.category === 'signature';

            return (
              <div
                key={ability.id}
                onClick={() => setSelectedAbility(ability.id)}
                style={{
                  padding: '8px 10px',
                  border: isSelected
                    ? isSignature ? '2px solid var(--amber)' : '2px solid var(--blood-red)'
                    : '1px solid rgba(139, 0, 0, 0.2)',
                  background: isSelected ? 'rgba(139, 0, 0, 0.15)' : 'rgba(10, 8, 6, 0.6)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isReady ? 1 : 0.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontSize: '12px', color: isSignature ? 'var(--amber)' : 'var(--text-main)', letterSpacing: '1px' }}>
                    {isSignature ? '★ ' : ''}{ability.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '2px 6px', borderRadius: '2px', background: isReady ? 'rgba(34, 197, 94, 0.2)' : 'rgba(139, 0, 0, 0.2)', color: isReady ? 'var(--exit-green)' : 'var(--blood-red-bright)', border: `1px solid ${isReady ? 'rgba(34, 197, 94, 0.4)' : 'rgba(139, 0, 0, 0.4)'}` }}>
                    {isReady ? 'READY' : `${Math.ceil(cooldown / 1000)}s`}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {ability.description}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            TARGET TALENT
          </span>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {talents.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTarget(t.id)}
                style={{
                  padding: '4px 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  border: selectedTarget === t.id ? '1px solid var(--blood-red)' : '1px solid var(--panel-border)',
                  background: selectedTarget === t.id ? 'rgba(139, 0, 0, 0.2)' : 'transparent',
                  color: selectedTarget === t.id ? 'var(--blood-red-bright)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleFire}
          disabled={!selectedAbility || !selectedTarget}
          className="fire-button"
          style={{ fontSize: '12px', padding: '10px 0' }}
        >
          ⚡ EXECUTE ABILITY
        </button>
      </div>
    </div>
  );
}

// ── Station Progress Tracker ──────────────────────────────────────────────

function StationTracker({ completedCount, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
      <span style={{ color: 'var(--amber)', fontWeight: 700, letterSpacing: '1px' }}>
        SCENES: {completedCount}/{total}
      </span>
      <div style={{ width: '80px', height: '6px', background: 'rgba(196, 163, 90, 0.15)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(196, 163, 90, 0.3)' }}>
        <div style={{ width: `${(completedCount / total) * 100}%`, height: '100%', background: 'var(--amber)', transition: 'width 0.5s ease', boxShadow: '0 0 8px var(--amber-glow)' }} />
      </div>
    </div>
  );
}

// ── Death Overlay (Individual Talent Elimination Screen) ───────────────────

function DeathOverlay({ show, onDismiss }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ background: 'rgba(5, 0, 0, 0.92)', backdropFilter: 'blur(10px)' }}>
      <div className="death-screen-modal max-w-lg w-full p-8 flex flex-col items-center gap-5 text-center">
        <div style={{ fontSize: '48px', lineHeight: 1 }}>🎬</div>
        <div className="space-y-2">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blood-red-bright)', letterSpacing: '4px', textTransform: 'uppercase' }}>
            ELIMINATED FROM PRODUCTION
          </span>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', color: 'var(--blood-red-bright)', letterSpacing: '4px', textShadow: '0 0 20px var(--blood-glow)' }}>
            THAT'S A WRAP
          </h2>
          <p style={{ fontFamily: 'var(--font-sub)', fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
            Your 60s wrap timer expired. Your character was wrapped in film reel and removed from the scene.
          </p>
          <div style={{ padding: '8px 14px', background: 'rgba(139, 0, 0, 0.2)', border: '1px solid var(--blood-red)', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '12px' }}>
            📽️ SPECTATOR VISION ACTIVE (BLACK &amp; WHITE 1987 REEL)
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="fire-button mt-3"
          style={{ width: '100%', padding: '12px 0', fontSize: '14px' }}
        >
          👁️ ENTER CREW SPECTATOR MODE
        </button>
      </div>
    </div>
  );
}

// ── End Match Overlay (Victory / Summary Screen) ──────────────────────────

function EndMatchOverlay({ matchOver, players, directorId, onReturnToLobby }) {
  if (!matchOver || !matchOver.over) return null;
  const isDirectorWin = matchOver.winner === 'director';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" style={{ background: 'rgba(8, 6, 4, 0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="hud-container hud-cut-corner max-w-xl w-full p-8 flex flex-col items-center gap-6 text-center" style={{ borderColor: isDirectorWin ? 'var(--blood-red)' : 'var(--exit-green)', boxShadow: isDirectorWin ? '0 0 50px var(--blood-glow)' : '0 0 50px var(--exit-glow)' }}>
        <div className="space-y-2">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isDirectorWin ? 'var(--blood-red-bright)' : 'var(--exit-green)', letterSpacing: '3px', textTransform: 'uppercase' }}>
            {isDirectorWin ? '🎬 PRODUCTION WRAPPED — TALENT LOSS' : '🎭 ESCAPE SUCCESSFUL — TALENT VICTORY'}
          </span>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '32px', color: isDirectorWin ? 'var(--blood-red-bright)' : 'var(--amber)', letterSpacing: '4px' }}>
            {isDirectorWin ? "THE DIRECTOR'S CUT IS COMPLETE" : 'CAST ESCAPED THE LOT!'}
          </h2>
          <p style={{ fontFamily: 'var(--font-sub)', fontSize: '14px', color: 'var(--text-dim)' }}>
            {matchOver.reason}
          </p>
        </div>

        {/* Stats Table */}
        <div className="w-full bg-black/50 border border-amber-900/30 rounded p-4">
          <table className="w-full text-left" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(196, 163, 90, 0.3)', color: 'var(--text-muted)' }}>
                <th className="pb-2">PLAYER</th>
                <th className="pb-2">ROLE</th>
                <th className="pb-2 text-right">OUTCOME</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const isDir = p.id === directorId;
                const status = matchOver.stats?.statuses?.[p.id] || (isDir ? 'director' : 'unknown');

                let badgeColor = 'var(--text-dim)';
                let badgeText = status.toUpperCase();

                if (isDir) {
                  badgeColor = 'var(--blood-red-bright)';
                  badgeText = isDirectorWin ? 'VICTORIOUS' : 'CUT SHORT';
                } else if (status === 'escaped') {
                  badgeColor = 'var(--exit-green)';
                  badgeText = 'ESCAPED';
                } else if (status === 'wrapped') {
                  badgeColor = 'var(--blood-red-bright)';
                  badgeText = 'WRAPPED (DEAD)';
                } else if (status === 'downed' || status === 'on-mark' || status === 'carried') {
                  badgeColor = 'var(--amber)';
                  badgeText = 'CAPTURED';
                } else if (status === 'alive') {
                  badgeColor = 'var(--amber)';
                  badgeText = 'SURVIVED';
                }

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="py-2.5 font-bold" style={{ color: 'var(--text-main)' }}>{p.name}</td>
                    <td className="py-2.5" style={{ color: isDir ? 'var(--blood-red-bright)' : 'var(--amber)' }}>
                      {isDir ? '🎬 DIRECTOR' : '🎭 TALENT'}
                    </td>
                    <td className="py-2.5 text-right font-bold" style={{ color: badgeColor }}>
                      {badgeText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={onReturnToLobby}
          className={isDirectorWin ? 'fire-button' : 'btn-green'}
          style={{ width: '100%', padding: '14px 0', fontSize: '16px' }}
        >
          📋 RETURN TO CALL SHEET
        </button>
      </div>
    </div>
  );
}

// ══════════════════ MAIN GAME COMPONENT ══════════════════════════════════

export default function Game({
  peer,
  playerId,
  playerName,
  isHost,
  players,
  directorId,
  conn,
  broadcast,
  onMessage,
}) {
  const isDirector = playerId === directorId;
  const role = isDirector ? 'director' : 'talent';
  const talents = useMemo(() => players.filter((p) => p.id !== directorId), [players, directorId]);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const playersByPeerId = useMemo(() => new Map(players.map((p) => [p.peerId, p])), [players]);

  // ── Game Phase State ────────────────────────────────────────────────────
  const [phase, setPhase] = useState('pre-production');
  const [preProductionTimer, setPreProductionTimer] = useState(15);
  const [paMessage, setPaMessage] = useState('"Quiet on set."');
  const [stationsCompleted, setStationsCompleted] = useState(0);
  const [completedStationIds, setCompletedStationIds] = useState(new Set());

  // ── Station & Interaction State ─────────────────────────────────────────
  const [activeStationId, setActiveStationId] = useState(null);
  const stationElRef = useRef(null);
  const [interactProgress, setInteractProgress] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactTimerRef = useRef(null);
  const eKeyDownRef = useRef(false);

  // ── Player & Mark State ─────────────────────────────────────────────────
  const [playerStatuses, setPlayerStatuses] = useState(() => {
    const init = {};
    players.forEach((p) => { init[p.id] = p.id === directorId ? 'director' : 'alive'; });
    return init;
  });
  const [carriedTalentId, setCarriedTalentId] = useState(null);
  const [markOccupants, setMarkOccupants] = useState({}); // markId -> { talentId, remainingSecs }
  const [openExitGates, setOpenExitGates] = useState(new Set());
  const [escapedCount, setEscapedCount] = useState(0);
  const [matchOver, setMatchOver] = useState({ over: false, winner: null, reason: '', stats: null });

  // ── UI & FX State ───────────────────────────────────────────────────────
  const [showAbilityPanel, setShowAbilityPanel] = useState(isDirector);
  const [toast, setToast] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  const [terrorIntensity, setTerrorIntensity] = useState(0);
  const [terminalFlash, setTerminalFlash] = useState(false);
  const [chaseTarget, setChaseTarget] = useState(null);

  function showToast(msg, duration = 3000) {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }

  function showPA(msg, duration = 4000) {
    setPaMessage(msg);
    if (isHost && broadcast) {
      broadcast({ type: 'pa-announcement', payload: { message: msg } });
    }
    setTimeout(() => setPaMessage(null), duration);
  }

  // ── Spawn Points ────────────────────────────────────────────────────────
  const mySpawnPoint = useMemo(() => {
    if (isDirector) {
      const booth = layout.rooms.find((r) => r.isDirectorBooth);
      if (booth) return { x: (booth.bounds.x1 + booth.bounds.x2) / 2, y: (booth.bounds.y1 + booth.bounds.y2) / 2 };
      return layout.spawnPoint;
    }
    const talentIndex = talents.findIndex((t) => t.id === playerId);
    const spawnPoints = layout.talentSpawnPoints || [layout.spawnPoint];
    return spawnPoints[talentIndex % spawnPoints.length] || layout.spawnPoint;
  }, [isDirector, playerId, talents]);

  // ── Movement Hook ───────────────────────────────────────────────────────
  const myStatus = playerStatuses[playerId] || 'alive';

  const { localPos, allPositions, facingAngle, isCrouching, crouchStates, setBroadcast, receiveGuestMove } = usePlayerMovement({
    playerId,
    role,
    isHost,
    conn,
    initialPos: mySpawnPoint,
    walkableRects: WALKABLE_RECTS,
    playerStatus: myStatus === 'director' ? 'alive' : myStatus,
  });

  useEffect(() => {
    if (isHost && broadcast) setBroadcast(broadcast);
  }, [isHost, broadcast, setBroadcast]);

  // Proximity zone trigger
  const { nearbyRoom, nearbyMark, nearbyGate, nearbyTargetPlayer } = useTaskZoneTrigger({
    localPos,
    rooms: layout.rooms,
    marks: layout.chalkMarks,
    gates: layout.exitGates,
    allPositions,
    playerStatuses,
    localPlayerId: playerId,
    isDirector,
  });

  // Keep carried Talent locked to Director position
  useEffect(() => {
    if (isDirector && carriedTalentId && allPositions[playerId]) {
      const dirPos = allPositions[playerId];
      if (isHost && broadcast) {
        receiveGuestMove(carriedTalentId, { x: dirPos.x + 10, y: dirPos.y });
      }
    }
  }, [isDirector, carriedTalentId, allPositions, playerId, isHost, broadcast, receiveGuestMove]);

  // ── Pre-Production Countdown ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'pre-production') return;

    const interval = setInterval(() => {
      setPreProductionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('rolling');
          showPA('"And... rolling!"', 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // ── 60-Second Mark Wrap Timer Ticker (Host only) ────────────────────────
  useEffect(() => {
    if (!isHost || matchOver.over) return;

    const interval = setInterval(() => {
      setMarkOccupants((prevMarks) => {
        let updatedMarks = { ...prevMarks };
        let stateChanged = false;
        let nextStatuses = { ...playerStatuses };

        Object.entries(prevMarks).forEach(([markId, markData]) => {
          if (!markData || !markData.talentId) return;
          const nextSecs = markData.remainingSecs - 1;

          if (nextSecs <= 0) {
            // Talent is WRAPPED (DEAD)
            stateChanged = true;
            delete updatedMarks[markId];
            nextStatuses[markData.talentId] = 'wrapped';

            const deadTalentName = playersById.get(markData.talentId)?.name || 'Talent';
            showPA(`"That's a wrap on ${deadTalentName}!"`, 4000);
          } else {
            updatedMarks[markId] = { ...markData, remainingSecs: nextSecs };
          }
        });

        if (stateChanged) {
          setPlayerStatuses(nextStatuses);
          if (broadcast) {
            broadcast({ type: 'talent-status-update', payload: { statuses: nextStatuses, markOccupants: updatedMarks } });
          }
        } else if (broadcast && Object.keys(updatedMarks).length > 0) {
          broadcast({ type: 'mark-timer-tick', payload: { markOccupants: updatedMarks } });
        }

        return updatedMarks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, matchOver.over, playerStatuses, players, broadcast]);

  // ── Check Win / Loss Conditions (Host only) ─────────────────────────────
  useEffect(() => {
    if (!isHost || matchOver.over || phase === 'pre-production') return;

    const nonDirectorPlayers = players.filter((p) => p.id !== directorId);
    const totalTalent = nonDirectorPlayers.length;

    let wrappedCount = 0;
    let escapedTotal = 0;
    let aliveOrDownedCount = 0;

    nonDirectorPlayers.forEach((p) => {
      const st = playerStatuses[p.id];
      if (st === 'wrapped') wrappedCount++;
      if (st === 'escaped') escapedTotal++;
      if (st === 'alive' || st === 'downed' || st === 'on-mark' || st === 'carried') aliveOrDownedCount++;
    });

    // 1. Director Win: All Talent are wrapped (dead) or no Talent left alive to rescue
    if (wrappedCount >= totalTalent || (wrappedCount + (carriedTalentId ? 1 : 0) >= totalTalent)) {
      triggerMatchOver('director', 'All Talent have been wrapped in film reel. Film production complete!');
      return;
    }

    // If all non-escaped Talent are wrapped
    if (wrappedCount + escapedTotal >= totalTalent && escapedTotal === 0) {
      triggerMatchOver('director', 'The Director eliminated the entire cast before anyone could escape.');
      return;
    }

    // 2. Talent Win: At least 1 Talent escaped and all active players resolved
    if (escapedTotal > 0 && (wrappedCount + escapedTotal >= totalTalent)) {
      triggerMatchOver('talent', `${escapedTotal} Talent escaped the lot! Production canceled.`);
      return;
    }
  }, [isHost, matchOver.over, phase, playerStatuses, players, directorId, carriedTalentId]);

  function triggerMatchOver(winner, reason) {
    const stats = { statuses: playerStatuses, stationsCompleted, escapedCount };
    setMatchOver({ over: true, winner, reason, stats });
    if (isHost && broadcast) {
      broadcast({ type: 'match-over', payload: { winner, reason, stats } });
    }
  }

  // ── Interact Charge-Up Handler (Hold E) ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'rolling' && phase !== 'wrap-up') return;

    function onKeyDown(e) {
      if ((e.key !== 'e' && e.key !== 'E') || eKeyDownRef.current) return;

      // 1. Director Actions
      if (isDirector) {
        // A. Pick up downed Talent
        if (nearbyTargetPlayer && nearbyTargetPlayer.action === 'pickup' && !carriedTalentId) {
          eKeyDownRef.current = true;
          const targetId = nearbyTargetPlayer.id;
          setCarriedTalentId(targetId);
          setPlayerStatuses((prev) => {
            const next = { ...prev, [targetId]: 'carried' };
            if (isHost && broadcast) broadcast({ type: 'talent-status-update', payload: { statuses: next } });
            return next;
          });
          showToast(`📦 Picked up ${playersById.get(targetId)?.name}`);
          setTimeout(() => { eKeyDownRef.current = false; }, 300);
          return;
        }

        // B. Mount carried Talent on Mark
        if (nearbyMark && carriedTalentId) {
          eKeyDownRef.current = true;
          const targetId = carriedTalentId;
          const markId = nearbyMark.id;

          setMarkOccupants((prev) => ({ ...prev, [markId]: { talentId: targetId, remainingSecs: WRAP_TIMER_DURATION } }));
          setCarriedTalentId(null);
          setPlayerStatuses((prev) => {
            const next = { ...prev, [targetId]: 'on-mark' };
            if (isHost && broadcast) broadcast({ type: 'talent-status-update', payload: { statuses: next } });
            return next;
          });
          showToast(`⛓️ Bound ${playersById.get(targetId)?.name} to ${nearbyMark.label}!`);
          setTimeout(() => { eKeyDownRef.current = false; }, 300);
          return;
        }
      }

      // 2. Talent Actions
      if (!isDirector) {
        // A. Station interaction
        if (nearbyRoom?.stationId && !activeStationId && !completedStationIds.has(nearbyRoom.stationId)) {
          startHoldAction(450, () => {
            setActiveStationId(nearbyRoom.stationId);
            setTerminalFlash(true);
            setTimeout(() => setTerminalFlash(false), 350);
          });
          return;
        }

        // B. Revive downed teammate or Rescue from Mark
        if (nearbyTargetPlayer && (nearbyTargetPlayer.action === 'revive' || nearbyTargetPlayer.action === 'rescue')) {
          const targetId = nearbyTargetPlayer.id;
          const targetName = playersById.get(targetId)?.name;
          const actionText = nearbyTargetPlayer.action === 'revive' ? 'Reviving' : 'Rescuing';

          startHoldAction(HOLD_ACTION_DURATION, () => {
            setPlayerStatuses((prev) => {
              const next = { ...prev, [targetId]: 'alive' };
              if (isHost && broadcast) broadcast({ type: 'talent-status-update', payload: { statuses: next } });
              else if (conn) sendMessage(conn, 'talent-action', { action: 'rescue', targetId });
              return next;
            });

            if (nearbyTargetPlayer.action === 'rescue') {
              setMarkOccupants((prev) => {
                const next = { ...prev };
                Object.keys(next).forEach((mId) => {
                  if (next[mId]?.talentId === targetId) delete next[mId];
                });
                return next;
              });
            }

            showToast(`❤️ Rescued ${targetName}!`);
          });
          return;
        }

        // C. Open Exit Gate (during Wrap-Up)
        if (phase === 'wrap-up' && nearbyGate && !openExitGates.has(nearbyGate.id)) {
          startHoldAction(GATE_HOLD_DURATION, () => {
            setOpenExitGates((prev) => new Set([...prev, nearbyGate.id]));
            showPA(`🚪 ${nearbyGate.label} HAS BEEN POWERED OPEN!`, 5000);
            if (isHost && broadcast) broadcast({ type: 'gate-open', payload: { gateId: nearbyGate.id } });
            else if (conn) sendMessage(conn, 'gate-open', { gateId: nearbyGate.id });
          });
          return;
        }
      }
    }

    function startHoldAction(duration, onComplete) {
      eKeyDownRef.current = true;
      setIsInteracting(true);
      const startTime = Date.now();

      if (interactTimerRef.current) clearInterval(interactTimerRef.current);
      interactTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(1.0, elapsed / duration);
        setInteractProgress(pct);

        if (pct >= 1.0) {
          clearInterval(interactTimerRef.current);
          eKeyDownRef.current = false;
          setIsInteracting(false);
          setInteractProgress(0);
          onComplete();
        }
      }, 30);
    }

    function onKeyUp(e) {
      if (e.key === 'e' || e.key === 'E') {
        eKeyDownRef.current = false;
        if (interactTimerRef.current) clearInterval(interactTimerRef.current);
        setIsInteracting(false);
        setInteractProgress(0);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (interactTimerRef.current) clearInterval(interactTimerRef.current);
    };
  }, [phase, isDirector, nearbyRoom, nearbyMark, nearbyGate, nearbyTargetPlayer, activeStationId, completedStationIds, carriedTalentId, openExitGates, isHost, broadcast, conn, players]);

  // ── Exit Gate Escape Trigger (Talent walking into open gate) ────────────
  useEffect(() => {
    if (isDirector || phase !== 'wrap-up' || myStatus !== 'alive') return;

    if (nearbyGate && openExitGates.has(nearbyGate.id)) {
      setPlayerStatuses((prev) => {
        const next = { ...prev, [playerId]: 'escaped' };
        setEscapedCount((c) => c + 1);
        showToast('🏃 YOU ESCAPED THE LOT!');
        showPA(`🎭 ${playerName} HAS ESCAPED!`, 4000);

        if (isHost && broadcast) {
          broadcast({ type: 'talent-status-update', payload: { statuses: next } });
        } else if (conn) {
          sendMessage(conn, 'talent-action', { action: 'escape', targetId: playerId });
        }
        return next;
      });
    }
  }, [isDirector, phase, myStatus, nearbyGate, openExitGates, playerId, playerName, isHost, broadcast, conn]);

  // Close station on ESC
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && activeStationId) setActiveStationId(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStationId]);

  // ── Terror Radius ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isDirector || phase !== 'rolling') {
      setTerrorIntensity(0);
      return;
    }

    const interval = setInterval(() => {
      const dirPos = allPositions[directorId];
      const myPos = allPositions[playerId];
      if (!dirPos || !myPos) { setTerrorIntensity(0); return; }

      const dx = dirPos.x - myPos.x;
      const dy = dirPos.y - myPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < TERROR_RADIUS * TERROR_RADIUS) {
        const dist = Math.sqrt(distSq);
        setTerrorIntensity(1 - (dist / TERROR_RADIUS));
      } else {
        setTerrorIntensity(0);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isDirector, phase, allPositions, directorId, playerId]);

  // ── Director Ability System ─────────────────────────────────────────────
  const stageRef = useRef(null);
  const hostActiveEffects = useRef(new Map());
  const getTargetEl = useCallback(() => stationElRef.current || stageRef.current || document.body, []);

  const directorBroadcasterRef = useRef(null);
  useEffect(() => {
    if (isHost && broadcast) {
      directorBroadcasterRef.current = createDirectorBroadcaster(
        broadcast,
        (payload) => {
          if (payload.targetPlayerId === playerId) {
            applyAbilityLocally(payload, getTargetEl, hostActiveEffects.current, {});
          }
        }
      );
    }
  }, [isHost, broadcast, playerId, getTargetEl]);

  const abilityCallbacks = useMemo(() => ({
    onAbilityApplied: (payload) => {
      if (payload?.targetPlayerId === playerId) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 250);
        showToast(`⚠️ The Director used ${payload.effectId} on you!`);
      }
    },
    onBleedThrough: () => {
      showToast('▒▒ BLEED-THROUGH — Reality is shifting... ▒▒', 5000);
    },
  }), [playerId]);

  useAbilityReceiver(isHost ? null : conn, playerId, getTargetEl, abilityCallbacks);

  // ── Host Message Handlers ───────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !onMessage) return;

    onMessage('player-move', (conn, payload) => {
      const canonicalSenderId = playersByPeerId.get(conn.peer)?.id;
      if (!canonicalSenderId) return;
      const pos = payload?.pos || payload;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        receiveGuestMove(canonicalSenderId, pos, payload?.crouching);
      }
    });

    onMessage('task-complete', (conn, payload) => {
      const canonicalId = payload?.playerId || playersByPeerId.get(conn.peer)?.id;
      const stationId = payload?.stationId;
      if (canonicalId && stationId) handleStationCompleted(stationId, canonicalId);
    });

    onMessage('talent-action', (conn, payload) => {
      if (payload.action === 'rescue') {
        setPlayerStatuses((prev) => {
          const next = { ...prev, [payload.targetId]: 'alive' };
          if (broadcast) broadcast({ type: 'talent-status-update', payload: { statuses: next } });
          return next;
        });
        setMarkOccupants((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((mId) => {
            if (next[mId]?.talentId === payload.targetId) delete next[mId];
          });
          return next;
        });
      }
      if (payload.action === 'escape') {
        setPlayerStatuses((prev) => {
          const next = { ...prev, [payload.targetId]: 'escaped' };
          setEscapedCount((c) => c + 1);
          if (broadcast) broadcast({ type: 'talent-status-update', payload: { statuses: next } });
          return next;
        });
      }
    });

    onMessage('gate-open', (conn, payload) => {
      setOpenExitGates((prev) => new Set([...prev, payload.gateId]));
      if (broadcast) broadcast({ type: 'gate-open', payload });
    });
  }, [isHost, onMessage, players, receiveGuestMove, broadcast]);

  // Guest message handlers
  useEffect(() => {
    if (isHost || !conn) return;

    function handleData(raw) {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }

      if (msg.type === 'phase-change') setPhase(msg.payload?.phase || 'rolling');
      if (msg.type === 'pa-announcement') { setPaMessage(msg.payload?.message); setTimeout(() => setPaMessage(null), 4000); }
      if (msg.type === 'station-complete') {
        setStationsCompleted(msg.payload?.completedCount ?? 0);
        if (msg.payload?.stationId) setCompletedStationIds((prev) => new Set([...prev, msg.payload.stationId]));
        if (msg.payload?.completedCount >= layout.stationsRequired) setPhase('wrap-up');
      }
      if (msg.type === 'talent-status-update') {
        if (msg.payload?.statuses) setPlayerStatuses(msg.payload.statuses);
        if (msg.payload?.markOccupants) setMarkOccupants(msg.payload.markOccupants);
      }
      if (msg.type === 'mark-timer-tick') {
        if (msg.payload?.markOccupants) setMarkOccupants(msg.payload.markOccupants);
      }
      if (msg.type === 'gate-open') {
        setOpenExitGates((prev) => new Set([...prev, msg.payload.gateId]));
      }
      if (msg.type === 'match-over') {
        setMatchOver(msg.payload);
      }
    }

    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [isHost, conn]);

  // ── Station Completion Handler ──────────────────────────────────────────
  function handleStationCompleted(stationId, completerId) {
    setCompletedStationIds((prev) => {
      if (prev.has(stationId)) return prev;
      const updated = new Set([...prev, stationId]);
      const newCount = updated.size;
      setStationsCompleted(newCount);

      const completerName = playersById.get(completerId)?.name || 'Someone';
      showPA(`"Cut — print it!" Scene completed by ${completerName}.`, 4000);

      if (isHost && broadcast) {
        broadcast({ type: 'station-complete', payload: { stationId, completedCount: newCount, completerId } });
      }

      if (newCount >= layout.stationsRequired) {
        setPhase('wrap-up');
        showPA('"That\'s enough takes. Exit doors are powered."', 5000);
        if (isHost && broadcast) {
          broadcast({ type: 'phase-change', payload: { phase: 'wrap-up' } });
        }
      }
      return updated;
    });
  }

  function handleTaskSolve() {
    showToast('🎬 SCENE COMPLETED!');
    setTerminalFlash(true);
    setTimeout(() => setTerminalFlash(false), 350);

    const stationId = activeStationId;
    if (isHost) handleStationCompleted(stationId, playerId);
    else if (conn) sendMessage(conn, 'task-complete', { playerId, stationId });

    setTimeout(() => setActiveStationId(null), 1200);
  }

  // ── Director Ability Firing ─────────────────────────────────────────────
  function handleUseAbility(effectId, targetPlayerId) {
    if (!isDirector) return;
    if (isHost && directorBroadcasterRef.current) {
      const result = directorBroadcasterRef.current.useAbility(playerId, effectId, targetPlayerId);
      if (result.ok) showToast(`⚡ Ability executed: ${effectId}`);
      else showToast(`❌ ${result.reason}`);
    }
  }

  // ── Chase & Attack Detection (Director side, host) ──────────────────────
  useEffect(() => {
    if (!isDirector || !isHost || phase !== 'rolling') return;

    const interval = setInterval(() => {
      const dirPos = allPositions[directorId];
      if (!dirPos) return;

      for (const t of talents) {
        if (playerStatuses[t.id] !== 'alive') continue;
        const tPos = allPositions[t.id];
        if (!tPos) continue;

        const dx = dirPos.x - tPos.x;
        const dy = dirPos.y - tPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CHASE_RANGE) {
          setChaseTarget(t.id);
          showPA(`"And... action!" ${t.name} DOWNED!`, 3000);

          setPlayerStatuses((prev) => {
            const next = { ...prev, [t.id]: 'downed' };
            if (broadcast) broadcast({ type: 'talent-status-update', payload: { statuses: next } });
            return next;
          });
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isDirector, isHost, phase, allPositions, directorId, talents, playerStatuses, broadcast]);

  // ── Death & Spectator State ──────────────────────────────────────────────
  const isDead = myStatus === 'wrapped' || myStatus === 'crew';
  const [showDeathModal, setShowDeathModal] = useState(false);
  const prevStatusRef = useRef(myStatus);

  useEffect(() => {
    if (!isDirector && (myStatus === 'wrapped' || myStatus === 'crew') && prevStatusRef.current !== 'wrapped' && prevStatusRef.current !== 'crew') {
      setShowDeathModal(true);
    }
    prevStatusRef.current = myStatus;
  }, [myStatus, isDirector]);

  // ── Render ──────────────────────────────────────────────────────────────
  const StationComp = activeStationId ? STATION_COMPONENTS[activeStationId] : null;

  return (
    <div className={`h-screen max-h-screen overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 relative z-10 ${isDead ? 'dead-spectator-filter' : ''}`} style={{ background: 'var(--bg-void)' }}>
      {/* Death Modal for Eliminated Talent */}
      <DeathOverlay
        show={showDeathModal}
        onDismiss={() => setShowDeathModal(false)}
      />

      {/* End Match Overlay */}
      <EndMatchOverlay
        matchOver={matchOver}
        players={players}
        directorId={directorId}
        onReturnToLobby={() => window.location.reload()}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 z-50 animate-fadeIn" style={{ background: 'rgba(14, 10, 8, 0.95)', border: '2px solid var(--blood-red)', color: 'var(--amber)', padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, boxShadow: '0 0 25px var(--blood-glow)' }}>
          {toast}
        </div>
      )}

      {/* Terror Radius Vignette (Talent only) */}
      {!isDirector && terrorIntensity > 0 && !isDead && (
        <div className="terror-vignette active" style={{ background: `radial-gradient(ellipse at center, transparent ${40 - terrorIntensity * 20}%, rgba(139, 0, 0, ${terrorIntensity * 0.4}) 100%)` }} />
      )}

      {/* Main Viewport */}
      <div
        className={`w-full max-w-5xl aspect-video relative hud-container hud-cut-corner overflow-hidden flex flex-col ${screenShake ? 'screen-hit-shake' : ''} ${terminalFlash ? 'terminal-success-flash' : ''}`}
        style={{ borderColor: isDirector ? 'rgba(139, 0, 0, 0.5)' : isDead ? 'rgba(139, 0, 0, 0.8)' : 'rgba(196, 163, 90, 0.3)', boxShadow: isDirector ? '0 0 50px rgba(139, 0, 0, 0.2)' : '0 0 30px rgba(0, 0, 0, 0.5)' }}
        ref={stageRef}
      >
        <div className="hud-scan-beam-overlay" />

        {/* Canvas Map */}
        <div className="absolute inset-0 w-full h-full z-0">
          <LotCanvas
            allPositions={allPositions}
            localPlayerId={playerId}
            directorId={directorId}
            players={players}
            nearbyRoom={nearbyRoom}
            completedStationIds={completedStationIds}
            playerStatuses={playerStatuses}
            markOccupants={markOccupants}
            openExitGates={openExitGates}
            phase={phase}
            facingAngle={facingAngle}
            interactProgress={interactProgress}
            isInteracting={isInteracting}
            crouchStates={crouchStates}
            terrorIntensity={terrorIntensity}
          />
        </div>

        {/* PA Announcement Bar */}
        {paMessage && (
          <div className="absolute top-0 inset-x-0 z-5">
            <PABar message={paMessage} />
          </div>
        )}

        {/* Top HUD */}
        <div className="absolute top-0 inset-x-0 z-10 flex flex-col">
          <div className="top-hud py-2 px-5 flex items-center justify-between" style={{ background: 'rgba(10, 8, 6, 0.92)', borderBottom: `2px solid ${isDirector ? 'var(--blood-red)' : 'rgba(196, 163, 90, 0.3)'}` }}>
            <div className="flex items-center gap-3">
              <h1 className="brand-logo" style={{ fontSize: '16px' }}>
                FINAL <span>CUT</span>
              </h1>
              <div className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: isDirector ? 'var(--blood-red-bright)' : 'var(--amber)', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDirector ? 'var(--blood-red-bright)' : 'var(--amber)', animation: 'pulseGlow 2s infinite' }} />
                {isDirector ? '🎬 DIRECTOR' : '🎭 TALENT'}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <StationTracker completedCount={stationsCompleted} total={layout.stationsRequired} />

              {phase === 'pre-production' && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--amber)', fontWeight: 700, letterSpacing: '2px' }}>
                  {preProductionTimer}s
                </div>
              )}

              {phase === 'wrap-up' && (
                <span style={{ fontFamily: 'var(--font-head)', fontSize: '12px', color: 'var(--exit-green)', letterSpacing: '2px', animation: 'pulseGlow 1s infinite' }}>
                  EXIT DOORS POWERED
                </span>
              )}

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }} className="hidden sm:block">
                {playerName}
              </div>
            </div>
          </div>
        </div>

        {/* Director Ability Panel */}
        {isDirector && showAbilityPanel && phase === 'rolling' && directorBroadcasterRef.current && (
          <DirectorAbilityPanel
            onUseAbility={handleUseAbility}
            getCooldownRemaining={(id) => directorBroadcasterRef.current.getCooldownRemaining(id)}
            targetTalent={chaseTarget}
            talents={talents}
          />
        )}

        {/* Bottom Controls & Interaction Prompts */}
        <div className="absolute bottom-3 inset-x-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto" style={{ background: 'rgba(10, 8, 6, 0.9)', border: '1px solid var(--panel-border)', padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
            {isDirector ? (
              <span>WASD: Move · E: Pick up / Mount Mark · TAB: Toggle Kit</span>
            ) : (
              <span>WASD: Move · HOLD E: Action · SHIFT: Crouch</span>
            )}
          </div>

          {/* Interaction Prompts */}
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-0">
            {/* Director: Pick Up Downed */}
            {isDirector && nearbyTargetPlayer?.action === 'pickup' && !carriedTalentId && (
              <button className="fire-button" style={{ fontSize: '12px', padding: '10px 20px' }}>
                📦 PRESS E TO PICK UP {playersById.get(nearbyTargetPlayer.id)?.name?.toUpperCase()}
              </button>
            )}

            {/* Director: Mount on Mark */}
            {isDirector && nearbyMark && carriedTalentId && (
              <button className="fire-button" style={{ fontSize: '12px', padding: '10px 20px' }}>
                ⛓️ PRESS E TO MOUNT ON {nearbyMark.label?.toUpperCase()}
              </button>
            )}

            {/* Talent: Station Prompt */}
            {!isDirector && nearbyRoom?.stationId && !activeStationId && !completedStationIds.has(nearbyRoom.stationId) && phase === 'rolling' && (
              <button className="btn-amber" style={{ fontSize: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎬 {nearbyRoom.name?.toUpperCase()}</span>
                <span style={{ background: 'rgba(10, 8, 6, 0.8)', color: 'var(--amber)', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', border: '1px solid var(--amber)' }}>
                  {isInteracting ? `${Math.round(interactProgress * 100)}%` : 'HOLD E'}
                </span>
              </button>
            )}

            {/* Talent: Revive / Rescue Prompt */}
            {!isDirector && nearbyTargetPlayer && (nearbyTargetPlayer.action === 'revive' || nearbyTargetPlayer.action === 'rescue') && (
              <button className="btn-amber" style={{ fontSize: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>❤️ {nearbyTargetPlayer.action.toUpperCase()} {playersById.get(nearbyTargetPlayer.id)?.name?.toUpperCase()}</span>
                <span style={{ background: 'rgba(10, 8, 6, 0.8)', color: 'var(--amber)', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', border: '1px solid var(--amber)' }}>
                  {isInteracting ? `${Math.round(interactProgress * 100)}%` : 'HOLD E'}
                </span>
              </button>
            )}

            {/* Talent: Exit Gate Prompt */}
            {!isDirector && phase === 'wrap-up' && nearbyGate && !openExitGates.has(nearbyGate.id) && (
              <button className="btn-green" style={{ fontSize: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🚪 POWER OPEN {nearbyGate.label?.toUpperCase()}</span>
                <span style={{ background: 'rgba(10, 8, 6, 0.8)', color: '#fff', padding: '2px 8px', fontFamily: 'var(--font-mono)', fontSize: '10px', border: '1px solid #fff' }}>
                  {isInteracting ? `${Math.round(interactProgress * 100)}%` : 'HOLD E'}
                </span>
              </button>
            )}
          </div>

          {/* Director toggle */}
          {isDirector && (
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setShowAbilityPanel((prev) => !prev)}
                className="icon-btn"
                style={{ fontSize: '10px', borderColor: showAbilityPanel ? 'var(--blood-red)' : 'var(--panel-border)' }}
              >
                🎬 {showAbilityPanel ? 'HIDE' : 'SHOW'} KIT
              </button>
            </div>
          )}
        </div>

        {/* Pre-Production Overlay */}
        {phase === 'pre-production' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(10, 8, 6, 0.7)', pointerEvents: 'none' }}>
            <div className="text-center">
              <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '36px', color: 'var(--amber)', letterSpacing: '6px', textShadow: '0 0 20px var(--amber-glow)', marginBottom: '16px' }}>
                QUIET ON SET
              </h2>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-dim)', letterSpacing: '2px' }}>
                {isDirector ? 'YOU ARE SEALED IN THE BOOTH' : 'SCATTER BEFORE THE DIRECTOR IS RELEASED'}
              </p>
              <p style={{ fontFamily: 'var(--font-head)', fontSize: '48px', color: 'var(--blood-red-bright)', marginTop: '12px', textShadow: '0 0 30px var(--blood-glow)' }}>
                {preProductionTimer}
              </p>
            </div>
          </div>
        )}

        {/* Station Overlay */}
        {activeStationId && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4 animate-fadeIn" style={{ background: 'rgba(10, 8, 6, 0.9)', backdropFilter: 'blur(8px)' }}>
            <div className="hud-container hud-cut-corner max-w-xl w-full max-h-[92%] flex flex-col p-0" style={{ borderColor: 'rgba(196, 163, 90, 0.5)', boxShadow: '0 0 40px var(--amber-glow)' }} ref={stationElRef}>
              <div className="container-header py-2.5 px-4 flex items-center justify-between">
                <div className="container-title" style={{ fontSize: '12px', color: 'var(--amber)' }}>
                  <span className="status-indicator" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />
                  SCENE // {activeStationId.toUpperCase()}
                </div>
                <button onClick={() => setActiveStationId(null)} className="icon-btn" style={{ fontSize: '10px' }}>
                  ✕ EXIT [ESC]
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto flex flex-col items-center justify-center" style={{ background: 'rgba(10, 8, 6, 0.8)' }}>
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
    </div>
  );
}
