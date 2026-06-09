/**
 * V82d - Melody note to 6th / dim7 chord-melody resolution.
 */

import { pitchClassToSharpName } from './scaleOfChords';
import {
  dim7ChordTones,
  dim7DegreePc,
  pairFromAnchor,
  sixthChordTones,
  sixthDegreePc,
} from './chordTones';
import { resolveBorrowedNoteChoice } from './borrowed';
import type {
  ChordMelodyBarAnchor,
  ChordMelodyNoteChoice,
  MelodyNoteForChordMelody,
  ScaleOfChords,
  SixthDimPair,
} from './types';

function symbolForSixth(pair: SixthDimPair): string {
  const root = pitchClassToSharpName(pair.sixthRootPc);
  return pair.sixthQuality === 'm6' ? `${root}m6` : `${root}6`;
}

function symbolForDim7(pair: SixthDimPair): string {
  return `${pitchClassToSharpName(pair.dim7RootPc)}dim7`;
}

function baseFields(
  barAnchor: ChordMelodyBarAnchor,
  note: MelodyNoteForChordMelody,
  pair: SixthDimPair,
  scalePairIndex: number
): Omit<ChordMelodyNoteChoice, 'kind'> {
  return {
    bar: note.bar,
    onsetBeat: note.onsetBeat,
    sectionLabel: barAnchor.sectionLabel,
    fakeBookSymbol: barAnchor.fakeBookSymbol,
    anchor: pair,
    scalePairIndex,
    melodyPc: ((note.melodyPc % 12) + 12) % 12,
  };
}

/**
 * V82a gate: sixth tones -> sixth chord (drop 6th); dim7 tones -> dim7 (drop dim7 degree).
 */
export function selectChordMelodyNoteChoice(
  scale: ScaleOfChords,
  barAnchor: ChordMelodyBarAnchor,
  note: MelodyNoteForChordMelody
): ChordMelodyNoteChoice {
  const { pair, scalePairIndex } = pairFromAnchor(scale.pairs, barAnchor.anchor);
  const pc = ((note.melodyPc % 12) + 12) % 12;
  const base = baseFields(barAnchor, note, pair, scalePairIndex);
  const sixthSymbol = symbolForSixth(pair);
  const dimSymbol = symbolForDim7(pair);
  const sixthTones = sixthChordTones(pair.sixthRootPc, pair.sixthQuality);
  const dimTones = dim7ChordTones(pair.dim7RootPc);

  if (sixthTones.includes(pc)) {
    return {
      ...base,
      kind: 'sixth',
      chordSymbol: sixthSymbol,
      droppedTonePc: sixthDegreePc(pair.sixthRootPc),
    };
  }

  if (dimTones.includes(pc)) {
    return {
      ...base,
      kind: 'dim7',
      chordSymbol: dimSymbol,
      droppedTonePc: dim7DegreePc(pair.dim7RootPc),
    };
  }

  return resolveBorrowedNoteChoice(base, pair, pc, sixthSymbol, dimSymbol, sixthTones, dimTones);
}

export function selectChordMelodyNoteChoices(
  scale: ScaleOfChords,
  barAnchor: ChordMelodyBarAnchor,
  notes: readonly MelodyNoteForChordMelody[]
): ChordMelodyNoteChoice[] {
  return notes.map((note) => selectChordMelodyNoteChoice(scale, barAnchor, note));
}