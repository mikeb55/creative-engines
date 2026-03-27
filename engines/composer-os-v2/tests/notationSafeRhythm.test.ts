/**
 * Notation-safe beat atoms: decompose + allowed set.
 */

import {
  decomposeDurationIntoAllowedPieces,
  isNotationSafeDuration,
  NOTATION_SAFE_BEAT_DURATIONS_DESC,
} from '../core/score-integrity/notationSafeRhythm';

export function runNotationSafeRhythmTests(): { name: string; ok: boolean }[] {
  return [
    {
      name: 'Notation-safe: allowed set covers standard atoms',
      ok:
        NOTATION_SAFE_BEAT_DURATIONS_DESC.length === 7 &&
        [1, 0.5, 0.25, 1.5, 0.75, 2, 4].every((b) => isNotationSafeDuration(b)),
    },
    {
      name: 'Notation-safe: 1.25 decomposes to 1 + 0.25',
      ok: (() => {
        const p = decomposeDurationIntoAllowedPieces(1.25);
        return p.length === 2 && p[0] === 1 && p[1] === 0.25;
      })(),
    },
    {
      name: 'Notation-safe: 3.75 decomposes without remainder',
      ok: (() => {
        const p = decomposeDurationIntoAllowedPieces(3.75);
        return Math.abs(p.reduce((a, b) => a + b, 0) - 3.75) < 1e-4;
      })(),
    },
  ].map(({ name, ok }) => ({ name, ok }));
}
