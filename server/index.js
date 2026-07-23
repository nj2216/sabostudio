// server/index.js
// Express server — serves the API routes and (in production) the frontend static build.

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Supabase client (shared across routes)
// ---------------------------------------------------------------------------

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function generateRoomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ---------------------------------------------------------------------------
// POST /api/rooms/create
// Body: { hostPeerId: string, hostName: string }
// ---------------------------------------------------------------------------

app.post('/api/rooms/create', async (req, res) => {
  const { hostPeerId, hostName } = req.body ?? {};

  if (!hostPeerId || typeof hostPeerId !== 'string') {
    return res.status(400).json({ error: 'hostPeerId is required' });
  }
  if (!hostName || typeof hostName !== 'string') {
    return res.status(400).json({ error: 'hostName is required' });
  }

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

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

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
    await supabase.from('rooms').delete().eq('code', code);
    return res.status(500).json({ error: 'Failed to register host player' });
  }

  return res.status(201).json({ code, playerId });
});

// ---------------------------------------------------------------------------
// POST /api/rooms/join
// Body: { code: string, playerName: string, peerId: string }
// ---------------------------------------------------------------------------

app.post('/api/rooms/join', async (req, res) => {
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
});

// ---------------------------------------------------------------------------
// GET /api/rooms/:code
// ---------------------------------------------------------------------------

app.get('/api/rooms/:code', async (req, res) => {
  const { code } = req.params;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Room code is required' });
  }

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
});

// ---------------------------------------------------------------------------
// Serve frontend in production
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sabotage Studio server running on http://localhost:${PORT}`);
});
