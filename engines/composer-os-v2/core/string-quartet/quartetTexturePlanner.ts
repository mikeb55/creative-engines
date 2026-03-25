/**
 * String quartet texture — roles per instrument per slice (Prompt 6/7).
 */

import type { QuartetFormPlan } from './quartetPlanTypes';
import type { QuartetTexturePlan, QuartetTextureSlicePlan } from './quartetPlanTypes';
import type { QuartetFormPhase } from './quartetPlanTypes';
import type { QuartetInstrument } from './stringQuartetTypes';
import type { QuartetRoleType } from './quartetRoleTypes';

function rolesForPhase(phase: QuartetFormPhase, seed: number): Record<QuartetInstrument, QuartetRoleType> {
  const u = seed % 5;
  switch (phase) {
    case 'statement':
      return {
        violin_1: 'lead',
        violin_2: 'harmonic_support',
        viola: 'inner_motion',
        cello: 'bass_anchor',
      };
    case 'development':
      return {
        violin_1: u % 2 === 0 ? 'counterline' : 'inner_motion',
        violin_2: 'lead',
        viola: 'inner_motion',
        cello: 'bass_anchor',
      };
    case 'contrast':
      return {
        violin_1: 'harmonic_support',
        violin_2: 'counterline',
        viola: 'lead',
        cello: 'bass_anchor',
      };
    case 'return':
      return {
        violin_1: 'lead',
        violin_2: 'harmonic_support',
        viola: 'inner_motion',
        cello: 'bass_anchor',
      };
    case 'coda':
      return {
        violin_1: 'sustain_pad',
        violin_2: 'sustain_pad',
        viola: 'harmonic_support',
        cello: 'bass_anchor',
      };
    default:
      return {
        violin_1: 'lead',
        violin_2: 'harmonic_support',
        viola: 'inner_motion',
        cello: 'bass_anchor',
      };
  }
}

export function planQuartetTexture(formPlan: QuartetFormPlan, seed: number): QuartetTexturePlan {
  const slices: QuartetTextureSlicePlan[] = formPlan.slices.map((s) => ({
    formSliceIndex: s.index,
    phase: s.phase,
    rolesByInstrument: rolesForPhase(s.phase, seed + s.index * 17),
  }));
  return { slices };
}
