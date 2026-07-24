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

    const prevCursor = el.style.cursor;
    el.style.cursor = 'none';

    const fakeCursor = document.createElement('div');
    fakeCursor.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.5 3.5L18.5 10.5L11.5 12.5L9.5 19.5L5.5 3.5Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    `;
    fakeCursor.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-4px, -4px);
    `;
    overlay.appendChild(fakeCursor);

    let realX = 0, realY = 0;
    let fakeX = 0, fakeY = 0;
    let vx = 0, vy = 0;
    let animId;
    let hasMoved = false;

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      realX = e.clientX - rect.left;
      realY = e.clientY - rect.top;
      if (!hasMoved) {
        fakeX = realX;
        fakeY = realY;
        hasMoved = true;
      }
    }

    function tick() {
      if (hasMoved) {
        const dx = realX - fakeX;
        const dy = realY - fakeY;

        vx += dx * 0.02;
        vy += dy * 0.02;

        vx *= 0.92; // icy friction
        vy *= 0.92;

        fakeX += vx;
        fakeY += vy;

        fakeCursor.style.left = `${fakeX}px`;
        fakeCursor.style.top = `${fakeY}px`;
      }
      animId = requestAnimationFrame(tick);
    }
    tick();

    function interceptClick(e) {
      if (e.isTrusted) {
        e.stopPropagation();
        e.preventDefault();

        const rect = el.getBoundingClientRect();
        const clientX = rect.left + fakeX;
        const clientY = rect.top + fakeY;

        // Temporarily hide overlay so we don't click on the label
        const prevPointerEvents = overlay.style.pointerEvents;
        overlay.style.pointerEvents = 'none';

        const target = document.elementFromPoint(clientX, clientY);

        overlay.style.pointerEvents = prevPointerEvents;

        if (target && el.contains(target)) {
          const fakeEvent = new e.constructor(e.type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            view: window,
          });
          target.dispatchEvent(fakeEvent);
        }
      }
    }

    el.addEventListener('pointermove', handleMove);
    const interceptEvents = ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup'];
    interceptEvents.forEach(type => el.addEventListener(type, interceptClick, { capture: true }));

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener('pointermove', handleMove);
      interceptEvents.forEach(type => el.removeEventListener(type, interceptClick, { capture: true }));
      el.style.cursor = prevCursor;
      overlay.remove();
    };
  },
};
