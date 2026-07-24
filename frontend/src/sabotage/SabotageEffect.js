/**
 * frontend/src/sabotage/SabotageEffect.js
 *
 * Shared interface + registry for all 10 Sabotage Deck effects.
 */

import { adAvalanche } from './effects/adAvalanche.js';
import { flashbang } from './effects/flashbang.js';
import { screenGlitch } from './effects/screenGlitch.js';
import { invertControls } from './effects/invertControls.js';
import { butterFingers } from './effects/butterFingers.js';
import { lagSpike } from './effects/lagSpike.js';
import { soundboardAssault } from './effects/soundboardAssault.js';
import { fakeScreenSwap } from './effects/fakeScreenSwap.js';
import { taskRewind } from './effects/taskRewind.js';
import { phantomCursor } from './effects/phantomCursor.js';
import { controlSwap } from './effects/controlSwap.js';

/** @type {SabotageEffect[]} */
export const ALL_EFFECTS = [
  adAvalanche,
  flashbang,
  screenGlitch,
  invertControls,
  butterFingers,
  lagSpike,
  soundboardAssault,
  fakeScreenSwap,
  taskRewind,
  phantomCursor,
  controlSwap,
];

/** @type {Map<string, SabotageEffect>} */
export const EFFECTS_BY_ID = new Map();

ALL_EFFECTS.forEach((e) => {
  if (e && e.id) {
    EFFECTS_BY_ID.set(e.id, e);
    const camel = e.id.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    EFFECTS_BY_ID.set(camel, e);
  }
});

/** Convenience: look up an effect by ID. Returns null if not found. */
export function getEffect(id) {
  return EFFECTS_BY_ID.get(id) ?? null;
}

/**
 * Returns a random effect from the given category (or any category if omitted).
 * @param {'visual'|'input'|'social'|'structural'} [category]
 * @returns {SabotageEffect}
 */
export function randomEffect(category) {
  const pool = category
    ? ALL_EFFECTS.filter((e) => e.category === category)
    : ALL_EFFECTS;
  return pool[Math.floor(Math.random() * pool.length)];
}
