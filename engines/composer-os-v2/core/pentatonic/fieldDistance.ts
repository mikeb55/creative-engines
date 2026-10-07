/**
 * Dev 7A field distance.
 * A pentatonic field is a colour collection, not a chord-scale prescription.
 * Shared pitch classes are not voice-leading. Register motion is reported only when notes exist.
 */

import { getPentatonicColourResource, listPentatonicColourResources } from './colourRegistry';
import { canonicalPitchSet, canonicalPitchSetId, mod12, parseNoteToken, sharpName, spellFromReference } from './pitch';

export const PENTATONIC_FIELD_DISTANCE_VERSION = 'pentatonic-field-distance-7a';

export type FieldKind = 'REGISTERED' | 'EXTRACTED';

export type DistanceClass = 'IDENTICAL' | 'NEAR' | 'RELATED' | 'OUTSIDE' | 'REMOTE';

export type CentreRelationship = 'SAME_CENTRE' | 'SHARED_CENTRE_TONE' | 'DIFFERENT_CENTRE' | 'UNKNOWN';

export type VoiceLeadingKind = 'REGISTER' | 'PITCH_CLASS_PROXIMITY';

export interface MotionPair {
  from: number;
  to: number;
  semitones: number;
}

export interface PentatonicField {
  resourceId: string | null;
  displayName: string;
  referenceSpelling: string;
  referencePc: number;
  pitchClasses: readonly number[];
  intervalsFromReference: readonly number[];
  noteNames: readonly string[];
  kind: FieldKind;
  canonicalIntervalClass: string;
  canonicalFamily: string;
  /** Other registered resources that are rotations of this same pitch-class set. Spelling stays. */
  rotationOfResourceIds: readonly string[];
}

export interface FieldDistance {
  version: typeof PENTATONIC_FIELD_DISTANCE_VERSION;
  sharedPitchClasses: readonly number[];
  sharedCount: number;
  changedPitchClasses: { source: readonly number[]; destination: readonly number[] };
  minimumVoiceMotion: number;
  voiceMotionPairs: readonly MotionPair[];
  voiceLeading: VoiceLeadingKind;
  centreRelationship: CentreRelationship;
  chromaticDisplacement: number;
  continuityPotential: number;
  distanceClass: DistanceClass;
  rotationEquivalent: boolean;
  canonicalFamily: string;
}

function intervalKey(intervals: readonly number[]): number {
  let key = 0;
  for (const interval of intervals) key = key * 16 + interval;
  return key;
}

export function pcDistance(left: number, right: number): number {
  const raw = Math.abs(mod12(left) - mod12(right));
  return Math.min(raw, 12 - raw);
}

export function rotationNormalForm(pitchClasses: readonly number[]): number[] {
  const sorted = canonicalPitchSet(pitchClasses);
  let best: number[] = [];
  let bestKey = '';
  for (const start of sorted) {
    const relative = sorted.map((pc) => mod12(pc - start)).sort((a, b) => a - b);
    const key = relative.join(',');
    if (!bestKey || key < bestKey) {
      best = relative;
      bestKey = key;
    }
  }
  return best;
}

export function adjacentSemitoneCount(pitchClasses: readonly number[]): number {
  const sorted = canonicalPitchSet(pitchClasses);
  if (sorted.length < 2) return 0;
  let count = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    const next = sorted[(index + 1) % sorted.length]!;
    const gap = index === sorted.length - 1 ? mod12(next + 12 - current) : next - current;
    if (gap === 1) count += 1;
  }
  return count;
}

interface RegistryMatch {
  resourceId: string;
  displayName: string;
  family: string;
  referencePc: number;
  intervals: readonly number[];
  noteNames: readonly string[];
}

