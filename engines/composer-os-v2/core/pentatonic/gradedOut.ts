/**
 * Dev 7A GRADED_OUT.
 * Selects a field relationship at a requested distance.
 * Does not write a lick. Phrase realisation stays with the phrase engine.
 * Graded outness follows how much a moved pentatonic still shares with the start.
 * This is not an implementation of any one teacher's full system.
 */

import {
  fieldFromResource,
  measureFieldDistance,
  registeredFieldsAround,
  type DistanceClass,
  type FieldDistance,
  type PentatonicField,
} from './fieldDistance';
import { canonicalPitchSetId } from './pitch';

export const PENTATONIC_GRADED_OUT_VERSION = 'pentatonic-graded-out-7a';

export const OUTNESS_LEVELS = ['SUBTLE', 'MODERATE', 'STRONG', 'REMOTE'] as const;
export type OutnessLevel = (typeof OUTNESS_LEVELS)[number];

export interface ReturnPath {
  destination: PentatonicField;
  commonToneAnchors: readonly number[];
  preferredLandingPitch: number | null;
  nearestNoteReturn: FieldDistance['voiceMotionPairs'];
  home: PentatonicField | null;
  current: PentatonicField;
  intermediate: PentatonicField | null;
  credible: boolean;
}

export interface GradedOutPlan {
  version: typeof PENTATONIC_GRADED_OUT_VERSION;
  disposition: 'MOVE' | 'STAY';
  outness: OutnessLevel;
  source: PentatonicField;
  destination: PentatonicField;
  distance: FieldDistance;
  returnPath: ReturnPath;
  explanation: string;
}

const TARGET_CLASS: Record<OutnessLevel, DistanceClass> = {
  SUBTLE: 'NEAR',
  MODERATE: 'RELATED',
  STRONG: 'OUTSIDE',
  REMOTE: 'REMOTE',
};

const TARGET_SHARED: Record<OutnessLevel, number> = {
  SUBTLE: 4,
  MODERATE: 3,
  STRONG: 2,
  REMOTE: 0,
};

export function planGradedOut(request: {
  source: PentatonicField;
  outness: OutnessLevel;
  home?: PentatonicField | null;
  avoidPitchSets?: readonly string[];
  /** Accepted and ignored. Tempo does not change field distance or density. */
  tempo?: number;
}): GradedOutPlan {
  const home = request.home ?? null;
  const avoid = new Set(request.avoidPitchSets ?? []);
  const pool = registeredFieldsAround(request.source.referenceSpelling);
  const ranked = bestPerSet(
    pool
      .map((destination) => {
        const distance = measureFieldDistance(request.source, destination);
        return { destination, distance, score: scoreDestination(request.source, destination, distance, request.outness) };
      })
      .filter((row) => row.distance.distanceClass === TARGET_CLASS[request.outness])
      .filter((row) => !avoid.has(canonicalPitchSetId(row.destination.pitchClasses)))
      .filter((row) => canonicalPitchSetId(row.destination.pitchClasses) !== canonicalPitchSetId(request.source.pitchClasses))
  ).sort((left, right) => right.score - left.score || left.distance.minimumVoiceMotion - right.distance.minimumVoiceMotion);

  for (const row of ranked) {
    const returnPath = buildReturnPath(request.source, row.destination, home, pool);
    const remoteNeedsBridge = request.outness === 'REMOTE' || request.outness === 'STRONG';
    if (remoteNeedsBridge && !returnPath.credible) continue;
    if (request.outness !== 'REMOTE' && row.distance.chromaticDisplacement > 4) continue;
    if ((request.outness === 'SUBTLE' || request.outness === 'MODERATE') && row.distance.changedPitchClasses.source.length > 2) continue;
    return {
      version: PENTATONIC_GRADED_OUT_VERSION,
      disposition: 'MOVE',
      outness: request.outness,
      source: request.source,
      destination: row.destination,
      distance: row.distance,
      returnPath,
      explanation: moveExplanation(request.outness, row.destination, row.distance, returnPath),
    };
  }

  const stayed = measureFieldDistance(request.source, request.source);
  return {
    version: PENTATONIC_GRADED_OUT_VERSION,
    disposition: 'STAY',
    outness: request.outness,
    source: request.source,
    destination: request.source,
    distance: stayed,
    returnPath: buildReturnPath(request.source, request.source, home, pool),
    explanation: 'The current field is already the right distance. No new field.',
  };
}

function scoreDestination(source: PentatonicField, destination: PentatonicField, distance: FieldDistance, outness: OutnessLevel): number {
  let score = 12;
  score -= Math.abs(distance.sharedCount - TARGET_SHARED[outness]) * 2;
  score -= distance.minimumVoiceMotion * 0.2;
  if (outness === 'SUBTLE' || outness === 'MODERATE') score += distance.continuityPotential * 3;
  if (outness === 'REMOTE' && distance.sharedCount === 0 && destination.resourceId === source.resourceId) score += 3;
  if (outness === 'REMOTE' && distance.sharedCount > 0) score -= 4;
  if (destination.intervalsFromReference.includes(5) || destination.intervalsFromReference.includes(7)) score += 0.4;
  if (distance.changedPitchClasses.source.length <= 2) score += 0.6;
  return score;
}

