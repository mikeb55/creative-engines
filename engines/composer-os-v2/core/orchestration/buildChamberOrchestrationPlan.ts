/**
 * ECM chamber-style orchestration plan — uses existing ECM context metadata only (Prompt 4/7).
 */

import { buildEcmChamberContext } from '../ecm/buildEcmChamberContext';
import type { EcmChamberMode } from '../ecm/ecmChamberTypes';
import { getEnsembleFamilyProfile } from './ensembleFamilyProfiles';
import { mapEcmTextureStateToOrchestrationRoles } from './orchestrationCompatibility';
import { planDensityOwnership } from './densityOwnershipPlanner';
import { planRegisterOwnership } from './registerOwnershipPlanner';
import { planTextureOwnership } from './textureOwnershipPlanner';
import type { OrchestrationPlan } from './orchestrationPlanTypes';
import type { PartOrchestrationRow } from './orchestrationTypes';
import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';
import { validateOrchestrationPlan } from './orchestrationValidation';
import { DEFAULT_DUO_BASS_PART, DEFAULT_DUO_GUITAR_PART } from './buildDuoOrchestrationPlan';

export interface BuildChamberOrchestrationPlanInput {
  seed: number;
  mode: EcmChamberMode;
  totalBars?: number;
  guitarPartId?: string;
  bassPartId?: string;
}

/**
 * Builds a planning object from `buildEcmChamberContext` — does not alter ECM musical output.
 */
export function buildChamberOrchestrationPlan(input: BuildChamberOrchestrationPlanInput): OrchestrationPlan {
  const ctx = buildEcmChamberContext(input.seed, input.mode, { totalBars: input.totalBars });
  const metrics = ctx.generationMetadata.ecmMetrics;
  if (!metrics) {
    throw new Error('buildChamberOrchestrationPlan: missing ecmMetrics on context');
  }

  const g = input.guitarPartId ?? DEFAULT_DUO_GUITAR_PART;
  const b = input.bassPartId ?? DEFAULT_DUO_BASS_PART;
  const profile = getEnsembleFamilyProfile('chamber');

  const sections = metrics.sections.map((s, i) => ({
    index: i,
    label: s.label,
    startBar: s.startBar,
    endBar: s.startBar + s.length - 1,
  }));

  const sectionRoleMatrix = metrics.sections.map((s, i) => {
    const tex = s.textureStates[0] ?? 'hover';
    const roles = mapEcmTextureStateToOrchestrationRoles(tex);
    const guitarInstrument: OrchestrationRoleLabel =
      roles.includes('lead') || roles.includes('counterline') ? 'lead' : 'support';
    const guitarRow: PartOrchestrationRow = {
      partId: g,
      instrumentRole: guitarInstrument,
      textureRole: guitarInstrument === 'lead' ? 'lead' : 'pad',
      registerBand: 'high',
      densityBand: s.foregroundLineCount >= 2 ? 'dense' : 'sparse',
      articulationBias: 'mixed',
      sustainVsAttack: 'balanced',
    };
    const bassRow: PartOrchestrationRow = {
      partId: b,
      instrumentRole: 'bass_anchor',
      textureRole: 'support',
      registerBand: 'bass',
      densityBand: 'moderate',
      articulationBias: 'neutral',
      sustainVsAttack: 'sustain_heavy',
    };
    return {
      section: sections[i],
      rows: [guitarRow, bassRow],
    };
  });

  const registerOwnership = planRegisterOwnership({
    sections,
    partRegisterBias: { [g]: 'high', [b]: 'bass' },
    mayLeadInMidRegister: { [g]: false, [b]: false },
  });

  const leadBy: Record<number, string> = {};
  for (let i = 0; i < sections.length; i++) leadBy[i] = g;

  const textureOwnership = planTextureOwnership({
    sections,
    leadPartBySection: leadBy,
  });

  const densityBias: Record<number, 'sparse' | 'moderate' | 'dense'> = {};
  for (let i = 0; i < sections.length; i++) {
    const s = metrics.sections[i];
    densityBias[i] = s.backgroundComplexityScore >= 3 ? 'dense' : s.backgroundComplexityScore <= 2 ? 'sparse' : 'moderate';
  }

  const densityOwnership = planDensityOwnership({
    sections,
    sectionDensityBias: densityBias,
    partWeights: { [g]: 0.52, [b]: 0.48 },
  });

  const totalBars = ctx.form.totalBars;
  const silenceEligibleByBar = Array.from({ length: totalBars }, () => true);
  const silenceEligibility = [
    { partId: g, eligible: true },
    { partId: b, eligible: false, reason: 'bass_anchor' },
  ];

  const plan: OrchestrationPlan = {
    ensembleFamily: 'chamber',
    presetId: 'ecm_chamber',
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
    throw new Error(`buildChamberOrchestrationPlan: invalid plan: ${v.errors.join('; ')}`);
  }
  return plan;
}
