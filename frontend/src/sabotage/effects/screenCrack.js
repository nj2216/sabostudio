/**
 * Screen Crack — SVG crack overlay, cosmetic only but psychologically distracting.
 * Category: visual
 */

const CRACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none;z-index:50">
  <defs>
    <filter id="crack-glow">
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g stroke="rgba(255,255,255,0.6)" stroke-width="1.5" fill="none" filter="url(#crack-glow)">
    <polyline points="35%,0 30%,20% 40%,35% 25%,55% 35%,70% 20%,100%"/>
    <polyline points="30%,20% 20%,30% 15%,40%"/>
    <polyline points="40%,35% 55%,38% 60%,50% 50%,60%"/>
    <polyline points="65%,10% 60%,25% 70%,40% 80%,38% 90%,55%"/>
    <polyline points="70%,40% 65%,50% 70%,65%"/>
  </g>
  <rect width="100%" height="100%" fill="rgba(255,255,255,0.03)" style="pointer-events:none"/>
</svg>`;

/** @type {import('../SabotageEffect.js').SabotageEffect} */
export const screenCrack = {
  id: 'screen-crack',
  name: 'Screen Crack',
  description: 'Your screen shatters. Cosmetically. Mostly.',
  category: 'visual',
  durationMs: 20_000,

  apply(stationEl) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:50;`;
    wrapper.innerHTML = CRACK_SVG;

    stationEl.style.position = 'relative';
    stationEl.appendChild(wrapper);

    // Small shake on apply
    stationEl.animate(
      [
        { transform: 'translate(0,0)' },
        { transform: 'translate(-4px,3px)' },
        { transform: 'translate(4px,-3px)' },
        { transform: 'translate(-2px,2px)' },
        { transform: 'translate(0,0)' },
      ],
      { duration: 200, easing: 'ease-out' },
    );

    return () => wrapper.remove();
  },
};
