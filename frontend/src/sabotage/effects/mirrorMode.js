/**
 * Mirror Mode — horizontally flips the station's DOM via CSS transform.
 * Hit-testing stays on the real (un-mirrored) coordinates — pure chaos.
 * Category: input
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const mirrorMode = {
  id: 'mirror-mode',
  name: 'Mirror Mode',
  description: 'The station is horizontally mirrored. Your clicks still land where you pointed — before the flip.',
  category: 'input',
  durationMs: 10_000,

  apply(stationEl) {
    const prev = stationEl.style.transform;
    stationEl.style.transform = `${prev} scaleX(-1)`.trim();
    stationEl.style.transition = 'transform 0.2s ease';

    return () => {
      stationEl.style.transform = prev;
      stationEl.style.transition = '';
    };
  },
};
