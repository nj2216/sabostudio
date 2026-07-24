/**
 * frontend/src/map/LotCanvas.jsx
 *
 * 2D Top-Down Canvas renderer for "The Lot" map.
 * Enhanced with 100° Raycasted Viewcone System (Wall Occlusion), smooth viewcone turning,
 * soft fog dissolve, peripheral motion blips, and 2D bean avatars.
 */

import { useEffect, useState } from 'react';
import layout from './lotLayout.json';

const { mapWidth, mapHeight, rooms, corridors } = layout;

/** Fog-of-war reveal radius during Blackout (px). */
const BLACKOUT_RADIUS = 90;

/** Viewcone maximum vision distance (px). */
const VIEWCONE_RADIUS = 230;

/** Palette for player suits — vibrant cyan, purple, emerald, gold, crimson, etc. */
const SUIT_COLOURS = [
  '#a855f7', // Purple
  '#00f3ff', // Cyan
  '#00ff9d', // Emerald
  '#ffb703', // Amber
  '#ff0055', // Crimson
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
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

function getSuitColour(index) {
  return SUIT_COLOURS[index % SUIT_COLOURS.length];
}

/**
 * Traces 50 rays in a 100° FOV arc from player position.
 * Rays stop when hitting non-walkable wall boundaries.
 */
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

/**
 * Checks if a target player is visible in the viewcone (accounting for angle + wall occlusion).
 */
function checkPlayerVisibility(localPos, smoothAngle, targetPos) {
  const dx = targetPos.x - localPos.x;
  const dy = targetPos.y - localPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > VIEWCONE_RADIUS) return { inCone: false, inPeripheral: false };
  if (dist < 30) return { inCone: true, inPeripheral: true }; // Immediate proximity reveal

  // Angle check
  const angleToTarget = Math.atan2(dy, dx);
  let diff = angleToTarget - smoothAngle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;

  const inAngleArc = Math.abs(diff) <= (53 * Math.PI) / 180;
  if (!inAngleArc) {
    return { inCone: false, inPeripheral: dist <= 165 };
  }

  // Raycast wall occlusion check
  const steps = Math.ceil(dist / 6);
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 1; i <= steps; i++) {
    const rx = localPos.x + stepX * i;
    const ry = localPos.y + stepY * i;
    if (!isPointWalkable(rx, ry)) {
      return { inCone: false, inPeripheral: dist <= 165 }; // Blocked by wall!
    }
  }

  return { inCone: true, inPeripheral: true };
}

