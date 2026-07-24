/**
 * Grease Screen — a smudge overlay that follows the pointer with a delay.
 * Category: visual
 */

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const greaseScreen = {
  id: 'grease-screen',
  name: 'Grease Screen',
  description: 'A smudge overlay follows your cursor with a delay.',
  category: 'visual',
  durationMs: 12_000,

  apply(stationEl) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 50;
    `;

    // Create multiple smudge blobs that trail the cursor
    const blobs = Array.from({ length: 5 }, () => {
      const blob = document.createElement('div');
      blob.style.cssText = `
        position: absolute;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(180,160,120,0.35) 0%, transparent 70%);
        transform: translate(-50%, -50%);
        pointer-events: none;
        filter: blur(8px);
        transition: left 0.3s ease, top 0.3s ease;
      `;
      blob.style.left = '50%';
      blob.style.top = '50%';
      overlay.appendChild(blob);
      return blob;
    });

    // Maintain a history of cursor positions — each blob snaps to a position
    // from TRAIL_DELAY_MS * i ms ago, creating a genuine cascading smudge trail.
    const history = [];

    function handleMove(e) {
      const rect = stationEl.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      history.unshift({ x: mx, y: my });
      // Keep history length proportional to the number of blobs × delay buckets
      if (history.length > blobs.length * 8) history.pop();

      // Render each blob at a staggered position from the history
      blobs.forEach((blob, i) => {
        const histIdx = Math.min(i * 3, history.length - 1);
        const pos = history[histIdx] ?? history[history.length - 1];
        if (pos) {
          blob.style.left = `${pos.x}%`;
          blob.style.top = `${pos.y}%`;
        }
      });
    }

    stationEl.style.position = 'relative';
    stationEl.appendChild(overlay);
    stationEl.addEventListener('pointermove', handleMove);

    return () => {
      stationEl.removeEventListener('pointermove', handleMove);
      overlay.remove();
    };
  },
};
