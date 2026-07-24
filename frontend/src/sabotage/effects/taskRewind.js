/**
 * frontend/src/sabotage/effects/taskRewind.js
 * Task Rewind — Resets 50% of target's current minigame progress back to zero!
 */

export const taskRewind = {
  id: 'taskRewind',
  name: 'Task Rewind',
  description: 'Instantly resets 50% of your active minigame progress back to zero!',
  category: 'structural',
  cost: 80,
  durationMs: 3000,

  apply(targetEl, ctx) {
    const el = targetEl || document.body;

    // Trigger onTaskRewind callback if provided in context
    if (ctx && typeof ctx.onTaskRewind === 'function') {
      ctx.onTaskRewind();
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 100;
      background: rgba(15, 23, 42, 0.85);
      border: 3px solid #3b82f6;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `;

    overlay.innerHTML = `
      <span style="font-size: 3rem;" class="animate-spin">⏪</span>
      <h2 style="color: #60a5fa; font-family: monospace; font-weight: 900; font-size: 1.1rem; margin: 8px 0 4px;">
        ⏪ TASK REWOUND!
      </h2>
      <p style="color: #94a3b8; font-family: monospace; font-size: 0.75rem; margin: 0;">
        -50% PROGRESS DENIAL APPLIED!
      </p>
    `;

    el.style.position = 'relative';
    el.appendChild(overlay);

    return () => {
      overlay.remove();
    };
  },
};
