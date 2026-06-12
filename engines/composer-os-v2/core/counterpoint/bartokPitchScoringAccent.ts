/**
 * Bartok-local accent helper - symmetric mode (default duo 4/4) + aksak stub.
 * Imports oddMeterEngine slot helpers only; no aksak engine exports.
 */

import { getAccentSlots, getHookSlots } from '../rhythm/oddMeterEngine';
import {
  BARTOK_PITCH_ACCENT_HOOK_MULT,
  BARTOK_PITCH_ACCENT_STRONG_MULT,
  BARTOK_PITCH_ACCENT_WEAK_MULT,
  BARTOK_PITCH_SYMMETRIC_BEAT_WEIGHTS,
} from './bartokPitchScoringConfig';

export type BartokAccentMode = 'symmetric' | 'aksak';

export type BartokAccentSlotKind = 'strong' | 'hook' | 'weak';

/** Base metrical weight before fit multiplier (spec symmetric-metric). */
export function bartokAccentBaseWeight(beatIndexInBar: number, mode: BartokAccentMode): number {
  if (mode === 'aksak') {
    return 0.5;
  }
  return BARTOK_PITCH_SYMMETRIC_BEAT_WEIGHTS[beatIndexInBar % 4] ?? 0.32;
}

/** Classify quarter-slot accent kind for default 4/4 symmetric path. */
export function bartokSymmetricAccentKind(beatIndexInBar: number): BartokAccentSlotKind {
  const b = beatIndexInBar % 4;
  if (b === 0) return 'strong';
  if (b === 2) return 'hook';
  return 'weak';
}

/** Aksak mode - subgroup-boundary accents via oddMeterEngine (stub wiring for later). */
export function bartokAksakAccentKind(pulseIndex: number, grouping: readonly number[]): BartokAccentSlotKind {
  const accents = new Set(getAccentSlots(grouping));
  const hooks = new Set(getHookSlots(grouping));
  if (accents.has(pulseIndex)) return 'strong';
  if (hooks.has(pulseIndex)) return 'hook';
  return 'weak';
}

export function bartokAccentFitMultiplier(kind: BartokAccentSlotKind): number {
  switch (kind) {
    case 'strong':
      return BARTOK_PITCH_ACCENT_STRONG_MULT;
    case 'hook':
      return BARTOK_PITCH_ACCENT_HOOK_MULT;
    case 'weak':
      return BARTOK_PITCH_ACCENT_WEAK_MULT;
  }
}

export function bartokAccentFitScore(
  beatIndexInBar: number,
  mode: BartokAccentMode,
  grouping?: readonly number[],
): number {
  const base =
    mode === 'aksak' && grouping
      ? bartokAccentBaseWeight(beatIndexInBar, 'aksak')
      : bartokAccentBaseWeight(beatIndexInBar, 'symmetric');
  const kind =
    mode === 'aksak' && grouping
      ? bartokAksakAccentKind(beatIndexInBar, grouping)
      : bartokSymmetricAccentKind(beatIndexInBar);
  return base * bartokAccentFitMultiplier(kind);
}
