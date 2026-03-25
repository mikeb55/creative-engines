/**
 * Big Band planning pipeline — no MusicXML / voicing generation (Prompt 5/7 + 5.6/7 research rules).
 */

import { applyBigBandRules } from './applyBigBandRules';
import { assembleBigBandOrchestrationPlan } from './buildBigBandOrchestrationPlan';
import { planBebopLineBehaviour, type BebopLineBehaviourMetadata } from './bebopLinePlanner';
import { planBigBandDensity } from './bigBandDensityPlanner';
import { resolveBigBandEraRules } from './bigBandEraResolver';
import { planDefaultBigBandForm } from './bigBandFormPlanner';
import type { BigBandDensityPlan, BigBandEnhancedPlanning } from './bigBandPlanTypes';
import type { BigBandFormPlan } from './bigBandPlanTypes';
import type { BigBandSectionPlan } from './bigBandPlanTypes';
import { loadBigBandResearchFromPath, loadBigBandResearchFromEnvOrDefault } from './bigBandResearchParser';
import { validateResearchDrivenBigBand } from './bigBandResearchDrivenValidation';
import type { BigBandComposerId, BigBandEraId, ResolvedBigBandRuleSet } from './bigBandResearchTypes';
import { planBigBandSections } from './bigBandSectionPlanner';
import { type BigBandValidationResult, mergeBigBandValidation, validateBigBandPlanningBundle } from './bigBandValidation';
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
  /** Default `post_bop`. */
  era?: BigBandEraId;
  /** Optional composer bias; default none. */
  composerStyle?: BigBandComposerId | null;
  /** Override path to BigBandResearch.md (defaults to bundled data + env). */
  researchPathOverride?: string;
}

export interface BigBandRunManifestHints {
  presetType: 'big_band';
  bigBandFormSequence: string[];
  bigBandOrchestrationReady: boolean;
  bigBandModuleIds: string[];
  bigBandTotalBars: number;
  ensembleFamily: 'big_band';
  bigBandEra: BigBandEraId;
  bigBandComposerStyle: BigBandComposerId | null;
  bigBandResearchRulesParsed: boolean;
}

export interface BigBandRunResult {
  title: string;
  era: BigBandEraId;
  composerStyle: BigBandComposerId | null;
  researchParseOk: boolean;
  researchParseErrors: string[];
  resolvedRules: ResolvedBigBandRuleSet;
  bebopLineMetadata: BebopLineBehaviourMetadata | null;
  enhancedPlanning: BigBandEnhancedPlanning;
  formPlan: BigBandFormPlan;
  sectionPlan: BigBandSectionPlan;
  densityPlan: BigBandDensityPlan;
  orchestrationPlan: OrchestrationPlan;
  validation: BigBandValidationResult;
  manifestHints: BigBandRunManifestHints;
}

/**
 * Full planning path: form → sections → density → research + era/composer → rules → orchestration → validation.
 */
export function runBigBandMode(input: BigBandRunInput): BigBandRunResult {
  const title = input.title ?? `Big Band Plan ${input.seed}`;
  const totalBars = Math.max(16, input.totalBars ?? 32);
  const era = input.era ?? 'post_bop';
  const composerStyle = input.composerStyle === undefined ? null : input.composerStyle;

  const formPlan = planDefaultBigBandForm(input.seed, { totalBars });
  const sectionPlan = planBigBandSections(formPlan, input.seed);
  const densityPlan = planBigBandDensity(formPlan);

  const parsed = input.researchPathOverride
    ? loadBigBandResearchFromPath(input.researchPathOverride)
    : loadBigBandResearchFromEnvOrDefault();

  const resolvedRules = resolveBigBandEraRules(era, composerStyle, parsed.ok, parsed.errors);
  const bebopLineMetadata = planBebopLineBehaviour(era, input.seed);
  const enhancedPlanning = applyBigBandRules({
    formPlan,
    densityPlan,
    resolved: resolvedRules,
    bebopLine: bebopLineMetadata,
    seed: input.seed,
  });

  const bbVal = validateBigBandPlanningBundle(formPlan, sectionPlan, densityPlan);
  const researchVal = validateResearchDrivenBigBand(
    era,
    composerStyle,
    densityPlan,
    enhancedPlanning,
    bebopLineMetadata
  );

  const orchestrationPlan = assembleBigBandOrchestrationPlan({ formPlan, sectionPlan, densityPlan });
  const profile = getEnsembleFamilyProfile('big_band');
  const orchVal = mergeOrchestrationValidation(
    validateOrchestrationPlan(orchestrationPlan, profile),
    validateDensityNoOverload(orchestrationPlan)
  );

  const validation: BigBandValidationResult = mergeBigBandValidation(
    bbVal,
    researchVal,
    {
      ok: orchVal.ok,
      errors: orchVal.errors,
      warnings: orchVal.warnings,
    }
  );

  const manifestHints: BigBandRunManifestHints = {
    presetType: 'big_band',
    bigBandFormSequence: formPlan.slices.map((s) => s.phase),
    bigBandOrchestrationReady: validation.ok,
    bigBandModuleIds: ['big_band_plan'],
    bigBandTotalBars: formPlan.totalBars,
    ensembleFamily: 'big_band',
    bigBandEra: era,
    bigBandComposerStyle: composerStyle,
    bigBandResearchRulesParsed: parsed.ok,
  };

  return {
    title,
    era,
    composerStyle,
    researchParseOk: parsed.ok,
    researchParseErrors: parsed.errors,
    resolvedRules,
    bebopLineMetadata,
    enhancedPlanning,
    formPlan,
    sectionPlan,
    densityPlan,
    orchestrationPlan,
    validation,
    manifestHints,
  };
}
