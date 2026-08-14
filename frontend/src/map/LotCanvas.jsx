/**
 * frontend/src/map/LotCanvas.jsx
 *
 * 2D Top-Down Canvas renderer for Final Cut — "The Lot" map.
 *
 * Role-based rendering:
 *   - Director: full map vision (no fog), all positions visible, aura highlights
 *   - Talent: 100° raycasted viewcone with wall occlusion, fog-of-war
 *
 * Additional elements: chalk Marks, Exit Gates, Director's Booth, terror radius
 */

import { useEffect, useState, useMemo } from 'react';
import layout from './lotLayout.json';

const { mapWidth, mapHeight, rooms, corridors, chalkMarks, exitGates } = layout;

const VIEWCONE_RADIUS = 230;

const SUIT_COLOURS = [
  '#8b0000', // Blood red (Director)
  '#c4a35a', // Amber
  '#7a8b5c', // Olive
  '#6b7d8e', // Steel
  '#8b6b5c', // Rust
  '#5c6b8b', // Slate blue
];

const WALKABLE_RECTS = [
  ...rooms.map((r) => r.bounds),
  ...corridors.map((c) => c.bounds),
];

function isPointWalkable(px, py) {
  return WALKABLE_RECTS.some(
    (r) => px >= r.x1 && px <= r.x2 && py >= r.y1 && py <= r.y2
  );
}

function getSuitColour(index, isDirector) {
  if (isDirector) return SUIT_COLOURS[0];
  return SUIT_COLOURS[(index % (SUIT_COLOURS.length - 1)) + 1];
}

function computeRaycastPolygon(localPos, smoothAngle, fovDegrees = 105, maxRadius = VIEWCONE_RADIUS, numRays = 50) {
  const halfArc = (fovDegrees * Math.PI) / 360;
  const startAngle = smoothAngle - halfArc;
  const step = (fovDegrees * Math.PI) / (180 * numRays);

  const points = [{ x: localPos.x, y: localPos.y }];

  for (let i = 0; i <= numRays; i++) {
    const angle = startAngle + i * step;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let finalDist = maxRadius;
    for (let d = 8; d <= maxRadius; d += 4) {
      const rx = localPos.x + cos * d;
      const ry = localPos.y + sin * d;
      if (!isPointWalkable(rx, ry)) {
        finalDist = d - 2;
        break;
      }
    }

    points.push({
      x: localPos.x + cos * finalDist,
      y: localPos.y + sin * finalDist,
    });
  }

  return points;
}

function checkPlayerVisibility(localPos, smoothAngle, targetPos) {
  const dx = targetPos.x - localPos.x;
  const dy = targetPos.y - localPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > VIEWCONE_RADIUS) return { inCone: false, inPeripheral: false };
  if (dist < 30) return { inCone: true, inPeripheral: true };

  const angleToTarget = Math.atan2(dy, dx);
  let diff = angleToTarget - smoothAngle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;

  const inAngleArc = Math.abs(diff) <= (53 * Math.PI) / 180;
  if (!inAngleArc) return { inCone: false, inPeripheral: dist <= 165 };

  const steps = Math.ceil(dist / 6);
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 1; i <= steps; i++) {
    const rx = localPos.x + stepX * i;
    const ry = localPos.y + stepY * i;
    if (!isPointWalkable(rx, ry)) return { inCone: false, inPeripheral: dist <= 165 };
  }

  return { inCone: true, inPeripheral: true };
}

