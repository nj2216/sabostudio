/**
 * frontend/src/pages/Lobby.jsx
 *
 * Lobby screen — shown after creating or joining a room.
 *
 * Host:
 *   - Listens for incoming PeerJS connections from guests.
 *   - Maintains the authoritative player list and broadcasts it to all guests.
 *   - Polls /api/rooms/[code] as a fallback to pick up players who reconnect.
 *   - Shows a "Start Game" button that transitions to the Game screen.
 *
 * Guest:
 *   - Connects to the host via PeerJS and announces itself with 'player-joined'.
 *   - Receives 'player-list-update' messages from the host to render the list.
 *   - Polls /api/rooms/[code] as a fallback for resilience.
 *   - Transitions to Game screen on 'game-start' message.
 *
 * TODO (follow-up PRs):
 *   - Avatar selection.
 *   - Host migration on host disconnect.
 *   - Voice chat.
 */

import { useEffect, useRef, useState } from 'react';
import { connectToHost, sendMessage, setupHost } from '../lib/peer.js';

// How often (ms) to poll the REST API for the player list as a resilience fallback.
const POLL_INTERVAL = 3000;

/**
 * @param {{
 *   code: string,
 *   peer: import('peerjs').Peer,
 *   playerId: string,
 *   playerName: string,
 *   isHost: boolean,
 *   hostPeerId?: string,   // Only for guests
 *   onGameStart: Function, // Called when the game starts with game props
 * }} props
 */
export default function Lobby({ code, peer, playerId, playerName, isHost, hostPeerId, onGameStart }) {
  const [players, setPlayers] = useState([{ id: playerId, name: playerName, isHost }]);
  const [gameStarting, setGameStarting] = useState(false);
  const [peerConnected, setPeerConnected] = useState(isHost); // Host is "always connected" as self
  const [copySuccess, setCopySuccess] = useState(false);
  const [swapMin, setSwapMin] = useState(15);
  const [swapMax, setSwapMax] = useState(20);

  // Refs so callbacks don't close over stale state.
  const playersRef = useRef(players);
  const broadcastRef = useRef(null);
  const connectionsRef = useRef(null);
  const onMessageRef = useRef(null);
  const connRef = useRef(null); // guest's DataConnection to host
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

      // A guest announced itself via 'player-joined'. Add to list if not present.
      setPlayers((prev) => {
        const alreadyIn = prev.some((p) => p.peerId === peerId);
        if (alreadyIn) return prev;
        const updated = [...prev, { id: guestPlayerId, peerId, name, isHost: false }];

        // Broadcast updated list to all guests.
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
      // Clean up connections on unmount, unless we are transitioning to the game
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
            // Transition to game screen with the live connection
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

        // Announce ourselves to the host.
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

  // ── REST API polling (resilience fallback) ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        // Only use API data for guests (host is authoritative).
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
        // Silently ignore polling errors.
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
    // Transition the host to the game screen
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
      // Fallback: select text — not needed since clipboard should be available in modern browsers.
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (gameStarting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        <div className="hud-container hud-cut-corner max-w-md w-full p-8 text-center flex flex-col items-center gap-4 border-neon-amber shadow-[0_0_30px_rgba(255,183,3,0.3)]">
          <div className="w-12 h-12 border-4 border-neon-amber border-t-transparent rounded-full animate-spin" />
          <h2 className="font-head text-2xl font-extrabold text-neon-amber tracking-wider animate-pulse">
            INITIALIZING STUDIO LOT...
          </h2>
          <p className="font-mono text-xs text-slate-400 tracking-wider">
            ESTABLISHING WEBRTC P2P CHANNELS & STATIONS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col items-center justify-between p-4 relative z-10">
      {/* Top HUD Nav Header */}
      <div className="w-full max-w-xl">
        <div className="top-hud">
          <div className="flex items-center gap-4">
            <h1 className="brand-logo text-xl">
              SABOTAGE <span>STUDIO</span>
            </h1>
            <span className="level-badge">LOBBY STAGE</span>
          </div>
          <div className="timecode-box">
            {isHost ? 'ROOM HOST' : 'OPERATOR'}
          </div>
        </div>
      </div>

      <div className="w-full max-w-xl flex-1 flex flex-col justify-center gap-4 min-h-0">
        {/* Room code display card */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator bg-neon-amber shadow-[0_0_8px_var(--neon-amber)]" />
              SESSION ACCESS CODE
            </div>
            <span className="container-subtitle">SHARE WITH PLAYERS</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-3xl font-extrabold text-neon-amber tracking-[0.25em] drop-shadow-[0_0_10px_rgba(255,183,3,0.4)]">
                {code}
              </span>
            </div>
            <button onClick={handleCopyCode} className="icon-btn font-mono text-xs">
              {copySuccess ? '✓ COPIED TO CLIPBOARD' : '📋 COPY CODE'}
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
              <span className="font-mono text-xs text-neon-amber animate-pulse">CONNECTING TO HOST...</span>
            )}
          </div>
          <div className="p-5 flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {players.map((p) => (
                <li
                  key={p.id ?? p.peerId ?? p.name}
                  className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center font-head font-bold text-xs ${p.isHost ? 'bg-neon-purple text-white shadow-[0_0_8px_var(--neon-purple)]' : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'}`}>
                      {p.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="font-sub font-semibold text-base text-slate-100">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isHost ? (
                      <span className="font-mono text-[10px] bg-neon-purple/20 border border-neon-purple text-neon-purple px-2 py-0.5 tracking-wider font-bold">
                        HOST
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan px-2 py-0.5 tracking-wider">
                        OPERATOR
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {players.length < 2 && (
              <div className="p-3 bg-amber-950/20 border border-neon-amber/30 text-neon-amber font-mono text-xs text-center tracking-wider">
                WAITING FOR AT LEAST 2 PLAYERS TO LAUNCH MISSION...
              </div>
            )}
          </div>
        </div>

        {/* Mission Gameplay Intel */}
        <div className="hud-container hud-cut-corner p-0">
          <div className="container-header">
            <div className="container-title">
              <span className="status-indicator bg-neon-cyan" />
              GAMEPLAY OBJECTIVE
            </div>
            <span className="container-subtitle">POINTS & SABOTAGE MODE</span>
          </div>
          <div className="p-4 text-xs font-sub text-slate-300 flex flex-col gap-2 leading-relaxed">
            <p>🎯 Complete station minigames around the lot to earn <b className="text-neon-amber">+100 PTS</b> each.</p>
            <p>⚡ Spend your points in the <b className="text-neon-red">SABOTAGE SHOP</b> to disrupt opponents.</p>
            <p>🔄 Use <b className="text-white">Control Swap</b> (100 PTS) to hijack an opponent's controls while keeping your camera locked on your avatar!</p>
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
          <div className="p-4 bg-slate-900/50 border border-slate-800 text-slate-400 font-mono text-xs text-center tracking-wider">
            WAITING FOR THE HOST TO START THE GAME...
          </div>
        )}
      </div>
    </div>
  );
}

