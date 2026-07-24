/**
 * frontend/src/map/useTaskZoneTrigger.js
 *
 * Detects when the local player's position overlaps a task room's interact zone
 * and the player presses the interact key (E or Enter).
 *
 * Usage:
 *   const { nearbyRoom } = useTaskZoneTrigger({
 *     localPos,
 *     rooms,
 *     onEnterRoom: (roomId, stationId) => { ... },
 *   });
 */

import { useEffect, useRef, useState } from 'react';

/** Radius around the player's centre that counts as "inside" an interact zone. */
const PLAYER_RADIUS = 10;

/**
 * Returns true if a circle at (px, py) with given radius overlaps a rect.
 * @param {number} px
 * @param {number} py
 * @param {number} radius
 * @param {{x1:number,y1:number,x2:number,y2:number}} rect
 */
function circleOverlapsRect(px, py, radius, rect) {
  const nearX = Math.max(rect.x1, Math.min(px, rect.x2));
  const nearY = Math.max(rect.y1, Math.min(py, rect.y2));
  const dx = px - nearX;
  const dy = py - nearY;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * @param {{
 *   localPos:     { x: number, y: number },
 *   rooms:        import('../map/lotLayout.json').rooms,
 *   onEnterRoom:  (roomId: string, stationId: string | null) => void,
 * }} options
 * @returns {{ nearbyRoom: object | null }}
 */
export function useTaskZoneTrigger({ localPos, rooms, onEnterRoom }) {
  const [nearbyRoom, setNearbyRoom] = useState(null);
  const onEnterRef = useRef(onEnterRoom);

  useEffect(() => { onEnterRef.current = onEnterRoom; }, [onEnterRoom]);

  // Find which room (if any) the player is currently near
  useEffect(() => {
    const { x, y } = localPos;
    let found = null;

    for (const room of rooms) {
      if (!room.interactZone) continue;
      if (circleOverlapsRect(x, y, PLAYER_RADIUS, room.interactZone)) {
        found = room;
        break;
      }
    }

    setNearbyRoom(found);
  }, [localPos, rooms]);

  // Listen for the interact key (E or Enter)
  useEffect(() => {
    function handleKey(e) {
      if (e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return;
      if (!nearbyRoom) return;
      onEnterRef.current?.(nearbyRoom.id, nearbyRoom.stationId);
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nearbyRoom]);

  return { nearbyRoom };
}
