/**
 * frontend/src/sabotage/SabotageDeck.js
 *
 * Host-side sabotage broadcaster.
 *
 * The Director (host) holds a limited number of Director Tokens per round.
 * Spending a token broadcasts a 'sabotage-apply' message to all peers
 * targeting a specific player's station. Clients apply the effect locally.
 *
 * Message types:
 *   'sabotage-apply'   — host -> all peers
 *     payload: { effectId, targetPlayerId, stationId, durationMs }
 *   'sabotage-clear'   — host -> all peers  (optional early clear)
 *     payload: { effectId, targetPlayerId }
 *   'studio-crisis'    — host -> all peers
 *     payload: { type: 'power-outage' | 'fire-alarm' | 'take-too-many' }
 *
 * React hook for clients:
 *   useSabotageReceiver(conn, localPlayerId, stationElRef)
 *     Listens for sabotage-apply and applies effects to the station element.
 */

import { useEffect, useRef } from 'react';
import { getEffect } from './SabotageEffect.js';

// ---------------------------------------------------------------------------
// Director Tokens
// ---------------------------------------------------------------------------

export const DIRECTOR_TOKENS_PER_ROUND = 3;

// ---------------------------------------------------------------------------
// Host-side broadcaster
// ---------------------------------------------------------------------------

/**
 * Creates a SabotageDeck instance for the host.
 *
 * @param {Function} broadcast — host broadcast fn from setupHost()
 * @param {number}   [tokensPerRound]
 * @returns {{
 *   tokensLeft: number,
 *   fire:      (effectId: string, targetPlayerId: string, stationId: string) => boolean,
 *   crisis:    (type: 'power-outage' | 'fire-alarm' | 'take-too-many') => void,
 *   reset:     () => void,
 * }}
 */
export function createSabotageDeck(broadcast, tokensPerRound = DIRECTOR_TOKENS_PER_ROUND) {
  let tokensLeft = tokensPerRound;

  /**
   * Fire a sabotage effect at a target player.
   * Returns false if out of tokens.
   */
  function fire(effectId, targetPlayerId, stationId) {
    const effect = getEffect(effectId);
    if (!effect) {
      console.warn('[SabotageDeck] Unknown effect:', effectId);
      return false;
    }
    if (tokensLeft <= 0) return false;

    tokensLeft--;
    broadcast({
      type: 'sabotage-apply',
      payload: {
        effectId,
        targetPlayerId,
        stationId,
        durationMs: effect.durationMs,
      },
    });
    return true;
  }

  /** Broadcast a Studio Crisis co-op event to all players. */
  function crisis(type) {
    broadcast({ type: 'studio-crisis', payload: { type } });
  }

  /** Refill tokens (call at round start). */
  function reset() {
    tokensLeft = tokensPerRound;
  }

  return {
    get tokensLeft() { return tokensLeft; },
    fire,
    crisis,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Client-side hook — useSabotageReceiver
// ---------------------------------------------------------------------------

/**
 * React hook that listens for 'sabotage-apply' messages and applies effects
 * to the local player's station DOM element.
 *
 * @param {import('peerjs').DataConnection | null} conn  — null for host
 * @param {string}   localPlayerId
 * @param {React.RefObject<HTMLElement>} stationElRef    — ref to the station container
 * @param {{
 *   onEarlySwap?: Function,
 *   onFreeze?: (frozen: boolean) => void,
 *   onCrisis?: (type: string) => void,
 * }} [callbacks]
 */
export function useSabotageReceiver(conn, localPlayerId, stationElRef, callbacks = {}) {
  // Track active cleanups by effectId so we can clear them early if needed
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
        if (targetPlayerId !== localPlayerId) return;

        const el = stationElRef.current;
        if (!el) return;

        const effect = getEffect(effectId);
        if (!effect) return;

        // Run cleanup if the same effect is already active
        const existing = activeEffects.current.get(effectId);
        if (existing) existing();

        const ctx = {
          stationId: msg.payload.stationId,
          targetPlayerId,
          onEarlySwap: callbacks.onEarlySwap,
          onFreeze: callbacks.onFreeze,
        };

        const cleanup = effect.apply(el, ctx);
        activeEffects.current.set(effectId, cleanup);

        // Auto-clear after duration
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

      if (msg.type === 'sabotage-clear') {
        const { effectId, targetPlayerId } = msg.payload ?? {};
        if (targetPlayerId !== localPlayerId) return;
        const fn = activeEffects.current.get(effectId);
        if (fn) {
          fn();
          activeEffects.current.delete(effectId);
        }
      }

      if (msg.type === 'studio-crisis') {
        callbacks.onCrisis?.(msg.payload?.type);
      }
    }

    conn.on('data', handleData);
    const effects = activeEffects.current;
    return () => {
      conn.off('data', handleData);
      // Clean up all active effects on unmount
      effects.forEach((fn) => fn());
      effects.clear();
    };
  }, [conn, localPlayerId, stationElRef, callbacks]);
}
