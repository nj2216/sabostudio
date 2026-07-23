// api/rooms/[code].js
// GET /api/rooms/:code
// Returns the room metadata and current player list for a given room code.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Room code is required' });
  }

  // Fetch room details.
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('code, host_peer_id, status, created_at, expires_at')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (roomError) {
    console.error('Supabase select room error:', roomError);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Fetch all players in this room.
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, is_host, peer_id, joined_at')
    .eq('room_code', room.code)
    .order('joined_at', { ascending: true });

  if (playersError) {
    console.error('Supabase select players error:', playersError);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }

  return res.status(200).json({
    room: {
      code: room.code,
      hostPeerId: room.host_peer_id,
      status: room.status,
      createdAt: room.created_at,
      expiresAt: room.expires_at,
    },
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.is_host,
      peerId: p.peer_id,
      joinedAt: p.joined_at,
    })),
  });
}
