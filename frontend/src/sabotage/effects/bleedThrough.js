/**
 * frontend/src/sabotage/effects/bleedThrough.js
 *
 * Bleed-Through — Director's signature power.
 * Forces a local zone into "1987 mode": sepia filter, static noise,
 * scan-line intensification, and FOV shrink effect (visual only, actual FOV
 * shrink is handled by LotCanvas via game state).
 *
 * Category: signature
 */

export const bleedThrough = {
  id: 'bleed-through',
  name: 'Bleed-Through',
  description: 'Reality bleeds — 1987 mode activates. FOV narrows, static fills the air.',
  category: 'signature',
  cooldownMs: 50_000,
  durationMs: 9_000,

  apply(targetEl) {
    const el = targetEl || document.body;

    // Sepia + static overlay container
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 95;
      pointer-events: none;
      mix-blend-mode: multiply;
    `;

    // Sepia color wash
    const sepiaWash = document.createElement('div');
    sepiaWash.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(139, 115, 85, 0.25);
      animation: bleedPulse 1.5s infinite ease-in-out;
    `;

    // Static noise canvas
    const staticCanvas = document.createElement('canvas');
    staticCanvas.width = 200;
    staticCanvas.height = 120;
    staticCanvas.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.12;
      image-rendering: pixelated;
    `;

    // Warning text
    const warning = document.createElement('div');
    warning.textContent = '▒▒ BLEED-THROUGH ACTIVE — 1987 MODE ▒▒';
    warning.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #c4a35a;
      text-shadow: 0 0 8px rgba(196, 163, 90, 0.8);
      letter-spacing: 2px;
      white-space: nowrap;
      z-index: 96;
      animation: paFlicker 2s infinite ease-in-out;
    `;

    overlay.appendChild(sepiaWash);
    overlay.appendChild(staticCanvas);
    overlay.appendChild(warning);

    el.style.position = 'relative';
    el.appendChild(overlay);

    // Add CSS filter to parent
    const prevFilter = el.style.filter;
    el.style.filter = 'sepia(0.4) contrast(1.15) brightness(0.85)';
    el.style.transition = 'filter 0.5s ease';

    // Animate static noise
    const ctx = staticCanvas.getContext('2d');
    let animId;
    function drawStatic() {
      const imgData = ctx.createImageData(200, 120);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const v = Math.random() * 255;
        imgData.data[i] = v;
        imgData.data[i + 1] = v;
        imgData.data[i + 2] = v;
        imgData.data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(drawStatic);
    }
    drawStatic();

    // Audio: low-frequency hum + static crackle
    let audioCtx;
    let osc;
    let noise;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Low hum
      osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();

      // White noise crackle
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      noise.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start();
    } catch {}

    // Inject keyframe if not already present
    if (!document.getElementById('bleed-keyframes')) {
      const style = document.createElement('style');
      style.id = 'bleed-keyframes';
      style.textContent = `
        @keyframes bleedPulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      cancelAnimationFrame(animId);
      overlay.remove();
      el.style.filter = prevFilter || '';
      if (osc) { try { osc.stop(); } catch {} }
      if (noise) { try { noise.stop(); } catch {} }
      if (audioCtx) { try { audioCtx.close(); } catch {} }
    };
  },
};
