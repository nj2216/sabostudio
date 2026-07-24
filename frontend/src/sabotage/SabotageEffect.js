/**
 * frontend/src/sabotage/SabotageEffect.js
 *
 * Shared interface + registry for all Sabotage Deck effects.
 *
 * Every effect follows the same shape:
 *   apply(stationEl, ctx) → cleanup
 *
 * The host fires effects via SabotageDeck.js; clients receive a
 * 'sabotage-apply' message and call effect.apply() on the correct DOM element.
 * When the duration expires (or the effect is manually cleared), the cleanup
 * function returned by apply() is called.
 *
 * @typedef {Object} StationContext
 * @property {string}   stationId       — which station the effect targets
 * @property {string}   targetPlayerId  — which player's view is affected
 * @property {Function} [onEarlySwap]   — called by earlySwap effect to fire a swap now
 * @property {Function} [onFreeze]      — called by stationFreeze to lock inputs
 *
 * @typedef {Object} SabotageEffect
 * @property {string}   id
 * @property {string}   name
 * @property {string}   description
 * @property {'visual'|'input'|'social'|'structural'} category
 * @property {number}   durationMs
 * @property {(stationEl: HTMLElement, ctx: StationContext) => () => void} apply
 */

import { greaseScreen } from './effects/greaseScreen.js';
import { invertControls } from './effects/invertControls.js';
import { blindfold } from './effects/blindfold.js';
import { fakePopup } from './effects/fakePopup.js';
import { screenCrack } from './effects/screenCrack.js';
import { nightVision } from './effects/nightVision.js';
import { wrongColors } from './effects/wrongColors.js';
import { stickyDrag } from './effects/stickyDrag.js';
import { mirrorMode } from './effects/mirrorMode.js';
import { ghostInput } from './effects/ghostInput.js';
import { stationFreeze } from './effects/stationFreeze.js';
import { earlySwap } from './effects/earlySwap.js';

/** @type {SabotageEffect[]} */
export const ALL_EFFECTS = [
  greaseScreen,
  invertControls,
  blindfold,
  fakePopup,
  screenCrack,
  nightVision,
  wrongColors,
  stickyDrag,
  mirrorMode,
  ghostInput,
  stationFreeze,
  earlySwap,
];

/** @type {Map<string, SabotageEffect>} */
export const EFFECTS_BY_ID = new Map(ALL_EFFECTS.map((e) => [e.id, e]));

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
