/**
 * frontend/src/lib/playerMovement.js
 *
 * Player movement for Final Cut — "The Lot" free-roam map.
 *
 * Design:
 *   - Client predicts movement locally for instant visual response.
 *   - Guest sends 'player-move' to host at ~10 Hz.
 *   - Host receives guest moves, merges with own position, and rebroadcasts
 *     'position-update' to all peers — standard host-relay pattern.
 *
 * Final Cut additions:
 *   - Role-based speed (Director ~115%, Talent 100%, crouch 50%, downed 25%)
 *   - Crouch/stealth mode (Shift key) — Talent only
 *   - Down state — downed Talent crawl slowly
 *
 * Message types:
 *   'player-move'      — guest -> host,  payload: { x, y, crouching }
 *   'position-update'  — host -> all,    payload: { positions, crouchStates }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendMessage } from './peer.js';

/** How often the movement tick fires (ms). */
const TICK_MS = 80; // ~12.5 Hz

/** Base pixels per tick. */
const SPEED_TALENT = 4;
const SPEED_DIRECTOR = 4.6; // ~115% of Talent
const SPEED_CROUCH = 2;     // 50% of Talent
const SPEED_DOWNED = 1;     // 25% of Talent

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isWalkable(px, py, walkableRects) {
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
 *   role:            'director' | 'talent',
 *   isHost:          boolean,
 *   conn:            import('peerjs').DataConnection | null,
 *   initialPos:      { x: number, y: number },
 *   walkableRects:   Array<{x1:number,y1:number,x2:number,y2:number}>,
 *   playerStatus?:   'alive' | 'downed' | 'carried' | 'on-mark' | 'wrapped' | 'escaped' | 'crew',
 * }} options
 */
export function usePlayerMovement({ playerId, role = 'talent', isHost, conn, initialPos, walkableRects, playerStatus = 'alive' }) {
  const [allPositions, setAllPositions] = useState({ [playerId]: initialPos });
  const [facingAngle, setFacingAngle] = useState(Math.PI / 2);
  const [isCrouching, setIsCrouching] = useState(false);
  const [crouchStates, setCrouchStates] = useState({});

  const facingAngleRef = useRef(Math.PI / 2);
  const allPositionsRef = useRef({ [playerId]: initialPos });
  const broadcastRef = useRef(null);
  const keysRef = useRef(new Set());
  const lastSentRef = useRef(0);
  const walkableRef = useRef(walkableRects);
  const crouchRef = useRef(false);
  const statusRef = useRef(playerStatus);

  useEffect(() => { walkableRef.current = walkableRects; }, [walkableRects]);
  useEffect(() => { statusRef.current = playerStatus; }, [playerStatus]);

  const setBroadcast = useCallback((fn) => { broadcastRef.current = fn; }, []);

  // Keyboard input listeners
  useEffect(() => {
    const onDown = (e) => {
      keysRef.current.add(e.key);
      // Shift for crouch (Talent only)
      if ((e.key === 'Shift') && role === 'talent') {
        crouchRef.current = true;
        setIsCrouching(true);
      }
    };
    const onUp = (e) => {
      keysRef.current.delete(e.key);
      if (e.key === 'Shift') {
        crouchRef.current = false;
        setIsCrouching(false);
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [role]);

  // Movement + send tick
  useEffect(() => {
    const id = setInterval(() => {
      const status = statusRef.current;
      // Cannot move if wrapped, escaped, crew, carried, or on-mark
      if (['wrapped', 'escaped', 'crew', 'carried', 'on-mark'].includes(status)) return;

      const keys = keysRef.current;
      const pos = allPositionsRef.current[playerId] || initialPos;
      const { x, y } = pos;

      const up = keys.has('ArrowUp') || keys.has('w') || keys.has('W');
      const down = keys.has('ArrowDown') || keys.has('s') || keys.has('S');
      const left = keys.has('ArrowLeft') || keys.has('a') || keys.has('A');
      const right = keys.has('ArrowRight') || keys.has('d') || keys.has('D');

      if (!up && !down && !left && !right) return;

      // Determine speed based on role and state
      let speed;
      if (status === 'downed') {
        speed = SPEED_DOWNED;
      } else if (crouchRef.current && role === 'talent') {
        speed = SPEED_CROUCH;
      } else if (role === 'director') {
        speed = SPEED_DIRECTOR;
      } else {
        speed = SPEED_TALENT;
      }

      const dx = (right ? speed : 0) - (left ? speed : 0);
      const dy = (down ? speed : 0) - (up ? speed : 0);

      if (dx !== 0 || dy !== 0) {
        const angle = Math.atan2(dy, dx);
        facingAngleRef.current = angle;
        setFacingAngle(angle);
      }

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
      const updated = { ...allPositionsRef.current, [playerId]: newPos };
      allPositionsRef.current = updated;
      setAllPositions(updated);

      // Throttled network send
      const now = Date.now();
      if (now - lastSentRef.current < TICK_MS) return;
      lastSentRef.current = now;

      if (isHost && broadcastRef.current) {
        broadcastRef.current({
          type: 'position-update',
          payload: { positions: updated, crouchStates: { [playerId]: crouchRef.current } },
        });
      } else if (!isHost && conn) {
        sendMessage(conn, 'player-move', { pos: newPos, crouching: crouchRef.current });
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [playerId, role, isHost, conn, initialPos]);

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
      if (msg.payload?.crouchStates) {
        setCrouchStates(msg.payload.crouchStates);
      }
    }

    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [isHost, conn]);

  /**
   * Host: call this when a 'player-move' message arrives from a guest.
   */
  const receiveGuestMove = useCallback(
    (senderId, pos, crouching = false) => {
      const updated = { ...allPositionsRef.current, [senderId]: pos };
      allPositionsRef.current = updated;
      setAllPositions(updated);
      if (crouching !== undefined) {
        setCrouchStates((prev) => ({ ...prev, [senderId]: crouching }));
      }
      if (broadcastRef.current) {
        broadcastRef.current({
          type: 'position-update',
          payload: { positions: updated, crouchStates: { ...crouchStates, [senderId]: crouching } },
        });
      }
    },
    [crouchStates],
  );

  const localPos = allPositions[playerId] || initialPos;

  return {
    localPos,
    allPositions,
    facingAngle,
    isCrouching,
    crouchStates,
    setBroadcast,
    receiveGuestMove,
  };
}
