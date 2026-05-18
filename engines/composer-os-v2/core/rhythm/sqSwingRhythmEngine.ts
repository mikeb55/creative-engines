/**
 * SQ swing rhythm engine — tempo-adaptive Friberg–Sundström swing ratio on abstract line NoteEvents.
 */

import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { NoteEvent } from '../counterpoint/abstractLineSet';

const beatMs = (bpm: number) => 60000 / bpm;
const straightEighthMs = (bpm: number) => beatMs(bpm) / 2;
const tripletShortMs = (bpm: number) => beatMs(bpm) / 3;

const shortNoteFloor = (sensitivity: number) => {
  const s = Math.max(0, Math.min(1, sensitivity));
  return 60 + (150 - 60) * (1 - s);
};

export function swingRatio(bpm: number, sensitivity: number): number {
  const beat = beatMs(bpm);
  const floor = shortNoteFloor(sensitivity);
  const baseShort = Math.max(floor, beat / 3);
  const slowness = Math.max(0, Math.min(1, (180 - bpm) / 100));
  const overDot = slowness * slowness * 0.45 * (0.5 + sensitivity);
  const short = baseShort * (1 - overDot * 0.35);
  const long = beat - short;
  return Math.max(1.0, Math.min(3.5, long / short));
}

export function longNoteMs(bpm: number, sensitivity: number): number {
  const r = swingRatio(bpm, sensitivity);
  return beatMs(bpm) * (r / (r + 1));
}

export function shortNoteMs(bpm: number, sensitivity: number): number {
  const r = swingRatio(bpm, sensitivity);
  return beatMs(bpm) * (1 / (r + 1));
}

void straightEighthMs;
void tripletShortMs;

export interface SqSwingRhythmEnginePolicy {
  swingStyle: 'none' | 'jazz' | 'concert' | 'folk_jazz';
  swingIntensity: number;
  bpm: number;
}

function inferSwingStyleFromVrbId(
  vrbId: string,
  swingFeel?: boolean,
): SqSwingRhythmEnginePolicy['swingStyle'] {
  const id = vrbId.trim().toLowerCase();
  if (id === 'turtle_island' || id === 'turtle_island_quartet' || id === 'turtleisland' || id === 'ti') {
    return 'jazz';
  }
  if (
    id === 'gershwin' ||
    id === 'george_gershwin' ||
    id === 'cole_porter' ||
    id === 'porter'
  ) {
    return 'concert';
  }
  if (id === 'satie' || id === 'erik_satie') {
    return 'none';
  }
  return swingFeel ? 'concert' : 'none';
}

export function buildSwingPolicy(bundle: VoiceRuleBundle, bpm: number): SqSwingRhythmEnginePolicy {
  const intensity =
    bundle.swingIntensity !== undefined
      ? Math.max(0, Math.min(1, bundle.swingIntensity))
      : 0.5;
  const swingStyle =
    bundle.swingStyle ?? inferSwingStyleFromVrbId(bundle.voiceId, bundle.swingFeel);
  return {
    swingStyle,
    swingIntensity: intensity,
    bpm: Math.max(40, Math.min(300, bpm)),
  };
}

function isOnBeat(offsetBars: number): boolean {
  const frac = Math.abs(offsetBars % 0.5);
  return frac < 0.05 || frac > 0.45;
}

function isOffBeatEighth(offsetBars: number): boolean {
  const frac = ((offsetBars % 0.5) + 0.5) % 0.5;
  return Math.abs(frac - 0.25) < 0.05;
}

function styleLongFraction(longFraction: number, swingStyle: SqSwingRhythmEnginePolicy['swingStyle']): number {
  if (swingStyle === 'folk_jazz') return longFraction * 0.85;
  if (swingStyle === 'concert') return longFraction * 0.92;
  return longFraction;
}

export function applySwingTransform(
  notes: NoteEvent[],
  policy: SqSwingRhythmEnginePolicy,
  maxOffsetBars?: number,
): NoteEvent[] {
  if (policy.swingStyle === 'none') {
    return notes;
  }

  const intensity = policy.swingIntensity;
  const longFraction = styleLongFraction(
    longNoteMs(policy.bpm, intensity) / beatMs(policy.bpm),
    policy.swingStyle,
  );
  const maxOff =
    maxOffsetBars !== undefined && Number.isFinite(maxOffsetBars) ? Math.max(0, maxOffsetBars) : undefined;

  return notes.map((note) => {
    if (isOnBeat(note.offsetBars) || !isOffBeatEighth(note.offsetBars)) {
      return note;
    }
    const baseBeat = Math.floor(note.offsetBars + 1e-9);
    let offsetBars = baseBeat + longFraction;
    if (maxOff !== undefined) {
      offsetBars = Math.max(0, Math.min(maxOff, offsetBars));
    }
    return { ...note, offsetBars };
  });
}

export function sqSwingRhythmEngineId(): string {
  return 'sq_swing';
}
