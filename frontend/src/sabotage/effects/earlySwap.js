/**
 * Early Swap — triggers a station-swap outside the normal schedule.
 * Category: structural
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const earlySwap = {
  id: 'early-swap',
  name: 'Early Swap',
  description: 'Triggers an immediate station swap. No warning.',
  category: 'structural',
  durationMs: 0, // instant — fires and is done

  apply(_stationEl, ctx) {
    // Notify the host scheduler to fire immediately
    if (ctx?.onEarlySwap) {
      ctx.onEarlySwap();
    }

    // No visual overlay — the swap itself is the effect
    return () => {};
  },
};