function registryMatches(pitchClasses: readonly number[]): RegistryMatch[] {
  const sorted = canonicalPitchSet(pitchClasses);
  const matches: RegistryMatch[] = [];
  for (const resource of listPentatonicColourResources()) {
    for (const referencePc of sorted) {
      const intervals = sorted.map((pc) => mod12(pc - referencePc)).sort((a, b) => a - b);
      if (intervalKey(intervals) !== intervalKey(resource.intervals)) continue;
      const spelling = sharpName(referencePc);
      matches.push({
        resourceId: resource.id,
        displayName: resource.displayName,
        family: resource.family,
        referencePc,
        intervals,
        noteNames: spellFromReference(spelling, resource.intervals, resource.letterSteps),
      });
    }
  }
  return matches;
}

function chooseMatch(matches: RegistryMatch[], preferredReference: number | null): RegistryMatch | null {
  if (matches.length === 0) return null;
  if (preferredReference !== null) {
    const atCentre = matches.find((match) => match.referencePc === mod12(preferredReference));
    if (atCentre) return atCentre;
  }
  const normal = rotationNormalForm(matches[0]!.intervals.map((interval) => mod12(matches[0]!.referencePc + interval)));
  const canonical = matches.find((match) => match.intervals.join(',') === normal.join(','));
  return canonical ?? matches[0]!;
}

export function fieldFromResource(resourceId: string, referenceSpelling: string): PentatonicField | null {
  const resource = getPentatonicColourResource(resourceId);
  const reference = parseNoteToken(referenceSpelling);
  if (!resource || !reference) return null;
  const pitchClasses = canonicalPitchSet(resource.intervals.map((interval) => mod12(reference.pc + interval)));
  const spelled = spellFromReference(reference.spelling, resource.intervals, resource.letterSteps);
  const intervals = resource.intervals.map((interval) => interval);
  return describeField({
    resourceId: resource.id,
    displayName: `${reference.spelling} ${resource.displayName}`,
    referenceSpelling: reference.spelling,
    referencePc: reference.pc,
    pitchClasses,
    intervalsFromReference: intervals,
    noteNames: spelled,
    kind: 'REGISTERED',
    familyHint: resource.family,
  });
}

export function fieldFromPitchClasses(
  pitchClasses: readonly number[],
  referenceSpelling?: string | null
): PentatonicField | null {
  const sorted = canonicalPitchSet(pitchClasses);
  if (sorted.length !== 5) return null;
  const preferred = referenceSpelling ? parseNoteToken(referenceSpelling) : null;
  const preferredPc = preferred && sorted.includes(preferred.pc) ? preferred.pc : sorted[0]!;
  const matches = registryMatches(sorted);
  const chosen = chooseMatch(matches, preferredPc);
  if (!chosen) {
    const spelling = preferred?.spelling ?? sharpName(preferredPc);
    const intervals = sorted.map((pc) => mod12(pc - preferredPc)).sort((a, b) => a - b);
    return describeField({
      resourceId: null,
      displayName: 'Extracted field',
      referenceSpelling: spelling,
      referencePc: preferredPc,
      pitchClasses: sorted,
      intervalsFromReference: intervals,
      noteNames: intervals.map((interval) => sharpName(mod12(preferredPc + interval))),
      kind: 'EXTRACTED',
      familyHint: 'extracted',
    });
  }
  const spelling = preferred && preferred.pc === chosen.referencePc ? preferred.spelling : sharpName(chosen.referencePc);
  const resource = getPentatonicColourResource(chosen.resourceId);
  const noteNames = resource
    ? spellFromReference(spelling, resource.intervals, resource.letterSteps)
    : chosen.noteNames;
  return describeField({
    resourceId: chosen.resourceId,
    displayName: `${spelling} ${chosen.displayName}`,
    referenceSpelling: spelling,
    referencePc: chosen.referencePc,
    pitchClasses: sorted,
    intervalsFromReference: [...chosen.intervals],
    noteNames,
    kind: 'REGISTERED',
    familyHint: chosen.family,
  });
}

