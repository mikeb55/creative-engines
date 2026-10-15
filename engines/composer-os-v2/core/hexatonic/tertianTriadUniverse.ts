/**
 * Hexatonic H6-A — tertian triad universe.
 * Qualities match the vault triad type. Voice-leading uses the existing assignment.
 */

import { minimumAssignment } from '../pentatonic/fieldDistance';
import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';
import type { VaultTriadQuality } from '../wwh/wps/wpsTonalityVaultRecord';
import { classifyPitchClassSet } from './setClass';

const TEMPLATES: readonly { quality: VaultTriadQuality; intervals: readonly number[] }[] = [
  { quality: 'major', intervals: [0, 4, 7] },
  { quality: 'minor', intervals: [0, 3, 7] },
  { quality: 'diminished', intervals: [0, 3, 6] },
  { quality: 'augmented', intervals: [0, 4, 8] },
];

export interface TertianTriad {
  quality: VaultTriadQuality;
  /** Template root. An augmented triad has three possible roots; this is one of them. */
  rootPc: number;
  pitchClasses: readonly number[];
}

export interface TertianRelationClass {
  /** Transposition class of the unordered pair. */
  id: string;
  commonTones: number;
  unionPitchClasses: readonly number[];
  unionNormalForm: readonly number[] | null;
  forte: string | null;
  interleaves: boolean;
  minVoiceLeading: number;
  example: readonly [TertianTriad, TertianTriad];
}

function triadKey(pitchClasses: readonly number[]): string {
  return canonicalPitchSet(pitchClasses).join(',');
}

export function listTertianTriads(): readonly TertianTriad[] {
  const seen = new Set<string>();
  const triads: TertianTriad[] = [];
  for (const template of TEMPLATES) {
    for (let rootPc = 0; rootPc < 12; rootPc += 1) {
      const pitchClasses = canonicalPitchSet(template.intervals.map((interval) => rootPc + interval));
      const key = `${template.quality}:${triadKey(pitchClasses)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      triads.push({ quality: template.quality, rootPc, pitchClasses });
    }
  }
  return triads;
}

export function triadAt(quality: VaultTriadQuality, rootPc: number): TertianTriad {
  const template = TEMPLATES.find((row) => row.quality === quality);
  if (!template) throw new Error(`unknown triad quality ${quality}`);
  return {
    quality,
    rootPc: mod12(rootPc),
    pitchClasses: canonicalPitchSet(template.intervals.map((interval) => rootPc + interval)),
  };
}

function pairKey(left: readonly number[], right: readonly number[]): string {
  return [triadKey(left), triadKey(right)].sort().join('|');
}

export function relationClassId(left: readonly number[], right: readonly number[]): string {
  let best = '';
  for (let semitones = 0; semitones < 12; semitones += 1) {
    const key = pairKey(
      left.map((pitchClass) => pitchClass + semitones),
      right.map((pitchClass) => pitchClass + semitones),
    );
    if (!best || key < best) best = key;
  }
  return best;
}

export function commonToneCount(left: readonly number[], right: readonly number[]): number {
  const other = new Set(canonicalPitchSet(right));
  return canonicalPitchSet(left).filter((pitchClass) => other.has(pitchClass)).length;
}

export function triadsInterleave(left: readonly number[], right: readonly number[]): boolean {
  if (commonToneCount(left, right) !== 0) return false;
  const union = canonicalPitchSet([...left, ...right]);
  if (union.length !== 6) return false;
  const inLeft = new Set(canonicalPitchSet(left));
  let expectLeft = inLeft.has(union[0]!);
  for (const pitchClass of union) {
    if (inLeft.has(pitchClass) !== expectLeft) return false;
    expectLeft = !expectLeft;
  }
  return true;
}

export function minVoiceLeading(left: readonly number[], right: readonly number[]): number {
  return minimumAssignment(canonicalPitchSet(left), canonicalPitchSet(right)).sum;
}

export function listTertianRelationClasses(): readonly TertianRelationClass[] {
  const triads = listTertianTriads();
  const classes = new Map<string, TertianRelationClass>();
  for (let leftIndex = 0; leftIndex < triads.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < triads.length; rightIndex += 1) {
      const left = triads[leftIndex]!;
      const right = triads[rightIndex]!;
      const id = relationClassId(left.pitchClasses, right.pitchClasses);
      if (classes.has(id)) continue;
      const shared = commonToneCount(left.pitchClasses, right.pitchClasses);
      const union = canonicalPitchSet([...left.pitchClasses, ...right.pitchClasses]);
      const classified = union.length === 6 ? classifyPitchClassSet(union) : null;
      classes.set(id, {
        id,
        commonTones: shared,
        unionPitchClasses: union,
        unionNormalForm: classified ? classified.normalForm : null,
        forte: classified ? classified.forte : null,
        interleaves: triadsInterleave(left.pitchClasses, right.pitchClasses),
        minVoiceLeading: minVoiceLeading(left.pitchClasses, right.pitchClasses),
        example: [left, right],
      });
    }
  }
  return [...classes.values()];
}

export interface TertianUniverseCensus {
  triads: number;
  unorderedPairs: number;
  relationClasses: number;
  disjointClasses: number;
  oneCommonToneClasses: number;
  twoCommonToneClasses: number;
  disjointUnionTranspositionClasses: number;
}

export function censusTertianUniverse(): TertianUniverseCensus {
  const classes = listTertianRelationClasses();
  const unions = new Set<string>();
  let disjoint = 0;
  let one = 0;
  let two = 0;
  for (const row of classes) {
    if (row.commonTones === 0) {
      disjoint += 1;
      if (row.unionNormalForm) unions.add(row.unionNormalForm.join(','));
    } else if (row.commonTones === 1) one += 1;
    else if (row.commonTones === 2) two += 1;
  }
  const triads = listTertianTriads();
  return {
    triads: triads.length,
    unorderedPairs: (triads.length * (triads.length - 1)) / 2,
    relationClasses: classes.length,
    disjointClasses: disjoint,
    oneCommonToneClasses: one,
    twoCommonToneClasses: two,
    disjointUnionTranspositionClasses: unions.size,
  };
}

/** Disjoint tertian splits of a six-note set. Order inside a split is not significant. */
export function disjointTertianSplits(pitchClasses: readonly number[]): { left: TertianTriad; right: TertianTriad }[] {
  const set = new Set(canonicalPitchSet(pitchClasses));
  if (set.size !== 6) return [];
  const triads = listTertianTriads().filter((triad) => triad.pitchClasses.every((pitchClass) => set.has(pitchClass)));
  const splits: { left: TertianTriad; right: TertianTriad }[] = [];
  const seen = new Set<string>();
  for (let leftIndex = 0; leftIndex < triads.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < triads.length; rightIndex += 1) {
      const left = triads[leftIndex]!;
      const right = triads[rightIndex]!;
      if (commonToneCount(left.pitchClasses, right.pitchClasses) !== 0) continue;
      const union = canonicalPitchSet([...left.pitchClasses, ...right.pitchClasses]);
      if (union.length !== 6) continue;
      const id = pairKey(left.pitchClasses, right.pitchClasses);
      if (seen.has(id)) continue;
      seen.add(id);
      splits.push({ left, right });
    }
  }
  return splits;
}
