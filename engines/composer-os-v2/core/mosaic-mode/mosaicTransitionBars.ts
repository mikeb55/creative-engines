/**
 * Mosaic Mode — anticipatory transition bar fragments before section boundaries.
 */

import type { CoreMotif } from '../motif/motifEngineTypes';
import type { MosaicModeSectionPlan, MosaicModeSectionPlanEntry } from './precomputeMosaicEffectiveHarmonyBars';

export interface MidiNote {
  pitch: number;
  startBeat: number;
  duration: number;
  motifRef: string;
  velocity?: number;
}

export interface MosaicTransitionBarMatch {
  isTransition: boolean;
  incomingSection?: MosaicModeSectionPlanEntry;
}

/** Beat 3 = startBeat 2, beat 4 = startBeat 3 (quarter-beat space, 4/4). */
const TRANSITION_ATTACK_BEATS: readonly number[][] = [[2], [2, 3], [2, 2.5, 3]];

export function isMosaicTransitionBar(
  barIndex: number,
  sectionPlan: MosaicModeSectionPlan
): MosaicTransitionBarMatch {
  for (const section of sectionPlan) {
    if (section.startBar > 1 && barIndex === section.startBar - 1) {
      return { isTransition: true, incomingSection: section };
    }
  }
  return { isTransition: false };
}

export function buildTransitionBarNotes(
  barIndex: number,
  incomingSection: MosaicModeSectionPlanEntry,
  incomingMotifVariant: CoreMotif,
  tonicDeltaSemitones: number
): MidiNote[] {
  void barIndex;
  const fragmentIntervals = incomingMotifVariant.intervalPattern.slice(0, 2);
  if (fragmentIntervals.length === 0) return [];

  const tonicPc = ((tonicDeltaSemitones % 12) + 12) % 12;
  let pitch = 60 + tonicPc;
  const pitches = [pitch];
  for (const iv of fragmentIntervals) {
    pitch += iv;
    pitches.push(pitch);
  }

  const noteCount = Math.min(pitches.length, 3);
  const attacks = TRANSITION_ATTACK_BEATS[noteCount - 1] ?? [2];
  const motifRef = `mosaic_transition_${incomingSection.sectionLabel}`;
  const out: MidiNote[] = [];

  for (let i = 0; i < noteCount; i++) {
    const startBeat = attacks[i];
    if (startBeat === undefined || startBeat < 2) continue;
    out.push({
      pitch: pitches[i]!,
      startBeat,
      duration: 0.5,
      motifRef,
    });
  }

  return out;
}
