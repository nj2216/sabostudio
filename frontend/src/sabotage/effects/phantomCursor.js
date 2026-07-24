/**
 * frontend/src/sabotage/effects/phantomCursor.js
 * The Phantom Cursor — Spawns 3 decoy cursors that mimic the player's movements
 * with slight offsets and delays, making it hard to identify the real cursor.
 */

export const phantomCursor = {
  id: 'phantomCursor',
  name: 'The Phantom Cursor',
  description: 'Spawns 3 decoy cursors following your cursor with offsets & delays!',
  category: 'social',
  cost: 60,
  durationMs: 10_000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 99;
    `;

    // Create 3 decoy cursors
    const decoys = [
      { dx: 35, dy: -25, el: document.createElement('div') },
      { dx: -45, dy: 30, el: document.createElement('div') },
      { dx: 20, dy: 50, el: document.createElement('div') },
    ];

    decoys.forEach((d) => {
      d.el.textContent = '↖';
      d.el.style.cssText = `
        position: absolute;
        font-size: 24px;
        color: #00f3ff;
        font-weight: bold;
        text-shadow: 0 0 5px #00f3ff;
        pointer-events: none;
        transition: transform 0.15s ease;
      `;
      overlay.appendChild(d.el);
    });

    function handleMove(e) {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      decoys.forEach((d) => {
        d.el.style.transform = `translate(${x + d.dx}px, ${y + d.dy}px)`;
      });
    }

    el.style.position = 'relative';
    el.appendChild(overlay);
    el.addEventListener('pointermove', handleMove);

    return () => {
      el.removeEventListener('pointermove', handleMove);
      overlay.remove();
    };
  },
};
