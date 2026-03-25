/**
 * Big Band planning pipeline — no MusicXML / voicing generation (Prompt 5/7).
 */

import { assembleBigBandOrchestrationPlan } from './buildBigBandOrchestrationPlan';
import { planBigBandDensity } from './bigBandDensityPlanner';
import { planDefaultBigBandForm } from './bigBandFormPlanner';
import { planBigBandSections } from './bigBandSectionPlanner';
import type { BigBandDensityPlan } from './bigBandPlanTypes';
import type { BigBandFormPlan } from './bigBandPlanTypes';
import type { BigBandSectionPlan } from './bigBandPlanTypes';
import { type BigBandValidationResult, validateBigBandPlanningBundle } from './bigBandValidation';
import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import {
  mergeOrchestrationValidation,
  validateDensityNoOverload,
  validateOrchestrationPlan,
} from '../orchestration/orchestrationValidation';

export interface BigBandRunInput {
  seed: number;
  title?: string;
  totalBars?: number;
}

export interface BigBandRunManifestHints {
  presetType: 'big_band';
  bigBandFormSequence: string[];
  bigBandOrchestrationReady: boolean;
  bigBandModuleIds: string[];
  bigBandTotalBars: number;
  ensembleFamily: 'big_band';
}

export interface BigBandRunResult {
  title: string;
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
  densityPlan: BigBandDensityPlan;
  orchestrationPlan: OrchestrationPlan;
  validation: BigBandValidationResult;
  manifestHints: BigBandRunManifestHints;
}

/**
 * Full planning path: form → sections → density → shared orchestration → validation.
 */
export function runBigBandMode(input: BigBandRunInput): BigBandRunResult {
  const title = input.title ?? `Big Band Plan ${input.seed}`;
  const totalBars = Math.max(16, input.totalBars ?? 32);
  const formPlan = planDefaultBigBandForm(input.seed, { totalBars });
  const sectionPlan = planBigBandSections(formPlan, input.seed);
  const densityPlan = planBigBandDensity(formPlan);

  const bbVal = validateBigBandPlanningBundle(formPlan, sectionPlan, densityPlan);
  const orchestrationPlan = assembleBigBandOrchestrationPlan({ formPlan, sectionPlan, densityPlan });
  const profile = getEnsembleFamilyProfile('big_band');
  const orchVal = mergeOrchestrationValidation(
    validateOrchestrationPlan(orchestrationPlan, profile),
    validateDensityNoOverload(orchestrationPlan)
  );

  const validation: BigBandValidationResult = {
    ok: bbVal.ok && orchVal.ok,
    errors: [...bbVal.errors, ...orchVal.errors],
    warnings: [...bbVal.warnings, ...orchVal.warnings],
  };

  const manifestHints: BigBandRunManifestHints = {
    presetType: 'big_band',
    bigBandFormSequence: formPlan.slices.map((s) => s.phase),
    bigBandOrchestrationReady: validation.ok,
    bigBandModuleIds: ['big_band_plan'],
    bigBandTotalBars: formPlan.totalBars,
    ensembleFamily: 'big_band',
  };

  return {
    title,
    formPlan,
    sectionPlan,
    densityPlan,
    orchestrationPlan,
    validation,
    manifestHints,
  };
}
