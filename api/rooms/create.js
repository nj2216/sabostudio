// api/rooms/create.js
// POST /api/rooms/create
// Body: { hostPeerId: string, hostName: string }
// Creates a new room in Supabase and returns the generated room code.

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Generate a short, uppercase room code (6 characters).
 * Characters chosen to be unambiguous when read aloud (no 0/O, 1/I/L).
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { hostPeerId, hostName } = req.body ?? {};

  if (!hostPeerId || typeof hostPeerId !== 'string') {
    return res.status(400).json({ error: 'hostPeerId is required' });
  }
  if (!hostName || typeof hostName !== 'string') {
    return res.status(400).json({ error: 'hostName is required' });
  }

  // Generate a unique room code (retry on collision, max 5 attempts).
  let code;
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateRoomCode();
    const { data: existing } = await supabase
      .from('rooms')
      .select('code')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    code = null;
  }

  if (!code) {
    return res.status(500).json({ error: 'Failed to generate a unique room code. Please try again.' });
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours TTL

  // Insert the room record.
  const { error: roomError } = await supabase.from('rooms').insert({
    code,
    host_peer_id: hostPeerId,
    status: 'waiting',
    expires_at: expiresAt,
  });

  if (roomError) {
    console.error('Supabase insert room error:', roomError);
    return res.status(500).json({ error: 'Failed to create room' });
  }

  // Insert the host as the first player.
  const playerId = nanoid();
  const { error: playerError } = await supabase.from('players').insert({
    id: playerId,
    room_code: code,
    name: hostName,
    is_host: true,
    peer_id: hostPeerId,
  });

  if (playerError) {
    console.error('Supabase insert host player error:', playerError);
    // Clean up the room we just created to keep DB consistent.
    await supabase.from('rooms').delete().eq('code', code);
    return res.status(500).json({ error: 'Failed to register host player' });
  }

  return res.status(201).json({ code, playerId });
}
