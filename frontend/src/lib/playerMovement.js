/**
 * frontend/src/lib/playerMovement.js
 *
 * Player movement for Sabotage Studio — "The Lot" free-roam map.
 *
 * Design:
 *   - Client predicts movement locally for instant visual response.
 *   - Guest sends 'player-move' to host at ~10 Hz.
 *   - Host receives guest moves, merges with own position, and rebroadcasts
 *     'position-update' to all peers — standard host-relay pattern.
 *
 * Message types:
 *   'player-move'      — guest -> host,  payload: { x: number, y: number }
 *   'position-update'  — host -> all,    payload: { positions: { [playerId]: { x, y } } }
 *
 * Usage:
 *   const { localPos, allPositions, receiveGuestMove, setBroadcast } =
 *     usePlayerMovement({ playerId, isHost, conn, initialPos, walkableRects });
 *
 *   // Host only — call once broadcast is available:
 *   setBroadcast(broadcastFn);
 *
 *   // Host only — wire into setupHost's onMessage handler:
 *   if (msg.type === 'player-move') receiveGuestMove(senderId, msg.payload);
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendMessage } from './peer.js';

/** How often the movement tick fires (ms). Also the network-send interval. */
const TICK_MS = 80; // ~12.5 Hz — smooth enough, low enough for P2P

/** Pixels the player moves per tick while a key is held. */
const SPEED = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the point (px, py) is inside at least one walkable rect.
 *
 * @param {number} px
 * @param {number} py
 * @param {Array<{x1:number,y1:number,x2:number,y2:number}>} walkableRects
 */
function isWalkable(px, py, walkableRects) {
  return walkableRects.some(
    (r) => px >= r.x1 && px <= r.x2 && py >= r.y1 && py <= r.y2,
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   playerId:        string,
 *   controlTargetId?: string, // If control swapped, target player ID being controlled
 *   isHost:          boolean,
 *   conn:            import('peerjs').DataConnection | null,  // null for host
 *   initialPos:      { x: number, y: number },
 *   walkableRects:   Array<{x1:number,y1:number,x2:number,y2:number}>,
 * }} options
 * @returns {{
 *   localPos:         { x: number, y: number },
 *   allPositions:     Record<string, { x: number, y: number }>,
 *   setBroadcast:     (fn: Function) => void,
 *   receiveGuestMove: (targetId: string, pos: { x: number, y: number }) => void,
 * }}
 */
export function usePlayerMovement({ playerId, controlTargetId, isHost, conn, initialPos, walkableRects }) {
  const activeTargetId = controlTargetId || playerId;
  const activeTargetRef = useRef(activeTargetId);
  useEffect(() => { activeTargetRef.current = activeTargetId; }, [activeTargetId]);

  const [allPositions, setAllPositions] = useState({ [playerId]: initialPos });

  // Mutable refs — avoid stale closures in the interval
  const allPositionsRef = useRef({ [playerId]: initialPos });
  const broadcastRef = useRef(null);
  const keysRef = useRef(new Set());
  const lastSentRef = useRef(0);
  const walkableRef = useRef(walkableRects);

  useEffect(() => { walkableRef.current = walkableRects; }, [walkableRects]);

  /** Host calls this once its broadcast fn is ready. */
  const setBroadcast = useCallback((fn) => { broadcastRef.current = fn; }, []);

  // Keyboard input listeners
  useEffect(() => {
    const onDown = (e) => keysRef.current.add(e.key);
    const onUp = (e) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Movement + send tick
  useEffect(() => {
    const id = setInterval(() => {
      const targetId = activeTargetRef.current;
      const keys = keysRef.current;
      const targetPos = allPositionsRef.current[targetId] || initialPos;
      const { x, y } = targetPos;

      const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
      const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
      const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
      const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');

      if (!up && !down && !left && !right) return;

      const dx = (right ? SPEED : 0) - (left ? SPEED : 0);
      const dy = (down ? SPEED : 0) - (up ? SPEED : 0);

      let nx = x;
      let ny = y;

      if (isWalkable(x + dx, y + dy, walkableRef.current)) {
        nx = x + dx;
        ny = y + dy;
      } else if (dx !== 0 && isWalkable(x + dx, y, walkableRef.current)) {
        nx = x + dx;
      } else if (dy !== 0 && isWalkable(x, y + dy, walkableRef.current)) {
        ny = y + dy;
      } else {
        return; // fully blocked
      }

      const newPos = { x: nx, y: ny };
      const updated = { ...allPositionsRef.current, [targetId]: newPos };
      allPositionsRef.current = updated;
      setAllPositions(updated);

      // Throttled network send
      const now = Date.now();
      if (now - lastSentRef.current < TICK_MS) return;
      lastSentRef.current = now;

      if (isHost && broadcastRef.current) {
        broadcastRef.current({
          type: 'position-update',
          payload: { positions: updated },
        });
      } else if (!isHost && conn) {
        sendMessage(conn, 'player-move', { targetId, pos: newPos });
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [playerId, isHost, conn, initialPos]);

  // Guest: receive 'position-update' from host
  useEffect(() => {
    if (isHost || !conn) return;

    function handleData(raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }
      if (msg.type !== 'position-update') return;
      const positions = msg.payload?.positions;
      if (!positions) return;
      allPositionsRef.current = positions;
      setAllPositions(positions);
    }

    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [isHost, conn]);

  /**
   * Host: call this when a 'player-move' message arrives from a guest.
   * Updates the host's canonical position table and rebroadcasts.
   */
  const receiveGuestMove = useCallback(
    (targetId, pos) => {
      const updated = { ...allPositionsRef.current, [targetId]: pos };
      allPositionsRef.current = updated;
      setAllPositions(updated);
      if (broadcastRef.current) {
        broadcastRef.current({
          type: 'position-update',
          payload: { positions: updated },
        });
      }
    },
    [],
  );

  const localPos = allPositions[playerId] || initialPos;

  return { localPos, allPositions, setBroadcast, receiveGuestMove };
}

