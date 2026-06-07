/**
 * Tritonic cell continuation — derive new cells when voice-leading pool exhausts.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { TritonicCell } from './tritonicCell';

export type ContinuationStrategy = 'invert' | 'transpose' | 'augment';

const STRATEGY_CYCLE: readonly ContinuationStrategy[] = ['transpose', 'invert', 'augment'];

function normalisePcs(notes: readonly number[]): PitchClass[] {
  return notes.map((n) => (((n % 12) + 12) % 12) as PitchClass);
}

function intervalProfileOf(notes: readonly PitchClass[]): number[] {
  const sorted = [...notes].sort((a, b) => a - b);
  return sorted.slice(1).map((n, i) => n - sorted[i]!);
}

/** Derive a fresh cell from the last active cell (deterministic by index). */
export function deriveContinuedCell(from: TritonicCell, barIndex: number): TritonicCell {
  const strategy = STRATEGY_CYCLE[barIndex % STRATEGY_CYCLE.length]!;
  const base = normalisePcs(from.notes);

  if (strategy === 'transpose') {
    const shift = 1 + (barIndex % 5);
    const notes = base.map((pc) => ((pc + shift) % 12) as PitchClass);
    return {
      ...from,
      notes,
      intervalProfile: intervalProfileOf(notes),
      tension: Math.min(1, from.tension + 0.04),
    };
  }

  if (strategy === 'invert') {
    const pivot = base[0]!;
    const notes = base.map((pc) => ((pivot + pivot - pc + 12) % 12) as PitchClass);
    return {
      ...from,
      notes,
      intervalProfile: intervalProfileOf(notes),
      tension: Math.min(1, from.tension + 0.06),
    };
  }

  // augment — widen registral spread via octave-equivalent displacement on top note
  const notes = [...base] as PitchClass[];
  const topIdx = notes.reduce<number>((best, n, idx) => (n > notes[best]! ? idx : best), 0);
  notes[topIdx] = ((notes[topIdx]! + 1) % 12) as PitchClass;
  return {
    ...from,
    notes,
    intervalProfile: intervalProfileOf(notes),
    tension: Math.min(1, from.tension + 0.08),
  };
}
