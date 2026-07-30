/**
 * frontend/src/sabotage/DirectorKit.js
 *
 * Registry for all Director abilities in Final Cut.
 * Replaces the old symmetric SabotageEffect.js system.
 * All abilities are cooldown-gated (no point cost).
 */

import { flashbang } from './effects/flashbang.js';
import { screenCrack } from './effects/screenCrack.js';
import { invertControls } from './effects/invertControls.js';
import { fakeScreenSwap } from './effects/fakeScreenSwap.js';
import { taskRewind } from './effects/taskRewind.js';
import { ghostInput } from './effects/ghostInput.js';
import { nightVision } from './effects/nightVision.js';
import { stationFreeze } from './effects/stationFreeze.js';
import { bleedThrough } from './effects/bleedThrough.js';

/**
 * Director ability definitions.
 * Each has: id, name, description, category, cooldownMs, durationMs, apply().
 */
export const DIRECTOR_ABILITIES = [
  // ── Visual (Dread) ──
  {
    ...flashbang,
    category: 'dread',
    cooldownMs: 30_000,
    description: 'Flashes the target Talent\'s screen white, then pitch black for 4s. Ear-ringing audio.',
  },
  {
    ...screenCrack,
    category: 'dread',
    cooldownMs: 20_000,
    description: 'Violent near-catch effect — cracks appear across the Talent\'s screen.',
  },
  {
    ...nightVision,
    id: 'night-vision',
    name: 'Night Vision Inversion',
    category: 'dread',
    cooldownMs: 25_000,
    durationMs: 6_000,
    description: 'Forces a Talent\'s screen into high-contrast distorted vision for 6s.',
  },

  // ── Input (Possession) ──
  {
    ...invertControls,
    category: 'possession',
    cooldownMs: 35_000,
    description: 'Brief "possession" — target Talent\'s movement controls are inverted for 5s.',
  },
  {
    ...ghostInput,
    id: 'ghost-input',
    name: 'Ghost Input',
    category: 'possession',
    cooldownMs: 30_000,
    durationMs: 8_000,
    description: 'Injects phantom keypresses, as if the Director is directing the Talent\'s body.',
  },

  // ── Social (Paranoia) ──
  {
    ...fakeScreenSwap,
    id: 'fake-screen',
    name: 'Fake Screen Swap',
    category: 'paranoia',
    cooldownMs: 40_000,
    description: 'Renders a decoy of another Talent\'s view to sow confusion and misdirection.',
  },

  // ── Structural ──
  {
    ...taskRewind,
    category: 'structural',
    cooldownMs: 45_000,
    description: 'Resets a station\'s progress if disrupted mid-attempt.',
  },
  {
    ...stationFreeze,
    id: 'station-freeze',
    name: 'Station Freeze',
    category: 'structural',
    cooldownMs: 35_000,
    durationMs: 10_000,
    description: 'Locks a station\'s controls for 10s — area denial.',
  },

  // ── Signature Power ──
  {
    ...bleedThrough,
    id: 'bleed-through',
    name: 'Bleed-Through',
    category: 'signature',
    cooldownMs: 50_000,
    durationMs: 9_000,
    description: 'Forces a zone into 1987 mode: shrinks Talent FOV from 100° to 60°, adds static and distortion for 9s.',
  },
];

/** @type {Map<string, object>} */
export const ABILITIES_BY_ID = new Map();

DIRECTOR_ABILITIES.forEach((a) => {
  if (a && a.id) {
    ABILITIES_BY_ID.set(a.id, a);
    // Also index by camelCase
    const camel = a.id.replace(/-([a-z])/g, (_, g) => g.toUpperCase());
    ABILITIES_BY_ID.set(camel, a);
  }
});

/** Look up an ability by ID. Returns null if not found. */
export function getAbility(id) {
  return ABILITIES_BY_ID.get(id) ?? null;
}

/** Category list for UI tabs. */
export const ABILITY_CATEGORIES = ['ALL', 'DREAD', 'POSSESSION', 'PARANOIA', 'STRUCTURAL', 'SIGNATURE'];
