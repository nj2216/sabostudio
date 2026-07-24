/**
 * Wrong Colors — shifts hue-rotate(180deg) so "press the red button" is ambiguous.
 * Category: visual
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const wrongColors = {
  id: 'wrong-colors',
  name: 'Wrong Colors',
  description: 'All colours shift 180°. Red is now cyan. Good luck.',
  category: 'visual',
  durationMs: 12_000,

  apply(stationEl) {
    const prev = stationEl.style.filter;
    stationEl.style.filter = `${prev} hue-rotate(180deg)`.trim();
    stationEl.style.transition = 'filter 0.3s ease';

    return () => {
      stationEl.style.filter = prev;
      stationEl.style.transition = '';
    };
  },
};
