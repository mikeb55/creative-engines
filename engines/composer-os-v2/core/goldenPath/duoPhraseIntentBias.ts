/**
 * Songwriter phraseIntentBias — per-bar MIDI nudge on duo golden-path guitar voice 1 only.
 */

import type { MeasureModel, NoteEvent } from '../score-model/scoreModelTypes';
import { clampPitch } from './guitarBassDuoHarmony';

export type PhraseIntentBias = 'ascending' | 'descending' | 'arch' | 'neutral';

/** 1-based position within the current 4-bar phrase (1–4). */
export function phrasePositionInFourBarPhrase(bar: number): number {
  return ((bar - 1) % 4) + 1;
}

/**
 * Deterministic semitone nudge (±2 max) from songwriter phrase contour bias.
 * Neutral → 0 on every bar.
 */
export function phraseIntentBiasPitchNudgeSemitones(bias: PhraseIntentBias, bar: number): number {
  if (bias === 'neutral') return 0;
  const pos = phrasePositionInFourBarPhrase(bar);
  switch (bias) {
    case 'arch':
      if (pos === 1) return 2;
      if (pos === 2) return 1;
      return 0;
    case 'descending':
      if (pos === 1) return 1;
      if (pos === 2) return 0;
      if (pos === 3) return -1;
      return -2;
    case 'ascending':
      if (pos === 1) return -1;
      if (pos === 2) return 0;
      if (pos === 3) return 1;
      return 2;
    default:
      return 0;
  }
}

/** Apply phraseIntentBias nudge to guitar voice-1 notes only; clamp to register window. */
export function applyPhraseIntentBiasToGuitarV1Measure(
  m: MeasureModel,
  bias: PhraseIntentBias,
  bar: number,
  effectiveLow: number,
  effectiveHigh: number
): void {
  const nudge = phraseIntentBiasPitchNudgeSemitones(bias, bar);
  if (nudge === 0) return;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    if ((n.voice ?? 1) !== 1) continue;
    n.pitch = clampPitch(n.pitch + nudge, effectiveLow, effectiveHigh);
  }
}
