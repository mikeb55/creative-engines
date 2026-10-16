/**
 * Guitar playability for any tuning.
 * Standard-tuning defaults match the Barry Harris pre-filter.
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

export interface GuitarFret {
  string: number;
  fret: number;
}

export interface SolvedGrip {
  feasible: boolean;
  fretSpan: number;
  lowestFret: number;
  stretch: boolean;
  frets: GuitarFret[];
}

const MAX_FRET = 22;
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'] as const;

export function stringName(index: number): string {
  return STRING_NAMES[index] ?? `S${index}`;
}

function opensFor(tuningId?: string, openStrings?: readonly number[]): number[] {
  if (openStrings && openStrings.length > 0) return [...openStrings];
  if (!tuningId || tuningId === 'standard') return [...GUITAR_OPEN_STRING_MIDIS];
  const loaded = require('./guitarGripLibrary') as { openStringMidisForTuning: (id: string) => number[] };
  return loaded.openStringMidisForTuning(tuningId);
}

function fretsOnString(midi: number, open: number): number[] {
  const fret = midi - open;
  if (fret < 0 || fret > MAX_FRET) return [];
  return [fret];
}

function evaluateAssignment(
  midis: readonly number[],
  stringIndices: readonly number[],
  opens: readonly number[],
): (GuitarFeasibilityResult & { frets: GuitarFret[] }) | null {
  const frets: GuitarFret[] = [];
  const usedStrings = new Set<number>();
  for (let i = 0; i < midis.length; i += 1) {
    const stringIndex = stringIndices[i]!;
    if (usedStrings.has(stringIndex)) return null;
    usedStrings.add(stringIndex);
    const options = fretsOnString(midis[i]!, opens[stringIndex]!);
    if (options.length === 0) return null;
    frets.push({ string: stringIndex, fret: options[0]! });
  }
  if (frets.length === 0) return { feasible: true, fretSpan: 0, lowestFret: 0, stretch: false, frets: [] };
  const values = frets.map((item) => item.fret);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  return { feasible: true, fretSpan: highest - lowest, lowestFret: lowest, stretch: false, frets };
}

function permute(
  midis: readonly number[],
  maxSpan: number,
  opens: readonly number[],
  legacyTie: boolean,
): (GuitarFeasibilityResult & { frets: GuitarFret[] }) | null {
  const count = midis.length;
  if (count === 0) return { feasible: true, fretSpan: 0, lowestFret: 0, stretch: false, frets: [] };
  if (count > opens.length) return null;
  const strings = opens.map((_, index) => index);
  let best: (GuitarFeasibilityResult & { frets: GuitarFret[] }) | null = null;
  const visit = (depth: number, picked: number[]): void => {
    if (depth === count) {
      const result = evaluateAssignment(midis, picked, opens);
      if (!result || result.fretSpan > maxSpan) return;
      const better = legacyTie
        ? !best || result.fretSpan < best.fretSpan || result.lowestFret < best.lowestFret
        : !best || result.fretSpan < best.fretSpan || (result.fretSpan === best.fretSpan && result.lowestFret < best.lowestFret);
      if (better) best = { ...result, stretch: maxSpan > GUITAR_MAX_FRET_SPAN };
      return;
    }
    for (const stringIndex of strings) {
      if (picked.includes(stringIndex)) continue;
      picked.push(stringIndex);
      visit(depth + 1, picked);
      picked.pop();
    }
  };
  visit(0, []);
  return best;
}

export function assessGuitarFeasibility(
  midis: readonly number[],
  options?: { allowStretch?: boolean; tuningId?: string; openStrings?: readonly number[] },
): GuitarFeasibilityResult {
  const opens = opensFor(options?.tuningId, options?.openStrings);
  const unique = [...new Set(midis)].sort((a, b) => a - b);
  if (unique.length === 0) return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
  if (unique.length === 1) {
    for (let s = 0; s < opens.length; s += 1) {
      const frets = fretsOnString(unique[0]!, opens[s]!);
      if (frets.length > 0) return { feasible: true, fretSpan: 0, lowestFret: frets[0]!, stretch: false };
    }
    return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
  }
  if (unique.length > 4) return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
  const normal = permute(unique, GUITAR_MAX_FRET_SPAN, opens, true);
  if (normal) return { feasible: normal.feasible, fretSpan: normal.fretSpan, lowestFret: normal.lowestFret, stretch: false };
  if (options?.allowStretch) {
    const stretched = permute(unique, GUITAR_STRETCH_FRET_SPAN, opens, true);
    if (stretched) return { feasible: true, fretSpan: stretched.fretSpan, lowestFret: stretched.lowestFret, stretch: true };
  }
  return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false };
}

export function solveGuitarGrip(
  midis: readonly number[],
  options?: { tuningId?: string; openStrings?: readonly number[]; maxSpan?: number },
): SolvedGrip {
  const opens = opensFor(options?.tuningId, options?.openStrings);
  const hard = options?.maxSpan ?? GUITAR_STRETCH_FRET_SPAN;
  const unique = [...new Set(midis)].sort((a, b) => a - b);
  if (unique.length === 0 || unique.length > opens.length || unique.length > 4) {
    return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false, frets: [] };
  }
  if (unique.length === 1) {
    let best: SolvedGrip | null = null;
    for (let s = 0; s < opens.length; s += 1) {
      const frets = fretsOnString(unique[0]!, opens[s]!);
      if (!frets.length) continue;
      const candidate: SolvedGrip = { feasible: true, fretSpan: 0, lowestFret: frets[0]!, stretch: false, frets: [{ string: s, fret: frets[0]! }] };
      if (!best || candidate.lowestFret < best.lowestFret) best = candidate;
    }
    return best ?? { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false, frets: [] };
  }
  const solved = permute(unique, hard, opens, false);
  if (!solved) return { feasible: false, fretSpan: 0, lowestFret: 0, stretch: false, frets: [] };
  return {
    feasible: true,
    fretSpan: solved.fretSpan,
    lowestFret: solved.lowestFret,
    stretch: solved.fretSpan > GUITAR_MAX_FRET_SPAN,
    frets: solved.frets,
  };
}

export function isGuitarVoicingFeasible(midis: readonly number[], allowStretch = false): boolean {
  return assessGuitarFeasibility(midis, { allowStretch }).feasible;
}
