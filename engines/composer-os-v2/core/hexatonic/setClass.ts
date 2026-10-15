/**
 * Hexatonic H6-A — six-note set classes.
 * Pitch classes use the pentatonic canonical set. This file does not replace the H2 registry.
 */

import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';

/** Left-packed Forte primes for the 50 hexachord TnI classes. Checked against music21 8.3. */
export const FORTE_HEXACHORD_PRIMES: readonly { forte: string; prime: readonly number[] }[] = [
  { forte: '6-1', prime: [0, 1, 2, 3, 4, 5] },
  { forte: '6-2', prime: [0, 1, 2, 3, 4, 6] },
  { forte: '6-3', prime: [0, 1, 2, 3, 5, 6] },
  { forte: '6-4', prime: [0, 1, 2, 4, 5, 6] },
  { forte: '6-5', prime: [0, 1, 2, 3, 6, 7] },
  { forte: '6-6', prime: [0, 1, 2, 5, 6, 7] },
  { forte: '6-7', prime: [0, 1, 2, 6, 7, 8] },
  { forte: '6-8', prime: [0, 2, 3, 4, 5, 7] },
  { forte: '6-9', prime: [0, 1, 2, 3, 5, 7] },
  { forte: '6-10', prime: [0, 1, 3, 4, 5, 7] },
  { forte: '6-11', prime: [0, 1, 2, 4, 5, 7] },
  { forte: '6-12', prime: [0, 1, 2, 4, 6, 7] },
  { forte: '6-13', prime: [0, 1, 3, 4, 6, 7] },
  { forte: '6-14', prime: [0, 1, 3, 4, 5, 8] },
  { forte: '6-15', prime: [0, 1, 2, 4, 5, 8] },
  { forte: '6-16', prime: [0, 1, 4, 5, 6, 8] },
  { forte: '6-17', prime: [0, 1, 2, 4, 7, 8] },
  { forte: '6-18', prime: [0, 1, 2, 5, 7, 8] },
  { forte: '6-19', prime: [0, 1, 3, 4, 7, 8] },
  { forte: '6-20', prime: [0, 1, 4, 5, 8, 9] },
  { forte: '6-21', prime: [0, 2, 3, 4, 6, 8] },
  { forte: '6-22', prime: [0, 1, 2, 4, 6, 8] },
  { forte: '6-23', prime: [0, 2, 3, 5, 6, 8] },
  { forte: '6-24', prime: [0, 1, 3, 4, 6, 8] },
  { forte: '6-25', prime: [0, 1, 3, 5, 6, 8] },
  { forte: '6-26', prime: [0, 1, 3, 5, 7, 8] },
  { forte: '6-27', prime: [0, 1, 3, 4, 6, 9] },
  { forte: '6-28', prime: [0, 1, 3, 5, 6, 9] },
  { forte: '6-29', prime: [0, 1, 3, 6, 8, 9] },
  { forte: '6-30', prime: [0, 1, 3, 6, 7, 9] },
  { forte: '6-31', prime: [0, 1, 3, 5, 8, 9] },
  { forte: '6-32', prime: [0, 2, 4, 5, 7, 9] },
  { forte: '6-33', prime: [0, 2, 3, 5, 7, 9] },
  { forte: '6-34', prime: [0, 1, 3, 5, 7, 9] },
  { forte: '6-35', prime: [0, 2, 4, 6, 8, 10] },
  { forte: '6-36', prime: [0, 1, 2, 3, 4, 7] },
  { forte: '6-37', prime: [0, 1, 2, 3, 4, 8] },
  { forte: '6-38', prime: [0, 1, 2, 3, 7, 8] },
  { forte: '6-39', prime: [0, 2, 3, 4, 5, 8] },
  { forte: '6-40', prime: [0, 1, 2, 3, 5, 8] },
  { forte: '6-41', prime: [0, 1, 2, 3, 6, 8] },
  { forte: '6-42', prime: [0, 1, 2, 3, 6, 9] },
  { forte: '6-43', prime: [0, 1, 2, 5, 6, 8] },
  { forte: '6-44', prime: [0, 1, 2, 5, 6, 9] },
  { forte: '6-45', prime: [0, 2, 3, 4, 6, 9] },
  { forte: '6-46', prime: [0, 1, 2, 4, 6, 9] },
  { forte: '6-47', prime: [0, 1, 2, 4, 7, 9] },
  { forte: '6-48', prime: [0, 1, 2, 5, 7, 9] },
  { forte: '6-49', prime: [0, 1, 3, 4, 7, 9] },
  { forte: '6-50', prime: [0, 1, 4, 6, 7, 9] },
];