export default function LotCanvas({
  allPositions = {},
  localPlayerId,
  directorId,
  players = [],
  nearbyRoom = null,
  completedStationIds = new Set(),
  playerStatuses = {},
  markOccupants = {},
  openExitGates = new Set(),
  phase = 'rolling',
  facingAngle = Math.PI / 2,
  interactProgress = 0,
  isInteracting = false,
  crouchStates = {},
  terrorIntensity = 0,
}) {
  const isDirector = localPlayerId === directorId;
  const isSpectator = playerStatuses[localPlayerId] === 'wrapped' || playerStatuses[localPlayerId] === 'crew';
  const showFullMap = isDirector || isSpectator;

  const playerDicts = useMemo(() => {
    const map = {};
    const indices = {};
    players.forEach((p, i) => {
      map[p.id] = p;
      indices[p.id] = i;
    });
    return { map, indices };
  }, [players]);

  const playerIndex = (id) => playerDicts.indices[id] ?? -1;
  const nameOf = (id) => playerDicts.map[id]?.name ?? id;

  const localPos = allPositions[localPlayerId] ?? { x: mapWidth / 2, y: mapHeight / 2 };

  // ── Smooth Viewcone Turning ──────────────────────────────────────────
  const [smoothAngle, setSmoothAngle] = useState(facingAngle);

  useEffect(() => {
    let animId;
    const updateAngle = () => {
      setSmoothAngle((prev) => {
        let diff = facingAngle - prev;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        if (Math.abs(diff) < 0.005) return facingAngle;
        return prev + diff * 0.16;
      });
      animId = requestAnimationFrame(updateAngle);
    };
    animId = requestAnimationFrame(updateAngle);
    return () => cancelAnimationFrame(animId);
  }, [facingAngle]);

  // ── Camera ──────────────────────────────────────────────────────────
  const VIEWPORT_WIDTH = 640;
  const VIEWPORT_HEIGHT = 360;
  const SCALE = 1.6;

  let tx = localPos.x - (VIEWPORT_WIDTH / 2) / SCALE;
  let ty = localPos.y - (VIEWPORT_HEIGHT / 2) / SCALE;

  const maxTx = mapWidth - VIEWPORT_WIDTH / SCALE;
  const maxTy = mapHeight - VIEWPORT_HEIGHT / SCALE;
  tx = Math.max(0, Math.min(tx, maxTx));
  ty = Math.max(0, Math.min(ty, maxTy));

  // Viewcone SVG path (Talent only when alive)
  const polygonPoints = !showFullMap ? computeRaycastPolygon(localPos, smoothAngle) : [];
  const viewConeSvgPath = polygonPoints.length > 0
    ? polygonPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ') + ' Z'
    : '';

  return (
    <div className="relative overflow-hidden w-full h-full select-none" style={{ background: '#080604' }}>
      <div
        className="absolute top-0 left-0"
        style={{
          width: mapWidth,
          height: mapHeight,
          transformOrigin: '0 0',
          transform: `scale(${SCALE}) translate(${-tx}px, ${-ty}px)`,
        }}
      >
        {/* ── Corridors ─────────────────────────────────────────────────── */}
        {corridors.map((c) => (
          <div
            key={c.id}
            className="absolute"
            style={{
              left: c.bounds.x1,
              top: c.bounds.y1,
              width: c.bounds.x2 - c.bounds.x1,
              height: c.bounds.y2 - c.bounds.y1,
              background: `
                linear-gradient(rgba(139, 0, 0, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 0, 0, 0.03) 1px, transparent 1px),
                linear-gradient(135deg, #0e0b08 0%, #080604 100%)
              `,
              backgroundSize: '16px 16px, 16px 16px, 100% 100%',
              border: '2px solid #0a0806',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
            }}
          />
        ))}

        {/* ── Rooms ─────────────────────────────────────────────────────── */}
        {rooms.map((room) => {
          const isNearby = nearbyRoom?.id === room.id;
          const isCompleted = room.stationId && completedStationIds.has(room.stationId);
          const isBooth = room.isDirectorBooth;
          const isBoothLocked = isBooth && phase === 'pre-production';
          const roomWidth = room.bounds.x2 - room.bounds.x1;
          const roomHeight = room.bounds.y2 - room.bounds.y1;

          return (
            <div
              key={room.id}
              className="absolute flex flex-col items-center justify-between p-1.5 transition-all duration-200"
              style={{
                left: room.bounds.x1,
                top: room.bounds.y1,
                width: roomWidth,
                height: roomHeight,
                background: isBooth
                  ? `linear-gradient(135deg, rgba(139, 0, 0, 0.12) 0%, #0e0a08 100%)`
                  : isCompleted
                  ? `linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, #0c0a06 100%)`
                  : `
                    linear-gradient(rgba(139, 0, 0, 0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(139, 0, 0, 0.02) 1px, transparent 1px),
                    linear-gradient(135deg, #12100c 0%, #0a0806 100%)
                  `,
                backgroundSize: '20px 20px, 20px 20px, 100% 100%',
                border: isNearby && !isCompleted
                  ? '3px solid var(--amber)'
                  : isCompleted
                  ? '2px solid rgba(34, 197, 94, 0.4)'
                  : isBoothLocked
                  ? '3px solid var(--blood-red)'
                  : '2.5px solid #1a1510',
                outline: '1.5px solid #000000',
                borderRadius: 4,
                boxShadow: isNearby && !isCompleted
                  ? '0 0 20px var(--amber-glow), inset 0 0 12px rgba(196, 163, 90, 0.1)'
                  : isBoothLocked
                  ? '0 0 20px var(--blood-glow)'
                  : '0 4px 10px rgba(0,0,0,0.6), inset 0 0 10px rgba(139, 0, 0, 0.03)',
              }}
            >
              <div className="flex items-center gap-1.5 z-10">
                <span
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontSize: 9,
                    color: isCompleted ? 'var(--exit-green)' : isNearby ? 'var(--amber)' : isBoothLocked ? 'var(--blood-red-bright)' : '#6b5f50',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    pointerEvents: 'none',
                  }}
                >
                  {isCompleted ? '✓ ' : ''}{isBoothLocked ? '🔒 SEALED' : room.label}
                </span>
              </div>

              {room.stationId && (
                <div className="relative flex flex-col items-center my-auto z-10">
                  <div
                    style={{
                      width: 30,
                      height: 18,
                      background: isCompleted
                        ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.3) 0%, #0a0806 100%)'
                        : 'linear-gradient(180deg, #1a1510 0%, #0a0806 100%)',
                      border: isCompleted ? '2px solid rgba(34, 197, 94, 0.5)' : '2px solid #2a2015',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isNearby && !isCompleted ? '0 0 12px var(--amber-glow)' : '0 2px 5px rgba(0,0,0,0.8)',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 10,
                        borderRadius: 2,
                        background: isCompleted ? 'rgba(34, 197, 94, 0.6)' : isNearby ? 'var(--amber)' : '#4a3a2a',
                        boxShadow: isCompleted ? '0 0 6px var(--exit-glow)' : isNearby ? '0 0 6px var(--amber)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '6px', color: isCompleted ? '#0a0806' : '#000', fontWeight: 900 }}>
                        {isCompleted ? '✓' : isNearby ? '>_E' : '::'}
                      </span>
                    </div>
                  </div>

                  {isNearby && !isCompleted && (
                    <div className="absolute -top-9 flex flex-col items-center z-20">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-8 h-8 -rotate-90">
                          <circle cx="16" cy="16" r="13" stroke="#2a2015" strokeWidth="3" fill="transparent" />
                          <circle
                            cx="16" cy="16" r="13"
                            stroke="var(--amber)"
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={2 * Math.PI * 13 * (1 - interactProgress)}
                            strokeLinecap="round"
                            fill="transparent"
                            style={{ transition: 'stroke-dashoffset 75ms ease' }}
                          />
                        </svg>
                        <span style={{ position: 'absolute', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '7px', color: 'var(--amber)', textShadow: '0 0 4px var(--amber-glow)' }}>
                          {isInteracting ? `${Math.round(interactProgress * 100)}%` : 'HOLD E'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Chalk Marks & Wrap Timers ──────────────────────────────────── */}
        {chalkMarks?.map((mark) => {
          const occupant = markOccupants[mark.id];
          const occupied = !!occupant;
          const remainingSecs = occupant?.remainingSecs ?? 60;
          const talentName = players.find((p) => p.id === occupant?.talentId)?.name;

          return (
            <div
              key={mark.id}
              className={`chalk-mark ${occupied ? 'occupied' : ''}`}
              style={{ left: mark.x - 20, top: mark.y - 20 }}
            >
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'var(--font-mono)', fontSize: '7px', color: occupied ? 'var(--blood-red-bright)' : 'var(--chalk-white)', fontWeight: 700 }}>
                {occupied ? '⛓️' : '✕'}
              </span>

              {/* Countdown Timer Ring Over Mark */}
              {occupied && (
                <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 30 }}>
                  <div style={{ background: 'rgba(139, 0, 0, 0.9)', border: '1px solid var(--blood-red-bright)', padding: '2px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#fff', fontWeight: 900, whiteSpace: 'nowrap', boxShadow: '0 0 8px var(--blood-glow)' }}>
                    ⛓️ {talentName}: {remainingSecs}s
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Exit Gates ─────────────────────────────────────────────────── */}
        {exitGates?.map((gate) => {
          const isPowered = phase === 'wrap-up';
          const isOpen = openExitGates.has(gate.id);

          return (
            <div
              key={gate.id}
              className={`exit-gate ${isOpen ? 'open' : isPowered ? 'powered' : ''}`}
              style={{
                position: 'absolute',
                left: gate.bounds.x1,
                top: gate.bounds.y1,
                width: gate.bounds.x2 - gate.bounds.x1,
                height: gate.bounds.y2 - gate.bounds.y1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                background: isOpen ? 'rgba(34, 197, 94, 0.3)' : undefined,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: isOpen ? 'var(--exit-green)' : isPowered ? 'var(--amber)' : '#4a3020', fontWeight: 900, letterSpacing: '1px' }}>
                {isOpen ? '🚪 OPEN' : isPowered ? 'POWERED' : '🔒'}
              </span>
            </div>
          );
        })}

        {/* ── Fog of War (Talent only when alive) ───────────────────────── */}
        {!showFullMap && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 15 }}>
            <defs>
              <mask id="viewcone-mask">
                <rect width={mapWidth} height={mapHeight} fill="#ffffff" />
                <path d={viewConeSvgPath} fill="#000000" />
                <circle cx={localPos.x} cy={localPos.y} r="35" fill="#000000" />
              </mask>
            </defs>

            <rect width={mapWidth} height={mapHeight} fill="rgba(8, 6, 4, 0.93)" mask="url(#viewcone-mask)" />
            <path d={viewConeSvgPath} fill="none" stroke="rgba(196, 163, 90, 0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
        )}

        {/* ── Director aura overlay ──────────────────────────────────── */}
        {isDirector && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 14, border: '3px solid rgba(139, 0, 0, 0.15)', borderRadius: '4px', boxShadow: 'inset 0 0 30px rgba(139, 0, 0, 0.08)' }} />
        )}

        {/* ── Player Avatars ─────────────────────────────────────────── */}
        {Object.entries(allPositions).map(([pid, pos]) => {
          const idx = playerIndex(pid);
          const pidIsDirector = pid === directorId;
          const suitColour = getSuitColour(idx, pidIsDirector);
          const isLocal = pid === localPlayerId;
          const name = nameOf(pid);
          const status = playerStatuses[pid] || 'alive';
          const isCrouched = crouchStates[pid];

          if (!showFullMap && !isLocal) {
            const vis = checkPlayerVisibility(localPos, smoothAngle, pos);
            if (!vis.inCone) {
              if (vis.inPeripheral) {
                return (
                  <div
                    key={`blip-${pid}`}
                    className="absolute pointer-events-none flex items-center justify-center"
                    style={{
                      left: pos.x - 5,
                      top: pos.y - 5,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: pidIsDirector ? 'rgba(139, 0, 0, 0.8)' : 'rgba(196, 163, 90, 0.6)',
                      boxShadow: pidIsDirector ? '0 0 12px var(--blood-glow)' : '0 0 8px var(--amber-glow)',
                      zIndex: 22,
                      animation: 'pulseGlow 1s infinite',
                    }}
                  />
                );
              }
              return null;
            }
          }

          if (status === 'wrapped' || status === 'escaped' || status === 'crew') return null;

          const isDowned = status === 'downed' || status === 'on-mark';
          const isCarried = status === 'carried';

          // ── DIRECTOR MODEL ──────────────────────────────────────────────
          if (pidIsDirector) {
            return (
              <div
                key={pid}
                className="absolute pointer-events-none flex flex-col items-center"
                style={{
                  left: pos.x - 18,
                  top: pos.y - 18,
                  width: 36,
                  height: 36,
                  zIndex: isLocal ? 38 : 28,
                }}
              >
                {/* Red Aura Floor Shadow */}
                <div
                  style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(220, 38, 38, 0.4) 0%, rgba(139, 0, 0, 0.1) 70%, transparent 100%)',
                    animation: 'pulseGlow 1.5s infinite',
                    filter: 'blur(3px)',
                  }}
                />

                {/* Director Character SVG */}
                <svg width="36" height="36" viewBox="0 0 36 36" className="relative z-10">
                  {/* Broad Shoulder Trenchcoat */}
                  <path d="M6 18 Q18 8 30 18 L28 32 Q18 35 8 32 Z" fill="#140a08" stroke="#8b0000" strokeWidth="2" />
                  {/* Coat Collar & Red Lapels */}
                  <path d="M12 14 L18 22 L24 14" fill="none" stroke="#dc2626" strokeWidth="1.5" />
                  {/* Director Head / Fedora Cap */}
                  <circle cx="18" cy="14" r="7" fill="#0e0806" stroke="#8b0000" strokeWidth="1.5" />
                  {/* Glowing 1987 Camera Lens Eye */}
                  <circle cx="18" cy="13" r="3" fill="#dc2626" />
                  <circle cx="18" cy="13" r="1.5" fill="#ffffff" />
                  {/* Viewfinder Hand Camera */}
                  <rect x="25" y="16" width="6" height="5" rx="1" fill="#3a1a1a" stroke="#dc2626" strokeWidth="0.8" />
                </svg>

                {/* Director Label */}
                <div
                  style={{
                    position: 'absolute',
                    top: 37,
                    background: 'rgba(20, 0, 0, 0.95)',
                    border: '1.5px solid var(--blood-red-bright)',
                    borderRadius: 3,
                    padding: '1px 6px',
                    fontSize: 7,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 900,
                    color: 'var(--blood-red-bright)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 0 10px var(--blood-glow)',
                  }}
                >
                  🎬 {name}
                </div>
              </div>
            );
          }

          // ── TALENT MODEL ────────────────────────────────────────────────
          const avatarSize = isDowned ? 20 : isCrouched ? 22 : 28;

          return (
            <div
              key={pid}
              className="absolute pointer-events-none flex flex-col items-center"
              style={{
                left: pos.x - 14,
                top: pos.y - 14,
                width: 28,
                height: 28,
                zIndex: isLocal ? 35 : 24,
                opacity: isCrouched ? 0.75 : 1,
                transform: isDowned ? 'rotate(90deg)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Floor Shadow */}
              <div
                style={{
                  position: 'absolute',
                  inset: isDowned ? 0 : 2,
                  borderRadius: '50%',
                  background: isDowned
                    ? 'radial-gradient(circle, rgba(220, 38, 38, 0.3) 0%, transparent 70%)'
                    : `radial-gradient(circle, ${suitColour}33 0%, transparent 70%)`,
                  filter: 'blur(3px)',
                }}
              />

              {/* Talent Character SVG */}
              <svg width="28" height="28" viewBox="0 0 28 28" className="relative z-10">
                {/* Backpack / Script Bag */}
                <rect x="8" y="18" width="12" height="5" rx="1.5" fill="#1a1510" stroke="#3a2f20" strokeWidth="1" />
                {/* Torso / Jacket */}
                <path d="M5 14 Q14 8 23 14 L21 23 Q14 25 7 23 Z" fill={suitColour} stroke={isLocal ? '#ffffff' : '#000000'} strokeWidth="1.5" />
                {/* Belt / Strap */}
                <line x1="8" y1="18" x2="20" y2="18" stroke="#000000" strokeWidth="1" />
                {/* Head */}
                <circle cx="14" cy="12" r="6" fill="#2a2018" stroke={isLocal ? '#ffffff' : suitColour} strokeWidth="1.5" />
                {/* Visor / Hair Cap */}
                <path d="M10 10 Q14 6 18 10" fill="none" stroke={isLocal ? '#ffffff' : suitColour} strokeWidth="2" strokeLinecap="round" />
                {/* Face Eyes */}
                <circle cx="12" cy="12" r="1" fill="#ffffff" />
                <circle cx="16" cy="12" r="1" fill="#ffffff" />
              </svg>

              {/* Label */}
              <div
                style={{
                  position: 'absolute',
                  top: 29,
                  background: 'rgba(8, 6, 4, 0.92)',
                  border: `1.5px solid ${isLocal ? suitColour : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: 3,
                  padding: '1px 5px',
                  fontSize: 7,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: isLocal ? suitColour : '#d4cfc4',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.9)',
                }}
              >
                {isCarried ? '📦 CARRIED ' : isDowned ? '⛓️ DOWN ' : ''}{name}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontSize: 8,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          background: 'rgba(8, 6, 4, 0.9)',
          border: '1px solid var(--panel-border)',
          padding: '4px 8px',
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        {isDirector ? '[WASD] Hunt · [E] Pick Up / Mount' : '[WASD] Move · [HOLD E] Interact / Rescue · [SHIFT] Crouch'}
      </div>
    </div>
  );
}
