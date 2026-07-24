import { useEffect, useRef } from 'react';
import { getEffect } from './SabotageEffect.js';

/**
 * Applies a sabotage effect on a target DOM element (station overlay or game stage).
 */
export function applySabotageEffectLocally(payload, getTargetEl, activeEffectsMap, callbacks = {}) {
  const { effectId, targetPlayerId, durationMs } = payload ?? {};
  const effect = getEffect(effectId);
  if (!effect) return;

  const targetEl = getTargetEl?.() || document.body;
  if (!targetEl) return;

  // Run cleanup if the same effect is already active
  const existing = activeEffectsMap.get(effect.id);
  if (existing) {
    try { existing(); } catch {}
  }

  const ctx = {
    stationId: payload.stationId,
    targetPlayerId,
    onFreeze: callbacks.onFreeze,
  };

  try {
    const cleanup = effect.apply(targetEl, ctx);
    if (typeof cleanup === 'function') {
      activeEffectsMap.set(effect.id, cleanup);

      if (durationMs > 0) {
        setTimeout(() => {
          const fn = activeEffectsMap.get(effect.id);
          if (fn) {
            try { fn(); } catch {}
            activeEffectsMap.delete(effect.id);
          }
        }, durationMs);
      }
    }
  } catch (err) {
    console.error('[SabotageDeck] Error applying effect:', effect.id, err);
  }
}

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
 * @param {Function} [onLocalSabotageApply] — callback when host is target of sabotage
 * @param {Function} [onLocalControlSwap]    — callback when control swap triggers
 * @returns {{
 *   fireSabotage: (buyerId: string, effectId: string, targetPlayerId: string, stationId?: string) => boolean,
 *   crisis: (type: string) => void,
 * }}
 */
export function createSabotageBroadcaster(
  broadcast,
  getScores,
  setScores,
  players = [],
  onLocalSabotageApply = null,
  onLocalControlSwap = null
) {
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
      if (!targetId || targetId === buyerId) {
        const opponents = players.filter((p) => p.id !== buyerId);
        targetId = opponents[Math.floor(Math.random() * opponents.length)]?.id;
      }
      if (!targetId) return false;

      const playerA = players.find((p) => p.id === buyerId);
      const playerB = players.find((p) => p.id === targetId);

      const swapPayload = {
        playerAId: buyerId,
        playerBId: targetId,
        playerAName: playerA?.name ?? 'Player A',
        playerBName: playerB?.name ?? 'Player B',
        durationMs: effect.durationMs || 15000,
      };

      broadcast({ type: 'control-swap', payload: swapPayload });
      if (onLocalControlSwap) onLocalControlSwap(swapPayload);
      return true;
    }

    // Standard sabotage effect
    const payload = {
      effectId: effect.id,
      buyerId,
      buyerName,
      targetPlayerId,
      stationId,
      durationMs: effect.durationMs,
    };

    broadcast({ type: 'sabotage-apply', payload });
    if (onLocalSabotageApply) onLocalSabotageApply(payload);

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
 * @param {Function} getTargetEl
 * @param {{
 *   onControlSwap?: (data: any) => void,
 *   onFreeze?: (frozen: boolean) => void,
 *   onCrisis?: (type: string) => void,
 *   onSabotageApplied?: (payload: any) => void,
 * }} [callbacks]
 */
export function useSabotageReceiver(conn, localPlayerId, getTargetEl, callbacks = {}) {
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
        const { targetPlayerId } = msg.payload ?? {};
        callbacks.onSabotageApplied?.(msg.payload);

        if (targetPlayerId === localPlayerId) {
          applySabotageEffectLocally(msg.payload, getTargetEl, activeEffects.current, callbacks);
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
      effects.forEach((fn) => { try { fn(); } catch {} });
      effects.clear();
    };
  }, [conn, localPlayerId, getTargetEl, callbacks]);
}


