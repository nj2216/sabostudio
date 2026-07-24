/**
 * Night Vision — inverts to green-on-black, desaturates everything else.
 * Category: visual
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const nightVision = {
  id: 'night-vision',
  name: 'Night Vision',
  description: 'Your screen switches to eerie green-on-black night vision.',
  category: 'visual',
  durationMs: 10_000,

  apply(stationEl) {
    const prev = stationEl.style.filter;
    stationEl.style.filter = 'invert(1) sepia(1) saturate(3) hue-rotate(80deg)';
    stationEl.style.transition = 'filter 0.4s ease';

    return () => {
      stationEl.style.filter = prev;
      stationEl.style.transition = '';
    };
  },
};
