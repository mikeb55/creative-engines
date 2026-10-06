/**
 * Small chord-tone reader for pentatonic evidence.
 * One symbol at a time. This is not the Composer OS harmony engine.
 * Unknown qualities fail this call. Callers decide whether that is a validation
 * error (Dev 1 region) or a per-event diagnostic (Dev 2 path).
 */

import { canonicalPitchSet, parseNoteToken } from './pitch';

export interface ChordEvidence {
  symbol: string;
  harmonyPitchClasses: number[];
  slashBassPitchClass: number | null;
}

/**
 * Dominant 13 includes 9 and 13. Jazz shorthand, not a voice-leading claim.
 * maj7#11 keeps the perfect fifth and adds #11.
 * maj7#5 replaces the fifth with #5.
 * dim7 is a diminished seventh (bb7), not a minor seventh.
 */
const QUALITY_INTERVALS: Readonly<Record<string, readonly number[]>> = {
  '': [0, 4, 7],
  maj7: [0, 4, 7, 11],
  ma7: [0, 4, 7, 11],
  major7: [0, 4, 7, 11],
  'maj7#11': [0, 4, 6, 7, 11],
  'ma7#11': [0, 4, 6, 7, 11],
  'major7#11': [0, 4, 6, 7, 11],
  'maj7#5': [0, 4, 8, 11],
  'ma7#5': [0, 4, 8, 11],
  'major7#5': [0, 4, 8, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  '-7': [0, 3, 7, 10],
  m9: [0, 2, 3, 7, 10],
  min9: [0, 2, 3, 7, 10],
  '-9': [0, 2, 3, 7, 10],
  '7': [0, 4, 7, 10],
  '9': [0, 2, 4, 7, 10],
  '13': [0, 2, 4, 7, 9, 10],
  m7b5: [0, 3, 6, 10],
  min7b5: [0, 3, 6, 10],
  '-7b5': [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  '°7': [0, 3, 6, 9],
  o7: [0, 3, 6, 9],
  dim: [0, 3, 6],
  '°': [0, 3, 6],
  o: [0, 3, 6],
  '5': [0, 7],
  mb6: [0, 3, 7, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  sus: [0, 5, 7],
  add9: [0, 2, 4, 7],
  madd9: [0, 2, 3, 7],
  minadd9: [0, 2, 3, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  min6: [0, 3, 7, 9],
  '69': [0, 2, 4, 7, 9],
  '6/9': [0, 2, 4, 7, 9],
  aug: [0, 4, 8],
  '+': [0, 4, 8],
  m: [0, 3, 7],
  min: [0, 3, 7],
  '-': [0, 3, 7],
};

function qualityIntervals(rest: string): readonly number[] | null {
  const quality = rest.replace(/[()]/g, '').toLowerCase();
  return QUALITY_INTERVALS[quality] ?? null;
}

export function readChordEvidence(symbol: string): { ok: true; chord: ChordEvidence } | { ok: false; error: string } {
  const compact = symbol.trim().replace(/\s+/g, '');
  if (!compact) return { ok: false, error: 'Empty chord symbol.' };
  const match = compact.match(/^([A-Ga-g](?:bb|##|b|#|x)?)(.*)$/);
  if (!match) return { ok: false, error: `Malformed chord "${symbol}".` };
  const root = parseNoteToken(match[1]!);
  if (!root) return { ok: false, error: `Malformed chord root in "${symbol}".` };
  let rest = match[2] ?? '';
  let slashBassPitchClass: number | null = null;
  const slashAt = rest.lastIndexOf('/');
  if (slashAt >= 0) {
    const bassToken = rest.slice(slashAt + 1);
    const bass = parseNoteToken(bassToken);
    if (!bass) return { ok: false, error: `Unknown chord symbol "${symbol}".` };
    slashBassPitchClass = bass.pc;
    rest = rest.slice(0, slashAt);
  }
  const intervals = qualityIntervals(rest);
  if (!intervals) return { ok: false, error: `Unknown chord symbol "${symbol}".` };
  const pcs = intervals.map((interval) => (root.pc + interval) % 12);
  return {
    ok: true,
    chord: {
      symbol: symbol.trim(),
      harmonyPitchClasses: canonicalPitchSet(pcs),
      slashBassPitchClass,
    },
  };
}
