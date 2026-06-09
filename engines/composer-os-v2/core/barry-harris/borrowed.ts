/**
 * V82d - Borrowed partner tones (chromatic melody against fixed scale-of-chords).
 */

import type { ChordMelodyChoiceBase, ChordMelodyNoteChoice, SixthDimPair } from './types';

function distanceToToneSet(pc: number, tones: readonly number[]): number {
  let best = 12;
  for (const tone of tones) {
    const d = Math.min((pc - tone + 12) % 12, (tone - pc + 12) % 12);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Keep active sixth chord; tag melody tone as borrowed from partner dim7 or sixth palette.
 */
export function resolveBorrowedNoteChoice(
  base: ChordMelodyChoiceBase,
  _pair: SixthDimPair,
  melodyPc: number,
  activeSymbol: string,
  partnerSymbol: string,
  sixthTones: readonly number[],
  dimTones: readonly number[]
): Extract<ChordMelodyNoteChoice, { kind: 'borrowed' }> {
  const distSixth = distanceToToneSet(melodyPc, sixthTones);
  const distDim = distanceToToneSet(melodyPc, dimTones);
  const borrowedFrom: 'sixth' | 'dim7' = distDim <= distSixth ? 'dim7' : 'sixth';

  return {
    ...base,
    kind: 'borrowed',
    activeSymbol,
    partnerSymbol,
    borrowedFrom,
  };
}