const FORTE_BY_PRIME = new Map(FORTE_HEXACHORD_PRIMES.map((row) => [row.prime.join(','), row.forte]));

export interface PitchClassSetClass {
  pitchClasses: readonly number[];
  /** Transposition class. Minimum span, then packed left, then transposed to 0. */
  normalForm: readonly number[];
  /** Transposition/inversion class. */
  primeForm: readonly number[];
  forte: string;
  /** Interval classes 1 through 6. */
  intervalVector: readonly number[];
  transpositionSymmetry: number;
  inversionSymmetry: boolean;
  selfComplementary: boolean;
  zPartner: string | null;
}

export function combinationsOf(n: number, k: number): number[][] {
  const out: number[][] = [];
  const pick: number[] = [];
  const walk = (start: number) => {
    if (pick.length === k) {
      out.push(pick.slice());
      return;
    }
    for (let value = start; value < n; value += 1) {
      pick.push(value);
      walk(value + 1);
      pick.pop();
    }
  };
  walk(0);
  return out;
}

export function transposePitchClassSet(pitchClasses: readonly number[], semitones: number): number[] {
  return canonicalPitchSet(pitchClasses.map((pitchClass) => pitchClass + semitones));
}

export function invertPitchClassSet(pitchClasses: readonly number[], axis = 0): number[] {
  return canonicalPitchSet(pitchClasses.map((pitchClass) => axis - pitchClass));
}

export function complementPitchClassSet(pitchClasses: readonly number[]): number[] {
  const present = new Set(canonicalPitchSet(pitchClasses));
  const complement: number[] = [];
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    if (!present.has(pitchClass)) complement.push(pitchClass);
  }
  return complement;
}

function lexLess(left: readonly number[], right: readonly number[]): boolean {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index]! < right[index]!;
  }
  return left.length < right.length;
}

/** Forte normal form: smallest span, then the left-packed rotation, starting at 0. */
export function normalForm(pitchClasses: readonly number[]): number[] {
  const sorted = canonicalPitchSet(pitchClasses);
  const count = sorted.length;
  if (count === 0) return [];
  let minSpan = 12;
  const spans: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const span = mod12(sorted[(index + count - 1) % count]! - sorted[index]!);
    spans.push(span);
    if (span < minSpan) minSpan = span;
  }
  let best: number[] | null = null;
  for (let index = 0; index < count; index += 1) {
    if (spans[index] !== minSpan) continue;
    const start = sorted[index]!;
    const rotated: number[] = [];
    for (let step = 0; step < count; step += 1) rotated.push(mod12(sorted[(index + step) % count]! - start));
    if (!best || lexLess(rotated, best)) best = rotated;
  }
  return best ?? [];
}

export function primeForm(pitchClasses: readonly number[]): number[] {
  const direct = normalForm(pitchClasses);
  const inverted = normalForm(invertPitchClassSet(pitchClasses));
  return lexLess(inverted, direct) ? inverted : direct;
}

export function intervalVector(pitchClasses: readonly number[]): number[] {
  const sorted = canonicalPitchSet(pitchClasses);
  const vector = [0, 0, 0, 0, 0, 0];
  for (let left = 0; left < sorted.length; left += 1) {
    for (let right = left + 1; right < sorted.length; right += 1) {
      let distance = Math.abs(sorted[left]! - sorted[right]!);
      if (distance > 6) distance = 12 - distance;
      if (distance > 0) vector[distance - 1] += 1;
    }
  }
  return vector;
}

