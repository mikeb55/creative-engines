/**
 * SQ anti-metric rhythm engine — Shostakovich accent displacement + Ligeti per-voice phase drift.
 */

import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { NoteEvent } from '../counterpoint/abstractLineSet';

export type SqAntimetricPreset = 'shostakovich' | 'ligeti';

export interface SqAntimetricRhythmEnginePolicy {
  preset: SqAntimetricPreset;
  intensity: number;
  bpm: number;
}

const LIGETI_DRIFT_RATE_PER_VOICE = [0, 0.03, 0.06, 0.09] as const;
const MAX_LIGETI_DRIFT_BARS = 0.45;

function inferPresetFromVrbId(vrbId: string): SqAntimetricPreset {
  const id = vrbId.trim().toLowerCase();
  if (id.includes('ligeti')) return 'ligeti';
  if (id.includes('shostakovich')) return 'shostakovich';
  return 'shostakovich';
}

export function buildAntimetricPolicy(bundle: VoiceRuleBundle, bpm: number): SqAntimetricRhythmEnginePolicy {
  const intensity = 0.7;
  return {
    preset: inferPresetFromVrbId(bundle.voiceId),
    intensity,
    bpm: Math.max(40, Math.min(300, bpm)),
  };
}

function isOnDownbeat(offsetBars: number): boolean {
  const frac = Math.abs(offsetBars % 1);
  return frac < 0.05 || frac > 0.95;
}

function isOffbeatEighth(offsetBars: number): boolean {
  const bar = Math.floor(offsetBars + 1e-9);
  const frac = offsetBars - bar;
  return Math.abs(frac - 0.25) < 0.05;
}

function clampWithinBar(offsetBars: number): number {
  const barStart = Math.floor(offsetBars + 1e-9);
  const barEnd = barStart + 1;
  return Math.max(barStart, Math.min(barEnd - 1e-6, offsetBars));
}

function applyShostakovichTransform(
  notes: NoteEvent[],
  intensity: number,
): NoteEvent[] {
  if (intensity <= 0) return notes;

  const beatBars = 0.25;
  const downbeatNudge = beatBars * 0.5 * intensity;
  const hemiolaPull = beatBars * 0.25 * intensity;

  return notes.map((note) => {
    let offsetBars = note.offsetBars;
    const bar = Math.floor(offsetBars + 1e-9);

    if (isOnDownbeat(offsetBars)) {
      offsetBars += downbeatNudge;
    }

    if (bar % 3 === 0 && isOffbeatEighth(offsetBars)) {
      offsetBars -= hemiolaPull;
    }

    return {
      ...note,
      offsetBars: clampWithinBar(offsetBars),
    };
  });
}

function applyLigetiTransform(
  notes: NoteEvent[],
  intensity: number,
  voiceIndex: number,
): NoteEvent[] {
  if (intensity <= 0) return notes;

  const voiceIdx = Math.max(0, Math.min(3, voiceIndex));
  const rate = LIGETI_DRIFT_RATE_PER_VOICE[voiceIdx]! * intensity;

  return notes.map((note) => {
    const original = note.offsetBars;
    const bar = Math.floor(original + 1e-9);
    const delta = Math.min(rate * bar, MAX_LIGETI_DRIFT_BARS);
    return {
      ...note,
      offsetBars: original + delta,
    };
  });
}

export function applyAntimetricTransform(
  notes: NoteEvent[],
  policy: SqAntimetricRhythmEnginePolicy,
  voiceIndex = 0,
): NoteEvent[] {
  if (policy.intensity <= 0) return notes;

  if (policy.preset === 'ligeti') {
    return applyLigetiTransform(notes, policy.intensity, voiceIndex);
  }

  return applyShostakovichTransform(notes, policy.intensity);
}

export function sqAntimetricRhythmEngineId(): string {
  return 'sq_antimetric';
}
