/**
 * Composer OS V2 — Barry Harris style validation
 */

import type { ScoreModel } from '../../score-model/scoreModelTypes';

export interface BarryHarrisValidationResult {
  valid: boolean;
  errors: string[];
}

function maxVoiceLeadJump(pitches: number[]): number {
  let max = 0;
  for (let i = 1; i < pitches.length; i++) {
    max = Math.max(max, Math.abs(pitches[i] - pitches[i - 1]));
  }
  return max;
}

export function validateBarryHarrisConformance(score: ScoreModel): BarryHarrisValidationResult {
  const errors: string[] = [];

  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (guitar) {
    const allPitches: number[] = [];
    for (const m of guitar.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') allPitches.push(e.pitch);
      }
    }
    const maxJump = maxVoiceLeadJump(allPitches);
    if (maxJump > 12) errors.push('Voice-leading jumps excessive for current duo grammar');
  }

  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (bass) {
    const allPitches: number[] = [];
    for (const m of bass.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') allPitches.push(e.pitch);
      }
    }
    const maxJump = maxVoiceLeadJump(allPitches);
    /** Walking bass + register shifts: allow up to 14 st (echo / cadence moves). */
    if (maxJump > 14) errors.push('Bass voice-leading jumps excessive');
  }

  const chordCount = new Set(score.parts.flatMap((p) => p.measures.map((m) => m.chord).filter(Boolean))).size;
  if (chordCount < 3) errors.push('Harmony too static for current duo grammar');

  return { valid: errors.length === 0, errors };
}
