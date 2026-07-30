/**
 * frontend/src/sabotage/DirectorAbilities.js
 *
 * Director-only ability broadcasting system for Final Cut.
 * Replaces the old symmetric SabotageDeck.js.
 *
 * All abilities are cooldown-gated (no point cost).
 * The host relays ability effects to target Talent clients.
 */

import { useEffect, useRef } from 'react';
import { getAbility } from './DirectorKit.js';

// ── Apply effect on target DOM element ──────────────────────────────────────

export function applyAbilityLocally(payload, getTargetEl, activeEffectsMap, callbacks = {}) {
  const { effectId, durationMs } = payload ?? {};
  const ability = getAbility(effectId);
  if (!ability || !ability.apply) return;

  const targetEl = getTargetEl?.() || document.body;
  if (!targetEl) return;

  // Clean up existing instance of same effect
  const existing = activeEffectsMap.get(ability.id);
  if (existing) {
    try { existing(); } catch {}
  }

  const ctx = {
    stationId: payload.stationId,
    targetPlayerId: payload.targetPlayerId,
    onFreeze: callbacks.onFreeze,
    onTaskRewind: callbacks.onTaskRewind,
  };

  try {
    const cleanup = ability.apply(targetEl, ctx);
    if (typeof cleanup === 'function') {
      activeEffectsMap.set(ability.id, cleanup);

      const dur = durationMs ?? ability.durationMs;
      if (dur > 0) {
        setTimeout(() => {
          const fn = activeEffectsMap.get(ability.id);
          if (fn) {
            try { fn(); } catch {}
            activeEffectsMap.delete(ability.id);
          }
        }, dur);
      }
    }
  } catch (err) {
    console.error('[DirectorAbilities] Error applying ability:', ability.id, err);
  }
}

// ── Director-side broadcaster (host) ────────────────────────────────────────

/**
 * Creates the Director's ability broadcaster.
 * Called by the host (who relays to target Talent via PeerJS).
 *
 * @param {Function} broadcast — host broadcast fn
 * @param {Function} onLocalAbilityApply — callback when Director targets a local player
 * @returns {{
 *   useAbility: (directorId: string, effectId: string, targetPlayerId: string, stationId?: string) => { ok: boolean, reason?: string },
 *   getCooldownRemaining: (effectId: string) => number,
 *   getAllCooldowns: () => Record<string, number>,
 * }}
 */
export function createDirectorBroadcaster(broadcast, onLocalAbilityApply = null) {
  /** @type {Map<string, number>} effectId → timestamp of last use */
  const cooldowns = new Map();

  /**
   * Attempt to use a Director ability.
   * Returns { ok: true } or { ok: false, reason: string }.
   */
  function useAbility(directorId, effectId, targetPlayerId, stationId = 'any') {
    const ability = getAbility(effectId);
    if (!ability) return { ok: false, reason: 'Unknown ability' };

    // Check cooldown
    const lastUsed = cooldowns.get(ability.id) ?? 0;
    const cooldownMs = ability.cooldownMs ?? 30_000;
    const now = Date.now();
    const remaining = Math.max(0, cooldownMs - (now - lastUsed));

    if (remaining > 0) {
      return { ok: false, reason: `On cooldown (${Math.ceil(remaining / 1000)}s)` };
    }

    // Set cooldown
    cooldowns.set(ability.id, now);

    // Build payload
    const payload = {
      effectId: ability.id,
      directorId,
      targetPlayerId,
      stationId,
      durationMs: ability.durationMs,
    };

    // Broadcast to all clients (target checks happen client-side)
    broadcast({ type: 'director-ability', payload });

    // Apply locally if Director is also running on this client
    if (onLocalAbilityApply) onLocalAbilityApply(payload);

    return { ok: true };
  }

  function getCooldownRemaining(effectId) {
    const ability = getAbility(effectId);
    if (!ability) return 0;
    const lastUsed = cooldowns.get(ability.id) ?? 0;
    const cooldownMs = ability.cooldownMs ?? 30_000;
    return Math.max(0, cooldownMs - (Date.now() - lastUsed));
  }

  function getAllCooldowns() {
    const result = {};
    cooldowns.forEach((lastUsed, id) => {
      const ability = getAbility(id);
      if (!ability) return;
      const cooldownMs = ability.cooldownMs ?? 30_000;
      result[id] = Math.max(0, cooldownMs - (Date.now() - lastUsed));
    });
    return result;
  }

  return { useAbility, getCooldownRemaining, getAllCooldowns };
}

// ── Talent-side receiver hook ───────────────────────────────────────────────

/**
 * React hook that listens for Director ability messages on the guest connection.
 *
 * @param {import('peerjs').DataConnection | null} conn
 * @param {string} localPlayerId
 * @param {Function} getTargetEl
 * @param {{
 *   onAbilityApplied?: (payload: any) => void,
 *   onBleedThrough?: (payload: any) => void,
 *   onFreeze?: (frozen: boolean) => void,
 *   onTaskRewind?: () => void,
 * }} [callbacks]
 */
export function useAbilityReceiver(conn, localPlayerId, getTargetEl, callbacks = {}) {
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

      if (msg.type === 'director-ability') {
        const { targetPlayerId } = msg.payload ?? {};
        callbacks.onAbilityApplied?.(msg.payload);

        if (targetPlayerId === localPlayerId) {
          applyAbilityLocally(msg.payload, getTargetEl, activeEffects.current, callbacks);
        }
      }

      if (msg.type === 'bleed-through-activate') {
        callbacks.onBleedThrough?.(msg.payload);
        // Bleed-through affects all Talent in the zone, not just one target
        applyAbilityLocally(
          { ...msg.payload, effectId: 'bleed-through' },
          getTargetEl,
          activeEffects.current,
          callbacks
        );
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
