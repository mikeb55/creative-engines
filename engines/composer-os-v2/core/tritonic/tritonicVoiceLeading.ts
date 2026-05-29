/**
 * V98 — Tritonic cell voice-leading engine.
 * Evaluates pitch-class moves between three-note cells; dictionary-only (no producer wiring).
 */

import type { TritonicCell } from './tritonicCell';

export type VoiceLeadingResult = {
  from: TritonicCell;
  to: TritonicCell;
  /** Semitone movement per voice (from.notes order), length 3. */
  voiceMovement: number[];
  /** 0–1; higher = less movement. */
  smoothness: number;
  valid: boolean;
};

const MAX_VOICE_MOVEMENT = 6;
const VOICE_COUNT = 3;

/** All 3! voice-to-voice assignment permutations. */
const VOICE_PERMUTATIONS: readonly [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/** Shortest chromatic path between pitch classes (−6…+6 semitones). */
export function pitchClassMovement(fromPc: number, toPc: number): number {
  let delta = ((toPc % 12) + 12) % 12 - ((fromPc % 12) + 12) % 12;
  if (delta > MAX_VOICE_MOVEMENT) delta -= 12;
  if (delta < -MAX_VOICE_MOVEMENT) delta += 12;
  return delta;
}

function movementIsValid(movements: readonly number[]): boolean {
  return movements.length === VOICE_COUNT && movements.every((m) => Math.abs(m) <= MAX_VOICE_MOVEMENT);
}

function smoothnessFromMovements(movements: readonly number[]): number {
  const totalAbs = movements.reduce((sum, m) => sum + Math.abs(m), 0);
  const maxTotal = VOICE_COUNT * MAX_VOICE_MOVEMENT;
  return Math.max(0, Math.min(1, 1 - totalAbs / maxTotal));
}

function bestVoiceMovement(from: TritonicCell, to: TritonicCell): number[] | null {
  let best: number[] | null = null;
  let bestSmoothness = -1;

  for (const perm of VOICE_PERMUTATIONS) {
    const movements = from.notes.map((fromPc, voiceIdx) =>
      pitchClassMovement(fromPc, to.notes[perm[voiceIdx]!]!),
    );
    if (!movementIsValid(movements)) continue;
    const smoothness = smoothnessFromMovements(movements);
    if (smoothness > bestSmoothness) {
      bestSmoothness = smoothness;
      best = movements;
    }
  }

  return best;
}

function buildVoiceLeadingResult(from: TritonicCell, to: TritonicCell): VoiceLeadingResult {
  const voiceMovement = bestVoiceMovement(from, to);
  if (voiceMovement === null) {
    return {
      from,
      to,
      voiceMovement: [0, 0, 0],
      smoothness: 0,
      valid: false,
    };
  }
  return {
    from,
    to,
    voiceMovement,
    smoothness: smoothnessFromMovements(voiceMovement),
    valid: true,
  };
}

export function getVoiceLeadingCandidates(from: TritonicCell, pool: TritonicCell[]): VoiceLeadingResult[] {
  return pool
    .map((to) => buildVoiceLeadingResult(from, to))
    .filter((r) => r.valid)
    .sort((a, b) => b.smoothness - a.smoothness);
}

export function getBestVoiceLeading(from: TritonicCell, pool: TritonicCell[]): VoiceLeadingResult {
  const candidates = getVoiceLeadingCandidates(from, pool);
  if (candidates.length === 0) {
    return buildVoiceLeadingResult(from, from);
  }
  return candidates[0]!;
}
