/**
 * frontend/src/sabotage/effects/butterFingers.js
 * Butter Fingers (Greasy Screen) — Applies heavy physics momentum to pointer/cursor.
 * Cursor drifts smoothly like it's on ice for 8 seconds.
 */

export const butterFingers = {
  id: 'butterFingers',
  name: 'Butter Fingers',
  description: 'Applies icy slippery momentum to your cursor for 8 seconds!',
  category: 'input',
  cost: 50,
  durationMs: 8000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 90;
      background: radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 80%);
    `;

    const label = document.createElement('div');
    label.textContent = '🧈 BUTTER FINGERS — ICY CURSOR DRIFT!';
    label.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      color: #facc15;
      font-family: monospace;
      font-weight: 900;
      font-size: 11px;
      background: rgba(0,0,0,0.8);
      padding: 4px 10px;
      border: 1px solid #facc15;
      border-radius: 4px;
    `;
    overlay.appendChild(label);

    el.style.position = 'relative';
    el.appendChild(overlay);

    return () => {
      overlay.remove();
    };
  },
};
