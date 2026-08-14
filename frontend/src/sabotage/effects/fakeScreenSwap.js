/**
 * frontend/src/sabotage/effects/fakeScreenSwap.js
 * Fake Screen Swap — Triggers full screen-swap red siren alarm & swap animation,
 * but leaves controls unchanged (psychological warfare!).
 */

export const fakeScreenSwap = {
  id: 'fakeScreenSwap',
  name: 'Fake Screen Swap',
  description: 'Triggers red sirens and CONTROL SWAP alert without actually swapping!',
  category: 'social',
  cost: 70,
  durationMs: 5000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 100;
      background: rgba(220, 38, 38, 0.35);
      border: 6px solid #ef4444;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      animation: pulse 0.4s infinite alternate;
    `;

    const container = document.createElement('div');
    container.style.cssText = 'background: #0f172a; border: 2px solid #ef4444; border-radius: 12px; padding: 20px 30px; text-align: center; box-shadow: 0 0 30px rgba(239,68,68,0.8);';

    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 3rem; display: block; margin-bottom: 8px;';
    iconSpan.className = 'animate-bounce';
    iconSpan.textContent = '🔄';
    container.appendChild(iconSpan);

    const titleH2 = document.createElement('h2');
    titleH2.style.cssText = 'color: #ef4444; font-family: monospace; font-weight: 900; font-size: 1.2rem; margin: 0 0 6px; text-transform: uppercase;';
    titleH2.textContent = '⚠️ CONTROL SWAP INITIATED!';
    container.appendChild(titleH2);

    const descP = document.createElement('p');
    descP.style.cssText = 'color: #cbd5e1; font-family: monospace; font-size: 0.8rem; margin: 0;';
    descP.textContent = 'YOU ARE NOW CONTROLLING OPPONENT VIEWPORT!';
    container.appendChild(descP);

    overlay.appendChild(container);

    el.style.position = 'relative';
    el.appendChild(overlay);

    return () => {
      overlay.remove();
    };
  },
};
