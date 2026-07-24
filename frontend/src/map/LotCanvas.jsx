/**
 * frontend/src/map/LotCanvas.jsx
 *
 * Renders "The Lot" — the top-down studio map with all rooms, corridors,
 * player avatars, and interaction prompts.
 *
 * Props:
 *   allPositions  — { [playerId]: { x, y } }
 *   localPlayerId — string
 *   players       — [{ id, name, isHost }]
 *   nearbyRoom    — room object | null  (from useTaskZoneTrigger)
 *   lockedRooms   — string[]  (room IDs sealed by Director Lockdown)
 *   blackout      — boolean   (Director Blackout active)
 *   ventSealed    — boolean   (Director Vent Seal active)
 *   onVentUse     — (fromId) => void
 */

import layout from './lotLayout.json';

const { mapWidth, mapHeight, rooms, corridors } = layout;

/** Pixel radius of the player avatar dot. */
const AVATAR_RADIUS = 10;
/** Fog-of-war reveal radius during Blackout (px). */
const BLACKOUT_RADIUS = 80;

/** Palette for player avatars — cycles through colours. */
const AVATAR_COLOURS = [
  '#a855f7', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];

function getAvatarColour(index) {
  return AVATAR_COLOURS[index % AVATAR_COLOURS.length];
}

export default function LotCanvas({
  allPositions = {},
  localPlayerId,
  players = [],
  nearbyRoom = null,
  lockedRooms = [],
  blackout = false,
  ventSealed = false,
}) {
  const playerIndex = (id) => players.findIndex((p) => p.id === id);

  // Build a name lookup
  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? id;

  // Local player position (for blackout fog-of-war)
  const localPos = allPositions[localPlayerId] ?? { x: mapWidth / 2, y: mapHeight / 2 };

  // ── Camera setup ─────────────────────────────────────────────────────────
  const VIEWPORT_WIDTH = 480;
  const VIEWPORT_HEIGHT = 360;
  const SCALE = 1.6;

  // Center camera on local player
  let tx = localPos.x - (VIEWPORT_WIDTH / 2) / SCALE;
  let ty = localPos.y - (VIEWPORT_HEIGHT / 2) / SCALE;

  // Clamp to map bounds
  const maxTx = mapWidth - VIEWPORT_WIDTH / SCALE;
  const maxTy = mapHeight - VIEWPORT_HEIGHT / SCALE;

  tx = Math.max(0, Math.min(tx, maxTx));
  ty = Math.max(0, Math.min(ty, maxTy));

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-gray-700 select-none"
      style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, background: '#0d0d0d', flexShrink: 0 }}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: mapWidth,
          height: mapHeight,
          transformOrigin: '0 0',
          transform: `scale(${SCALE}) translate(${-tx}px, ${-ty}px)`,
        }}
      >
        {/* ── Corridors ───────────────────────────────────────────────────────── */}
        {corridors.map((c) => (
        <div
          key={c.id}
          className="absolute"
          style={{
            left: c.bounds.x1,
            top: c.bounds.y1,
            width: c.bounds.x2 - c.bounds.x1,
            height: c.bounds.y2 - c.bounds.y1,
            background: '#1a1a1a',
          }}
        />
      ))}

      {/* ── Rooms ───────────────────────────────────────────────────────────── */}
      {rooms.map((room) => {
        const isLocked = lockedRooms.includes(room.id);
        const isVentDisabled = ventSealed && room.isVent;
        const isNearby = nearbyRoom?.id === room.id;

        return (
          <div
            key={room.id}
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: room.bounds.x1,
              top: room.bounds.y1,
              width: room.bounds.x2 - room.bounds.x1,
              height: room.bounds.y2 - room.bounds.y1,
              background: isLocked ? '#4a1a1a' : room.color,
              border: isNearby ? '2px solid #facc15' : '1px solid #333',
              borderRadius: 4,
              transition: 'border-color 0.15s',
            }}
          >
            <span
              className="text-center font-bold leading-tight pointer-events-none"
              style={{ fontSize: 9, color: isLocked ? '#f87171' : '#ccc', padding: '2px 4px' }}
            >
              {isLocked ? '🔒 LOCKED' : isVentDisabled ? '⛔ SEALED' : room.label}
            </span>
            {isNearby && room.stationId && (
              <span style={{ fontSize: 8, color: '#facc15', marginTop: 2 }}>
                [E] Enter
              </span>
            )}
            {isNearby && room.isVent && !isVentDisabled && (
              <span style={{ fontSize: 8, color: '#a78bfa', marginTop: 2 }}>
                [E] Use Vent
              </span>
            )}
          </div>
        );
      })}

      {/* ── Player Avatars ──────────────────────────────────────────────────── */}
      {Object.entries(allPositions).map(([pid, pos]) => {
        const idx = playerIndex(pid);
        const colour = getAvatarColour(idx);
        const isLocal = pid === localPlayerId;
        const name = nameOf(pid);

        // During blackout: only show players within BLACKOUT_RADIUS of local player
        if (blackout) {
          const dx = pos.x - localPos.x;
          const dy = pos.y - localPos.y;
          if (!isLocal && Math.sqrt(dx * dx + dy * dy) > BLACKOUT_RADIUS) return null;
        }

        return (
          <div
            key={pid}
            className="absolute pointer-events-none"
            style={{
              left: pos.x - AVATAR_RADIUS,
              top: pos.y - AVATAR_RADIUS,
              width: AVATAR_RADIUS * 2,
              height: AVATAR_RADIUS * 2,
            }}
          >
            {/* Circle */}
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: colour,
                border: isLocal ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                boxShadow: isLocal ? `0 0 6px ${colour}` : 'none',
              }}
            />
            {/* Name label */}
            <span
              style={{
                position: 'absolute',
                top: AVATAR_RADIUS * 2 + 2,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 8,
                color: '#fff',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 2px #000',
              }}
            >
              {name}
            </span>
          </div>
        );
      })}

      {/* ── Blackout fog-of-war overlay ─────────────────────────────────────── */}
      {blackout && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle ${BLACKOUT_RADIUS}px at ${localPos.x}px ${localPos.y}px, transparent 60%, rgba(0,0,0,0.96) 100%)`,
            zIndex: 40,
          }}
        />
      )}

        {/* ── Vent sealed indicator ──────────────────────────────────────────── */}
        {ventSealed && (
          <div
            className="absolute bottom-0 left-0 right-0 text-center text-xs font-bold py-1"
            style={{ background: 'rgba(80,0,0,0.7)', color: '#f87171', zIndex: 45 }}
          >
            ⛔ Vents Sealed by Director
          </div>
        )}
      </div>

      {/* ── Map legend ─────────────────────────────────────────────────────── */}
      <div
        className="absolute top-1 right-1 text-xs text-gray-600 pointer-events-none"
        style={{ fontSize: 7, zIndex: 50 }}
      >
        WASD / ↑↓←→ to move · E to interact
      </div>
    </div>
  );
}
