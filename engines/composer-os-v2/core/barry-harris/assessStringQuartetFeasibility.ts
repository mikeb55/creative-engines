/**
 * V81d — String quartet feasibility for Barry Harris chord-melody stacks.
 */

import type { PhrasingRole } from './types';
import { distributeStackToSqVoices, type SqVoiceMidis } from './stringQuartetVoicing';

export const SQ_VIOLIN1_MIN = 64;
export const SQ_VIOLIN1_MAX = 105;
export const SQ_VIOLIN2_MIN = 57;
export const SQ_VIOLIN2_MAX = 100;
export const SQ_VIOLA_MIN = 48;
export const SQ_VIOLA_MAX = 81;
export const SQ_CELLO_MIN = 36;
export const SQ_CELLO_MAX = 76;
export const SQ_CELLO_THICK_TEXTURE_MAX = 67;
export const SQ_PREFERRED_SPAN = 24;

export type StringQuartetFeasibilityResult = {
  feasible: boolean;
  warnings: string[];
  span?: number;
};

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

export function sqIntervalPc(lower: number, upper: number): number {
  return mod12(upper - lower);
}

export function sqIsDissonantInterval(pcInterval: number): boolean {
  return pcInterval === 1 || pcInterval === 11 || pcInterval === 6;
}

function inRange(midi: number, min: number, max: number): boolean {
  return midi >= min && midi <= max;
}

function isCloseFourThirdsVoicing(voices: SqVoiceMidis): boolean {
  const ordered = [voices.cello, voices.viola, voices.violin2, voices.violin1 ?? voices.violin2].filter(
    (m) => m != null
  ) as number[];
  if (ordered.length < 4) return false;
  ordered.sort((a, b) => a - b);
  for (let i = 0; i < 3; i++) {
    const iv = sqIntervalPc(ordered[i]!, ordered[i + 1]!);
    if (iv !== 3 && iv !== 4) return false;
  }
  return ordered[3]! - ordered[0]! <= 14;
}

export function assessStringQuartetFeasibilityFromVoices(
  voices: SqVoiceMidis,
  options?: { phrasingRole?: PhrasingRole; allowCrossed?: boolean }
): StringQuartetFeasibilityResult {
  const warnings: string[] = [];
  const allowCrossed = options?.allowCrossed === true;
  const vn1 = voices.violin1 ?? voices.violin1SustainMidi;
  const vn2 = voices.violin2;
  const vla = voices.viola;
  const vc = voices.cello;

  if (vn1 == null) {
    warnings.push('RANGE: missing violin i pitch');
  } else if (!inRange(vn1, SQ_VIOLIN1_MIN, SQ_VIOLIN1_MAX)) {
    warnings.push('RANGE: violin i out of range');
  }
  if (!inRange(vn2, SQ_VIOLIN2_MIN, SQ_VIOLIN2_MAX)) warnings.push('RANGE: violin ii out of range');
  if (!inRange(vla, SQ_VIOLA_MIN, SQ_VIOLA_MAX)) warnings.push('RANGE: viola out of range');
  if (!inRange(vc, SQ_CELLO_MIN, SQ_CELLO_MAX)) warnings.push('RANGE: cello out of range');

  if (!allowCrossed) {
    if (vc > vla) warnings.push('VOICE_CROSS: cello above viola');
    if (vla > vn2) warnings.push('VOICE_CROSS: viola above violin ii');
    if (vn1 != null && vn2 > vn1) warnings.push('VOICE_CROSS: violin ii above violin i');
  }

  const top = vn1 ?? vn2;
  const span = top - vc;
  if (span > SQ_PREFERRED_SPAN) warnings.push('SPAN: exceeds preferred 2 octaves');

  const active = [vn1, vn2, vla, vc].filter((m) => m != null).length;
  if (active >= 3 && vc > SQ_CELLO_THICK_TEXTURE_MAX) {
    warnings.push('THICK_TEXTURE: cello above G4');
  }

  if (vn1 != null && sqIsDissonantInterval(sqIntervalPc(vn2, vn1))) {
    warnings.push('DISSONANCE_TOP: dissonant interval at top of voicing');
  }

  if (isCloseFourThirdsVoicing(voices)) {
    warnings.push('CLOSE_VOICING: four adjacent thirds (warn)');
  }

  const hardFail = warnings.some((w) => w.startsWith('RANGE:') || w.startsWith('VOICE_CROSS:'));
  return { feasible: !hardFail, warnings, span };
}

export function assessStringQuartetFeasibility(
  stack: readonly number[],
  options?: { phrasingRole?: PhrasingRole; allowCrossed?: boolean }
): StringQuartetFeasibilityResult {
  const voices = distributeStackToSqVoices(stack);
  return assessStringQuartetFeasibilityFromVoices(voices, options);
}
