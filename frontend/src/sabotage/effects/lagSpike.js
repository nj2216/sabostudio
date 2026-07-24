/**
 * frontend/src/sabotage/effects/lagSpike.js
 * Lag Spike / Stutter — Simulates severe network lag by dropping frame rate
 * to 5 FPS and delaying inputs for 5 seconds.
 */

export const lagSpike = {
  id: 'lagSpike',
  name: 'Lag Spike / Stutter',
  description: 'Simulates 5 FPS stutter lag and delayed input for 5 seconds.',
  category: 'input',
  cost: 50,
  durationMs: 5000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 95;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 10px;
    `;

    const badge = document.createElement('div');
    badge.textContent = '📶 LAG SPIKE: 999 ms (5 FPS)';
    badge.style.cssText = `
      background: #dc2626;
      color: #fff;
      font-family: monospace;
      font-weight: 900;
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      box-shadow: 0 0 10px rgba(220,38,38,0.8);
      animation: pulse 0.5s infinite;
    `;
    overlay.appendChild(badge);

    // Stutter animation overlay via CSS filter animation
    const prevTransition = el.style.transition;
    el.style.transition = 'filter 0.2s steps(4)';

    el.style.position = 'relative';
    el.appendChild(overlay);

    const timeouts = [];
    function interceptInput(e) {
      if (e.isTrusted) {
        e.stopPropagation();
        e.preventDefault();

        const delay = 400 + Math.random() * 600; // 400-1000ms delay

        const clone = new e.constructor(e.type, {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          view: window,
        });

        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && el.contains(target)) {
          const tid = setTimeout(() => {
            target.dispatchEvent(clone);
          }, delay);
          timeouts.push(tid);
        }
      }
    }

    const interceptEvents = ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup'];
    interceptEvents.forEach(type => el.addEventListener(type, interceptInput, { capture: true }));

    return () => {
      timeouts.forEach(clearTimeout);
      interceptEvents.forEach(type => el.removeEventListener(type, interceptInput, { capture: true }));
      el.style.transition = prevTransition;
      overlay.remove();
    };
  },
};
