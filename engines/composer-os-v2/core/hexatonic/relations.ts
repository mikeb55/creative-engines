/**
 * Hexatonic Phase H2 — collection operations.
 * Distance uses the collection's own cardinality.
 * Five-note field-distance thresholds stay in the pentatonic module.
 */

import {
  minimumAssignment,
  pcDistance,
  type DistanceClass,
  type MotionPair,
} from '../pentatonic/fieldDistance';
import { canonicalPitchSet, canonicalPitchSetId, mod12 } from '../pentatonic/pitch';
import { nearestResolvePitchClassToTriad } from '../harmony/liquidHarmonyPlanner';
import {
  analyzeTriadPair,
  type ParentTriadInput,
  type RelationshipAnalysis,
} from '../wwh/wwhTriadPair';
import {
  getHexatonicScalar,
  listHexatonicScalars,
  transposeScalar,
  type HexatonicScalarCollection,
} from './collections';

export type HexatonicPlacement = 'inside' | 'outside' | 'return';

export interface HexatonicDistance {
  cardinality: number;
  sharedPitchClasses: readonly number[];
  sharedCount: number;
  changed: { source: readonly number[]; destination: readonly number[] };
  meanMotion: number;
  minimumVoiceMotion: number;
  voiceMotionPairs: readonly MotionPair[];
  continuityPotential: number;
  distanceClass: DistanceClass;
  samePitchClassSet: boolean;
}

export interface PitchClassDuplicateGroup {
  canonicalId: string;
  pitchClasses: readonly number[];
  ids: readonly string[];
}

export interface NearestTone {
  from: number;
  to: number;
  semitones: number;
}

export interface TriadExchange {
  analysis: RelationshipAnalysis;
  disjoint: boolean;
  sharedPitchClasses: readonly number[];
  retained: readonly MotionPair[];
  motions: readonly MotionPair[];
  voiceLeadingDistance: number;
  /** True when a voice moves farther than its own nearest tone so two voices do not land on one pitch class. */
  leapAfterCollision: boolean;
}

export interface ReturnHomePath {
  homeId: string;
  steps: readonly { role: HexatonicPlacement; id: string; pitchClasses: readonly number[] }[];
  returnMatchesHome: boolean;
  outsideLeavesHome: boolean;
}

const AUGMENTED_IDS = ['hex_augmented_t0', 'hex_augmented_t1', 'hex_augmented_t2', 'hex_augmented_t3'] as const;
const WHOLE_TONE_IDS = ['hex_whole_tone_even', 'hex_whole_tone_odd'] as const;

export function containsPitchClass(pitchClasses: readonly number[], pitchClass: number): boolean {
  return canonicalPitchSet(pitchClasses).includes(mod12(pitchClass));
}

export function pitchClassSetsEqual(left: readonly number[], right: readonly number[]): boolean {
  return canonicalPitchSetId(left) === canonicalPitchSetId(right);
}

export function transposePitchClasses(pitchClasses: readonly number[], semitones: number): number[] {
  return canonicalPitchSet(pitchClasses.map((pitchClass) => pitchClass + semitones));
}

export function intersectPitchClasses(left: readonly number[], right: readonly number[]): number[] {
  const destination = new Set(canonicalPitchSet(right));
  return canonicalPitchSet(left).filter((pitchClass) => destination.has(pitchClass));
}

export function nearestTone(pitchClass: number, collection: readonly number[]): NearestTone {
  const target = canonicalPitchSet(collection);
  if (target.length === 0) throw new Error('nearest tone needs a collection');
  const to = nearestResolvePitchClassToTriad(mod12(pitchClass), target);
  return { from: mod12(pitchClass), to, semitones: pcDistance(pitchClass, to) };
}

/**
 * Classification offsets follow the live collection size.
 * A six-note set does not inherit the five-note cutoffs 5 / 4 / 3.
 */
export function classifyHexatonicDistance(
  sharedCount: number,
  meanMotion: number,
  sameSet: boolean,
  cardinality: number
): DistanceClass {
  const size = Math.max(1, cardinality);
  if (sameSet || sharedCount >= size) return 'IDENTICAL';
  if (sharedCount >= size - 1 && meanMotion <= 2) return 'NEAR';
  if (sharedCount >= size - 1 || (sharedCount === size - 2 && meanMotion <= 2)) return 'RELATED';
  if (sharedCount === size - 2 || sharedCount === size - 3 || (sharedCount === size - 4 && meanMotion <= 1)) return 'OUTSIDE';
  return 'REMOTE';
}