export default function LotCanvas({
  allPositions = {},
  localPlayerId,
  players = [],
  nearbyRoom = null,
  lockedRooms = [],
  blackout = false,
  ventSealed = false,
  controllingStationId = null,
  facingAngle = Math.PI / 2,
  interactProgress = 0,
  isInteracting = false,
  isDirectorSpectating = false,
}) {
  const playerIndex = (id) => players.findIndex((p) => p.id === id);
  const nameOf = (id) => players.find((p) => p.id === id)?.name ?? id;

  const localPos = allPositions[localPlayerId] ?? { x: mapWidth / 2, y: mapHeight / 2 };

  // ── Smooth Viewcone Turning Animation Loop ──────────────────────────────
  const [smoothAngle, setSmoothAngle] = useState(facingAngle);

  useEffect(() => {
    let animId;
    const updateAngle = () => {
      setSmoothAngle((prev) => {
        let diff = facingAngle - prev;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        if (Math.abs(diff) < 0.005) return facingAngle;
        return prev + diff * 0.16; // Smooth turning interpolation
      });
      animId = requestAnimationFrame(updateAngle);
    };
    animId = requestAnimationFrame(updateAngle);
    return () => cancelAnimationFrame(animId);
  }, [facingAngle]);

  // ── Camera setup (16:9 aspect ratio) ─────────────────────────────────────
  const VIEWPORT_WIDTH = 640;
  const VIEWPORT_HEIGHT = 360;
  const SCALE = 1.6;

  let tx = localPos.x - (VIEWPORT_WIDTH / 2) / SCALE;
  let ty = localPos.y - (VIEWPORT_HEIGHT / 2) / SCALE;

  const maxTx = mapWidth - VIEWPORT_WIDTH / SCALE;
  const maxTy = mapHeight - VIEWPORT_HEIGHT / SCALE;

  tx = Math.max(0, Math.min(tx, maxTx));
  ty = Math.max(0, Math.min(ty, maxTy));

  // Compute Raycasted Wall-Occluded Viewcone Polygon SVG Path
  const polygonPoints = computeRaycastPolygon(localPos, smoothAngle);
  const viewConeSvgPath = polygonPoints.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '') + ' Z';

  return (
    <div className="relative overflow-hidden w-full h-full select-none bg-[#03060a]">
      <div
        className="absolute top-0 left-0"
        style={{
          width: mapWidth,
          height: mapHeight,
          transformOrigin: '0 0',
          transform: `scale(${SCALE}) translate(${-tx}px, ${-ty}px)`,
        }}
      >
        {/* ── Corridors (with gridlines & dark outlines) ────────────────────── */}
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
                linear-gradient(rgba(0, 243, 255, 0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 243, 255, 0.04) 1px, transparent 1px),
                linear-gradient(135deg, #101622 0%, #0a0e17 100%)
              `,
              backgroundSize: '16px 16px, 16px 16px, 100% 100%',
              border: '2px solid #090e17',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
            }}
          />
        ))}

        {/* ── Rooms (Bold 2D Vector Outlines & Door Hazard Stripes) ─────────── */}
        {rooms.map((room) => {
          const isLocked = lockedRooms.includes(room.id);
          const isVentDisabled = ventSealed && room.isVent;
          const isNearby = nearbyRoom?.id === room.id;
          const roomWidth = room.bounds.x2 - room.bounds.x1;
          const roomHeight = room.bounds.y2 - room.bounds.y1;

          return (
            <div
              key={room.id}
              className={`absolute flex flex-col items-center justify-between p-1.5 transition-all duration-200 ${isNearby ? 'animate-pulse' : ''}`}
              style={{
                left: room.bounds.x1,
                top: room.bounds.y1,
                width: roomWidth,
                height: roomHeight,
                background: isLocked
                  ? `
                    repeating-linear-gradient(-45deg, rgba(255,0,85,0.15) 0, rgba(255,0,85,0.15) 10px, transparent 10px, transparent 20px),
                    linear-gradient(135deg, #2b0b14 0%, #150409 100%)
                  `
                  : `
                    linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(135deg, #161e2e 0%, #0d131f 100%)
                  `,
                backgroundSize: '100% 100%, 20px 20px, 20px 20px, 100% 100%',
                border: isNearby
                  ? '3px solid #ffb703'
                  : isLocked
                  ? '3px solid #ff0055'
                  : '2.5px solid #1e293b',
                outline: '1.5px solid #000000',
                borderRadius: 6,
                boxShadow: isNearby
                  ? '0 0 24px rgba(255, 183, 3, 0.6), inset 0 0 16px rgba(255, 183, 3, 0.2)'
                  : isLocked
                  ? '0 0 16px rgba(255, 0, 85, 0.4)'
                  : '0 4px 12px rgba(0,0,0,0.6), inset 0 0 12px rgba(0, 243, 255, 0.04)',
              }}
            >
              {/* Doorway Hazard Stripes Bar */}
              <div
                className="absolute bottom-0 inset-x-2 h-1 pointer-events-none"
                style={{
                  background: 'repeating-linear-gradient(45deg, #ffb703 0, #ffb703 6px, #000000 6px, #000000 12px)',
                  opacity: 0.7,
                }}
              />

              {/* Room Header Label */}
              <div className="flex items-center gap-1.5 z-10">
                <span
                  className="font-head font-extrabold uppercase tracking-wider text-center pointer-events-none drop-shadow-md"
                  style={{
                    fontSize: 8.5,
                    color: isLocked ? '#ff0055' : isNearby ? '#ffb703' : '#94a3b8',
                  }}
                >
                  {isLocked ? '🔒 LOCKDOWN' : isVentDisabled ? '⛔ SEALED' : room.label}
                </span>
              </div>

              {/* Interactive Terminal Desk / Console Vector Graphics */}
              {room.stationId && (
                <div className="relative flex flex-col items-center my-auto z-10">
                  <div
                    className="relative flex items-center justify-center rounded-sm transition-transform"
                    style={{
                      width: 32,
                      height: 20,
                      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                      border: '2px solid #334155',
                      outline: '1px solid #000000',
                      boxShadow: isNearby ? '0 0 14px rgba(0,243,255,0.7)' : '0 2px 6px rgba(0,0,0,0.8)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xs"
                      style={{
                        width: 22,
                        height: 12,
                        background: isNearby ? '#00f3ff' : '#0284c7',
                        boxShadow: isNearby ? '0 0 8px #00f3ff' : '0 0 4px #0284c7',
                        border: '1px solid #ffffff',
                      }}
                    >
                      <span className="font-mono text-[7px] text-black font-black tracking-tighter">
                        {isNearby ? '>_E' : '::'}
                      </span>
                    </div>
                  </div>

                  {/* Radial Hold-Progress Ring Indicator on Interact */}
                  {isNearby && (
                    <div className="absolute -top-9 flex flex-col items-center z-20">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-8 h-8 -rotate-90">
                          <circle
                            cx="16"
                            cy="16"
                            r="13"
                            className="stroke-slate-800"
                            strokeWidth="3"
                            fill="transparent"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="13"
                            className="stroke-amber-400 transition-all duration-75"
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 13}
                            strokeDashoffset={2 * Math.PI * 13 * (1 - interactProgress)}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute font-mono font-black text-[7.5px] text-amber-300 drop-shadow">
                          {isInteracting ? `${Math.round(interactProgress * 100)}%` : 'HOLD E'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vent Hatch Graphic */}
              {room.isVent && (
                <div className="relative flex flex-col items-center my-auto z-10">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle, #334155 0%, #0f172a 100%)',
                      border: '2px solid #64748b',
                      outline: '1px solid #000',
                      boxShadow: isNearby ? '0 0 12px #a855f7' : 'none',
                    }}
                  >
                    <span className="text-[10px]">🌀</span>
                  </div>
                  {isNearby && !isVentDisabled && (
                    <div className="absolute -top-6 font-mono font-black text-[8px] bg-purple-500 text-white px-2 py-0.5 rounded shadow-[0_0_10px_rgba(168,85,247,0.8)] border border-black animate-bounce whitespace-nowrap z-20">
                      [E] VENT
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Raycasted 100° FOV Viewcone & Soft Fog Layer (Wall Occlusion) ────── */}
        {!blackout && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 15 }}
          >
            <defs>
              <mask id="viewcone-mask">
                <rect width={mapWidth} height={mapHeight} fill="#ffffff" />
                <path d={viewConeSvgPath} fill="#000000" />
                <circle cx={localPos.x} cy={localPos.y} r="35" fill="#000000" />
              </mask>
            </defs>

            {/* Dark Fog mask outside local player's raycasted FOV polygon */}
            <rect
              width={mapWidth}
              height={mapHeight}
              fill="rgba(4, 7, 13, 0.92)"
              mask="url(#viewcone-mask)"
            />

            {/* Glowing boundary path for raycasted FOV cone */}
            <path
              d={viewConeSvgPath}
              fill="none"
              stroke="rgba(0, 243, 255, 0.4)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
        )}

        {/* ── 2D Stylized Bean/Capsule Avatars (With Wall Occlusion Check) ────── */}
        {Object.entries(allPositions).map(([pid, pos]) => {
          const idx = playerIndex(pid);
          const suitColour = getSuitColour(idx);
          const isLocal = pid === localPlayerId;
          const name = nameOf(pid);

          // Raycast Visibility Check
          const vis = checkPlayerVisibility(localPos, smoothAngle, pos);

          if (blackout) {
            const dx = pos.x - localPos.x;
            const dy = pos.y - localPos.y;
            if (!isLocal && Math.sqrt(dx * dx + dy * dy) > BLACKOUT_RADIUS) return null;
          }

          // If opponent is occluded by walls or outside viewcone:
          if (!isLocal && !vis.inCone) {
            if (vis.inPeripheral) {
              return (
                <div
                  key={`blip-${pid}`}
                  className="absolute pointer-events-none flex items-center justify-center animate-ping"
                  style={{
                    left: pos.x - 6,
                    top: pos.y - 6,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'rgba(0, 243, 255, 0.8)',
                    boxShadow: '0 0 10px #00f3ff',
                    zIndex: 22,
                  }}
                />
              );
            }
            return null; // Hidden completely by walls or range
          }

          return (
            <div
              key={pid}
              className="absolute pointer-events-none"
              style={{
                left: pos.x - 12,
                top: pos.y - 16,
                width: 24,
                height: 32,
                zIndex: isLocal ? 35 : 25,
              }}
            >
              {/* Outer Aura Glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '16px 16px 12px 12px',
                  background: suitColour,
                  opacity: isLocal ? 0.4 : 0.15,
                  filter: 'blur(5px)',
                }}
              />

              {/* 2D Cyber-Bean / Capsule Avatar Container */}
              <div className="relative w-full h-full flex flex-col items-center justify-between">
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: -3,
                    width: 5,
                    height: 14,
                    borderRadius: '3px 0 0 3px',
                    background: suitColour,
                    border: '1.5px solid #000000',
                    borderRight: 'none',
                  }}
                />

                <div
                  style={{
                    width: 20,
                    height: 25,
                    borderRadius: '12px 12px 8px 8px',
                    background: `linear-gradient(180deg, ${suitColour} 0%, #000000 160%)`,
                    border: isLocal ? '2px solid #ffffff' : '2px solid #000000',
                    outline: isLocal ? '1.5px solid #00f3ff' : '1px solid #000000',
                    boxShadow: isLocal ? `0 0 12px ${suitColour}` : '0 2px 6px rgba(0,0,0,0.8)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 3,
                      width: 13,
                      height: 8,
                      borderRadius: '5px',
                      background: 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                      border: '1.5px solid #ffffff',
                      boxShadow: 'inset 0 0 4px #00f3ff, 0 0 6px rgba(0, 243, 255, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="font-mono text-[7px] text-white font-black tracking-tighter drop-shadow">
                      {isLocal ? '^ _ ^' : '● _ ●'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between w-3.5 -mt-1 z-10">
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '0 0 3px 3px',
                      background: suitColour,
                      border: '1.5px solid #000000',
                    }}
                  />
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '0 0 3px 3px',
                      background: suitColour,
                      border: '1.5px solid #000000',
                    }}
                  />
                </div>
              </div>

              {/* Name Tag Pill Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 33,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(3, 6, 12, 0.9)',
                  border: `1.5px solid ${isLocal ? '#00f3ff' : 'rgba(255,255,255,0.3)'}`,
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontSize: 8,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: isLocal ? '#00f3ff' : '#ffffff',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.9)',
                }}
              >
                {isLocal ? `★ ${name}` : name}
              </div>

              {/* Target Guidance Arrow */}
              {isLocal && controllingStationId && (() => {
                const targetRoom = rooms.find((r) => r.stationId === controllingStationId);
                if (!targetRoom) return null;

                const targetX = targetRoom.bounds.x1 + (targetRoom.bounds.x2 - targetRoom.bounds.x1) / 2;
                const targetY = targetRoom.bounds.y1 + (targetRoom.bounds.y2 - targetRoom.bounds.y1) / 2;

                const dx = targetX - pos.x;
                const dy = targetY - pos.y;
                const angle = Math.atan2(dy, dx);
                const dist = 22;
                const arrowX = Math.cos(angle) * dist + 12;
                const arrowY = Math.sin(angle) * dist + 16;

                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: arrowX,
                      top: arrowY,
                      width: 0,
                      height: 0,
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: '8px solid #ffb703',
                      transform: `translate(-50%, -50%) rotate(${angle}rad)`,
                      transformOrigin: 'center center',
                      filter: 'drop-shadow(0 0 6px rgba(255, 183, 3, 0.9))',
                    }}
                  />
                );
              })()}
            </div>
          );
        })}

        {/* ── Blackout Fog-of-War ─────────────────────────────────────── */}
        {blackout && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle ${BLACKOUT_RADIUS}px at ${localPos.x}px ${localPos.y}px, transparent 55%, rgba(2, 4, 8, 0.98) 100%)`,
              zIndex: 40,
            }}
          />
        )}
      </div>

      {/* ── Director Eyes On You Indicator ─────────────────────────────────── */}
      {isDirectorSpectating && (
        <div
          className="absolute top-2 left-2 z-50 bg-rose-950/90 border border-rose-500/80 text-rose-300 font-mono text-[10px] font-bold px-3 py-1 rounded flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,85,0.5)] animate-pulse"
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>👁️ DIRECTOR SPECTATING YOU</span>
        </div>
      )}

      {/* ── Sealed Vents Warning Overlay ───────────────────────────────────── */}
      {ventSealed && (
        <div
          className="absolute bottom-0 left-0 right-0 text-center text-xs font-mono font-bold py-1.5 shadow-[0_-4px_16px_rgba(255,0,85,0.5)]"
          style={{ background: 'rgba(50, 5, 18, 0.92)', color: '#ff0055', zIndex: 45 }}
        >
          ⛔ STUDIO LOCKDOWN: VENTS SEALED BY DIRECTOR
        </div>
      )}

      {/* ── Controls Guide Legend ───────────────────────────────────────────── */}
      <div
        className="absolute top-2 right-2 text-xs font-mono text-cyan-300 bg-slate-950/90 border border-cyan-500/40 px-2.5 py-1 rounded pointer-events-none shadow-lg"
        style={{ fontSize: 9, zIndex: 50 }}
      >
        [WASD / ARROWS] Move · [HOLD E] Interact
      </div>
    </div>
  );
}
