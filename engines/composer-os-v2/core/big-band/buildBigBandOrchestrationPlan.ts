/**
 * Big Band → shared orchestration plan (Prompt 5/7).
 */

import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import { planDensityOwnership } from '../orchestration/densityOwnershipPlanner';
import { planRegisterOwnership } from '../orchestration/registerOwnershipPlanner';
import { planTextureOwnership } from '../orchestration/textureOwnershipPlanner';
import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import type { PartOrchestrationRow, RegisterBand } from '../orchestration/orchestrationTypes';
import { validateOrchestrationPlan } from '../orchestration/orchestrationValidation';
import type { BigBandDensityPlan } from './bigBandPlanTypes';
import type { BigBandFormPlan } from './bigBandPlanTypes';
import type { BigBandSectionPlan } from './bigBandPlanTypes';
import type { BigBandInstrumentSection } from './bigBandSectionTypes';
import type { BigBandRoleType } from './bigBandTypes';
import { mapBigBandRoleToOrchestrationRoles } from './bigBandRoleMapping';
import type { BigBandEnsembleSectionMask } from './bigBandEnsembleConfigTypes';
import { FULL_BIG_BAND_MASK } from './bigBandEnsembleConfigTypes';

export const BB_PART_SAXES = 'bb_saxes';
export const BB_PART_TRUMPETS = 'bb_trumpets';
export const BB_PART_TROMBONES = 'bb_trombones';
export const BB_PART_RHYTHM = 'bb_rhythm_section';

const PART_ORDER: BigBandInstrumentSection[] = ['saxes', 'trumpets', 'trombones', 'rhythm_section'];

const registerBySection: Record<BigBandInstrumentSection, RegisterBand> = {
  saxes: 'high',
  trumpets: 'very_high',
  trombones: 'middle',
  rhythm_section: 'low',
};

export function partIdForInstrumentSection(sec: BigBandInstrumentSection): string {
  switch (sec) {
    case 'saxes':
      return BB_PART_SAXES;
    case 'trumpets':
      return BB_PART_TRUMPETS;
    case 'trombones':
      return BB_PART_TROMBONES;
    case 'rhythm_section':
      return BB_PART_RHYTHM;
  }
}

function rowFor(
  sec: BigBandInstrumentSection,
  bbRole: BigBandRoleType,
  density: BigBandDensityPlan['slices'][0]['density']
): PartOrchestrationRow {
  const { instrumentRole, textureRole } = mapBigBandRoleToOrchestrationRoles(bbRole);
  return {
    partId: partIdForInstrumentSection(sec),
    instrumentRole,
    textureRole,
    registerBand: registerBySection[sec],
    densityBand: density,
    articulationBias: bbRole === 'shout' ? 'staccato' : 'mixed',
    sustainVsAttack: bbRole === 'pads' ? 'sustain_heavy' : 'balanced',
  };
}

export interface BuildBigBandOrchestrationPlanInput {
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
  densityPlan: BigBandDensityPlan;
  ensembleMask?: BigBandEnsembleSectionMask;
}

/**
 * Assembles orchestration data without throwing (caller runs `validateOrchestrationPlan`).
 */
function normalizedDensityWeights(mask: BigBandEnsembleSectionMask): Record<string, number> {
  const base: Record<BigBandInstrumentSection, number> = {
    saxes: 0.28,
    trumpets: 0.28,
    trombones: 0.22,
    rhythm_section: 0.22,
  };
  let sum = 0;
  const raw: Record<string, number> = {};
  for (const p of PART_ORDER) {
    if (!mask[p]) continue;
    const id = partIdForInstrumentSection(p);
    raw[id] = base[p];
    sum += base[p];
  }
  if (sum <= 0) return { [BB_PART_RHYTHM]: 1 };
  const out: Record<string, number> = {};
  for (const k of Object.keys(raw)) {
    out[k] = raw[k] / sum;
  }
  return out;
}