function describeField(input: {
  resourceId: string | null;
  displayName: string;
  referenceSpelling: string;
  referencePc: number;
  pitchClasses: readonly number[];
  intervalsFromReference: readonly number[];
  noteNames: readonly string[];
  kind: FieldKind;
  familyHint: string;
}): PentatonicField {
  const matches = registryMatches(input.pitchClasses);
  const rotationOfResourceIds = [...new Set(matches.map((match) => match.resourceId))].filter((id) => id !== input.resourceId);
  return {
    resourceId: input.resourceId,
    displayName: input.displayName,
    referenceSpelling: input.referenceSpelling,
    referencePc: input.referencePc,
    pitchClasses: canonicalPitchSet(input.pitchClasses),
    intervalsFromReference: [...input.intervalsFromReference],
    noteNames: [...input.noteNames],
    kind: input.kind,
    canonicalIntervalClass: rotationNormalForm(input.pitchClasses).join(','),
    canonicalFamily: input.familyHint,
    rotationOfResourceIds,
  };
}

export function minimumAssignment(source: readonly number[], destination: readonly number[]): { sum: number; pairs: MotionPair[] } {
  const from = [...source];
  const to = [...destination];
  if (from.length === 0 && to.length === 0) return { sum: 0, pairs: [] };
  let bestSum = Number.POSITIVE_INFINITY;
  let bestPairs: MotionPair[] = [];
  const used = new Array<boolean>(to.length).fill(false);
  const current: MotionPair[] = [];

  const consider = (sum: number, pairs: MotionPair[]) => {
    if (sum < bestSum) {
      bestSum = sum;
      bestPairs = pairs.map((pair) => ({ ...pair }));
    }
  };

  const walk = (index: number, sum: number) => {
    if (sum >= bestSum) return;
    if (index === from.length) {
      let extra = sum;
      const pairs = current.map((pair) => ({ ...pair }));
      for (let mark = 0; mark < to.length; mark += 1) {
        if (used[mark]) continue;
        extra += 6;
        pairs.push({ from: -1, to: to[mark]!, semitones: 6 });
      }
      consider(extra, pairs);
      return;
    }
    for (let mark = 0; mark < to.length; mark += 1) {
      if (used[mark]) continue;
      used[mark] = true;
      const semitones = pcDistance(from[index]!, to[mark]!);
      current.push({ from: from[index]!, to: to[mark]!, semitones });
      walk(index + 1, sum + semitones);
      current.pop();
      used[mark] = false;
    }
    current.push({ from: from[index]!, to: -1, semitones: 6 });
    walk(index + 1, sum + 6);
    current.pop();
  };

  if (from.length === 0) {
    return {
      sum: to.length * 6,
      pairs: to.map((pc) => ({ from: -1, to: pc, semitones: 6 })),
    };
  }
  walk(0, 0);
  return { sum: bestSum, pairs: bestPairs };
}

