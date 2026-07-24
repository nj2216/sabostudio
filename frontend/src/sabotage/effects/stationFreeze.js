/**
 * Station Freeze — locks all pointer and keyboard events for 5 s.
 * Category: structural
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const stationFreeze = {
  id: 'station-freeze',
  name: 'Station Freeze',
  description: 'This station locks up for 5 seconds. Nothing works.',
  category: 'structural',
  durationMs: 5_000,

  apply(stationEl, ctx) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(100,180,255,0.15);
      backdrop-filter: blur(2px);
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: all;
      cursor: not-allowed;
    `;

    const label = document.createElement('p');
    label.textContent = '🧊 FROZEN';
    label.style.cssText = `
      color: #93c5fd;
      font-size: 1.5rem;
      font-weight: 900;
      letter-spacing: 0.2em;
      text-shadow: 0 0 12px rgba(147,197,253,0.8);
    `;
    overlay.appendChild(label);

    stationEl.style.position = 'relative';
    stationEl.appendChild(overlay);

    // Block all pointer events to the station
    function stopEvent(e) {
      e.stopPropagation();
      e.preventDefault();
    }
    stationEl.addEventListener('pointerdown', stopEvent, { capture: true });
    stationEl.addEventListener('keydown', stopEvent, { capture: true });

    if (ctx?.onFreeze) ctx.onFreeze(true);

    return () => {
      overlay.remove();
      stationEl.removeEventListener('pointerdown', stopEvent, { capture: true });
      stationEl.removeEventListener('keydown', stopEvent, { capture: true });
      if (ctx?.onFreeze) ctx.onFreeze(false);
    };
  },
};
