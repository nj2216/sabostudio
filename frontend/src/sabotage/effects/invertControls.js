/**
 * Invert Controls — flips X and Y axes on pointer/drag events.
 * Category: input
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const invertControls = {
  id: 'invert-controls',
  name: 'Invert Controls',
  description: 'X and Y pointer axes are flipped inside this station.',
  category: 'input',
  durationMs: 10_000,

  apply(stationEl) {
    // CSS transform trick: scale(-1,-1) on the station's interactive layer
    // visually mirrors the element AND inverts pointer coordinates naturally.
    const prev = stationEl.style.transform;
    stationEl.style.transform = `${prev} scale(-1,-1)`;
    stationEl.style.transition = 'transform 0.2s ease';

    return () => {
      stationEl.style.transform = prev;
      stationEl.style.transition = '';
    };
  },
};
