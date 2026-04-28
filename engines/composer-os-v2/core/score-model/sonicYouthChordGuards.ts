/**
 * Sonic Youth — type guards and preset helpers for ChordEvent extensions.
 *
 * PIPELINE: Call sites that branch on Sonic Youth should also verify songwriter/profile
 * (e.g. primary style id) so default duo / export paths ignore `sonicYouth` unless intended.
 */

import type { ChordEvent } from './scoreModelTypes';
import type { SonicYouthExtension, SYDissonancePreset } from './sonicYouthChordTypes';

export function isSonicYouthEvent(
  event: ChordEvent
): event is ChordEvent & { sonicYouth: SonicYouthExtension } {
  return event.sonicYouth !== undefined && event.sonicYouth !== null;
}

/**
 * Maps a 0–1 dissonance score to a friction preset (v1 thresholds: thirds).
 * PIPELINE: Clamp or validate `score` before calling if input may be outside [0, 1].
 */
export function getSYDissonancePreset(score: number): SYDissonancePreset {
  const s = Math.max(0, Math.min(1, score));
  if (s < 1 / 3) return 'low_friction';
  if (s < 2 / 3) return 'medium_friction';
  return 'high_friction';
}
