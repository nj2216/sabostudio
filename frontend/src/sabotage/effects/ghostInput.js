/**
 * Ghost Input — randomly injects a fake click every few seconds that the
 * player has to visually catch and undo.
 * Category: input
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const ghostInput = {
  id: 'ghost-input',
  name: 'Ghost Input',
  description: 'Phantom clicks fire randomly inside your station. Someone is in the machine.',
  category: 'input',
  durationMs: 15_000,

  apply(stationEl) {
    let timeoutId = null;
    let active = true;

    function scheduleNext() {
      if (!active) return;
      // Re-randomize the interval for each ghost click (2.5–4 s)
      const delay = 2500 + Math.random() * 1500;
      timeoutId = setTimeout(fireGhost, delay);
    }

    function fireGhost() {
      if (!active) return;
      const rect = stationEl.getBoundingClientRect();
      const x = rect.left + Math.random() * rect.width;
      const y = rect.top + Math.random() * rect.height;

      // Show a ghost cursor flash
      const ghost = document.createElement('div');
      ghost.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid rgba(255,80,80,0.8);
        background: rgba(255,80,80,0.2);
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%,-50%);
        animation: ghost-pulse 0.4s ease-out forwards;
      `;
      document.body.appendChild(ghost);
      setTimeout(() => ghost.remove(), 500);

      // Fire the fake click
      const clickEvt = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
      });
      const target = document.elementFromPoint(x, y);
      if (target && stationEl.contains(target)) {
        target.dispatchEvent(clickEvt);
      }

      scheduleNext();
    }

    scheduleNext();

    // Inject keyframe animation once
    if (!document.getElementById('ghost-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'ghost-pulse-style';
      style.textContent = `
        @keyframes ghost-pulse {
          0%   { opacity:1; transform:translate(-50%,-50%) scale(0.5); }
          100% { opacity:0; transform:translate(-50%,-50%) scale(2); }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  },
};
