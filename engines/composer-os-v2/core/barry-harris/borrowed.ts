/**
 * V82d / V80j - Borrowed partner tones (chromatic melody against fixed scale-of-chords).
 */

import type { ChordMelodyChoiceBase, ChordMelodyNoteChoice, SixthDimPair } from './types';

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function distanceToToneSet(pc: number, tones: readonly number[]): number {
  let best = 12;
  for (const tone of tones) {
    const d = Math.min((pc - tone + 12) % 12, (tone - pc + 12) % 12);
    if (d < best) best = d;
  }
  return best;
}

/** Classify which partner-chord tone the melody borrows (classify only). */
export function classifyBorrowedTonePc(
  melodyPc: number,
  sixthTones: readonly number[],
  dimTones: readonly number[],
  borrowedFrom: 'sixth' | 'dim7'
): number {
  const pc = mod12(melodyPc);
  const partner = borrowedFrom === 'dim7' ? dimTones : sixthTones;
  let best = partner[0] ?? pc;
  let bestDist = 12;
  for (const tone of partner) {
    const d = Math.min((pc - tone + 12) % 12, (tone - pc + 12) % 12);
    if (d < bestDist) {
      bestDist = d;
      best = tone;
    }
  }
  return mod12(best);
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
  const borrowedTonePc = classifyBorrowedTonePc(melodyPc, sixthTones, dimTones, borrowedFrom);

  return {
    ...base,
    kind: 'borrowed',
    activeSymbol,
    partnerSymbol,
    borrowedFrom,
    borrowedTonePc,
  };
}
