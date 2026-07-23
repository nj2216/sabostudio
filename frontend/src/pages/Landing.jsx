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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      {/* Header */}
      <h1 className="text-5xl font-extrabold mb-2 text-purple-400 tracking-tight">
        🎮 Sabotage Studio
      </h1>
      <p className="text-gray-400 mb-10 text-lg">
        The chaotic browser party game. 2–8 players. Pure mayhem.
      </p>

      {error && (
        <p className="mb-4 px-4 py-2 bg-red-900/50 border border-red-600 rounded text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {/* Create Room Card */}
        <div className="flex-1 bg-gray-900 rounded-2xl p-6 border border-gray-700 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white">Create Room</h2>
          <p className="text-gray-400 text-sm">
            Start a new lobby. Share the code with friends.
          </p>
          <input
            type="text"
            placeholder="Your display name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl font-bold text-white transition-colors"
          >
            {loading ? 'Creating…' : '🚀 Create Room'}
          </button>
        </div>

        {/* Join Room Card */}
        <div className="flex-1 bg-gray-900 rounded-2xl p-6 border border-gray-700 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white">Join Room</h2>
          <p className="text-gray-400 text-sm">
            Have a code? Jump straight into the chaos.
          </p>
          <input
            type="text"
            placeholder="Room code (e.g. ABC123)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase tracking-widest"
          />
          <input
            type="text"
            placeholder="Your display name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold text-white transition-colors"
          >
            {loading ? 'Joining…' : '🎲 Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
