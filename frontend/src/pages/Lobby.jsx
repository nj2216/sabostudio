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

  // Refs so callbacks don't close over stale state.
  const playersRef = useRef(players);
  const broadcastRef = useRef(null);
  const connectionsRef = useRef(null);
  const connRef = useRef(null); // guest's DataConnection to host

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // ── Host setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const { broadcast, connections } = setupHost(peer, ({ peerId, name }) => {
      // A guest announced itself via 'player-joined'. Add to list if not present.
      setPlayers((prev) => {
        const alreadyIn = prev.some((p) => p.peerId === peerId);
        if (alreadyIn) return prev;
        const updated = [...prev, { id: peerId, peerId, name, isHost: false }];

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

    return () => {
      // Clean up connections on unmount.
      connections.forEach((conn) => conn.close());
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
            });
          }
        });

        connRef.current = conn;
        setPeerConnected(true);

        // Announce ourselves to the host.
        sendMessage(conn, 'player-joined', { name: playerName });
      } catch (err) {
        console.error('[SaboGuest] Failed to connect to host:', err);
      }
    }

    connect();

    return () => {
      conn?.close();
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
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-extrabold text-yellow-400 animate-pulse">
          🎬 Loading The Lot…
        </h1>
        <p className="text-gray-400 mt-4">
          Heading to the studio…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      {/* Header */}
      <h1 className="text-4xl font-extrabold mb-1 text-purple-400 tracking-tight">
        🎮 Sabotage Studio
      </h1>
      <p className="text-gray-500 mb-6 text-sm">
        {isHost ? 'You are the host' : 'You joined as a guest'}
        {!peerConnected && !isHost && (
          <span className="ml-2 text-yellow-400">(connecting to host…)</span>
        )}
      </p>

      {/* Room code display */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6 w-full max-w-md text-center">
        <p className="text-gray-400 text-sm mb-2">Room Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-mono font-bold text-white tracking-widest">
            {code}
          </span>
          <button
            onClick={handleCopyCode}
            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          >
            {copySuccess ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">Share this code with friends to join</p>
      </div>

      {/* Player list */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mb-6">
        <h2 className="text-lg font-bold text-white mb-4">
          Players ({players.length}/8)
        </h2>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id ?? p.peerId ?? p.name}
              className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2"
            >
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold">
                {p.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-white font-medium">{p.name}</span>
              {p.isHost && (
                <span className="ml-auto text-xs text-yellow-400 font-semibold">
                  HOST
                </span>
              )}
            </li>
          ))}
        </ul>

        {players.length < 2 && (
          <p className="text-gray-500 text-sm mt-4 text-center">
            Waiting for more players to join…
          </p>
        )}
      </div>

      {/* Start Game button — host only */}
      {isHost && (
        <button
          onClick={handleStartGame}
          disabled={players.length < 2}
          className="w-full max-w-md py-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-white text-lg transition-colors"
        >
          {players.length < 2
            ? '⏳ Waiting for players…'
            : '▶️ Start Game'}
        </button>
      )}

      {!isHost && (
        <p className="text-gray-500 text-sm mt-2">
          Waiting for the host to start the game…
        </p>
      )}
    </div>
  );
}
