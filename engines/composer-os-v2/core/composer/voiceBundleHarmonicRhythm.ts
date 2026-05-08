/**
 * Voice-bundle harmonic rhythm overlay on bar-level chord symbols (Phase 2+3a).
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeChordToken } from '../harmony/chordProgressionParser';

export interface VoiceBundleHarmonicRhythmState {
  anchorChord: string;
  anchorStartBar: number;
}

/** Apply min/max bar hold windows before emitting a chord change (sequential bar reads preferred). */
export function applyVoiceBundleHarmonicRhythm(
  barIndex: number,
  candidateChord: string,
  context: CompositionContext
): string {
  const vb = context.voiceBundle;
  const meta = context.generationMetadata;
  if (!vb) return candidateChord;

  const minB = vb.harmonicRhythm.minChordDurationBars;
  const maxB = vb.harmonicRhythm.maxChordDurationBars;

  if (minB <= 0) {
    return candidateChord;
  }

  let state = meta.voiceBundleHarmonicRhythmState as VoiceBundleHarmonicRhythmState | undefined;

  if (!state || barIndex < state.anchorStartBar) {
    state = { anchorChord: candidateChord, anchorStartBar: barIndex };
    meta.voiceBundleHarmonicRhythmState = state;
    return candidateChord;
  }

  const held = barIndex - state.anchorStartBar + 1;
  const candTok = normalizeChordToken(candidateChord);
  const anchorTok = normalizeChordToken(state.anchorChord);

  if (candTok === anchorTok) {
    if (held > maxB) {
      state.anchorChord = candidateChord;
      state.anchorStartBar = barIndex;
    }
    return state.anchorChord;
  }

  if (held < minB) {
    return state.anchorChord;
  }

  state.anchorChord = candidateChord;
  state.anchorStartBar = barIndex;
  return candidateChord;
}