export function buildReturnPath(
  current: PentatonicField,
  destination: PentatonicField,
  home: PentatonicField | null,
  pool?: readonly PentatonicField[]
): ReturnPath {
  const distance = measureFieldDistance(destination, current);
  const anchors = distance.sharedPitchClasses;
  const landingSource = anchors.length > 0 ? anchors : destination.pitchClasses;
  const preferredLandingPitch = nearestTo(destination.referencePc, landingSource);
  const intermediate = anchors.length >= 1 ? null : findIntermediate(current, destination, pool ?? registeredFieldsAround(current.referenceSpelling));
  const credible = anchors.length >= 1 || intermediate !== null || canonicalPitchSetId(current.pitchClasses) === canonicalPitchSetId(destination.pitchClasses);
  return {
    destination,
    commonToneAnchors: anchors,
    preferredLandingPitch,
    nearestNoteReturn: distance.voiceMotionPairs.filter((pair) => pair.from >= 0 && pair.to >= 0),
    home,
    current,
    intermediate,
    credible,
  };
}

function findIntermediate(source: PentatonicField, destination: PentatonicField, pool: readonly PentatonicField[]): PentatonicField | null {
  let best: { field: PentatonicField; score: number } | null = null;
  const sourceId = canonicalPitchSetId(source.pitchClasses);
  const destinationId = canonicalPitchSetId(destination.pitchClasses);
  for (const field of pool) {
    const id = canonicalPitchSetId(field.pitchClasses);
    if (id === sourceId || id === destinationId) continue;
    const toSource = sharedCount(field.pitchClasses, source.pitchClasses);
    const toDestination = sharedCount(field.pitchClasses, destination.pitchClasses);
    if (toSource < 2 || toDestination < 2) continue;
    const score = Math.min(toSource, toDestination) * 2 + toSource;
    if (!best || score > best.score) best = { field, score };
  }
  return best?.field ?? null;
}

function sharedCount(left: readonly number[], right: readonly number[]): number {
  return left.filter((pc) => right.includes(pc)).length;
}

function nearestTo(reference: number, pitchClasses: readonly number[]): number | null {
  if (pitchClasses.length === 0) return null;
  return [...pitchClasses].sort((left, right) => {
    const delta = pcAbs(left, reference) - pcAbs(right, reference);
    return delta !== 0 ? delta : left - right;
  })[0]!;
}

function pcAbs(left: number, right: number): number {
  const raw = Math.abs((left % 12) - (right % 12));
  return Math.min(raw, 12 - raw);
}

function bestPerSet<T extends { destination: PentatonicField; score: number }>(rows: readonly T[]): T[] {
  const kept = new Map<string, T>();
  for (const row of rows) {
    const id = canonicalPitchSetId(row.destination.pitchClasses);
    const existing = kept.get(id);
    if (!existing || row.score > existing.score) kept.set(id, row);
  }
  return [...kept.values()];
}

function moveExplanation(outness: OutnessLevel, destination: PentatonicField, distance: FieldDistance, returnPath: ReturnPath): string {
  const bridge = returnPath.intermediate ? ` Return can pass through ${returnPath.intermediate.displayName}.` : ' Return uses the shared tones.';
  return `${outness.toLowerCase()} move to ${destination.displayName}. ${distance.sharedCount} shared notes, ${distance.distanceClass.toLowerCase()} distance.${bridge}`;
}

export function assessFieldWalkStrategy(source: PentatonicField): { emerges: boolean; status: 'STRATEGY'; operatorAdded: false; steps: readonly string[]; note: string } {
  const seen = new Set<string>([canonicalPitchSetId(source.pitchClasses)]);
  const steps = [source.displayName];
  let current = source;
  let oneNoteSteps = 0;
  for (let index = 0; index < 3; index += 1) {
    const plan = planGradedOut({ source: current, outness: 'SUBTLE', home: source, avoidPitchSets: [...seen] });
    if (plan.disposition !== 'MOVE') break;
    const oneNote = plan.distance.sharedCount === 4 && plan.distance.changedPitchClasses.source.length === 1;
    if (!oneNote) break;
    oneNoteSteps += 1;
    seen.add(canonicalPitchSetId(plan.destination.pitchClasses));
    steps.push(plan.destination.displayName);
    current = plan.destination;
  }
  const emerges = oneNoteSteps >= 2;
  return {
    emerges,
    status: 'STRATEGY',
    operatorAdded: false,
    steps,
    note: emerges
      ? 'One-note drift appears when subtle graded moves are repeated. FIELD_WALK stays a strategy, not an operator.'
      : 'Repeated subtle moves did not produce a one-note walk. FIELD_WALK was not added as an operator.',
  };
}

export function minorField(reference: string): PentatonicField {
  const field = fieldFromResource('minor_pentatonic', reference);
  if (!field) throw new Error(`minor pentatonic ${reference} missing`);
  return field;
}
