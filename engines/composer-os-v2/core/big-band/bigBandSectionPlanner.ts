/**
 * Big Band section role planning — who plays what (Prompt 5/7).
 */

import type { BigBandFormPlan } from './bigBandPlanTypes';
import type { BigBandSectionPlan, BigBandSectionSlicePlan } from './bigBandPlanTypes';
import type { BigBandInstrumentSection } from './bigBandSectionTypes';
import type { BigBandRoleType } from './bigBandTypes';

function sliceRoles(phase: BigBandFormPlan['slices'][0]['phase'], seed: number): Record<BigBandInstrumentSection, BigBandRoleType> {
  const u = (seed % 7) + (phase.length % 5);
  switch (phase) {
    case 'intro':
      return {
        saxes: 'pads',
        trumpets: u % 2 === 0 ? 'silence' : 'pads',
        trombones: 'pads',
        rhythm_section: 'bass_anchor',
      };
    case 'melody_head':
      return {
        saxes: 'backgrounds',
        trumpets: 'lead_melody',
        trombones: 'backgrounds',
        rhythm_section: 'bass_anchor',
      };
    case 'background_figures':
      return {
        saxes: 'riffs',
        trumpets: 'backgrounds',
        trombones: 'riffs',
        rhythm_section: 'bass_anchor',
      };
    case 'solo_section':
      return {
        saxes: u % 3 === 0 ? 'silence' : 'counterline',
        trumpets: 'silence',
        trombones: 'lead_melody',
        rhythm_section: 'bass_anchor',
      };
    case 'shout_chorus':
      return {
        saxes: 'shout',
        trumpets: 'shout',
        trombones: 'shout',
        rhythm_section: 'bass_anchor',
      };
    case 'ending':
      return {
        saxes: 'punches',
        trumpets: 'punches',
        trombones: 'punches',
        rhythm_section: 'bass_anchor',
      };
    default:
      return {
        saxes: 'backgrounds',
        trumpets: 'lead_melody',
        trombones: 'backgrounds',
        rhythm_section: 'bass_anchor',
      };
  }
}

export function planBigBandSections(formPlan: BigBandFormPlan, seed: number): BigBandSectionPlan {
  const slices: BigBandSectionSlicePlan[] = formPlan.slices.map((s) => ({
    formSliceIndex: s.index,
    phase: s.phase,
    rolesBySection: sliceRoles(s.phase, seed + s.index * 31),
  }));
  return { slices };
}
