/**
 * frontend/src/map/useTaskZoneTrigger.js
 *
 * Detects when local player is near interactable elements:
 *  - Station rooms
 *  - Chalk Marks
 *  - Exit Gates
 *  - Downed / On-mark players (for revive / rescue / pickup)
 */

import { useEffect, useRef, useState } from 'react';

const INTERACT_RADIUS = 25; // Proximity radius for interaction

function circleOverlapsRect(px, py, radius, rect) {
  const nearX = Math.max(rect.x1, Math.min(px, rect.x2));
  const nearY = Math.max(rect.y1, Math.min(py, rect.y2));
  const dx = px - nearX;
  const dy = py - nearY;
  return dx * dx + dy * dy <= radius * radius;
}

function distSq(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

export function useTaskZoneTrigger({
  localPos,
  rooms = [],
  marks = [],
  gates = [],
  allPositions = {},
  playerStatuses = {},
  localPlayerId,
  isDirector = false,
}) {
  const [nearbyRoom, setNearbyRoom] = useState(null);
  const [nearbyMark, setNearbyMark] = useState(null);
  const [nearbyGate, setNearbyGate] = useState(null);
  const [nearbyTargetPlayer, setNearbyTargetPlayer] = useState(null); // downed / on-mark player to interact with

  useEffect(() => {
    const { x, y } = localPos;

    // 1. Check Station Rooms
    let foundRoom = null;
    for (const room of rooms) {
      if (!room.interactZone) continue;
      if (circleOverlapsRect(x, y, INTERACT_RADIUS, room.interactZone)) {
        foundRoom = room;
        break;
      }
    }
    setNearbyRoom(foundRoom);

    // 2. Check Chalk Marks
    let foundMark = null;
    for (const mark of marks) {
      if (distSq(x, y, mark.x, mark.y) <= INTERACT_RADIUS * INTERACT_RADIUS * 2) {
        foundMark = mark;
        break;
      }
    }
    setNearbyMark(foundMark);

    // 3. Check Exit Gates
    let foundGate = null;
    for (const gate of gates) {
      if (gate.bounds && circleOverlapsRect(x, y, INTERACT_RADIUS, gate.bounds)) {
        foundGate = gate;
        break;
      } else if (distSq(x, y, gate.x, gate.y) <= INTERACT_RADIUS * INTERACT_RADIUS * 2) {
        foundGate = gate;
        break;
      }
    }
    setNearbyGate(foundGate);

    // 4. Check Nearby Players for Interaction
    let foundPlayer = null;
    Object.entries(allPositions).forEach(([pid, pos]) => {
      if (pid === localPlayerId) return;
      const status = playerStatuses[pid];

      if (isDirector) {
        // Director can interact with downed players to pick them up
        if (status === 'downed' && distSq(x, y, pos.x, pos.y) <= INTERACT_RADIUS * INTERACT_RADIUS * 2) {
          foundPlayer = { id: pid, status, action: 'pickup' };
        }
      } else {
        // Talent can interact with downed players (revive) or on-mark players (rescue)
        if ((status === 'downed' || status === 'on-mark') && distSq(x, y, pos.x, pos.y) <= INTERACT_RADIUS * INTERACT_RADIUS * 3) {
          foundPlayer = { id: pid, status, action: status === 'downed' ? 'revive' : 'rescue' };
        }
      }
    });
    setNearbyTargetPlayer(foundPlayer);

  }, [localPos, rooms, marks, gates, allPositions, playerStatuses, localPlayerId, isDirector]);

  return { nearbyRoom, nearbyMark, nearbyGate, nearbyTargetPlayer };
}
