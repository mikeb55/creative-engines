/**
 * Big Band density planning — contrasts shout vs head (Prompt 5/7).
 */

import type { BigBandDensityPlan, BigBandDensitySlice, BigBandFormPlan } from './bigBandPlanTypes';
import type { DensityBand } from '../orchestration/orchestrationTypes';

function densityForPhase(phase: BigBandFormPlan['slices'][0]['phase']): DensityBand {
  switch (phase) {
    case 'intro':
      return 'sparse';
    case 'melody_head':
      return 'moderate';
    case 'background_figures':
      return 'moderate';
    case 'solo_section':
      return 'sparse';
    case 'shout_chorus':
      return 'dense';
    case 'ending':
      return 'moderate';
    default:
      return 'moderate';
  }
}

export function planBigBandDensity(formPlan: BigBandFormPlan): BigBandDensityPlan {
  const slices: BigBandDensitySlice[] = formPlan.slices.map((s) => ({
    formSliceIndex: s.index,
    phase: s.phase,
    density: densityForPhase(s.phase),
  }));
  return { slices };
}
