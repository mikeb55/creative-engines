/**
 * Apply ensemble selection: silence removed sections, rebalance lead roles, keep bass.
 */

import { mapBigBandRoleToOrchestrationRoles } from './bigBandRoleMapping';
import type { BigBandSectionPlan, BigBandSectionSlicePlan } from './bigBandPlanTypes';
import type { BigBandInstrumentSection } from './bigBandSectionTypes';
import type { BigBandRoleType } from './bigBandTypes';
import type { BigBandEnsembleConfigId, BigBandEnsembleSectionMask } from './bigBandEnsembleConfigTypes';
import { FULL_BIG_BAND_MASK } from './bigBandEnsembleConfigTypes';

const HORNS: BigBandInstrumentSection[] = ['saxes', 'trumpets', 'trombones'];

function isLeadRole(r: BigBandRoleType): boolean {
  return mapBigBandRoleToOrchestrationRoles(r).instrumentRole === 'lead';
}

export function resolveEnsembleMaskForConfig(
  id: BigBandEnsembleConfigId,
  custom?: Omit<BigBandEnsembleSectionMask, 'rhythm_section'> | null
): BigBandEnsembleSectionMask {
  if (id === 'custom') {
    const c = custom ?? { saxes: true, trumpets: true, trombones: true };
    return { ...c, rhythm_section: true };
  }
  switch (id) {
    case 'full_band':
      return { ...FULL_BIG_BAND_MASK };
    case 'medium_band':
      return { saxes: true, trumpets: true, trombones: false, rhythm_section: true };
    case 'small_band':
      return { saxes: true, trumpets: false, trombones: false, rhythm_section: true };
    case 'reeds_only':
      return { saxes: true, trumpets: false, trombones: false, rhythm_section: true };
    case 'brass_only':
      return { saxes: false, trumpets: true, trombones: true, rhythm_section: true };
    default:
      return { ...FULL_BIG_BAND_MASK };
  }
}

function rebalanceSlice(slice: BigBandSectionSlicePlan, mask: BigBandEnsembleSectionMask): BigBandSectionSlicePlan {
  const roles = { ...slice.rolesBySection };
  for (const h of HORNS) {
    if (!mask[h]) roles[h] = 'silence';
  }
  roles.rhythm_section = 'bass_anchor';

  const active = HORNS.filter((h) => mask[h]);
  if (active.length === 0) {
    return { ...slice, rolesBySection: roles };
  }

  const anyLead = active.some((h) => isLeadRole(roles[h]));
  if (anyLead) {
    return { ...slice, rolesBySection: roles };
  }

  const first = active[0];
  const ph = slice.phase;
  if (ph === 'shout_chorus' || ph === 'ending') {
    roles[first] = 'shout';
  } else if (ph === 'melody_head' || ph === 'solo_section') {
    roles[first] = 'lead_melody';
  } else {
    roles[first] = 'backgrounds';
  }
  return { ...slice, rolesBySection: roles };
}

export function applyBigBandEnsembleMask(plan: BigBandSectionPlan, mask: BigBandEnsembleSectionMask): BigBandSectionPlan {
  return {
    slices: plan.slices.map((sl) => rebalanceSlice(sl, mask)),
  };
}
