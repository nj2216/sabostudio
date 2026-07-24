/**
 * frontend/src/pages/Landing.jsx
 *
 * Landing screen — allows a user to:
 *   1. Create a new room (becomes the host).
 *   2. Join an existing room by entering a room code + display name.
 */

import { useState } from 'react';
import { createPeer } from '../lib/peer.js';

/**
 * @param {{ onHostReady: Function, onGuestReady: Function }} props
 *   onHostReady({ code, peer, playerId })
 *   onGuestReady({ code, hostPeerId, peer, playerId, playerName })
 */
export default function Landing({ onHostReady, onGuestReady }) {
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Create Room ─────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!hostName.trim()) {
      setError('Please enter your display name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // 1. Open a PeerJS instance so we have a peer ID before hitting the API.
      const peer = await createPeer();

      // 2. Register the room in the backend.
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostPeerId: peer.id, hostName: hostName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create room');

      onHostReady({ code: data.code, peer, playerId: data.playerId, playerName: hostName.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Join Room ────────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!joinCode.trim()) {
      setError('Please enter a room code.');
      return;
    }
    if (!joinName.trim()) {
      setError('Please enter your display name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // 1. Open a PeerJS instance (guest gets a random peer ID).
      const peer = await createPeer();

      // 2. Register the join in the backend — returns host Peer ID.
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          playerName: joinName.trim(),
          peerId: peer.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to join room');

      onGuestReady({
        code: data.code,
        hostPeerId: data.hostPeerId,
        peer,
        playerId: data.playerId,
        playerName: joinName.trim(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col items-center justify-between p-4 relative z-10">
      {/* Top HUD Nav Header */}
      <div className="w-full max-w-4xl">
        <div className="top-hud">
          <div className="flex items-center gap-4">
            <h1 className="brand-logo text-xl">
              SABOTAGE <span>STUDIO</span>
            </h1>
            <span className="level-badge">v1.0.0 — P2P ONLINE</span>
          </div>
          <div className="flex items-center gap-6 hidden sm:flex">
            <div className="flex flex-col items-center">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">NETWORK</span>
              <span className="font-head text-xs text-neon-cyan tracking-wider">P2P DATACHANNEL</span>
            </div>
            <div className="timecode-box">SYS.ONLINE</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
        <p className="font-mono text-xs text-slate-400 tracking-wider text-center uppercase">
          [ TACTICAL GAME DIRECTOR INTERFACE & PARTY CONSOLE ]
        </p>

        {error && (
          <div className="w-full max-w-2xl bg-red-950/80 border border-neon-red px-4 py-3 text-neon-red font-mono text-xs flex items-center gap-3 shadow-[0_0_15px_rgba(255,0,85,0.3)]">
            <span className="w-2 h-2 bg-neon-red animate-ping rounded-full" />
            <span>ALERT: {error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Create Room Card */}
          <div className="hud-container hud-cut-corner p-0">
            <div className="container-header">
              <div className="container-title">
                <span className="status-indicator" />
                CREATE SQUAD LOBBY
              </div>
              <span className="container-subtitle">HOST MODE</span>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p className="font-sub text-slate-300 text-sm leading-relaxed">
                Initialize authoritative host peer session. Share room code with up to 8 players.
              </p>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  DIRECTOR CALLSIGN
                </label>
                <input
                  type="text"
                  placeholder="Enter display name..."
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  maxLength={20}
                  className="cyber-input"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                className="fire-button mt-2"
              >
                {loading ? 'INITIALIZING PEER...' : '🚀 LAUNCH NEW ROOM'}
              </button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="hud-container hud-cut-corner p-0">
            <div className="container-header">
              <div className="container-title">
                <span className="status-indicator bg-neon-amber shadow-[0_0_8px_var(--neon-amber)]" />
                JOIN GAME SESSION
              </div>
              <span className="container-subtitle">GUEST MODE</span>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p className="font-sub text-slate-300 text-sm leading-relaxed">
                Connect directly to an existing host room via 6-digit access code.
              </p>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  ACCESS CODE
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="cyber-input tracking-widest uppercase font-bold text-neon-cyan"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  OPERATOR CALLSIGN
                </label>
                <input
                  type="text"
                  placeholder="Enter display name..."
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  className="cyber-input"
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={loading}
                className="btn-cyan mt-2"
              >
                {loading ? 'CONNECTING PEER...' : '🎲 JOIN ROOM SESSION'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
