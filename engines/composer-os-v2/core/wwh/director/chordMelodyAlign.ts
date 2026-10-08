/**
 * Map a duo leadsheet onto an existing chord-melody file by melody, bass, and metre.
 * Printed bar numbers are not the map.
 */

import type { WwhImportedMeasure, WwhImportedNote } from '../wwhDuoImport';
import { cutAfter, expandSpan, type SourceIndex, type SourceMeasure } from './sourceIndexAdapter';
import type { Span } from './performancePlanTypes';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midi(note: WwhImportedNote): number {
  return (note.octave ?? 0) * 12 + (STEP[note.step ?? ''] ?? 0) + (note.alter ?? 0);
}

/** Voice 1 top note at each attack. Chord tones under it are voicing, not a new melody. */
export function topLine(measure: WwhImportedMeasure): string {
  const groups: WwhImportedNote[][] = [];
  for (const note of measure.notes) {
    if (note.voice !== '1') continue;
    if (!note.chord || groups.length === 0) groups.push([note]);
    else groups[groups.length - 1]!.push(note);
  }
  return groups
    .map((group) => {
      const pitched = group.filter((note) => !note.rest);
      if (!pitched.length) return `R:${group[0]!.duration}:${group[0]!.type}:${group[0]!.dots}`;
      const top = [...pitched].sort((a, b) => midi(b) - midi(a))[0]!;
      return [
        top.step,
        top.alter ?? 0,
        top.octave ?? '',
        top.duration,
        top.type ?? '',
        top.dots,
        top.tieStart ? 's' : '',
        top.tieStop ? 't' : '',
      ].join(':');
    })
    .join(',');
}

export function bassLine(measure: WwhImportedMeasure): string {
  return measure.notes
    .filter((note) => !note.chord)
    .map((note) =>
      note.rest
        ? `R:${note.duration}:${note.type}:${note.dots}`
        : `${note.step}:${note.alter ?? 0}:${note.octave}:${note.duration}:${note.type}:${note.dots}:${note.tieStart ? 's' : ''}:${note.tieStop ? 't' : ''}`
    )
    .join(',');
}

export function barsCompatible(duo: SourceMeasure, arrangement: SourceMeasure): boolean {
  const metre =
    duo.guitar.beats === arrangement.guitar.beats &&
    duo.guitar.beatType === arrangement.guitar.beatType &&
    duo.guitar.divisions === arrangement.guitar.divisions;
  return metre && topLine(duo.guitar) === topLine(arrangement.guitar) && bassLine(duo.bass) === bassLine(arrangement.bass);
}

export interface ChordMelodyAlignment {
  ok: boolean;
  pairs: Array<{ duoOrder: number; arrangementOrder: number }>;
  excludedArrangementOrders: number[];
  message: string;
}

export function alignChordMelody(duo: SourceIndex, arrangement: SourceIndex): ChordMelodyAlignment {
  const need = duo.measures.length;
  if (arrangement.measures.length < need) {
    return {
      ok: false,
      pairs: [],
      excludedArrangementOrders: arrangement.measures.map((measure) => measure.order),
      message: `arrangement has ${arrangement.measures.length} bars and the duo has ${need}`,
    };
  }
  const hits: number[] = [];
  for (let start = 0; start <= arrangement.measures.length - need; start += 1) {
    let good = true;
    for (let index = 0; index < need; index += 1) {
      if (!barsCompatible(duo.measures[index]!, arrangement.measures[start + index]!)) {
        good = false;
        break;
      }
    }
    if (good) hits.push(start);
  }
  if (hits.length !== 1) {
    return {
      ok: false,
      pairs: [],
      excludedArrangementOrders: [],
      message: hits.length === 0 ? 'no melody, bass, and metre alignment' : `ambiguous alignments at offsets ${hits.join(', ')}`,
    };
  }
  const start = hits[0]!;
  const pairs = duo.measures.map((measure, index) => ({ duoOrder: measure.order, arrangementOrder: start + index }));
  const used = new Set(pairs.map((pair) => pair.arrangementOrder));
  return {
    ok: true,
    pairs,
    excludedArrangementOrders: arrangement.measures.filter((measure) => !used.has(measure.order)).map((measure) => measure.order),
    message: `one alignment at arrangement offset ${start}`,
  };
}

export function verifyNamedSpans(
  duo: SourceIndex,
  arrangement: SourceIndex,
  sourceSpan: Span,
  arrangementSpan: Span
): string[] {
  let source: SourceMeasure[] = [];
  let arranged: SourceMeasure[] = [];
  try {
    source = expandSpan(duo, sourceSpan);
    arranged = expandSpan(arrangement, arrangementSpan);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  if (source.length !== arranged.length) {
    return [`span length ${source.length} != arrangement length ${arranged.length}`];
  }
  const errors: string[] = [];
  source.forEach((measure, index) => {
    const other = arranged[index]!;
    if (!barsCompatible(measure, other)) {
      errors.push(
        `duo bar ${measure.printedNumber} does not match arrangement bar ${other.printedNumber} on melody, bass, or metre`
      );
    }
  });
  return errors;
}

export function switchIsSafe(duo: SourceIndex, arrangement: SourceIndex, duoOrder: number, arrangementOrder: number): { safe: boolean; reason: string } {
  const left = cutAfter(duo, duoOrder);
  const right = cutAfter(arrangement, arrangementOrder);
  if (left.safe && right.safe) return { safe: true, reason: `${left.reason}; ${right.reason}` };
  return { safe: false, reason: [left.safe ? '' : left.reason, right.safe ? '' : right.reason].filter(Boolean).join('; ') };
}