export function measureHexatonicDistance(
  source: readonly number[],
  destination: readonly number[],
  references?: { source?: number; destination?: number }
): HexatonicDistance {
  const sourceSet = canonicalPitchSet(source);
  const destinationSet = canonicalPitchSet(destination);
  const cardinality = Math.max(sourceSet.length, destinationSet.length);
  const shared = intersectPitchClasses(sourceSet, destinationSet);
  const onlySource = sourceSet.filter((pitchClass) => !shared.includes(pitchClass));
  const onlyDestination = destinationSet.filter((pitchClass) => !shared.includes(pitchClass));
  const assignment = minimumAssignment(onlySource, onlyDestination);
  const matched = assignment.pairs.filter((pair) => pair.from >= 0 && pair.to >= 0);
  const meanMotion = matched.length === 0
    ? (onlySource.length + onlyDestination.length > 0 ? 6 : 0)
    : matched.reduce((sum, pair) => sum + pair.semitones, 0) / matched.length;
  const samePitchClassSet = pitchClassSetsEqual(sourceSet, destinationSet);
  const continuityPotential = samePitchClassSet
    ? 1
    : Math.max(0, Math.min(1, (shared.length / cardinality) * 0.65 + (1 - Math.min(meanMotion, 6) / 6) * 0.25 + centreBonus(sourceSet, destinationSet, references)));
  return {
    cardinality,
    sharedPitchClasses: shared,
    sharedCount: shared.length,
    changed: { source: onlySource, destination: onlyDestination },
    meanMotion,
    minimumVoiceMotion: assignment.sum,
    voiceMotionPairs: assignment.pairs,
    continuityPotential,
    distanceClass: classifyHexatonicDistance(shared.length, meanMotion, samePitchClassSet, cardinality),
    samePitchClassSet,
  };
}

function centreBonus(
  source: readonly number[],
  destination: readonly number[],
  references?: { source?: number; destination?: number }
): number {
  if (references?.source === undefined || references.destination === undefined) return 0;
  if (mod12(references.source) === mod12(references.destination)) return 0.1;
  const sourceInDestination = destination.includes(mod12(references.source));
  const destinationInSource = source.includes(mod12(references.destination));
  if (sourceInDestination && destinationInSource) return 0.05;
  return 0;
}

export function duplicatePitchClassGroups(
  entries: readonly { id: string; pitchClasses: readonly number[] }[]
): PitchClassDuplicateGroup[] {
  const groups = new Map<string, { pitchClasses: number[]; ids: string[] }>();
  for (const entry of entries) {
    const pitchClasses = canonicalPitchSet(entry.pitchClasses);
    const canonicalId = canonicalPitchSetId(pitchClasses);
    const group = groups.get(canonicalId) ?? { pitchClasses, ids: [] };
    group.ids.push(entry.id);
    groups.set(canonicalId, group);
  }
  return [...groups.values()]
    .filter((group) => group.ids.length > 1)
    .map((group) => ({ canonicalId: group.pitchClasses.join(','), pitchClasses: group.pitchClasses, ids: group.ids }));
}

export function symmetryLandingId(id: string, semitones: number): string | null {
  const row = getHexatonicScalar(id);
  if (!row) return null;
  const steps = mod12(semitones);
  if (row.symmetry === 'augmented') {
    const index = AUGMENTED_IDS.indexOf(id as (typeof AUGMENTED_IDS)[number]);
    if (index < 0) return null;
    return AUGMENTED_IDS[(index + steps) % 4]!;
  }
  if (row.symmetry === 'whole-tone') {
    const even = id === WHOLE_TONE_IDS[0];
    const oddSteps = steps % 2 === 1;
    if (even) return oddSteps ? WHOLE_TONE_IDS[1] : WHOLE_TONE_IDS[0];
    return oddSteps ? WHOLE_TONE_IDS[0] : WHOLE_TONE_IDS[1];
  }
  return steps === 0 ? id : null;
}

export function transposeRegisteredScalar(id: string, semitones: number): {
  pitchClasses: number[];
  symmetryLandingId: string | null;
  landingMatchesSet: boolean;
} {
  const pitchClasses = transposeScalar(id, semitones);
  const landing = symmetryLandingId(id, semitones);
  const landingRow = landing ? getHexatonicScalar(landing) : undefined;
  return {
    pitchClasses,
    symmetryLandingId: landing,
    landingMatchesSet: landingRow ? pitchClassSetsEqual(pitchClasses, landingRow.pitchClasses) : false,
  };
}

