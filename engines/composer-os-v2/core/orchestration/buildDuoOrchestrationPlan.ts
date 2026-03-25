/**
 * Duo orchestration plan — guitar/bass duo metadata only (Prompt 4/7).
 */

import { getEnsembleFamilyProfile } from './ensembleFamilyProfiles';
import { planDensityOwnership } from './densityOwnershipPlanner';
import { planRegisterOwnership } from './registerOwnershipPlanner';
import { planTextureOwnership } from './textureOwnershipPlanner';
import type { OrchestrationPlan } from './orchestrationPlanTypes';
import type { PartOrchestrationRow } from './orchestrationTypes';
import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';
import { validateOrchestrationPlan } from './orchestrationValidation';

export const DEFAULT_DUO_GUITAR_PART = 'clean_electric_guitar';
export const DEFAULT_DUO_BASS_PART = 'acoustic_upright_bass';

export interface BuildDuoOrchestrationPlanInput {
  totalBars?: number;
  guitarPartId?: string;
  bassPartId?: string;
  presetId?: string;
}

/**
 * Default 8-bar A | B duo plan: guitar lead / bass anchor; moderate density.
 */
export function buildDuoOrchestrationPlan(input?: BuildDuoOrchestrationPlanInput): OrchestrationPlan {
  const totalBars = input?.totalBars ?? 8;
  const g = input?.guitarPartId ?? DEFAULT_DUO_GUITAR_PART;
  const b = input?.bassPartId ?? DEFAULT_DUO_BASS_PART;
  const half = Math.floor(totalBars / 2);
  const aLen = half;
  const bLen = totalBars - half;
  const sections = [
    { index: 0, label: 'A', startBar: 1, endBar: aLen },
    { index: 1, label: 'B', startBar: aLen + 1, endBar: aLen + bLen },
  ];

  const profile = getEnsembleFamilyProfile('duo');

  const guitarRow = (sectionIndex: number): PartOrchestrationRow => ({
    partId: g,
    instrumentRole: 'lead',
    textureRole: 'lead',
    registerBand: profile.registerDefaults.melodicLead,
    densityBand: sectionIndex === 1 ? profile.densityTendencies.climax : profile.densityTendencies.opening,
    articulationBias: 'mixed',
    sustainVsAttack: 'balanced',
  });

  const bassRow = (sectionIndex: number): PartOrchestrationRow => ({
    partId: b,
    instrumentRole: 'bass_anchor',
    textureRole: 'support',
    registerBand: profile.registerDefaults.harmonicBass,
    densityBand: 'moderate',
    articulationBias: 'neutral',
    sustainVsAttack: 'sustain_heavy',
  });

  const sectionRoleMatrix = sections.map((sec) => ({
    section: sec,
    rows: [guitarRow(sec.index), bassRow(sec.index)],
  }));

  const registerOwnership = planRegisterOwnership({
    sections,
    partRegisterBias: {
      [g]: profile.registerDefaults.melodicLead,
      [b]: profile.registerDefaults.harmonicBass,
    },
    mayLeadInMidRegister: { [g]: false, [b]: false },
  });

  const textureOwnership = planTextureOwnership({
    sections,
    leadPartBySection: { 0: g, 1: g },
    textureByPartAndSection: [
      { partId: b, sectionIndex: 0, textureRole: 'support' as OrchestrationRoleLabel },
      { partId: b, sectionIndex: 1, textureRole: 'support' as OrchestrationRoleLabel },
    ],
  });

  const densityOwnership = planDensityOwnership({
    sections,
    sectionDensityBias: {
      0: profile.densityTendencies.opening,
      1: profile.densityTendencies.climax,
    },
    partWeights: { [g]: 0.55, [b]: 0.45 },
  });

  const silenceEligibleByBar = Array.from({ length: totalBars }, () => true);
  const silenceEligibility = [
    { partId: g, eligible: true, reason: 'duo_melodic' },
    { partId: b, eligible: false, reason: 'bass_anchor' },
  ];

  const plan: OrchestrationPlan = {
    ensembleFamily: 'duo',
    presetId: input?.presetId ?? 'guitar_bass_duo',
    totalBars,
    sections,
    sectionRoleMatrix,
    registerOwnership,
    textureOwnership,
    densityOwnership,
    silenceEligibleByBar,
    silenceEligibility,
  };

  const v = validateOrchestrationPlan(plan, profile);
  if (!v.ok) {
    throw new Error(`buildDuoOrchestrationPlan: invalid plan: ${v.errors.join('; ')}`);
  }
  return plan;
}
