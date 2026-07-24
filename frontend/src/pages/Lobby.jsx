/**
 * frontend/src/pages/Lobby.jsx
 *
 * Redesigned Lobby screen with elevated sci-fi HUD styling.
 */

import { useEffect, useRef, useState } from 'react';
import { connectToHost, sendMessage, setupHost } from '../lib/peer.js';

const POLL_INTERVAL = 3000;

export default function Lobby({ code, peer, playerId, playerName, isHost, hostPeerId, onGameStart }) {
  const [players, setPlayers] = useState([{ id: playerId, name: playerName, isHost }]);
  const [gameStarting, setGameStarting] = useState(false);
  const [peerConnected, setPeerConnected] = useState(isHost);
  const [copySuccess, setCopySuccess] = useState(false);
  const [swapMin, setSwapMin] = useState(15);
  const [swapMax, setSwapMax] = useState(20);

  const playersRef = useRef(players);
  const broadcastRef = useRef(null);
  const connectionsRef = useRef(null);
  const onMessageRef = useRef(null);
  const connRef = useRef(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ── Host setup ─────────────────────────────────────────────────────────────
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
          payload: { players: updated.map((p) => ({ id: p.id, name: p.name, isHost: p.isHost, peerId: p.peerId })) },
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

  // ── Guest setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHost) return;

    let conn;

    async function connect() {
      try {
        conn = await connectToHost(peer, hostPeerId, (msg) => {
          if (msg.type === 'player-list-update') {
            setPlayers(msg.payload.players);
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
        console.error('[SaboGuest] Failed to connect to host:', err);
      }
    }

    connect();

    return () => {
      if (!isTransitioningRef.current) {
        conn?.close();
      }
    };
  }, [isHost, peer, hostPeerId, playerName, playerId, onGameStart]);

  // ── REST API polling ───────────────────────────────────────────────────────
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

  // ── Start Game (host only) ─────────────────────────────────────────────────
  function handleStartGame() {
    isTransitioningRef.current = true;
    setGameStarting(true);
    if (broadcastRef.current) {
      broadcastRef.current({ type: 'game-start', payload: {} });
    }
    onGameStart?.({
      peer,
      playerId,
      playerName,
      isHost: true,
      players: playersRef.current,
      conn: null,
      broadcast: broadcastRef.current,
      connections: connectionsRef.current,
      onMessage: onMessageRef.current,
      swapSettings: { minMs: swapMin * 1000, maxMs: swapMax * 1000 },
    });
  }

  // ── Copy room code to clipboard ───────────────────────────────────────────
  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Ignore fallback
    }
  }

  if (gameStarting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        <div className="hud-container hud-cut-corner max-w-md w-full p-8 text-center flex flex-col items-center gap-5 border-amber-400/80 shadow-[0_0_40px_rgba(255,183,3,0.35)]">
          <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <h2 className="font-head text-2xl font-black text-amber-400 tracking-wider animate-pulse">
            INITIALIZING STUDIO MAP...
          </h2>
          <p className="font-mono text-xs text-slate-300 tracking-wider uppercase">
            SYNCHRONIZING P2P DATASTREAMS & STATIONS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col items-center justify-between p-4 sm:p-6 relative z-10">
      {/* Top HUD Nav Header */}
      <div className="w-full max-w-2xl">
        <div className="top-hud">
          <div className="flex items-center gap-4">
            <h1 className="brand-logo text-xl">
              SABOTAGE <span>STUDIO</span>
            </h1>
            <span className="level-badge">SQUAD LOBBY</span>
          </div>
          <div className="timecode-box">
            {isHost ? 'DIRECTOR HOST' : 'OPERATOR'}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl flex-1 flex flex-col justify-center gap-4 min-h-0 py-2">
        {/* Room code display card */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator" style={{ background: '#ffb703', boxShadow: '0 0 10px #ffb703' }} />
              SESSION ACCESS CODE
            </div>
            <span className="container-subtitle" style={{ color: '#ffb703' }}>SHARE WITH SQUAD</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-[0.2em] drop-shadow-[0_0_14px_rgba(255,183,3,0.5)]">
                {code}
              </span>
            </div>
            <button onClick={handleCopyCode} className="icon-btn font-mono text-xs">
              {copySuccess ? '✓ COPIED CODE' : '📋 COPY ACCESS CODE'}
            </button>
          </div>
        </div>

        {/* Player roster card */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator" />
              SQUAD ROSTER ({players.length}/8)
            </div>
            {!peerConnected && !isHost && (
              <span className="font-mono text-xs text-amber-400 animate-pulse">CONNECTING TO HOST...</span>
            )}
          </div>
          <div className="p-5 flex flex-col gap-3">
            <ul className="flex flex-col gap-2.5 max-h-52 overflow-y-auto pr-1">
              {players.map((p) => (
                <li
                  key={p.id ?? p.peerId ?? p.name}
                  className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all rounded-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded flex items-center justify-center font-head font-black text-sm ${p.isHost ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/40'}`}>
                      {p.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="font-sub font-bold text-base text-slate-100">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isHost ? (
                      <span className="font-mono text-[10px] bg-purple-500/20 border border-purple-500/80 text-purple-300 px-2.5 py-1 tracking-widest font-bold rounded-sm">
                        DIRECTOR HOST
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 px-2.5 py-1 tracking-widest rounded-sm">
                        OPERATOR
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {players.length < 2 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 text-amber-300 font-mono text-xs text-center tracking-wider">
                WAITING FOR AT LEAST 2 PLAYERS TO LAUNCH MISSION...
              </div>
            )}
          </div>
        </div>

        {/* Mission Gameplay Intel */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator" style={{ background: '#00ff9d', boxShadow: '0 0 10px #00ff9d' }} />
              MISSION INTEL
            </div>
            <span className="container-subtitle" style={{ color: '#00ff9d' }}>POINTS & SABOTAGE</span>
          </div>
          <div className="p-4 text-xs font-sub text-slate-300 flex flex-col gap-2 leading-relaxed">
            <p>🎯 Complete mini-game tasks around the studio lot to earn <b className="text-amber-400">+100 PTS</b> each.</p>
            <p>⚡ Spend points in the <b className="text-red-400">SABOTAGE SHOP</b> to execute attacks on opponents.</p>
            <p>🔄 Trigger <b className="text-cyan-300">Control Swap</b> (100 PTS) to hijack an opponent's movements!</p>
          </div>
        </div>

        {/* Action Button */}
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={players.length < 2}
            className="btn-green w-full mt-2"
          >
            {players.length < 2 ? '⏳ WAITING FOR OPERATORS...' : '▶️ LAUNCH MISSION SESSION'}
          </button>
        ) : (
          <div className="p-4 bg-slate-900/70 border border-slate-800 text-slate-400 font-mono text-xs text-center tracking-wider">
            WAITING FOR THE HOST TO START THE MISSION...
          </div>
        )}
      </div>
    </div>
  );
}
