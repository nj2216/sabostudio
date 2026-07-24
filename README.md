# Sabotage Studio

> **"Keep Talking and Nobody Explodes" meets Mario Party minigames — in your browser.**

A chaotic browser-based party game for **2–8 players** per lobby.  
No download, no account — just share a room code and start playing.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started (Local Dev)](#getting-started-local-dev)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Deployment](#deployment)
- [How It Works](#how-it-works)
- [Roadmap / TODOs](#roadmap--todos)

---

## Architecture Overview

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 19 + Vite + Tailwind CSS | UI, lobby screens, minigames (follow-up), sabotage overlays |
| **P2P Networking** | PeerJS (WebRTC) | Real-time swap events, sabotage triggers, player-list sync — host peer is authoritative |
| **Backend** | Express (Node.js, `server/`) | Room creation, player registration, room metadata lookup only — **no game logic** |
| **Database** | Supabase (Postgres) | Room registry, player registry, optional post-game stats |

### P2P Design

- When a host creates a room, their **PeerJS Peer ID** is stored in Supabase.
- When a guest joins, they retrieve the **host's Peer ID** from the backend and open a direct WebRTC data channel to the host via PeerJS.
- The **host** is the authoritative peer: it maintains the player list and broadcasts state updates (`player-list-update`, `game-start`, swap timers, sabotage events) to all connected peers over WebRTC data channels.
- The **Express server** is only hit for room creation/lookup/join — all real-time game logic flows P2P.

> ⚠️ **Host migration is not implemented in v1.** If the host disconnects, the game session ends. This is a known limitation to be addressed in a follow-up issue.

---

## Project Structure

```
sabostudio/
├── server/
│   └── index.js                # Express server — API routes + serves frontend in production
├── frontend/                   # Vite + React app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── peer.js         # PeerJS wrapper (createPeer, setupHost, connectToHost)
│   │   │   ├── stationSwap.js  # useStationSwap hook + host-side swap scheduler
│   │   │   └── playerMovement.js # Client-predicted movement + host position relay
│   │   ├── pages/
│   │   │   ├── Landing.jsx     # Create Room / Join Room UI
│   │   │   ├── Lobby.jsx       # Waiting room + player list + Start Game
│   │   │   └── Game.jsx        # Main game screen (map + stations + sabotage + Director HUD)
│   │   ├── stations/
│   │   │   ├── BombSet/        # Wire cutting, keypad code, symbol match
│   │   │   ├── Kitchen/        # Ingredient sequencing, stove dial match
│   │   │   ├── TestTrack/      # Gear shift QTE, obstacle dodge
│   │   │   ├── RadioBooth/     # Frequency tuning, fader balance
│   │   │   └── EditingBay/     # Timeline reorder, sync rhythm
│   │   ├── sabotage/
│   │   │   ├── SabotageEffect.js  # Shared interface + registry for all effects
│   │   │   ├── SabotageDeck.js    # Host-side broadcaster + useSabotageReceiver hook
│   │   │   └── effects/           # 12 effect implementations (visual, input, social, structural)
│   │   ├── map/
│   │   │   ├── lotLayout.json       # Room bounds, doors, vent pairs, task room IDs
│   │   │   ├── LotCanvas.jsx        # Renders the top-down studio map + player avatars
│   │   │   └── useTaskZoneTrigger.js # Detects player overlap with task room interact zones
│   │   ├── App.jsx             # Top-level screen routing (landing → lobby → game)
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind base styles
│   ├── package.json
│   ├── vite.config.js          # Proxies /api to Express in dev mode
│   ├── tailwind.config.js
│   └── postcss.config.js
├── package.json                # Root: scripts + server dependencies
├── .env.example                # Required environment variables (copy to .env)
└── README.md
```

---

## Getting Started (Local Dev)

### Prerequisites

- Node.js 18.11.0+ (required for `--watch` flag used in `npm run dev`)
- A [Supabase](https://supabase.com) project (free tier is fine)

### 1. Clone & install

```bash
git clone https://github.com/nj2216/sabostudio.git
cd sabostudio

# Install root (server) dependencies
npm install

# Install frontend dependencies
npm install --prefix frontend
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your Supabase credentials
```

### 3. Run locally (dev)

```bash
npm run dev
```

This starts two processes via `concurrently`:
- **Express server** on `http://localhost:3000` (API routes)
- **Vite dev server** on `http://localhost:5173` (frontend, proxies `/api` → Express)

Open `http://localhost:5173` in your browser.

### 4. Build for production

```bash
npm run build
# Builds the frontend into frontend/dist/
```

### 5. Run in production

```bash
npm start
# Express serves both the API and the built frontend at http://localhost:3000
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — used **server-side only** in `server/` |
| `PORT` | Port for the Express server (defaults to `3000`) |

> **Never commit `.env` or any file containing real keys.** Only `.env.example` (with placeholder values) should be committed.

---

## Supabase Setup

Run the following SQL in your Supabase project's **SQL Editor** to create the required tables:

```sql
-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  code            TEXT PRIMARY KEY,
  host_peer_id    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'waiting', -- waiting | in-progress | finished
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL
);

-- Index for fast expiry cleanup (optional cron job)
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms (expires_at);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,        -- nanoid
  room_code   TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_host     BOOLEAN NOT NULL DEFAULT FALSE,
  peer_id     TEXT NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_room_code ON players (room_code);

-- Optional: post-game stats (stub for follow-up)
-- CREATE TABLE IF NOT EXISTS game_sessions (
--   id          TEXT PRIMARY KEY,
--   room_code   TEXT NOT NULL,
--   started_at  TIMESTAMPTZ,
--   ended_at    TIMESTAMPTZ,
--   winner_id   TEXT
-- );
```

### Row-Level Security (RLS)

The server uses the **service role key**, which bypasses RLS.  
If you want to restrict direct client access to tables (recommended for production), enable RLS and add appropriate policies:

```sql
ALTER TABLE rooms  ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Example: allow anyone to read rooms (required for join flow if called client-side)
CREATE POLICY "rooms_read" ON rooms FOR SELECT USING (true);
```

---

## Deployment

Deploy to any Node.js host (Railway, Render, Fly.io, a VPS, etc.):

1. Set the environment variables from `.env.example` in your hosting platform.
2. Run `npm run build` to build the frontend.
3. Run `npm start` to start the Express server (`NODE_ENV=production`).

The server listens on `process.env.PORT` (default `3000`) and serves both the API and the compiled frontend from `frontend/dist/`.

---

## How It Works

### Create Room flow

1. Host enters their display name and clicks **Create Room**.
2. Frontend opens a PeerJS instance → gets a Peer ID.
3. Calls `POST /api/rooms/create` with `{ hostPeerId, hostName }`.
4. Backend generates a 6-character room code, stores it in Supabase, returns `{ code, playerId }`.
5. Host is taken to the **Lobby** screen showing their room code and waiting for guests.

### Join Room flow

1. Guest enters the room code + display name and clicks **Join Room**.
2. Frontend opens a PeerJS instance → gets a Peer ID.
3. Calls `POST /api/rooms/join` with `{ code, playerName, peerId }`.
4. Backend looks up the room, registers the guest in Supabase, returns `{ hostPeerId, playerId, code }`.
5. Guest opens a PeerJS WebRTC data channel directly to the host.
6. Guest sends a `player-joined` message → host broadcasts `player-list-update` to all peers.

### Lobby

- Host and guests see a live-updating player list (updated via P2P messages + REST polling as fallback).
- **Start Game** button is visible to the host only and is a stub (`game-start` is broadcast to all peers; actual minigames are out of scope for this PR).

---

## Roadmap / TODOs

These are intentionally left as stubs to be built in follow-up PRs:

- [x] **Station implementations** — BombSet, Kitchen, TestTrack, RadioBooth, EditingBay
- [x] **Sabotage Deck** — 12 effects across visual/input/social/structural categories
- [x] **Station swap engine** — `useStationSwap` hook + host scheduler (15–20 s, random)
- [x] **Free-roam map** — "The Lot" tilemap with WASD movement + interact zones
- [x] **Director HUD** — host Director Tokens + sabotage firing UI
- [x] **Studio Crisis** — power-outage, fire-alarm, take-too-many co-op events
- [x] **Screen/control splitting** — viewingStationId ≠ controllingStationId per player
- [ ] **Host migration** — elect a new host peer if the host disconnects
- [ ] **Voice chat** integration
- [ ] **Post-game stats** persistence in Supabase
- [ ] **Avatar selection** in the lobby
- [ ] **Automatic room cleanup** (expired rooms) via a scheduled function
- [ ] **Trust Meter** — social deduction layer with Crew Trust score

