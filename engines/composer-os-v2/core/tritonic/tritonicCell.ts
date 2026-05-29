/**
 * Tritonic cell dictionary — three-note pitch-class cells by harmonic family.
 * Distinct from Slonimsky {@link IntervalPattern} interval primitives (melodic cycles).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type TritonicCellFamily =
  | 'quartal'
  | 'cluster'
  | 'suspended'
  | 'shorter_floating'
  | 'bergonzi';

export type TritonicCell = {
  /** Exactly three pitch classes (0–11). */
  notes: PitchClass[];
  /** Semitone intervals between ascending consecutive notes. */
  intervalProfile: number[];
  /** 0–1 dissonance weight derived from interval content. */
  tension: number;
  family: TritonicCellFamily;
};

export type TritonicDictionary = {
  cells: TritonicCell[];
  byFamily: Record<TritonicCell['family'], TritonicCell[]>;
};

const TRITONIC_FAMILIES: readonly TritonicCellFamily[] = [
  'quartal',
  'cluster',
  'suspended',
  'shorter_floating',
  'bergonzi',
];

/** Representative pitch-class seeds per family (≥2 each). */
const TRITONIC_SEED_NOTES: Record<TritonicCellFamily, readonly PitchClass[][]> = {
  quartal: [
    [0, 5, 10],
    [2, 7, 0],
  ],
  cluster: [
    [0, 1, 2],
    [0, 1, 6],
  ],
  suspended: [
    [0, 5, 7],
    [0, 2, 7],
  ],
  shorter_floating: [
    [0, 4, 9],
    [0, 2, 9],
  ],
  bergonzi: [
    [0, 4, 7],
    [0, 3, 7],
  ],
};

function assertPitchClass(n: number): PitchClass {
  const pc = ((n % 12) + 12) % 12;
  return pc as PitchClass;
}

function normalizeNotes(notes: readonly number[]): PitchClass[] {
  if (notes.length !== 3) {
    throw new Error(`TritonicCell requires exactly 3 notes; got ${notes.length}`);
  }
  return notes.map(assertPitchClass);
}

/** Ascending consecutive semitone intervals (length = notes.length - 1). */
export function computeIntervalProfile(notes: readonly PitchClass[]): number[] {
  const sorted = [...notes].sort((a, b) => a - b);
  const profile: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    profile.push((sorted[i]! - sorted[i - 1]! + 12) % 12);
  }
  return profile;
}

function intervalDissonance(semitones: number): number {
  const iv = ((semitones % 12) + 12) % 12;
  if (iv === 0) return 0;
  if (iv === 1 || iv === 11 || iv === 6) return 1;
  if (iv === 2 || iv === 10) return 0.65;
  if (iv === 3 || iv === 4 || iv === 8 || iv === 9) return 0.4;
  if (iv === 5 || iv === 7) return 0.15;
  return 0.5;
}

/** Mean interval dissonance, clamped to [0, 1]. Tritone and semitone intervals score highest. */
export function computeTensionFromIntervalProfile(intervalProfile: readonly number[]): number {
  if (intervalProfile.length === 0) return 0;
  const sum = intervalProfile.reduce((acc, iv) => acc + intervalDissonance(iv), 0);
  const mean = sum / intervalProfile.length;
  return Math.min(1, Math.max(0, mean));
}

export function buildTritonicCell(
  notes: readonly number[],
  family: TritonicCellFamily,
): TritonicCell {
  const pcs = normalizeNotes(notes);
  const intervalProfile = computeIntervalProfile(pcs);
  const tension = computeTensionFromIntervalProfile(intervalProfile);
  return { notes: pcs, intervalProfile, tension, family };
}

export function buildTritonicDictionary(): TritonicDictionary {
  const cells: TritonicCell[] = [];
  const byFamily = {} as Record<TritonicCell['family'], TritonicCell[]>;

  for (const family of TRITONIC_FAMILIES) {
    const familyCells = TRITONIC_SEED_NOTES[family].map((seed) => buildTritonicCell(seed, family));
    byFamily[family] = familyCells;
    cells.push(...familyCells);
  }

  return { cells, byFamily };
}
