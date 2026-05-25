/**
 * Big Band planning pipeline — no MusicXML / voicing generation (Prompt 5/7 + 5.6/7 research rules).
 */

import { applyBigBandRules } from './applyBigBandRules';
import { assembleBigBandOrchestrationPlan } from './buildBigBandOrchestrationPlan';
import { planBebopLineBehaviour, type BebopLineBehaviourMetadata } from './bebopLinePlanner';
import { planBigBandDensity } from './bigBandDensityPlanner';
import { resolveBigBandEraRules } from './bigBandEraResolver';
import { planBigBandForm } from './bigBandFormPlanner';
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
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { FigureResponseLevel } from '../arranging/bigBandPatterns';
import type { DrumArticulationMode, DrumIntensity } from './bigBandDrumIntensity';
import type { BigBandFormPhase } from './bigBandPlanTypes';
import type { CompositionContext } from '../compositionContext';
import type { Song } from '../section-architecture/sectionArchitectureTypes';
import {
  createSectionArchitectureRuntimeContext,
  getSectionArchitectureDensityHint,
} from '../section-architecture/effectiveContextForBar';

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
  /** Optional `|`-separated chords — used by realisation / score only; ignored by planning. */
  chordProgressionText?: string;
  /** Songwriter id from Generate (e.g. `radiohead`) — Slonimsky catalogue bias in score realisation only. */
  songwriterStyleId?: string;
  /** User Chromatic Strength cap (0/1/2) — passed to score realisation Slonimsky only. */
  allowedOutsideOverride?: 0 | 1 | 2;
  /**
   * Named big-band form preset (e.g. `big_band_blues12` → 42-bar blues chart). Omitted → default weighted form.
   * Distinct from Generate UI `blues12` (12-bar duo/song option) in the app `formOptions` list.
   */
  formId?: string;
  /** Optional per-bar meter map — passed through to score realisation (`buildBigBandScoreModel`). */
  barMeterMap?: BarMeterMap;
  /** Drum intensity tier — passed to `buildBigBandScoreModel`. */
  drumIntensity?: DrumIntensity;
  /** Per-form-slice drum tier overrides (same keys as plan slices). */
  sectionIntensityOverrides?: Partial<Record<BigBandFormPhase, DrumIntensity>>;
  /** Ensemble figure / fill dialogue density — passed to score realisation. */
  figureResponse?: FigureResponseLevel;
  /** Rhythm-section half-time vs full walk — passed to score realisation. */
  feelMode?: 'in2' | 'in4';
  /** Brush vs stick timbre — passed to score realisation. */
  drumArticulation?: DrumArticulationMode;
  /** When true, skips bars 17–24 sax-soli substitute (custom charts e.g. Orbit). */
  suppressDesignatedSaxSoli?: boolean;
  /** Orbit BB orchestration profile (score builder). */
  bigBandArrangementProfile?:
    | 'default'
    | 'orbit_v2'
    | 'orbit_v3_melody_authority'
    | 'orbit_v4_64'
    | 'orbit_v5_64'
    | 'orbit_v6_64'
    | 'orbit_steely_v1_64'
    | 'orbit_steely_v1_1_64'
    | 'orbit_steely_v1_2_64'
    | 'orbit_steely_v1_3_64'
    | 'orbit_steely_v1_4_64'
    | 'orbit_steely_v1_5_64'
    | 'orbit_steely_v1_7_64';
  /** Per-bar drum tier overrides (1-based bar index). */
  barDrumIntensityOverrides?: Partial<Record<number, DrumIntensity>>;
  /** Per-bar brush vs sticks override (1-based bar index). */
  drumArticulationBarOverrides?: Partial<Record<number, DrumArticulationMode>>;
  /** V65 P2 — section architecture document for ensemble-aware planning/score. */
  song?: Song;
  /** V65 P2 — cached per-bar effective contexts created from `song`. */
  sectionArchitectureContext?: CompositionContext;
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
  sectionArchitectureContext?: CompositionContext;
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
  const requestedBars = Math.max(16, input.totalBars ?? 32);
  const blues12 = input.formId?.trim() === 'big_band_blues12';
  const orbitForm32 = input.formId?.trim() === 'orbit_bb' || input.formId?.trim() === 'orbit_32';
  const orbitForm64 = input.formId?.trim() === 'orbit_bb_64';
  const totalBars = blues12 ? 42 : orbitForm32 ? 32 : orbitForm64 ? 64 : requestedBars;
  const era = input.era ?? 'post_bop';
  const composerStyle = input.composerStyle === undefined ? null : input.composerStyle;

  const formPlan = planBigBandForm(input.formId, runSeed, { totalBars });
  const ensembleMask = resolveEnsembleMaskForConfig(
    input.ensembleConfigId ?? 'full_band',
    input.customEnsembleMask ?? null
  );
  let sectionPlan = planBigBandSections(formPlan, runSeed);
  sectionPlan = applyBigBandEnsembleMask(sectionPlan, ensembleMask);
  const sectionArchitectureContext =
    input.sectionArchitectureContext ?? createSectionArchitectureRuntimeContext(input.song, 'big_band', runSeed);
  const densityPlan = sectionArchitectureContext
    ? {
        slices: planBigBandDensity(formPlan).slices.map((slice) => {
          const formSlice = formPlan.slices.find((s) => s.index === slice.formSliceIndex);
          const hint = getSectionArchitectureDensityHint(formSlice?.startBar ?? 1, sectionArchitectureContext);
          return hint ? { ...slice, density: hint === 'medium' ? 'moderate' : hint } : slice;
        }),
      }
    : planBigBandDensity(formPlan);

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
    sectionArchitectureContext,
  };
}