export function distinctTranspositions(id: string): number {
  const seen = new Set<string>();
  for (let step = 0; step < 12; step += 1) seen.add(canonicalPitchSetId(transposeScalar(id, step)));
  return seen.size;
}

export function placementAgainstHome(home: readonly number[], candidate: readonly number[]): 'inside' | 'outside' {
  const homeSet = canonicalPitchSet(home);
  const candidateSet = canonicalPitchSet(candidate);
  if (candidateSet.length === 0) return 'outside';
  return candidateSet.every((pitchClass) => homeSet.includes(pitchClass)) ? 'inside' : 'outside';
}

export function returnHomePath(
  homeId: string,
  home: readonly number[],
  outsideId: string,
  outside: readonly number[]
): ReturnHomePath {
  const steps = [
    { role: 'inside' as const, id: homeId, pitchClasses: canonicalPitchSet(home) },
    { role: 'outside' as const, id: outsideId, pitchClasses: canonicalPitchSet(outside) },
    { role: 'return' as const, id: homeId, pitchClasses: canonicalPitchSet(home) },
  ];
  return {
    homeId,
    steps,
    returnMatchesHome: pitchClassSetsEqual(steps[2]!.pitchClasses, steps[0]!.pitchClasses) && steps[2]!.id === homeId,
    outsideLeavesHome: placementAgainstHome(home, outside) === 'outside',
  };
}

export function exchangeTriads(from: ParentTriadInput, to: ParentTriadInput): TriadExchange {
  const analysis = analyzeTriadPair(from, to);
  const shared = [...analysis.sharedPitchClasses];
  const fromMoving = from.pitchClasses.filter((pitchClass) => !shared.includes(mod12(pitchClass)));
  const toMoving = to.pitchClasses.filter((pitchClass) => !shared.includes(mod12(pitchClass)));
  const assignment = minimumAssignment(fromMoving, toMoving);
  const retained: MotionPair[] = shared.map((pitchClass) => ({ from: pitchClass, to: pitchClass, semitones: 0 }));
  const moving = assignment.pairs.filter((pair) => pair.from >= 0 && pair.to >= 0);
  const motions = [...retained, ...moving];
  const unconstrained = fromMoving.map((pitchClass) => nearestTone(pitchClass, to.pitchClasses).semitones);
  const unconstrainedSum = unconstrained.reduce((sum, semitones) => sum + semitones, 0);
  const movingSum = moving.reduce((sum, pair) => sum + pair.semitones, 0);
  const leapAfterCollision = moving.some((pair) => pair.semitones > nearestTone(pair.from, to.pitchClasses).semitones);
  return {
    analysis,
    disjoint: shared.length === 0,
    sharedPitchClasses: shared,
    retained,
    motions,
    voiceLeadingDistance: motions.reduce((sum, pair) => sum + pair.semitones, 0),
    leapAfterCollision: leapAfterCollision && movingSum > unconstrainedSum,
  };
}

export function scalarBySymmetry(symmetry: HexatonicScalarCollection['symmetry']): readonly HexatonicScalarCollection[] {
  return listHexatonicScalars().filter((row) => row.symmetry === symmetry);
}

/** Two or three notes sounding together. Six pitch classes are a collection, not a guitar chord. */
export function guitarSurface(pitchClasses: readonly number[]):
  | { accepted: true; kind: 'dyad' | 'triad'; pitchClasses: number[] }
  | { accepted: false; reason: string } {
  const set = canonicalPitchSet(pitchClasses);
  if (set.length === 2) return { accepted: true, kind: 'dyad', pitchClasses: set };
  if (set.length === 3) return { accepted: true, kind: 'triad', pitchClasses: set };
  if (set.length === 6) return { accepted: false, reason: 'six-note material is a collection, not a guitar chord' };
  return { accepted: false, reason: `a guitar surface here is a dyad or a triad, not ${set.length} notes` };
}

/** Melodic fragment of two, three, or four members. A six-note run stays out. */
export function melodicFragment(pitchClasses: readonly number[], count: 2 | 3 | 4): number[] {
  const set = canonicalPitchSet(pitchClasses);
  if (count < 2 || count > 4) throw new Error('a hexatonic fragment is two, three, or four notes');
  if (set.length < count) throw new Error('collection is shorter than the fragment');
  const fragment = set.slice(0, count);
  if (!fragment.every((pitchClass) => set.includes(pitchClass))) throw new Error('fragment left the collection');
  return fragment;
}
