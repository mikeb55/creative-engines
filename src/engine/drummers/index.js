import * as elvinJones from './elvinJones.js';
import * as tonyWilliams from './tonyWilliams.js';
import * as artBlakey from './artBlakey.js';
import * as jackDeJohnette from './jackDeJohnette.js';

/** @type {readonly import('../drumTypes').DrummerModule[]} */
export const DRUMMER_MODULES = [elvinJones, tonyWilliams, artBlakey, jackDeJohnette];

/** @type {Record<string, import('../drumTypes').DrummerModule>} */
export const DRUMMER_BY_ID = Object.fromEntries(DRUMMER_MODULES.map((m) => [m.drummerId, m]));

/** @param {string} drummerId */
export function getDrummerModule(drummerId) {
  return DRUMMER_BY_ID[drummerId];
}

/** @param {string} drummerId @param {string} patternName */
export function findPattern(drummerId, patternName) {
  const mod = getDrummerModule(drummerId);
  if (!mod) return undefined;
  return mod.patterns.find((p) => p.name === patternName);
}
