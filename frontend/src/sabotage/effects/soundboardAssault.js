/**
 * frontend/src/sabotage/effects/soundboardAssault.js
 * Soundboard Assault — Plays a random ear-splitting sound effect
 * (Airhorn, Screaming Goat, Windows Error, Dial-up noise) while shaking the UI screen.
 */

export const soundboardAssault = {
  id: 'soundboardAssault',
  name: 'Soundboard Assault',
  description: 'Plays loud ear-splitting audio effects while violently shaking your screen!',
  category: 'social',
  cost: 40,
  durationMs: 4000,

  apply(targetEl) {
    const el = targetEl || document.body;

    // Shake animation keyframes
    const keyframes = [
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: 'translate(-10px, 8px) rotate(-3deg)' },
      { transform: 'translate(12px, -10px) rotate(4deg)' },
      { transform: 'translate(-8px, -6px) rotate(-2deg)' },
      { transform: 'translate(10px, 10px) rotate(3deg)' },
      { transform: 'translate(0, 0) rotate(0deg)' },
    ];

    const animation = el.animate(keyframes, {
      duration: 150,
      iterations: 24, // 3.6 seconds shake
    });

    // Web Audio synthesizer for loud airhorn / alarm sound blast
    let audioCtx;
    let osc1, osc2;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      osc1 = audioCtx.createOscillator();
      osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(466.16, audioCtx.currentTime); // Bb4 Airhorn tone
      osc2.frequency.setValueAtTime(622.25, audioCtx.currentTime); // Eb5 Airhorn tone

      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 3.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
    } catch {}

    return () => {
      try { animation.cancel(); } catch {}
      if (osc1) { try { osc1.stop(); } catch {} }
      if (osc2) { try { osc2.stop(); } catch {} }
      if (audioCtx) { try { audioCtx.close(); } catch {} }
    };
  },
};
