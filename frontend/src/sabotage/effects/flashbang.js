/**
 * frontend/src/sabotage/effects/flashbang.js
 * Flashbang / Blindfold — Flashes bright white then turns screen pitch black for 4 seconds,
 * accompanied by a sudden loud audio buzzing / ear-ringing sound.
 */

export const flashbang = {
  id: 'flashbang',
  name: 'Flashbang / Blindfold',
  description: 'Screen flashes white then turns pitch black for 4s with loud buzzing!',
  category: 'visual',
  cost: 60,
  durationMs: 4000,

  apply(targetEl) {
    const el = targetEl || document.body;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: #fff;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: background-color 0.4s ease;
      pointer-events: auto;
    `;

    const text = document.createElement('div');
    text.textContent = '💣 FLASHBANGED! (4S)';
    text.style.cssText = `
      color: #ff2a6d;
      font-family: monospace;
      font-weight: 900;
      font-size: 1.2rem;
      text-shadow: 0 0 10px #ff2a6d;
    `;
    overlay.appendChild(text);

    el.style.position = 'relative';
    el.appendChild(overlay);

    // Audio ear ring buzz sound synthesis via Web Audio API
    let audioCtx;
    let osc;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3500, audioCtx.currentTime); // High ear-ringing frequency
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
    } catch {}

    // Fade white to black after 300ms
    const timer1 = setTimeout(() => {
      overlay.style.backgroundColor = '#000';
    }, 300);

    return () => {
      clearTimeout(timer1);
      overlay.remove();
      if (osc) {
        try { osc.stop(); } catch {}
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch {}
      }
    };
  },
};
