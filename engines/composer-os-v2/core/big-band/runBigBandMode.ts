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
import type { StylePairingInput, StylePairingResult } from '../style-pairing/stylePairingTypes';
import { resolveStylePairing } from '../style-pairing/stylePairingResolver';
import { validateStylePairingResult } from '../style-pairing/stylePairingValidation';
import { applyBigBandEnsembleMask, resolveEnsembleMaskForConfig } from './bigBandEnsembleApply';
import type { BigBandEnsembleConfigId } from './bigBandEnsembleConfigTypes';
import type { BigBandEnsembleSectionMask } from './bigBandEnsembleConfigTypes';
import { resolveEffectiveSeed } from '../creative-controls/creativeControlResolver';
import type { CreativeControlLevel } from '../creative-controls/creativeControlTypes';
import { planBigBandSections } from './bigBandSectionPlanner';
import { type BigBandValidationResult, mergeBigBandValidation, validateBigBandPlanningBundle } from './bigBandValidation';
import { getEnsembleFamilyProfile } from '../orchestration/ensembleFamilyProfiles';
import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import {
  mergeOrchestrationValidation,
  validateDensityNoOverload,
  validateOrchestrationPlan,
} from '../orchestration/orchestrationValidation';
import { buildUniversalLeadSheetFromPlanningForm } from '../lead-sheet/universalLeadSheetBuilder';
import type { UniversalLeadSheet } from '../lead-sheet/universalLeadSheetTypes';

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
  /** Optional songwriter ↔ arranger pairing (metadata + validation warnings). */
  stylePairing?: StylePairingInput | null;
  /** User-facing variation id — maps to deterministic seed (optional). */
  variationId?: string;
  creativeControlLevel?: CreativeControlLevel;
  /** Horn section selection (default full band). */
  ensembleConfigId?: BigBandEnsembleConfigId;
  /** Required when `ensembleConfigId` is `custom`. */
  customEnsembleMask?: Omit<BigBandEnsembleSectionMask, 'rhythm_section'> | null;
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
  bigBandEnsembleConfigId?: BigBandEnsembleConfigId;
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
  /** Unified lead-sheet view (planning placeholders — N.C. per section). */
  universalLeadSheet?: UniversalLeadSheet;
  /** Present when `stylePairing` was supplied on input. */
  stylePairingResolution?: StylePairingResult;
}

/**
 * Full planning path: form → sections → density → research + era/composer → rules → orchestration → validation.
 */
export function runBigBandMode(input: BigBandRunInput): BigBandRunResult {
  const { effectiveSeed: runSeed } = resolveEffectiveSeed({
    seed: input.seed,
    variationId: input.variationId,
    creativeControlLevel: input.creativeControlLevel,
  });

  const title = input.title ?? `Big Band Plan ${runSeed}`;
  const totalBars = Math.max(16, input.totalBars ?? 32);
  const era = input.era ?? 'post_bop';
  const composerStyle = input.composerStyle === undefined ? null : input.composerStyle;

  const formPlan = planDefaultBigBandForm(runSeed, { totalBars });
  const ensembleMask = resolveEnsembleMaskForConfig(
    input.ensembleConfigId ?? 'full_band',
    input.customEnsembleMask ?? null
  );
  let sectionPlan = planBigBandSections(formPlan, runSeed);
  sectionPlan = applyBigBandEnsembleMask(sectionPlan, ensembleMask);
  const densityPlan = planBigBandDensity(formPlan);

  const parsed = input.researchPathOverride
    ? loadBigBandResearchFromPath(input.researchPathOverride)
    : loadBigBandResearchFromEnvOrDefault();

  const resolvedRules = resolveBigBandEraRules(era, composerStyle, parsed.ok, parsed.errors);
  const bebopLineMetadata = planBebopLineBehaviour(era, runSeed);
  const enhancedPlanning = applyBigBandRules({
    formPlan,
    densityPlan,
    resolved: resolvedRules,
    bebopLine: bebopLineMetadata,
    seed: runSeed,
  });

  const bbVal = validateBigBandPlanningBundle(formPlan, sectionPlan, densityPlan);
  const researchVal = validateResearchDrivenBigBand(
    era,
    composerStyle,
    densityPlan,
    enhancedPlanning,
    bebopLineMetadata
  );

  const orchestrationPlan = assembleBigBandOrchestrationPlan({
    formPlan,
    sectionPlan,
    densityPlan,
    ensembleMask,
  });
  const profile = getEnsembleFamilyProfile('big_band');
  const orchVal = mergeOrchestrationValidation(
    validateOrchestrationPlan(orchestrationPlan, profile),
    validateDensityNoOverload(orchestrationPlan)
  );

  let stylePairingResolution: StylePairingResult | undefined;
  const pairingWarnings: string[] = [];
  if (input.stylePairing != null) {
    stylePairingResolution = resolveStylePairing({
      ...input.stylePairing,
      era: input.stylePairing.era ?? era,
      seed: runSeed,
    });
    pairingWarnings.push(...validateStylePairingResult(stylePairingResolution).warnings);
  }

  const validation: BigBandValidationResult = mergeBigBandValidation(
    bbVal,
    researchVal,
    {
      ok: orchVal.ok,
      errors: orchVal.errors,
      warnings: [...orchVal.warnings, ...pairingWarnings],
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
    bigBandEnsembleConfigId: input.ensembleConfigId ?? 'full_band',
  };

  const universalLeadSheet = buildUniversalLeadSheetFromPlanningForm({
    mode: 'big_band',
    title,
    presetId: 'big_band',
    slices: formPlan.slices.map((s) => ({
      phase: String(s.phase),
      startBar: s.startBar,
      endBar: s.endBar,
    })),
  });

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
    universalLeadSheet,
    stylePairingResolution,
  };
}
