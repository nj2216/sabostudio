/**
 * Sticky Drag — adds 200–400 ms of artificial input lag to all pointer events.
 * Category: input
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const stickyDrag = {
  id: 'sticky-drag',
  name: 'Sticky Drag',
  description: 'Your inputs are delayed by up to 400 ms. Everything feels like mud.',
  category: 'input',
  durationMs: 10_000,

  apply(stationEl) {
    const LAG = 200 + Math.random() * 200; // 200–400 ms

    function makeDelayed(type) {
      function handler(e) {
        e.stopPropagation();
        setTimeout(() => {
          const delayed = new e.constructor(type, e);
          stationEl.dispatchEvent(delayed);
        }, LAG);
      }
      return handler;
    }

    const handlers = ['click', 'pointerdown', 'pointerup'].map((type) => {
      const h = makeDelayed(type);
      stationEl.addEventListener(type, h, { capture: true });
      return { type, h };
    });

    return () => {
      handlers.forEach(({ type, h }) =>
        stationEl.removeEventListener(type, h, { capture: true }),
      );
    };
  },
};
