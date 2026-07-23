// api/rooms/join.js
// POST /api/rooms/join
// Body: { code: string, playerName: string, peerId: string }
// Looks up the room, registers the joining player, and returns the host's Peer ID.

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, playerName, peerId } = req.body ?? {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }
  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ error: 'playerName is required' });
  }
  if (!peerId || typeof peerId !== 'string') {
    return res.status(400).json({ error: 'peerId is required' });
  }

  // Look up the room.
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('code, host_peer_id, status, expires_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (roomError) {
    console.error('Supabase select room error:', roomError);
    return res.status(500).json({ error: 'Failed to look up room' });
  }

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.status === 'finished') {
    return res.status(410).json({ error: 'Room has already finished' });
  }

  if (room.status === 'in-progress') {
    return res.status(409).json({ error: 'Game is already in progress' });
  }

  if (new Date(room.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Room has expired' });
  }

  // Check current player count (max 8).
  const { count, error: countError } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('room_code', room.code);

  if (countError) {
    console.error('Supabase count players error:', countError);
    return res.status(500).json({ error: 'Failed to check player count' });
  }

  if (count >= 8) {
    return res.status(409).json({ error: 'Room is full (max 8 players)' });
  }

  // Register the new player.
  const playerId = nanoid();
  const { error: playerError } = await supabase.from('players').insert({
    id: playerId,
    room_code: room.code,
    name: playerName,
    is_host: false,
    peer_id: peerId,
  });

  if (playerError) {
    console.error('Supabase insert player error:', playerError);
    return res.status(500).json({ error: 'Failed to register player' });
  }

  return res.status(200).json({
    hostPeerId: room.host_peer_id,
    playerId,
    code: room.code,
  });
}
