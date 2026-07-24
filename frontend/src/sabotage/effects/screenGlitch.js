/**
 * frontend/src/sabotage/effects/screenGlitch.js
 * Screen Glitch / CRT Distortion — Screen warps, flips upside down, and
 * heavily distorts with RGB chromatic aberration and heavy static noise for 6s.
 */

export const screenGlitch = {
  id: 'screenGlitch',
  name: 'Screen Glitch / CRT',
  description: 'Screen warps upside down with RGB static distortion for 6s.',
  category: 'visual',
  cost: 50,
  durationMs: 6000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const prevTransform = el.style.transform;
    const prevFilter = el.style.filter;

    // Flip upside down + heavy CRT chromatic RGB glitch filter
    el.style.transform = `${prevTransform} scaleY(-1) scaleX(-1)`;
    el.style.filter = 'contrast(200%) hue-rotate(180deg) blur(0.5px)';
    el.style.transition = 'transform 0.2s ease, filter 0.2s ease';

    // Create CRT scanline overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 90;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.4),
        rgba(0, 0, 0, 0.4) 2px,
        transparent 2px,
        transparent 4px
      );
    `;
    el.appendChild(overlay);

    return () => {
      el.style.transform = prevTransform;
      el.style.filter = prevFilter;
      el.style.transition = '';
      overlay.remove();
    };
  },
};
