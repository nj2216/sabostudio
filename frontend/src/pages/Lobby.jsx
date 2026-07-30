/**
 * frontend/src/pages/Lobby.jsx
 *
 * Final Cut — Cast Call Sheet lobby with Director role assignment.
 * Host can assign the Director role to any connected player.
 */

import { useEffect, useRef, useState } from 'react';
import { connectToHost, sendMessage, setupHost } from '../lib/peer.js';

const POLL_INTERVAL = 3000;

const LORE_TIPS = [
  'Complete 5 of 10 stations to power the exit doors.',
  'The Director sees everything. Talent only see their viewcone.',
  'Downed Talent can crawl. Rescue them before the wrap timer expires.',
  'Crouch with SHIFT to move slowly and stay hidden.',
  'When you hear the heartbeat, the Director is close.',
  '"That\'s a wrap" means someone has been eliminated.',
];

export default function Lobby({ code, peer, playerId, playerName, isHost, hostPeerId, onGameStart }) {
  const [players, setPlayers] = useState([{ id: playerId, name: playerName, isHost, peerId: peer?.id }]);
  const [directorId, setDirectorId] = useState(isHost ? playerId : null);
  const [gameStarting, setGameStarting] = useState(false);
  const [peerConnected, setPeerConnected] = useState(isHost);
  const [copySuccess, setCopySuccess] = useState(false);
  const [tipIdx] = useState(() => Math.floor(Math.random() * LORE_TIPS.length));

  const playersRef = useRef(players);
  const directorIdRef = useRef(directorId);
  const broadcastRef = useRef(null);
  const connectionsRef = useRef(null);
  const onMessageRef = useRef(null);
  const connRef = useRef(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { directorIdRef.current = directorId; }, [directorId]);

  // ── Host setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const { broadcast, connections, onMessage } = setupHost(peer);

    onMessage('player-joined', (conn, payload) => {
      const peerId = conn.peer;
      const { name, playerId: guestPlayerId } = payload;

      setPlayers((prev) => {
        const alreadyIn = prev.some((p) => p.peerId === peerId);
        if (alreadyIn) return prev;
        const updated = [...prev, { id: guestPlayerId, peerId, name, isHost: false }];

        broadcast({
          type: 'player-list-update',
          payload: {
            players: updated.map((p) => ({ id: p.id, name: p.name, isHost: p.isHost, peerId: p.peerId })),
            directorId: directorIdRef.current,
          },
        });

        return updated;
      });
    });

    broadcastRef.current = broadcast;
    connectionsRef.current = connections;
    onMessageRef.current = onMessage;

    return () => {
      if (!isTransitioningRef.current) {
        connections.forEach((conn) => conn.close());
      }
    };
  }, [isHost, peer]);

  // ── Guest setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    let conn;

    async function connect() {
      try {
        conn = await connectToHost(peer, hostPeerId, (msg) => {
          if (msg.type === 'player-list-update') {
            setPlayers(msg.payload.players);
            if (msg.payload.directorId) {
              setDirectorId(msg.payload.directorId);
            }
          }
          if (msg.type === 'director-assign') {
            setDirectorId(msg.payload.directorId);
          }
          if (msg.type === 'game-start') {
            isTransitioningRef.current = true;
            setGameStarting(true);
            onGameStart?.({
              peer,
              playerId,
              playerName,
              isHost: false,
              players: playersRef.current,
              directorId: msg.payload.directorId ?? directorIdRef.current,
              conn,
              broadcast: null,
              connections: null,
              onMessage: null,
            });
          }
        });

        connRef.current = conn;
        setPeerConnected(true);
        sendMessage(conn, 'player-joined', { name: playerName, playerId });
      } catch (err) {
        console.error('[FinalCut] Failed to connect to host:', err);
      }
    }

    connect();

    return () => {
      if (!isTransitioningRef.current) {
        conn?.close();
      }
    };
  }, [isHost, peer, hostPeerId, playerName, playerId, onGameStart]);

  // ── REST API polling ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isHost) {
          setPlayers(
            data.players.map((p) => ({
              id: p.id,
              name: p.name,
              isHost: p.isHost,
              peerId: p.peerId,
            }))
          );
        }
      } catch {
        // Fallback silently
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [code, isHost]);

  // ── Assign Director (host only) ─────────────────────────────────────────
  function handleAssignDirector(targetId) {
    if (!isHost) return;
    setDirectorId(targetId);
    if (broadcastRef.current) {
      broadcastRef.current({ type: 'director-assign', payload: { directorId: targetId } });
    }
  }

  // ── Start Game (host only) ──────────────────────────────────────────────
  function handleStartGame() {
    isTransitioningRef.current = true;
    setGameStarting(true);
    const finalDirectorId = directorIdRef.current || playerId;
    if (broadcastRef.current) {
      broadcastRef.current({ type: 'game-start', payload: { directorId: finalDirectorId } });
    }
    onGameStart?.({
      peer,
      playerId,
      playerName,
      isHost: true,
      players: playersRef.current,
      directorId: finalDirectorId,
      conn: null,
      broadcast: broadcastRef.current,
      connections: connectionsRef.current,
      onMessage: onMessageRef.current,
    });
  }

  // ── Copy room code ──────────────────────────────────────────────────────
  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {}
  }

  if (gameStarting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        <div className="hud-container hud-cut-corner max-w-md w-full p-8 text-center flex flex-col items-center gap-5" style={{ borderColor: 'var(--blood-red)', boxShadow: '0 0 40px var(--blood-glow)' }}>
          <div className="w-14 h-14 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--blood-red)', borderTopColor: 'transparent' }} />
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', color: 'var(--blood-red-bright)', letterSpacing: '4px' }} className="animate-pulse">
            QUIET ON SET...
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            SYNCHRONIZING DATASTREAMS &amp; LOADING THE LOT
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col items-center justify-between p-4 sm:p-6 relative z-10">
      {/* Top HUD */}
      <div className="w-full max-w-2xl">
        <div className="top-hud">
          <div className="flex items-center gap-4">
            <h1 className="brand-logo" style={{ fontSize: '22px' }}>
              FINAL <span>CUT</span>
            </h1>
            <span className="level-badge">CAST CALL</span>
          </div>
          <div className="timecode-box">
            {isHost ? 'SESSION HOST' : 'CONNECTED'}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center gap-4 min-h-0 py-2">
        {/* Room Code Display */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />
              ACCESS CODE
            </div>
            <span className="container-subtitle">SHARE WITH CAST</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: 'var(--amber)', letterSpacing: '0.2em', textShadow: '0 0 14px var(--amber-glow)' }}>
              {code}
            </span>
            <button id="copy-code-btn" onClick={handleCopyCode} className="icon-btn" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              {copySuccess ? '✓ COPIED' : '📋 COPY CODE'}
            </button>
          </div>
        </div>

        {/* Cast Call Sheet */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator" />
              CAST CALL SHEET ({players.length}/6)
            </div>
            {!peerConnected && !isHost && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--amber)', animation: 'paFlicker 2s infinite' }}>
                CONNECTING TO HOST...
              </span>
            )}
          </div>
          <div className="p-5 flex flex-col gap-3">
            <ul className="flex flex-col gap-2.5 max-h-52 overflow-y-auto pr-1">
              {players.map((p) => {
                const isDirector = p.id === directorId;
                return (
                  <li
                    key={p.id ?? p.peerId ?? p.name}
                    className={isDirector ? 'director-card' : 'talent-card'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '2px', transition: 'all 0.2s ease' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: '36px', height: '36px', borderRadius: '4px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-head)', fontWeight: 400, fontSize: '16px',
                          background: isDirector ? 'var(--blood-red)' : 'rgba(196, 163, 90, 0.15)',
                          color: isDirector ? '#fff' : 'var(--amber)',
                          border: isDirector ? '2px solid var(--blood-red-bright)' : '1px solid rgba(196, 163, 90, 0.3)',
                          boxShadow: isDirector ? '0 0 12px var(--blood-glow)' : 'none',
                        }}
                      >
                        {p.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span style={{ fontFamily: 'var(--font-sub)', fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isDirector ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'rgba(139, 0, 0, 0.3)', border: '1px solid var(--blood-red)', color: 'var(--blood-red-bright)', padding: '4px 10px', letterSpacing: '2px', borderRadius: '2px' }}>
                          🎬 DIRECTOR
                        </span>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'rgba(196, 163, 90, 0.1)', border: '1px solid rgba(196, 163, 90, 0.3)', color: 'var(--amber)', padding: '4px 10px', letterSpacing: '2px', borderRadius: '2px' }}>
                          🎭 TALENT
                        </span>
                      )}
                      {isHost && !isDirector && (
                        <button
                          onClick={() => handleAssignDirector(p.id)}
                          className="icon-btn"
                          style={{ fontSize: '9px', padding: '4px 8px' }}
                          title="Assign as Director"
                        >
                          SET DIRECTOR
                        </button>
                      )}
                      {isHost && isDirector && p.id !== playerId && (
                        <button
                          onClick={() => handleAssignDirector(playerId)}
                          className="icon-btn"
                          style={{ fontSize: '9px', padding: '4px 8px' }}
                          title="Reclaim Director role"
                        >
                          RECLAIM
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {players.length < 2 && (
              <div style={{ padding: '12px', background: 'rgba(196, 163, 90, 0.08)', border: '1px solid rgba(196, 163, 90, 0.2)', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center', letterSpacing: '2px' }}>
                WAITING FOR AT LEAST 2 CAST MEMBERS...
              </div>
            )}
          </div>
        </div>

        {/* Production Brief */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />
              PRODUCTION BRIEF
            </div>
            <span className="container-subtitle">INTEL</span>
          </div>
          <div className="p-4 flex flex-col gap-2" style={{ fontFamily: 'var(--font-sub)', fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.7' }}>
            <p>🎬 Complete <b style={{ color: 'var(--amber)' }}>5 of 10 stations</b> to power the exit doors and escape the lot.</p>
            <p>👁️ The <b style={{ color: 'var(--blood-red-bright)' }}>Director</b> sees everything. Talent only see their viewcone.</p>
            <p>⛓️ Downed Talent are dragged to <b style={{ color: 'var(--chalk-white)' }}>chalk Marks</b>. Rescue them before the 60s wrap timer!</p>
            <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
              💡 {LORE_TIPS[tipIdx]}
            </p>
          </div>
        </div>

        {/* Start Game */}
        {isHost ? (
          <button
            id="start-game-btn"
            onClick={handleStartGame}
            disabled={players.length < 2}
            className="fire-button w-full mt-2"
            style={{ fontSize: '18px', padding: '16px 0' }}
          >
            {players.length < 2 ? '⏳ WAITING FOR CAST...' : '🎬 AND... ACTION!'}
          </button>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(14, 10, 8, 0.8)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center', letterSpacing: '2px' }}>
            WAITING FOR THE HOST TO CALL ACTION...
          </div>
        )}
      </div>
    </div>
  );
}