export function transpositionSymmetry(pitchClasses: readonly number[]): number {
  const sorted = canonicalPitchSet(pitchClasses);
  const key = sorted.join(',');
  let count = 0;
  for (let semitones = 0; semitones < 12; semitones += 1) {
    if (transposePitchClassSet(sorted, semitones).join(',') === key) count += 1;
  }
  return count;
}

export function inversionSymmetry(pitchClasses: readonly number[]): boolean {
  const key = canonicalPitchSet(pitchClasses).join(',');
  for (let axis = 0; axis < 12; axis += 1) {
    if (invertPitchClassSet(pitchClasses, axis).join(',') === key) return true;
  }
  return false;
}

export function forteOfPrime(prime: readonly number[]): string {
  const forte = FORTE_BY_PRIME.get(prime.join(','));
  if (!forte) throw new Error(`no Forte hexachord for prime ${prime.join(' ')}`);
  return forte;
}

let zPartnerByForte: Map<string, string | null> | null = null;

function zPartners(): Map<string, string | null> {
  if (zPartnerByForte) return zPartnerByForte;
  const byVector = new Map<string, string[]>();
  for (const row of FORTE_HEXACHORD_PRIMES) {
    const vector = intervalVector(row.prime).join('');
    const group = byVector.get(vector) ?? [];
    group.push(row.forte);
    byVector.set(vector, group);
  }
  zPartnerByForte = new Map();
  for (const group of byVector.values()) {
    if (group.length === 1) zPartnerByForte.set(group[0]!, null);
    else if (group.length === 2) {
      zPartnerByForte.set(group[0]!, group[1]!);
      zPartnerByForte.set(group[1]!, group[0]!);
    } else {
      throw new Error(`interval vector shared by ${group.join(', ')}`);
    }
  }
  return zPartnerByForte;
}

export function classifyPitchClassSet(pitchClasses: readonly number[]): PitchClassSetClass {
  const set = canonicalPitchSet(pitchClasses);
  const prime = primeForm(set);
  const forte = forteOfPrime(prime);
  const complementPrime = primeForm(complementPitchClassSet(set));
  return {
    pitchClasses: set,
    normalForm: normalForm(set),
    primeForm: prime,
    forte,
    intervalVector: intervalVector(set),
    transpositionSymmetry: transpositionSymmetry(set),
    inversionSymmetry: inversionSymmetry(set),
    selfComplementary: complementPrime.join(',') === prime.join(','),
    zPartner: zPartners().get(forte) ?? null,
  };
}

export interface HexachordCensus {
  pitchClassSets: number;
  rootedSets: number;
  transpositionClasses: number;
  transpositionInversionClasses: number;
}

/** Every six-note subset of the chromatic scale, counted by Tn and TnI. */
export function censusHexachords(): HexachordCensus {
  const sets = combinationsOf(12, 6);
  const transposition = new Set<string>();
  const inversion = new Set<string>();
  let rooted = 0;
  for (const set of sets) {
    if (set.includes(0)) rooted += 1;
    transposition.add(normalForm(set).join(','));
    inversion.add(primeForm(set).join(','));
  }
  return {
    pitchClassSets: sets.length,
    rootedSets: rooted,
    transpositionClasses: transposition.size,
    transpositionInversionClasses: inversion.size,
  };
}

/** Distinct rotations. A symmetric set keeps one row per different interval pattern. */
export function rootedModes(pitchClasses: readonly number[]): { tonic: number; intervals: number[] }[] {
  const set = canonicalPitchSet(pitchClasses);
  const seen = new Set<string>();
  const modes: { tonic: number; intervals: number[] }[] = [];
  for (const tonic of set) {
    const ordered = [...set.filter((pitchClass) => pitchClass >= tonic), ...set.filter((pitchClass) => pitchClass < tonic)];
    const intervals = ordered.map((pitchClass) => mod12(pitchClass - tonic));
    const key = intervals.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    modes.push({ tonic, intervals });
  }
  return modes;
}
