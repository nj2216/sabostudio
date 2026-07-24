/**
 * frontend/src/pages/Landing.jsx
 *
 * Redesigned Landing screen with premium high-tech sci-fi studio aesthetics.
 */

import { useState } from 'react';
import { createPeer } from '../lib/peer.js';

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
      const peer = await createPeer();
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
      const peer = await createPeer();
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
    <div className="h-screen max-h-screen overflow-hidden flex flex-col items-center justify-between p-4 sm:p-6 relative z-10">
      {/* Top HUD Nav Header */}
      <div className="w-full max-w-5xl">
        <div className="top-hud">
          <div className="flex items-center gap-4">
            <h1 className="brand-logo text-xl sm:text-2xl">
              SABOTAGE <span>STUDIO</span>
            </h1>
            <span className="level-badge">v1.2.0 // P2P NET</span>
          </div>
          <div className="flex items-center gap-6 hidden md:flex">
            <div className="flex flex-col items-end">
              <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest">ENCRYPTION</span>
              <span className="font-head text-xs text-cyan-400 tracking-wider">WEBRTC DATASTREAM</span>
            </div>
            <div className="timecode-box">SYS.ONLINE</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center gap-6 min-h-0 py-4">
        <div className="text-center space-y-1">
          <p className="font-mono text-xs text-cyan-400/80 tracking-widest uppercase">
            [ TACTICAL GAME DIRECTOR INTERFACE & MULTIPLAYER CONSOLE ]
          </p>
          <h2 className="font-head text-2xl sm:text-3xl text-slate-100 font-extrabold tracking-wide">
            ENTER THE MULTIPLAYER ARENA
          </h2>
        </div>

        {error && (
          <div className="w-full max-w-3xl bg-red-950/90 border border-red-500/80 px-4 py-3 text-red-400 font-mono text-xs flex items-center gap-3 shadow-[0_0_20px_rgba(255,0,85,0.4)]">
            <span className="w-2.5 h-2.5 bg-red-500 animate-ping rounded-full" />
            <span>CRITICAL ALERT: {error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl">
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
                Initialize authoritative host peer session. Share your unique room code with players to launch tasks & sabotages.
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
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    INITIALIZING PEER...
                  </span>
                ) : (
                  '🚀 LAUNCH NEW ROOM'
                )}
              </button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="hud-container hud-cut-corner p-0">
            <div className="container-header">
              <div className="container-title">
                <span className="status-indicator style-amber" style={{ background: '#ffb703', boxShadow: '0 0 10px #ffb703' }} />
                JOIN GAME SESSION
              </div>
              <span className="container-subtitle" style={{ color: '#ffb703' }}>GUEST MODE</span>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p className="font-sub text-slate-300 text-sm leading-relaxed">
                Connect directly to an existing host session via a 6-digit access code and join the squad.
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
                  className="cyber-input tracking-widest uppercase font-bold text-amber-400"
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
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    CONNECTING PEER...
                  </span>
                ) : (
                  '🎲 JOIN ROOM SESSION'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="w-full max-w-5xl text-center py-2">
        <span className="font-mono text-[10px] text-slate-500 tracking-wider">
          SABOTAGE STUDIO INTERFACE &copy; 2026 // AUTHORITATIVE P2P ENGINE
        </span>
      </div>
    </div>
  );
}