export function measureFieldDistance(
  source: PentatonicField,
  destination: PentatonicField,
  registerMidis?: readonly number[]
): FieldDistance {
  const sourceSet = canonicalPitchSet(source.pitchClasses);
  const destinationSet = canonicalPitchSet(destination.pitchClasses);
  const shared = sourceSet.filter((pc) => destinationSet.includes(pc));
  const onlySource = sourceSet.filter((pc) => !destinationSet.includes(pc));
  const onlyDestination = destinationSet.filter((pc) => !sourceSet.includes(pc));
  const assignment = minimumAssignment(onlySource, onlyDestination);
  const matched = assignment.pairs.filter((pair) => pair.from >= 0 && pair.to >= 0);
  const chromaticDisplacement = matched.length === 0 ? (onlySource.length + onlyDestination.length > 0 ? 6 : 0) : matched.reduce((sum, pair) => sum + pair.semitones, 0) / matched.length;
  const sameSet = canonicalPitchSetId(sourceSet) === canonicalPitchSetId(destinationSet);
  const centreRelationship = centreOf(source, destination);
  const continuityPotential = sameSet
    ? 1
    : Math.max(0, Math.min(1, (shared.length / 5) * 0.65 + (1 - Math.min(chromaticDisplacement, 6) / 6) * 0.25 + centreBonus(centreRelationship)));
  const distanceClass = classify(shared.length, chromaticDisplacement, sameSet);
  let voiceLeading: VoiceLeadingKind = 'PITCH_CLASS_PROXIMITY';
  let minimumVoiceMotion = assignment.sum;
  let voiceMotionPairs = assignment.pairs;
  if (registerMidis && registerMidis.length > 0) {
    const registered = registerMotion(registerMidis, destinationSet);
    voiceLeading = 'REGISTER';
    minimumVoiceMotion = registered.sum;
    voiceMotionPairs = registered.pairs;
  }
  return {
    version: PENTATONIC_FIELD_DISTANCE_VERSION,
    sharedPitchClasses: shared,
    sharedCount: shared.length,
    changedPitchClasses: { source: onlySource, destination: onlyDestination },
    minimumVoiceMotion,
    voiceMotionPairs,
    voiceLeading,
    centreRelationship,
    chromaticDisplacement,
    continuityPotential,
    distanceClass,
    rotationEquivalent: sameSet && (source.resourceId !== destination.resourceId || source.referencePc !== destination.referencePc),
    canonicalFamily: source.canonicalFamily === destination.canonicalFamily ? source.canonicalFamily : `${source.canonicalFamily}|${destination.canonicalFamily}`,
  };
}

function centreBonus(relationship: CentreRelationship): number {
  if (relationship === 'SAME_CENTRE') return 0.1;
  if (relationship === 'SHARED_CENTRE_TONE') return 0.05;
  return 0;
}

function centreOf(source: PentatonicField, destination: PentatonicField): CentreRelationship {
  if (!Number.isFinite(source.referencePc) || !Number.isFinite(destination.referencePc)) return 'UNKNOWN';
  if (source.referencePc === destination.referencePc) return 'SAME_CENTRE';
  const sourceInDestination = destination.pitchClasses.includes(source.referencePc);
  const destinationInSource = source.pitchClasses.includes(destination.referencePc);
  if (sourceInDestination && destinationInSource) return 'SHARED_CENTRE_TONE';
  return 'DIFFERENT_CENTRE';
}

function classify(sharedCount: number, meanMotion: number, sameSet: boolean): DistanceClass {
  if (sameSet || sharedCount >= 5) return 'IDENTICAL';
  if (sharedCount >= 4 && meanMotion <= 2) return 'NEAR';
  if (sharedCount >= 4 || (sharedCount === 3 && meanMotion <= 2)) return 'RELATED';
  if (sharedCount === 3 || sharedCount === 2 || (sharedCount === 1 && meanMotion <= 1)) return 'OUTSIDE';
  return 'REMOTE';
}

function registerMotion(midis: readonly number[], destinationPitchClasses: readonly number[]): { sum: number; pairs: MotionPair[] } {
  const pairs: MotionPair[] = [];
  let sum = 0;
  for (const midi of midis) {
    let bestPc = destinationPitchClasses[0] ?? 0;
    let bestDelta = 99;
    for (const pc of destinationPitchClasses) {
      for (let octave = -2; octave <= 2; octave += 1) {
        const candidate = midi - (midi % 12) + pc + octave * 12;
        const delta = Math.abs(candidate - midi);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPc = pc;
        }
      }
    }
    sum += bestDelta;
    pairs.push({ from: mod12(midi), to: bestPc, semitones: bestDelta });
  }
  return { sum, pairs };
}

export function registeredFieldsAround(referenceSpelling: string): PentatonicField[] {
  const reference = parseNoteToken(referenceSpelling);
  if (!reference) return [];
  const fields: PentatonicField[] = [];
  for (const resource of listPentatonicColourResources()) {
    for (let shift = 0; shift < 12; shift += 1) {
      const spelling = shift === 0 ? reference.spelling : sharpName(mod12(reference.pc + shift));
      const field = fieldFromResource(resource.id, spelling);
      if (field) fields.push(field);
    }
  }
  return fields;
}