export function assembleBigBandOrchestrationPlan(input: BuildBigBandOrchestrationPlanInput): OrchestrationPlan {
  const { formPlan, sectionPlan, densityPlan } = input;
  const mask = input.ensembleMask ?? FULL_BIG_BAND_MASK;
  const partOrderActive = PART_ORDER.filter((p) => mask[p]);
  const profile = getEnsembleFamilyProfile('big_band');

  const sections = formPlan.slices.map((s) => ({
    index: s.index,
    label: s.phase,
    startBar: s.startBar,
    endBar: s.endBar,
  }));

  const sectionRoleMatrix = sections.map((sec) => {
    const sl = sectionPlan.slices.find((x) => x.formSliceIndex === sec.index);
    const den = densityPlan.slices.find((x) => x.formSliceIndex === sec.index);
    const density = den?.density ?? 'moderate';
    const rows = partOrderActive.map((instrument) =>
      rowFor(instrument, sl!.rolesBySection[instrument], density)
    );
    return { section: sec, rows };
  });

  const partRegisterBias: Record<string, RegisterBand> = {
    [BB_PART_SAXES]: profile.registerDefaults.melodicLead,
    [BB_PART_TRUMPETS]: 'very_high',
    [BB_PART_TROMBONES]: profile.registerDefaults.innerHarmony,
    [BB_PART_RHYTHM]: profile.registerDefaults.harmonicBass,
  };

  const registerOwnership = planRegisterOwnership({
    sections,
    partRegisterBias,
    mayLeadInMidRegister: {
      [BB_PART_SAXES]: false,
      [BB_PART_TRUMPETS]: false,
      [BB_PART_TROMBONES]: false,
      [BB_PART_RHYTHM]: false,
    },
  });

  const leadPartBySection: Record<number, string> = {};
  for (const sl of sectionPlan.slices) {
    let leadPart: string | undefined;
    let prio = -1;
    for (const inst of PART_ORDER) {
      const role = sl.rolesBySection[inst];
      const { instrumentRole } = mapBigBandRoleToOrchestrationRoles(role);
      const p = instrumentRole === 'lead' ? 3 : instrumentRole === 'counterline' ? 2 : 0;
      if (p > prio) {
        prio = p;
        leadPart = partIdForInstrumentSection(inst);
      }
    }
    if (leadPart) leadPartBySection[sl.formSliceIndex] = leadPart;
  }

  const textureOwnership = {
    ...planTextureOwnership({
      sections,
      leadPartBySection,
    }),
    /** Big band allows sectional shout layers (multiple simultaneous leads). */
    enforceSingleLead: false,
  };

  const sectionDensityBias: Record<number, 'sparse' | 'moderate' | 'dense'> = {};
  for (const d of densityPlan.slices) {
    sectionDensityBias[d.formSliceIndex] = d.density;
  }

  const densityOwnership = planDensityOwnership({
    sections,
    sectionDensityBias,
    partWeights: normalizedDensityWeights(mask),
  });

  const silenceEligibleByBar = Array.from({ length: formPlan.totalBars }, (_, i) => {
    const bar = i + 1;
    const slice = formPlan.slices.find((s) => bar >= s.startBar && bar <= s.endBar);
    if (!slice) return false;
    const sl = sectionPlan.slices.find((x) => x.formSliceIndex === slice.index);
    return partOrderActive.some((p) => sl?.rolesBySection[p] === 'silence');
  });

  const silenceEligibility = partOrderActive.map((p) => ({
    partId: partIdForInstrumentSection(p),
    eligible: true,
    reason: 'sectional_rest_allowed',
  }));

  return {
    ensembleFamily: 'big_band',
    presetId: 'big_band',
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

/**
 * Maps big-band slices to `OrchestrationPlan` and validates (throws if invalid).
 */
export function buildBigBandOrchestrationPlan(input: BuildBigBandOrchestrationPlanInput): OrchestrationPlan {
  const plan = assembleBigBandOrchestrationPlan(input);
  const profile = getEnsembleFamilyProfile('big_band');
  const v = validateOrchestrationPlan(plan, profile);
  if (!v.ok) {
    throw new Error(`buildBigBandOrchestrationPlan: ${v.errors.join('; ')}`);
  }
  return plan;
}
