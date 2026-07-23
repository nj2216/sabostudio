// server/db/sqlite.js
// SQLite adapter — used in development (no external DB required).

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../../dev.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ---------------------------------------------------------------------------
// Schema bootstrap
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code        TEXT PRIMARY KEY,
    host_peer_id TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'waiting',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id          TEXT PRIMARY KEY,
    room_code   TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_host     INTEGER NOT NULL DEFAULT 0,
    peer_id     TEXT NOT NULL,
    joined_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// rooms
// ---------------------------------------------------------------------------

async function findRoomByCode(code) {
  const row = db
    .prepare('SELECT code, host_peer_id, status, created_at, expires_at FROM rooms WHERE code = ?')
    .get(code);
  return row ?? null;
}

async function createRoom({ code, hostPeerId, status, expiresAt }) {
  db.prepare(
    'INSERT INTO rooms (code, host_peer_id, status, expires_at) VALUES (?, ?, ?, ?)'
  ).run(code, hostPeerId, status, expiresAt);
}

async function deleteRoom(code) {
  db.prepare('DELETE FROM rooms WHERE code = ?').run(code);
}

// ---------------------------------------------------------------------------
// players
// ---------------------------------------------------------------------------

async function countPlayersByRoom(roomCode) {
  const row = db
    .prepare('SELECT COUNT(*) AS cnt FROM players WHERE room_code = ?')
    .get(roomCode);
  return row.cnt;
}

async function createPlayer({ id, roomCode, name, isHost, peerId }) {
  db.prepare(
    'INSERT INTO players (id, room_code, name, is_host, peer_id) VALUES (?, ?, ?, ?, ?)'
  ).run(id, roomCode, name, isHost ? 1 : 0, peerId);
}

async function findPlayersByRoom(roomCode) {
  return db
    .prepare(
      'SELECT id, name, is_host, peer_id, joined_at FROM players WHERE room_code = ? ORDER BY joined_at ASC'
    )
    .all(roomCode)
    .map((r) => ({ ...r, is_host: r.is_host === 1 }));
}

export default {
  rooms: { findByCode: findRoomByCode, create: createRoom, delete: deleteRoom },
  players: {
    countByRoom: countPlayersByRoom,
    create: createPlayer,
    findByRoom: findPlayersByRoom,
  },
};
