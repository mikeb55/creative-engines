/**
 * Small chord-tone reader for pentatonic evidence.
 * One symbol, one region. This is not the Composer OS harmony engine and it does
 * not apply golden-path chord substitution.
 */

import { canonicalPitchSet, parseNoteToken } from './pitch';

export interface ChordEvidence {
  symbol: string;
  harmonyPitchClasses: number[];
  slashBassPitchClass: number | null;
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
    if (bass) {
      slashBassPitchClass = bass.pc;
      rest = rest.slice(0, slashAt);
    }
  }
  const quality = rest.replace(/[()]/g, '').toLowerCase();
  const minor = /^(m|min|-)(?!aj)/.test(quality);
  const sus2 = quality.includes('sus2');
  const sus4 = quality.includes('sus4') || (quality.includes('sus') && !sus2);
  const diminished = quality.includes('dim') || quality.includes('°') || quality.includes('m7b5') || quality.includes('ø');
  const augmented = quality.includes('aug') || quality.includes('+');
  const flatFive = quality.includes('b5') || diminished;
  const pcs = new Set<number>();
  const add = (interval: number) => pcs.add((root.pc + interval) % 12);
  add(0);
  if (sus2) add(2);
  else if (sus4) add(5);
  else add(minor || diminished ? 3 : 4);
  if (augmented) add(8);
  else if (flatFive) add(6);
  else add(7);
  if (quality.includes('maj7') || quality.includes('ma7') || quality.includes('δ')) add(11);
  else if (quality.includes('7')) add(10);
  if (quality.includes('add9') || quality.includes('69') || quality.includes('6/9') || /(?:^|[^a-z])9/.test(quality)) add(2);
  if (quality.includes('6')) add(9);
  return {
    ok: true,
    chord: {
      symbol: symbol.trim(),
      harmonyPitchClasses: canonicalPitchSet([...pcs]),
      slashBassPitchClass,
    },
  };
}
