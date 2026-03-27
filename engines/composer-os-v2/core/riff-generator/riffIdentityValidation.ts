/**
 * Riff identity rules: repeating cell, syncopation, asymmetry, hook, loop closure.
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RiffRhythmSegment } from './riffTypes';
import {
  countMaxRhythmRepeats,
  hasSyncopation,
  rhythmFingerprint,
} from './riffRhythm';

export interface RiffIdentityResult {
  valid: boolean;
  errors: string[];
}

function guitarNotes(score: ScoreModel): { bar: number; pitch: number; start: number }[] {
  const g = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const out: { bar: number; pitch: number; start: number }[] = [];
  if (!g) return out;
  for (const m of g.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') {
        out.push({
          bar: m.index,
          pitch: (e as { pitch: number }).pitch,
          start: (e as { startBeat: number }).startBeat,
        });
      }
    }
  }
  return out;
}

function hasHook(notes: { pitch: number }[]): boolean {
  if (notes.length < 2) return false;
  for (let i = 1; i < notes.length; i++) {
    const d = Math.abs(notes[i]!.pitch - notes[i - 1]!.pitch);
    if (d >= 4) return true;
    if (d === 1) return true;
  }
  return false;
}

/** Reject strict A–B–B–A palindrome of bar rhythms (reads as “square” symmetry). */
function isPalindromeBarSymmetry(perBar: RiffRhythmSegment[][]): boolean {
  if (perBar.length !== 4) return false;
  const f = perBar.map(rhythmFingerprint);
  return f[0] === f[3] && f[1] === f[2] && f[0] !== f[1];
}

export function validateRiffIdentity(
  score: ScoreModel,
  perBarRhythm: RiffRhythmSegment[][]
): RiffIdentityResult {
  const errors: string[] = [];

  if (countMaxRhythmRepeats(perBarRhythm) < 2) {
    errors.push('Riff identity: repeating rhythmic cell not found (need ≥2 occurrences)');
  }
  if (!hasSyncopation(perBarRhythm)) {
    errors.push('Riff identity: syncopation or off-beat attack required');
  }
  if (isPalindromeBarSymmetry(perBarRhythm)) {
    errors.push('Riff identity: avoid full A–B–B–A bar-rhythm palindrome');
  }

  const notes = guitarNotes(score);
  if (!hasHook(notes)) {
    errors.push('Riff identity: hook required (leap ≥4 semitones or chromatic step)');
  }

  return { valid: errors.length === 0, errors };
}
