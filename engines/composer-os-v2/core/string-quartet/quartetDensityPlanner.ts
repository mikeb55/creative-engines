/**
 * String quartet density — contrasts statement vs development vs climax (Prompt 6/7).
 */

import type { QuartetDensityPlan, QuartetDensitySlice, QuartetFormPlan } from './quartetPlanTypes';
import type { DensityBand } from '../orchestration/orchestrationTypes';

function densityForPhase(phase: QuartetFormPlan['slices'][0]['phase']): DensityBand {
  switch (phase) {
    case 'statement':
      return 'sparse';
    case 'development':
      return 'moderate';
    case 'contrast':
      return 'dense';
    case 'return':
      return 'moderate';
    case 'coda':
      return 'sparse';
    default:
      return 'moderate';
  }
}

export function planQuartetDensity(formPlan: QuartetFormPlan): QuartetDensityPlan {
  const slices: QuartetDensitySlice[] = formPlan.slices.map((s) => ({
    formSliceIndex: s.index,
    phase: s.phase,
    density: densityForPhase(s.phase),
  }));
  return { slices };
}
