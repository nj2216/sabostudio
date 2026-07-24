/**
 * Blindfold — covers the viewer's screen with a full black overlay.
 * The person controlling the station must give verbal instructions.
 * Category: social
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const blindfold = {
  id: 'blindfold',
  name: 'Blindfold',
  description: 'Your screen goes dark. Someone else must narrate what to do.',
  category: 'social',
  durationMs: 12_000,

  apply(stationEl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: #000;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const label = document.createElement('p');
    label.textContent = '🙈 BLINDFOLDED — listen to your partner!';
    label.style.cssText = `
      color: #fff;
      font-size: 1rem;
      font-weight: bold;
      text-align: center;
      padding: 1rem;
      opacity: 0.6;
    `;
    overlay.appendChild(label);

    stationEl.style.position = 'relative';
    stationEl.appendChild(overlay);

    return () => overlay.remove();
  },
};
