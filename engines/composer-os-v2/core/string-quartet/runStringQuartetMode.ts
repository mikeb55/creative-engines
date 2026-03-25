/**
 * String quartet planning pipeline — no MusicXML generation (Prompt 6/7).
 */

import { assembleQuartetOrchestrationPlan } from './buildQuartetOrchestrationPlan';
import { planQuartetDensity } from './quartetDensityPlanner';
import { planDefaultQuartetForm } from './quartetFormPlanner';
import { planQuartetTexture } from './quartetTexturePlanner';
import type { QuartetDensityPlan } from './quartetPlanTypes';
import type { QuartetFormPlan } from './quartetPlanTypes';
import type { QuartetTexturePlan } from './quartetPlanTypes';
import {
  mergeQuartetValidation,
  type QuartetValidationResult,
  validateQuartetPlanningBundle,
  validateQuartetRegisterOwnership,
} from './quartetValidation';
import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import { validateOrchestrationPlan } from '../orchestration/orchestrationValidation';

export interface StringQuartetRunInput {
  seed: number;
  title?: string;
  totalBars?: number;
}

export interface StringQuartetRunManifestHints {
  presetType: 'string_quartet';
  stringQuartetFormSequence: string[];
  stringQuartetOrchestrationReady: boolean;
  stringQuartetModuleIds: string[];
  stringQuartetTotalBars: number;
  ensembleFamily: 'string_quartet';
}

export interface StringQuartetRunResult {
  title: string;
  formPlan: QuartetFormPlan;
  texturePlan: QuartetTexturePlan;
  densityPlan: QuartetDensityPlan;
  orchestrationPlan: OrchestrationPlan;
  validation: QuartetValidationResult;
  manifestHints: StringQuartetRunManifestHints;
}

export function runStringQuartetMode(input: StringQuartetRunInput): StringQuartetRunResult {
  const title = input.title ?? `String Quartet Plan ${input.seed}`;
  const totalBars = Math.max(16, input.totalBars ?? 24);
  const formPlan = planDefaultQuartetForm(input.seed, { totalBars });
  const texturePlan = planQuartetTexture(formPlan, input.seed);
  const densityPlan = planQuartetDensity(formPlan);

  const qVal = validateQuartetPlanningBundle(formPlan, texturePlan, densityPlan);
  const orchestrationPlan = assembleQuartetOrchestrationPlan({ formPlan, texturePlan, densityPlan });
  const profile = getEnsembleFamilyProfile('string_quartet');
  const orchVal = validateOrchestrationPlan(orchestrationPlan, profile);
  const regVal = validateQuartetRegisterOwnership(orchestrationPlan);

  const validation = mergeQuartetValidation(
    qVal,
    { ok: orchVal.ok, errors: orchVal.errors, warnings: orchVal.warnings },
    regVal
  );

  const manifestHints: StringQuartetRunManifestHints = {
    presetType: 'string_quartet',
    stringQuartetFormSequence: formPlan.slices.map((s) => s.phase),
    stringQuartetOrchestrationReady: validation.ok,
    stringQuartetModuleIds: ['string_quartet_plan'],
    stringQuartetTotalBars: formPlan.totalBars,
    ensembleFamily: 'string_quartet',
  };

  return {
    title,
    formPlan,
    texturePlan,
    densityPlan,
    orchestrationPlan,
    validation,
    manifestHints,
  };
}
