/**
 * frontend/src/pages/Landing.jsx
 *
 * Final Cut — Horror-themed Landing screen.
 * Film noir / abandoned studio aesthetic with diegetic lore.
 */

import { useState } from 'react';
import { createPeer } from '../lib/peer.js';

const LORE_QUOTES = [
  '"The last reel was never found."',
  '"Quiet on set."',
  '"Nobody who watched that reel ever spoke about it again."',
  '"The production was quietly buried."',
  '"He is still trying to finish his movie."',
  '"The script stopped being fiction."',
];

export default function Landing({ onHostReady, onGuestReady }) {
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loreIdx] = useState(() => Math.floor(Math.random() * LORE_QUOTES.length));

  async function handleCreate() {
    if (!hostName.trim()) {
      setError('Enter your name to proceed.');
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

  async function handleJoin() {
    if (!joinCode.trim()) {
      setError('Enter the access code.');
      return;
    }
    if (!joinName.trim()) {
      setError('Enter your name to proceed.');
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
      {/* Top HUD Nav */}
      <div className="w-full max-w-5xl">
        <div className="top-hud">
          <div className="flex items-center gap-4">
            <h1 className="brand-logo text-2xl sm:text-3xl">
              FINAL <span>CUT</span>
            </h1>
            <span className="level-badge">HIGHLINE STUDIOS // 1987</span>
          </div>
          <div className="flex items-center gap-6 hidden md:flex">
            <div className="flex flex-col items-end">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                NETWORK
              </span>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: '13px', color: 'var(--amber)', letterSpacing: '2px' }}>
                P2P DATASTREAM
              </span>
            </div>
            <div className="timecode-box">SYS.ONLINE</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-center gap-6 min-h-0 py-4">
        {/* Lore Quote */}
        <div className="text-center space-y-2">
          <p style={{ fontFamily: 'var(--font-sub)', fontSize: '14px', color: 'var(--amber)', letterSpacing: '2px', opacity: 0.7, fontStyle: 'italic' }}>
            {LORE_QUOTES[loreIdx]}
          </p>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(22px, 4vw, 32px)', color: 'var(--text-main)', letterSpacing: '4px' }}>
            A SABOTAGE STUDIO PRODUCTION
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
            1 DIRECTOR vs 3–5 TALENT // ASYMMETRIC HORROR // BROWSER P2P
          </p>
        </div>

        {error && (
          <div className="w-full max-w-3xl" style={{ background: 'rgba(139, 0, 0, 0.2)', border: '1px solid rgba(139, 0, 0, 0.6)', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--blood-red-bright)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--blood-red-bright)', borderRadius: '50%', animation: 'pulseGlow 1s infinite' }} />
            <span>ALERT: {error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl">
          {/* Direct A Film Card */}
          <div className="hud-container hud-cut-corner p-0">
            <div className="container-header">
              <div className="container-title">
                <span className="status-indicator" />
                DIRECT A FILM
              </div>
              <span className="container-subtitle" style={{ color: 'var(--blood-red-bright)' }}>THE DIRECTOR</span>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p style={{ fontFamily: 'var(--font-sub)', fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.7' }}>
                Take the chair. Initialize a session and share the access code. You decide who hunts and who hides.
              </p>

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  YOUR NAME
                </label>
                <input
                  id="host-name-input"
                  type="text"
                  placeholder="Enter your name..."
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  maxLength={20}
                  className="cyber-input"
                />
              </div>

              <button
                id="create-room-btn"
                onClick={handleCreate}
                disabled={loading}
                className="fire-button mt-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    INITIALIZING...
                  </span>
                ) : (
                  '🎬 CREATE SESSION'
                )}
              </button>
            </div>
          </div>

          {/* Join The Cast Card */}
          <div className="hud-container hud-cut-corner p-0">
            <div className="container-header">
              <div className="container-title">
                <span className="status-indicator" style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber)' }} />
                JOIN THE CAST
              </div>
              <span className="container-subtitle">TALENT</span>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <p style={{ fontFamily: 'var(--font-sub)', fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.7' }}>
                You were told this was an audition. Enter the access code and step onto the lot. Try to survive.
              </p>

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  ACCESS CODE
                </label>
                <input
                  id="join-code-input"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="cyber-input"
                  style={{ letterSpacing: '6px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--amber)' }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  YOUR NAME
                </label>
                <input
                  id="join-name-input"
                  type="text"
                  placeholder="Enter your name..."
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  className="cyber-input"
                />
              </div>

              <button
                id="join-room-btn"
                onClick={handleJoin}
                disabled={loading}
                className="btn-amber mt-2"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    CONNECTING...
                  </span>
                ) : (
                  '🎭 JOIN SESSION'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-5xl text-center py-2">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
          FINAL CUT — A SABOTAGE STUDIO PRODUCTION &copy; 2026 // HIGHLINE STUDIOS
        </span>
      </div>
    </div>
  );
}
