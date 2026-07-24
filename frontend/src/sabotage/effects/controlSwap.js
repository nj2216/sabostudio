/**
 * frontend/src/sabotage/effects/controlSwap.js
 *
 * Control Swap sabotage effect descriptor.
 * Swaps player movement controls between two players while keeping each
 * player's camera focused on their own avatar.
 */

export const controlSwap = {
  id: 'controlSwap',
  name: 'Control Swap',
  description: 'Swaps movement controls between two players for 15 seconds!',
  category: 'input',
  cost: 100,
  durationMs: 15000,

  apply(stationEl, ctx) {
    // Visual overlay effect if active on station or map
    if (stationEl) {
      stationEl.classList.add('control-swap-active');
    }

    return () => {
      if (stationEl) {
        stationEl.classList.remove('control-swap-active');
      }
    };
  },
};
