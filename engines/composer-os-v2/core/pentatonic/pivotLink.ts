/**
 * Dev 7B PIVOT_LINK.
 * Checks a source and a destination that already exist. Does not choose the destination.
 * Pitch-class overlap is not voice-leading. A chromatic run is never the link.
 */

import { measureFieldDistance, pcDistance, type PentatonicField } from './fieldDistance';
import { buildReturnPath, type ReturnPath } from './gradedOut';
import { mod12 } from './pitch';

export const PENTATONIC_PIVOT_LINK_VERSION = 'pentatonic-pivot-link-7b';

export type PivotMechanism =
  | 'COMMON_TONE'
  | 'NEAREST_NOTE'
  | 'HELD_LANDING'
  | 'MOTIF_PRESERVING'
  | 'NO_CREDIBLE_PIVOT'
  | 'NONE';

export type MotifPreservation = 'YES' | 'PARTIAL' | 'NO';

export interface PivotLinkPlan {
  version: typeof PENTATONIC_PIVOT_LINK_VERSION;
  source: PentatonicField;
  destination: PentatonicField;
  commonTones: readonly number[];
  movingTones: readonly { from: number; to: number; semitones: number }[];
  totalMotion: number;
  pivotNotes: readonly number[];
  landingNote: number | null;
  returnPossibility: boolean;
  returnPath: ReturnPath;
  mechanism: PivotMechanism;
  motifPreservation: MotifPreservation | null;
  voiceLeading: 'REGISTER' | 'PITCH_CLASS_PROXIMITY';
  linkPhraseNeeded: boolean;
  scalarBridge: false;
  compact: boolean;
  explanation: string;
}

export function planPivotLink(request: {
  source: PentatonicField;
  destination: PentatonicField;
  home?: PentatonicField | null;
  motifPitchClasses?: readonly number[];
  motifMidis?: readonly number[];
}): PivotLinkPlan {
  const register = request.motifMidis && request.motifMidis.length > 0 ? request.motifMidis : undefined;
  const distance = measureFieldDistance(request.source, request.destination, register);
  const moving = distance.voiceMotionPairs.filter((pair) => pair.from >= 0 && pair.to >= 0 && pair.semitones > 0);
  const commonTones = distance.sharedPitchClasses;
  const motifPreservation = request.motifPitchClasses && request.motifPitchClasses.length > 0
    ? preserveMotif(request.motifPitchClasses, request.destination.pitchClasses)
    : request.motifMidis && request.motifMidis.length > 0
      ? preserveMotif(request.motifMidis.map((midi) => mod12(midi)), request.destination.pitchClasses)
      : null;
  const compact = moving.length <= 2 && moving.every((pair) => pair.semitones <= 2);
  const same = distance.distanceClass === 'IDENTICAL';
  const mechanism = chooseMechanism(commonTones.length, moving, compact, motifPreservation, same);
  const returnPath = buildReturnPath(request.destination, request.source, request.home ?? null);
  const noPivot = mechanism === 'NO_CREDIBLE_PIVOT';
  const linkPhraseNeeded = !same && !noPivot && commonTones.length < 4 && mechanism !== 'NONE';
  const pivotNotes = noPivot ? [] : commonTones.length > 0 ? commonTones.slice(0, 2) : moving.slice(0, 1).map((pair) => pair.to);
  const landingNote = noPivot ? null : (commonTones[0] ?? moving[0]?.to ?? request.destination.referencePc);
  return {
    version: PENTATONIC_PIVOT_LINK_VERSION,
    source: request.source,
    destination: request.destination,
    commonTones,
    movingTones: moving,
    totalMotion: distance.minimumVoiceMotion,
    pivotNotes,
    landingNote,
    returnPossibility: returnPath.credible,
    returnPath,
    mechanism,
    motifPreservation,
    voiceLeading: distance.voiceLeading,
    linkPhraseNeeded,
    scalarBridge: false,
    compact: same || compact,
    explanation: explain(mechanism, distance.voiceLeading, same, compact, commonTones.length),
  };
}

function chooseMechanism(
  sharedCount: number,
  moving: readonly { semitones: number }[],
  compact: boolean,
  motif: MotifPreservation | null,
  same: boolean
): PivotMechanism {
  if (same) return 'NONE';
  if (sharedCount === 0) return 'NO_CREDIBLE_PIVOT';
  if (motif === 'YES' || motif === 'PARTIAL') return 'MOTIF_PRESERVING';
  if (sharedCount === 1 && compact) return 'HELD_LANDING';
  if (sharedCount >= 1 && moving.length > 0 && moving.every((pair) => pair.semitones <= 2)) return 'NEAREST_NOTE';
  if (sharedCount >= 1) return 'COMMON_TONE';
  return 'NO_CREDIBLE_PIVOT';
}

function preserveMotif(motif: readonly number[], destination: readonly number[]): MotifPreservation {
  if (motif.length < 2 || destination.length === 0) return 'NO';
  const reseated = motif.map((pc) => nearest(pc, destination));
  const sourceContour = contour(motif);
  const destContour = contour(reseated);
  const signs = sourceContour.filter((step, index) => step === destContour[index]).length;
  const motion = motif.reduce((sum, pc, index) => sum + pcDistance(pc, reseated[index]!), 0);
  if (signs === sourceContour.length && motion <= motif.length * 2) return 'YES';
  if (signs >= Math.ceil(sourceContour.length / 2)) return 'PARTIAL';
  return 'NO';
}

function contour(pitchClasses: readonly number[]): number[] {
  const steps: number[] = [];
  for (let index = 1; index < pitchClasses.length; index += 1) {
    const delta = pitchClasses[index]! - pitchClasses[index - 1]!;
    steps.push(delta === 0 ? 0 : delta > 0 ? 1 : -1);
  }
  return steps;
}

function nearest(pc: number, pitchClasses: readonly number[]): number {
  return [...pitchClasses].sort((left, right) => pcDistance(pc, left) - pcDistance(pc, right) || left - right)[0]!;
}

function explain(mechanism: PivotMechanism, voiceLeading: 'REGISTER' | 'PITCH_CLASS_PROXIMITY', same: boolean, compact: boolean, sharedCount: number): string {
  if (mechanism === 'NO_CREDIBLE_PIVOT') return 'No credible pivot. These fields share no pitch class.';
  if (same || mechanism === 'NONE') return 'No link phrase. The field already holds.';
  const leading = voiceLeading === 'REGISTER'
    ? 'Motion is measured in register.'
    : 'Only pitch-class proximity is known. This is not full voice-leading.';
  const size = compact ? 'One or two notes move.' : 'The fields are far. Hold a common tone or use the return bridge. No scale connects them.';
  if (sharedCount >= 4) return `Hold the field. ${leading}`;
  return `${mechanism.replaceAll('_', ' ').toLowerCase()}. ${size} ${leading}`;
}
