/**
 * frontend/src/lib/stationSwap.js
 *
 * Station swap engine for Sabotage Studio — implements "The Swap" core loop.
 *
 * Every 15–20 s the host broadcasts a `station-swap` event that reassigns
 * who sees which station on their screen (viewingStationId) and whose inputs
 * land on which station (controllingStationId). The two can differ — that's
 * the whole joke.
 *
 * Message types (added to peer.js comment block):
 *   'station-swap' — host -> all peers
 *     payload: {
 *       mapping:     { [playerId]: { viewingStationId, controllingStationId } },
 *       swapAt:      number  (Date.now() timestamp when the swap fired),
 *       nextSwapIn:  number  (ms until next swap, 15 000–20 000)
 *     }
 *
 * Host exports:
 *   startSwapScheduler(broadcast, playerIds, stationIds)
 *     → { stop, triggerNow }
 *
 * React hook (host + guests):
 *   useStationSwap(conn, localPlayerId, hostMapping?)
 *     → { viewingStationId, controllingStationId, countdown }
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const SWAP_MIN_MS = 15_000;
const SWAP_MAX_MS = 20_000;

// ---------------------------------------------------------------------------
// Mapping generator
// ---------------------------------------------------------------------------

/**
 * Build a swap mapping where every player views one station and controls a
 * *different* one (rotated by 1 in a shuffled list).
 *
 * @param {string[]} playerIds
 * @param {string[]} stationIds
 * @returns {Record<string, { viewingStationId: string, controllingStationId: string }>}
 */
function generateSwapMapping(playerIds, stationIds) {
  if (playerIds.length === 0 || stationIds.length === 0) return {};

  // Shuffle stations so the assignment is random each swap
  const shuffled = [...stationIds].sort(() => Math.random() - 0.5);
  const n = shuffled.length;
  const mapping = {};

  playerIds.forEach((pid, i) => {
    const viewIdx = i % n;
    // Rotate by 1 — guarantees view ≠ control as long as n > 1
    const controlIdx = (i + 1) % n;
    mapping[pid] = {
      viewingStationId: shuffled[viewIdx],
      controllingStationId: shuffled[controlIdx],
    };
  });

  return mapping;
}

// ---------------------------------------------------------------------------
// Host-side scheduler
// ---------------------------------------------------------------------------

/**
 * Start the swap timer on the host.  Broadcasts an initial mapping immediately
 * and then fires new mappings every 15–20 s.
 *
 * @param {Function} broadcast  — host's broadcast fn from setupHost()
 * @param {string[]} playerIds  — all player IDs in the session
 * @param {string[]} stationIds — all active station IDs
 * @returns {{ stop: Function, triggerNow: Function }}
 */
export function startSwapScheduler(broadcast, playerIds, stationIds) {
  let timeoutId = null;

  function nextDelay() {
    return SWAP_MIN_MS + Math.random() * (SWAP_MAX_MS - SWAP_MIN_MS);
  }

  function fireSwap() {
    const delay = nextDelay();
    const mapping = generateSwapMapping(playerIds, stationIds);
    broadcast({
      type: 'station-swap',
      payload: {
        mapping,
        swapAt: Date.now(),
        nextSwapIn: delay,
      },
    });
    timeoutId = setTimeout(fireSwap, delay);
    return { mapping, delay };
  }

  // Broadcast the initial assignment immediately so all peers start with a
  // consistent view/control split before the first timed swap.
  fireSwap();

  function stop() {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  /** Trigger a swap outside the normal schedule (Early Swap sabotage). */
  function triggerNow() {
    clearTimeout(timeoutId);
    fireSwap();
  }

  return { stop, triggerNow };
}

// ---------------------------------------------------------------------------
// React hook — useStationSwap
// ---------------------------------------------------------------------------

/**
 * Subscribes to 'station-swap' messages on a PeerJS DataConnection and returns
 * the local player's current viewing station, controlling station, and a live
 * countdown (ms) to the next scheduled swap.
 *
 * Pass `conn = null` for the host (who does not receive its own broadcasts).
 * In that case provide `hostMapping` with the initial mapping the host generated.
 *
 * @param {import('peerjs').DataConnection | null} conn
 * @param {string} localPlayerId
 * @param {{ viewingStationId: string, controllingStationId: string } | null} [hostMapping]
 * @returns {{
 *   viewingStationId: string | null,
 *   controllingStationId: string | null,
 *   countdown: number,
 *   setHostMapping: (m: { viewingStationId: string, controllingStationId: string }) => void
 * }}
 */
export function useStationSwap(conn, localPlayerId, hostMapping = null) {
  const [viewingStationId, setViewingStationId] = useState(
    hostMapping?.viewingStationId ?? null,
  );
  const [controllingStationId, setControllingStationId] = useState(
    hostMapping?.controllingStationId ?? null,
  );
  const [countdown, setCountdown] = useState(0);

  const nextSwapAtRef = useRef(null);
  const countdownRef = useRef(null);

  /** Allow host to push an updated mapping from the scheduler. */
  const setHostMapping = useCallback((m) => {
    if (!m) return;
    setViewingStationId(m.viewingStationId);
    setControllingStationId(m.controllingStationId);
  }, []);

  function startCountdown(nextSwapIn) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    nextSwapAtRef.current = Date.now() + nextSwapIn;
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, nextSwapAtRef.current - Date.now());
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 250);
  }

  // Apply initial host mapping once
  useEffect(() => {
    if (hostMapping) {
      setViewingStationId(hostMapping.viewingStationId);
      setControllingStationId(hostMapping.controllingStationId);
    }
  }, [hostMapping]);

  // Listen for station-swap events from host (guest path)
  useEffect(() => {
    if (!conn) return;

    function handleData(raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }
      if (msg.type !== 'station-swap') return;

      const { mapping, nextSwapIn } = msg.payload ?? {};
      const mine = mapping?.[localPlayerId];
      if (mine) {
        setViewingStationId(mine.viewingStationId);
        setControllingStationId(mine.controllingStationId);
      }
      if (typeof nextSwapIn === 'number') startCountdown(nextSwapIn);
    }

    conn.on('data', handleData);
    return () => {
      conn.off('data', handleData);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [conn, localPlayerId]);

  return { viewingStationId, controllingStationId, countdown, setHostMapping };
}
