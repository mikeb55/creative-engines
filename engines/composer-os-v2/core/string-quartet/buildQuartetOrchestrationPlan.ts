/**
 * String quartet → shared orchestration plan (Prompt 6/7).
 */

import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import { planDensityOwnership } from '../orchestration/densityOwnershipPlanner';
import { planRegisterOwnership } from '../orchestration/registerOwnershipPlanner';
import { planTextureOwnership } from '../orchestration/textureOwnershipPlanner';
import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import type { PartOrchestrationRow, RegisterBand } from '../orchestration/orchestrationTypes';
import { validateOrchestrationPlan } from '../orchestration/orchestrationValidation';
import type { QuartetDensityPlan } from './quartetPlanTypes';
import type { QuartetFormPlan } from './quartetPlanTypes';
import type { QuartetTexturePlan } from './quartetPlanTypes';
import type { QuartetInstrument } from './stringQuartetTypes';
import { QUARTET_INSTRUMENTS, partIdForQuartetInstrument, SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from './stringQuartetTypes';
import type { QuartetRoleType } from './quartetRoleTypes';
import { mapQuartetRoleToOrchestrationRoles } from './quartetRoleMapping';

const PART_ORDER = QUARTET_INSTRUMENTS;

const registerByInstrument: Record<QuartetInstrument, RegisterBand> = {
  violin_1: 'high',
  violin_2: 'high',
  viola: 'middle',
  cello: 'bass',
};

function rowFor(
  inst: QuartetInstrument,
  role: QuartetRoleType,
  density: QuartetDensityPlan['slices'][0]['density']
): PartOrchestrationRow {
  const { instrumentRole, textureRole } = mapQuartetRoleToOrchestrationRoles(role);
  return {
    partId: partIdForQuartetInstrument(inst),
    instrumentRole,
    textureRole,
    registerBand: registerByInstrument[inst],
    densityBand: density,
    articulationBias: role === 'sustain_pad' ? 'legato' : 'mixed',
    sustainVsAttack: role === 'sustain_pad' || role === 'bass_anchor' ? 'sustain_heavy' : 'balanced',
  };
}

export interface BuildQuartetOrchestrationPlanInput {
  formPlan: QuartetFormPlan;
  texturePlan: QuartetTexturePlan;
  densityPlan: QuartetDensityPlan;
}

export function assembleQuartetOrchestrationPlan(input: BuildQuartetOrchestrationPlanInput): OrchestrationPlan {
  const { formPlan, texturePlan, densityPlan } = input;
  const profile = getEnsembleFamilyProfile('string_quartet');

  const sections = formPlan.slices.map((s) => ({
    index: s.index,
    label: s.phase,
    startBar: s.startBar,
    endBar: s.endBar,
  }));

  const sectionRoleMatrix = sections.map((sec) => {
    const sl = texturePlan.slices.find((x) => x.formSliceIndex === sec.index);
    const den = densityPlan.slices.find((x) => x.formSliceIndex === sec.index);
    const density = den?.density ?? 'moderate';
    const rows = PART_ORDER.map((instrument) => rowFor(instrument, sl!.rolesByInstrument[instrument], density));
    return { section: sec, rows };
  });

  const partRegisterBias: Record<string, RegisterBand> = {
    [SQ_PART_V1]: profile.registerDefaults.melodicLead,
    [SQ_PART_V2]: 'high',
    [SQ_PART_VA]: profile.registerDefaults.innerHarmony,
    [SQ_PART_VC]: profile.registerDefaults.harmonicBass,
  };

  const registerOwnership = planRegisterOwnership({
    sections,
    partRegisterBias,
    mayLeadInMidRegister: { [SQ_PART_V1]: false, [SQ_PART_V2]: false, [SQ_PART_VA]: false, [SQ_PART_VC]: false },
  });

  const leadPartBySection: Record<number, string> = {};
  for (const sl of texturePlan.slices) {
    let best: string | undefined;
    let prio = -1;
    for (const inst of PART_ORDER) {
      const role = sl.rolesByInstrument[inst];
      const { instrumentRole } = mapQuartetRoleToOrchestrationRoles(role);
      const p = instrumentRole === 'lead' ? 3 : instrumentRole === 'counterline' ? 2 : 0;
      if (p > prio) {
        prio = p;
        best = partIdForQuartetInstrument(inst);
      }
    }
    /** Only assign foreground lead when there is an actual lead or counterline (avoid pad-only slices). */
    if (best !== undefined && prio >= 2) leadPartBySection[sl.formSliceIndex] = best;
  }

  const textureOwnership = {
    ...planTextureOwnership({ sections, leadPartBySection }),
    enforceSingleLead: true,
  };

  const sectionDensityBias: Record<number, 'sparse' | 'moderate' | 'dense'> = {};
  for (const d of densityPlan.slices) sectionDensityBias[d.formSliceIndex] = d.density;

  const densityOwnership = planDensityOwnership({
    sections,
    sectionDensityBias,
    partWeights: { [SQ_PART_V1]: 0.26, [SQ_PART_V2]: 0.26, [SQ_PART_VA]: 0.24, [SQ_PART_VC]: 0.24 },
  });

  const silenceEligibleByBar = Array.from({ length: formPlan.totalBars }, (_, i) => {
    const bar = i + 1;
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    if (!slice) return false;
    const sl = texturePlan.slices.find((x) => x.formSliceIndex === slice.index);
    return PART_ORDER.some((p) => sl?.rolesByInstrument[p] === 'silence');
  });

  const silenceEligibility = PART_ORDER.map((p) => ({
    partId: partIdForQuartetInstrument(p),
    eligible: true,
    reason: 'quartet_sectional_rest',
  }));

  return {
    ensembleFamily: 'string_quartet',
    presetId: 'string_quartet',
    totalBars: formPlan.totalBars,
    sections,
    sectionRoleMatrix,
    registerOwnership,
    textureOwnership,
    densityOwnership,
    silenceEligibleByBar,
    silenceEligibility,
  };
}

export function buildQuartetOrchestrationPlan(input: BuildQuartetOrchestrationPlanInput): OrchestrationPlan {
  const plan = assembleQuartetOrchestrationPlan(input);
  const profile = getEnsembleFamilyProfile('string_quartet');
  const v = validateOrchestrationPlan(plan, profile);
  if (!v.ok) {
    throw new Error(`buildQuartetOrchestrationPlan: ${v.errors.join('; ')}`);
  }
  return plan;
}

export { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC, partIdForQuartetInstrument };
