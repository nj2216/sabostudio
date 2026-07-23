// server/index.js
// Express server — serves the API routes and (in production) the frontend static build.

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import db from './db/index.js';

// ---------------------------------------------------------------------------
// Startup validation
// ---------------------------------------------------------------------------

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
} else {
  console.log('Running in development mode — using local SQLite database (dev.db).');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

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
    const existing = await db.rooms.findByCode(code);
    if (!existing) break;
    code = null;
  }

  if (!code) {
    return res.status(500).json({ error: 'Failed to generate a unique room code. Please try again.' });
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  try {
    await db.rooms.create({ code, hostPeerId, status: 'waiting', expiresAt });
  } catch (err) {
    console.error('DB insert room error:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }

  const playerId = nanoid();
  try {
    await db.players.create({ id: playerId, roomCode: code, name: hostName, isHost: true, peerId: hostPeerId });
  } catch (err) {
    console.error('DB insert host player error:', err);
    await db.rooms.delete(code);
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

  let room;
  try {
    room = await db.rooms.findByCode(code.toUpperCase());
  } catch (err) {
    console.error('DB select room error:', err);
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

  let count;
  try {
    count = await db.players.countByRoom(room.code);
  } catch (err) {
    console.error('DB count players error:', err);
    return res.status(500).json({ error: 'Failed to check player count' });
  }

  if (count >= 8) {
    return res.status(409).json({ error: 'Room is full (max 8 players)' });
  }

  const playerId = nanoid();
  try {
    await db.players.create({ id: playerId, roomCode: room.code, name: playerName, isHost: false, peerId });
  } catch (err) {
    console.error('DB insert player error:', err);
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

  let room;
  try {
    room = await db.rooms.findByCode(code.toUpperCase());
  } catch (err) {
    console.error('DB select room error:', err);
    return res.status(500).json({ error: 'Failed to fetch room' });
  }

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  let players;
  try {
    players = await db.players.findByRoom(room.code);
  } catch (err) {
    console.error('DB select players error:', err);
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
