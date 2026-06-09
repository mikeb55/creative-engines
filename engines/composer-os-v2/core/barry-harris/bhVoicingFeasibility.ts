/**
 * V81d / V81f - preset dispatch for BH voicing feasibility.
 */

import type { PhrasingRole } from './types';
import { assessBigBandFeasibility } from './assessBigBandFeasibility';
import { assessGuitarFeasibility } from './guitarVoicingFeasibility';
import { assessStringQuartetFeasibility } from './assessStringQuartetFeasibility';

export type BhVoicingFeasibilityResult = {
  feasible: boolean;
  fretSpan: number;
  warnings?: string[];
};

export function assessBhVoicingFeasibility(
  stack: readonly number[],
  presetId?: string,
  options?: { allowStretch?: boolean; phrasingRole?: PhrasingRole; allowCrossed?: boolean }
): BhVoicingFeasibilityResult {
  if (presetId === 'big_band') {
    const bb = assessBigBandFeasibility(stack, {
      phrasingRole: options?.phrasingRole,
      allowCrossed: options?.allowCrossed,
    });
    const sorted = [...stack].sort((a, b) => a - b);
    const span = sorted.length > 0 ? sorted[sorted.length - 1]! - sorted[0]! : 0;
    return { feasible: bb.feasible, fretSpan: bb.span ?? span, warnings: bb.warnings };
  }
  if (presetId === 'string_quartet') {
    const sq = assessStringQuartetFeasibility(stack, {
      phrasingRole: options?.phrasingRole,
      allowCrossed: options?.allowCrossed,
    });
    const sorted = [...stack].sort((a, b) => a - b);
    const span = sorted.length > 0 ? sorted[sorted.length - 1]! - sorted[0]! : 0;
    return { feasible: sq.feasible, fretSpan: sq.span ?? span, warnings: sq.warnings };
  }
  const g = assessGuitarFeasibility(stack, { allowStretch: options?.allowStretch ?? true });
  return { feasible: g.feasible, fretSpan: g.fretSpan };
}

export function isBhStackFeasible(
  stack: readonly number[],
  presetId?: string,
  options?: { allowStretch?: boolean; phrasingRole?: PhrasingRole }
): boolean {
  return assessBhVoicingFeasibility(stack, presetId, options).feasible;
}
