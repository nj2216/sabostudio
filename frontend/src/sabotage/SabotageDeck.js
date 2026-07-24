/**
 * frontend/src/sabotage/SabotageDeck.js
 *
 * Sabotage Engine — handles points-based sabotage execution and network broadcast.
 *
 * All players can earn points by completing tasks and spend points in the Sabotage Console.
 *
 * Message types:
 *   'buy-sabotage'     — guest -> host (payload: { buyerId, effectId, targetPlayerId, stationId })
 *   'sabotage-apply'   — host -> all peers (payload: { effectId, targetPlayerId, stationId, durationMs, buyerName })
 *   'control-swap'     — host -> all peers (payload: { playerAId, playerBId, playerAName, playerBName, durationMs })
 *   'studio-crisis'    — host -> all peers (payload: { type })
 */

import { useEffect, useRef } from 'react';
import { getEffect } from './SabotageEffect.js';

// ---------------------------------------------------------------------------
// Host Sabotage Handler
// ---------------------------------------------------------------------------

/**
 * Creates a SabotageBroadcaster instance for the host.
 *
 * @param {Function} broadcast — host broadcast fn
 * @param {Function} getScores — fn returning current scores map { [playerId]: number }
 * @param {Function} setScores — fn updating scores map
 * @param {Array} players      — list of current players
 * @returns {{
 *   fireSabotage: (buyerId: string, effectId: string, targetPlayerId: string, stationId?: string) => boolean,
 *   crisis: (type: string) => void,
 * }}
 */
export function createSabotageBroadcaster(broadcast, getScores, setScores, players = []) {
  /**
   * Execute a sabotage purchase.
   * Returns true if successful (buyer had enough points).
   */
  function fireSabotage(buyerId, effectId, targetPlayerId, stationId = 'any') {
    const effect = getEffect(effectId);
    if (!effect) return false;

    const scores = getScores();
    const currentScore = scores[buyerId] ?? 0;
    const cost = effect.cost ?? 50;

    if (currentScore < cost) {
      return false; // Not enough points
    }

    // Deduct points
    const updatedScores = { ...scores, [buyerId]: currentScore - cost };
    setScores(updatedScores);
    broadcast({ type: 'score-update', payload: { scores: updatedScores } });

    const buyerName = players.find((p) => p.id === buyerId)?.name ?? 'Someone';

    // Handle Control Swap special sabotage
    if (effectId === 'controlSwap' || effectId === 'earlySwap') {
      let targetId = targetPlayerId;
      // If targetId not provided or invalid, pick random opponent
      if (!targetId || targetId === buyerId) {
        const opponents = players.filter((p) => p.id !== buyerId);
        targetId = opponents[Math.floor(Math.random() * opponents.length)]?.id;
      }
      if (!targetId) return false;

      const playerA = players.find((p) => p.id === buyerId);
      const playerB = players.find((p) => p.id === targetId);

      broadcast({
        type: 'control-swap',
        payload: {
          playerAId: buyerId,
          playerBId: targetId,
          playerAName: playerA?.name ?? 'Player A',
          playerBName: playerB?.name ?? 'Player B',
          durationMs: effect.durationMs || 15000,
        },
      });
      return true;
    }

    // Standard sabotage effect
    broadcast({
      type: 'sabotage-apply',
      payload: {
        effectId,
        buyerId,
        buyerName,
        targetPlayerId,
        stationId,
        durationMs: effect.durationMs,
      },
    });

    return true;
  }

  function crisis(type) {
    broadcast({ type: 'studio-crisis', payload: { type } });
  }

  return { fireSabotage, crisis };
}

// ---------------------------------------------------------------------------
// Client-side hook — useSabotageReceiver
// ---------------------------------------------------------------------------

/**
 * React hook that listens for sabotage messages on client connection.
 *
 * @param {import('peerjs').DataConnection | null} conn
 * @param {string} localPlayerId
 * @param {React.RefObject<HTMLElement>} stationElRef
 * @param {{
 *   onControlSwap?: (data: { playerAId: string, playerBId: string, playerAName: string, playerBName: string, durationMs: number }) => void,
 *   onFreeze?: (frozen: boolean) => void,
 *   onCrisis?: (type: string) => void,
 *   onSabotageApplied?: (payload: any) => void,
 * }} [callbacks]
 */
export function useSabotageReceiver(conn, localPlayerId, stationElRef, callbacks = {}) {
  const activeEffects = useRef(new Map());

  useEffect(() => {
    if (!conn) return;

    function handleData(raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }

      if (msg.type === 'sabotage-apply') {
        const { effectId, targetPlayerId, durationMs } = msg.payload ?? {};
        callbacks.onSabotageApplied?.(msg.payload);

        if (targetPlayerId !== localPlayerId) return;

        const el = stationElRef?.current;
        const effect = getEffect(effectId);
        if (!effect) return;

        const existing = activeEffects.current.get(effectId);
        if (existing) existing();

        const ctx = {
          stationId: msg.payload.stationId,
          targetPlayerId,
          onFreeze: callbacks.onFreeze,
        };

        const cleanup = effect.apply(el, ctx);
        activeEffects.current.set(effectId, cleanup);

        if (durationMs > 0) {
          setTimeout(() => {
            const fn = activeEffects.current.get(effectId);
            if (fn) {
              fn();
              activeEffects.current.delete(effectId);
            }
          }, durationMs);
        }
      }

      if (msg.type === 'control-swap') {
        callbacks.onControlSwap?.(msg.payload);
      }

      if (msg.type === 'studio-crisis') {
        callbacks.onCrisis?.(msg.payload?.type);
      }
    }

    conn.on('data', handleData);
    const effects = activeEffects.current;
    return () => {
      conn.off('data', handleData);
      effects.forEach((fn) => fn());
      effects.clear();
    };
  }, [conn, localPlayerId, stationElRef, callbacks]);
}

