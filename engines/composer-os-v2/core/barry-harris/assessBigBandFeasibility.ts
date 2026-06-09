/**
 * V81f - Big band sax soli feasibility for Barry Harris chord-melody stacks.
 */

import type { PhrasingRole } from './types';
import type { BbVoiceMidis } from './bigBandSaxSoliVoicing';
import { expandToFiveVoiceSaxSoli } from './bigBandSaxSoliVoicing';

export const BB_ALTO1_MIN = 61;
export const BB_ALTO1_MAX = 104;
export const BB_ALTO2_MIN = 61;
export const BB_ALTO2_MAX = 104;
export const BB_TENOR1_MIN = 56;
export const BB_TENOR1_MAX = 99;
export const BB_TENOR2_MIN = 56;
export const BB_TENOR2_MAX = 99;
export const BB_BARI_MIN = 37;
export const BB_BARI_MAX = 68;
export const BB_BARI_THICK_TEXTURE_MAX = 62;
export const BB_PREFERRED_SPAN_MIN = 24;
export const BB_PREFERRED_SPAN_MAX = 30;

export type BigBandFeasibilityResult = {
  feasible: boolean;
  warnings: string[];
  span?: number;
};

function inRange(midi: number, min: number, max: number): boolean {
  return midi >= min && midi <= max;
}

export function assessBigBandFeasibilityFromVoices(
  voices: BbVoiceMidis,
  options?: { phrasingRole?: PhrasingRole; allowCrossed?: boolean }
): BigBandFeasibilityResult {
  const warnings: string[] = [];
  const allowCrossed = options?.allowCrossed === true;
  const a1 = voices.alto1 ?? voices.alto1SustainMidi;
  const a2 = voices.alto2;
  const t1 = voices.tenor1;
  const t2 = voices.tenor2;
  const bari = voices.bari;

  if (a1 == null) {
    warnings.push('RANGE: missing alto 1 pitch');
  } else if (!inRange(a1, BB_ALTO1_MIN, BB_ALTO1_MAX)) {
    warnings.push('RANGE: alto 1 out of range');
  }
  if (!inRange(a2, BB_ALTO2_MIN, BB_ALTO2_MAX)) warnings.push('RANGE: alto 2 out of range');
  if (!inRange(t1, BB_TENOR1_MIN, BB_TENOR1_MAX)) warnings.push('RANGE: tenor 1 out of range');
  if (!inRange(t2, BB_TENOR2_MIN, BB_TENOR2_MAX)) warnings.push('RANGE: tenor 2 out of range');
  if (!inRange(bari, BB_BARI_MIN, BB_BARI_MAX)) warnings.push('RANGE: bari out of range');

  if (!allowCrossed) {
    if (bari > t2) warnings.push('VOICE_CROSS: bari above tenor 2');
    if (t2 > t1) warnings.push('VOICE_CROSS: tenor 2 above tenor 1');
    if (t1 > a2) warnings.push('VOICE_CROSS: tenor 1 above alto 2');
    if (a1 != null && a2 > a1) warnings.push('VOICE_CROSS: alto 2 above alto 1');
  }

  const top = a1 ?? a2;
  const span = top - bari;
  if (span > BB_PREFERRED_SPAN_MAX) warnings.push('SPAN: exceeds preferred 2.5 octaves');
  if (span < BB_PREFERRED_SPAN_MIN && voices.alto1 != null) {
    warnings.push('SPAN: below preferred 2 octaves');
  }

  const active = [a1, a2, t1, t2, bari].filter((m) => m != null).length;
  if (active >= 3 && bari > BB_BARI_THICK_TEXTURE_MAX) {
    warnings.push('THICK_TEXTURE: bari above D4');
  }

  const hardFail = warnings.some((w) => w.startsWith('RANGE:') || w.startsWith('VOICE_CROSS:'));
  return { feasible: !hardFail, warnings, span };
}

export function assessBigBandFeasibility(
  stack: readonly number[],
  options?: { phrasingRole?: PhrasingRole; allowCrossed?: boolean; rootPc?: number }
): BigBandFeasibilityResult {
  const voices = expandToFiveVoiceSaxSoli(stack, options?.rootPc);
  return assessBigBandFeasibilityFromVoices(voices, options);
}