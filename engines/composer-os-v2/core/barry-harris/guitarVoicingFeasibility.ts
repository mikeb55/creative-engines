/**
 * V80k - Guitar playability pre-filter for Barry Harris chord-melody voicings.
 */

/** Standard tuning open-string MIDI pitches: E2 A2 D3 G3 B3 E4 */
export const GUITAR_OPEN_STRING_MIDIS = [40, 45, 50, 55, 59, 64] as const;

export const GUITAR_MAX_FRET_SPAN = 4;
export const GUITAR_STRETCH_FRET_SPAN = 5;

export type GuitarFeasibilityResult = {
  feasible: boolean;
  fretSpan: number;
  lowestFret: number;
  stretch: boolean;
};

const MAX_FRET = 22;

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function fretsOnString(midi: number, stringIndex: number): number[] {
  const open = GUITAR_OPEN_STRING_MIDIS[stringIndex]!;
  const fret = midi - open;
  if (fret < 0 || fret > MAX_FRET) return [];
  return [fret];
}

function evaluateAssignment(
  midis: readonly number[],
  stringIndices: readonly number[]
): GuitarFeasibilityResult | null {
  const frets: number[] = [];
  const usedStrings = new Set<number>();
  for (let i = 0; i < midis.length; i++) {
    const s = stringIndices[i]!;
    if (usedStrings.has(s)) return null;
    usedStrings.add(s);
    const options = fretsOnString(midis[i]!, s);
    if (options.length === 0) return null;
    frets.push(options[0]!);
  }
  if (frets.length === 0) {
    return { feasible: true, fretSpan: 0, lowestFret: 0, stretch: false };
  }
  const lowest = Math.min(...frets);
  const highest = Math.max(...frets);
  const span = highest - lowest;
  return { feasible: true, fretSpan: span, lowestFret: lowest, stretch: false };
}

function permuteStringAssignments(
  midis: readonly number[],
  maxSpan: number
): GuitarFeasibilityResult | null {
  const n = midis.length;
  if (n === 0) return { feasible: true, fretSpan: 0, lowestFret: 0, stretch: false };
  if (n > GUITAR_OPEN_STRING_MIDIS.length) return null;

  const strings = GUITAR_OPEN_STRING_MIDIS.map((_, i) => i);
  let best: GuitarFeasibilityResult | null = null;

  function visit(depth: number, picked: number[]): void {
    if (depth === n) {
      const result = evaluateAssignment(midis, picked);
      if (!result || result.fretSpan > maxSpan) return;
      if (!best || result.fretSpan < best.fretSpan || result.lowestFret < best.lowestFret) {
        best = { ...result, stretch: maxSpan > GUITAR_MAX_FRET_SPAN };
      }
      return;
    }
    for (const s of strings) {
      if (picked.includes(s)) continue;
      picked.push(s);
      visit(depth + 1, picked);
      picked.pop();
    }
  }

  visit(0, []);
  return best;
}

/**
 * Determine whether MIDI pitches are playable as a guitar grip (3–4 notes max, one per string).
 */
export function assessGuitarFeasibility(
  midis: readonly number[],
  options?: { allowStretch?: boolean }
): GuitarFeasibilityResult {
  const unique = [...new Set(midis)].sort((a, b) => a - b);
  if (unique.length === 0) {
    return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
  }
  if (unique.length === 1) {
    for (let s = 0; s < GUITAR_OPEN_STRING_MIDIS.length; s++) {
      const frets = fretsOnString(unique[0]!, s);
      if (frets.length > 0) {
        return { feasible: true, fretSpan: 0, lowestFret: frets[0]!, stretch: false };
      }
    }
    return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
  }
  if (unique.length > 4) {
    return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
  }

  const normal = permuteStringAssignments(unique, GUITAR_MAX_FRET_SPAN);
  if (normal) return normal;

  if (options?.allowStretch) {
    const stretched = permuteStringAssignments(unique, GUITAR_STRETCH_FRET_SPAN);
    if (stretched) return { ...stretched, stretch: true };
  }

  return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
}

/** True when every pitch class appears on a distinct string within span limit. */
export function isGuitarVoicingFeasible(midis: readonly number[], allowStretch = false): boolean {
  return assessGuitarFeasibility(midis, { allowStretch }).feasible;
}

/** Drop-2 spacing: wide inner gap from dropping 2nd voice from top an octave. */
export function isDrop2InnerSpacing(_melodyMidi: number, innerAsc: readonly number[]): boolean {
  if (innerAsc.length < 2) return false;
  for (let i = 1; i < innerAsc.length; i++) {
    if (innerAsc[i]! - innerAsc[i - 1]! >= 8) return true;
  }
  return false;
}

export function pitchClasses(midis: readonly number[]): number[] {
  return [...new Set(midis.map(mod12))].sort((a, b) => a - b);
}
