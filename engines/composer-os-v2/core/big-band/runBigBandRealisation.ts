/**
 * Big Band — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import { buildBigBandScoreModel } from './bigBandScoreBuilder';
import { applyOrbitBbV64Overlay } from './orbitBbV64Overlay';
import { applyOrbitBbV5Extended } from './orbitBbV5Extended';
import { applyOrbitBbV6Extended } from './orbitBbV6Extended';
import { applySteelyOrbitV11DrumEnding } from './orbitSteelyV11DrumEnding';
import { applySteelyOrbitV12MotifRecurrence } from './orbitSteelyV12MotifRecurrence';
import { applySteelyOrbitDrumNarrative } from './orbitSteelyV13DrumNarrative';
import { applySteelyOrbitMelodicDevelopment } from './orbitSteelyV14MelodicDevelopment';
import { applySteelyOrbitV17Finishing } from './orbitSteelyV17Finishing';
import { applySteelyOrbitV22Humanisation } from './orbitSteelyV22Humanisation';
import type { BigBandFormPlan, BigBandSectionPlan } from './bigBandPlanTypes';
import type { CompositionContext } from '../compositionContext';
import type { GenerationMetadata } from '../compositionContext';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import {
  evaluateMosaicSections,
  type DuoSectionEvalResult,
} from '../mosaic-mode/evaluateMosaicSections';
import {
  formatEvalFailureReport,
  type MosaicEvalResult,
} from '../mosaic-mode/mosaicEvalDiagnostics';
import { isMosaicModeActive } from '../mosaic-mode/mosaicBarHelpers';
import { injectMosaicMotifNotesPostFinalizeBigBand } from '../mosaic-mode/mosaicTilePipeline';
import { getDispatchEntry } from '../mosaic-mode/mosaicComposerDispatch';
import {
  buildMosaicTonicMap,
  cloneDuoSectionContext,
  precomputeMosaicEffectiveHarmonyBars,
  type MosaicModeSectionPlanEntry,
} from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { resolveMosaicSectionStyles } from '../mosaic-mode/resolveMosaicSectionStyles';
import { precomputeFrankZappaEffectiveHarmonyBars } from '../song-mode/frankZappaSlice';
import { mapBigBandToMosaicSectionPlan } from './bigBandToMosaicMapper';
import { applyReferenceInfluence } from '../reference-import/applyReferenceInfluence';
import { extractReferenceBehaviour } from '../reference-import/extractReferenceBehaviour';
import { parseMusicXmlReference } from '../reference-import/musicXmlReferenceParser';
import type { ReferenceInfluenceEnvelope } from '../reference-import/referenceReuseTypes';
import { deriveChordBarsFromProgressionOrLeadSheet } from '../regeneration/ensembleChordBars';
import { planBigBandVoicing } from './bigBandVoicingPlanner';
import { runBigBandMode, type BigBandRunInput, type BigBandRunResult } from './runBigBandMode';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import { applyLeadSheetFormat } from '../goldenPath/generateLeadSheetScore';
import { applyMelodyBassFormat } from '../goldenPath/generateMelodyBassScore';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { BuildBigBandScoreModelInput } from './bigBandScoreBuilder';
import { validateEnsembleVoicing } from '../voicing/voicingValidation';
import type { EnsembleVoicingPlan } from '../voicing/voicingTypes';

export interface BigBandRealisationResult {
  planning: BigBandRunResult;
  voicingPlan: EnsembleVoicingPlan;
  voicingValidation: ReturnType<typeof validateEnsembleVoicing>;
  score: ScoreModel | undefined;
  exportPipeline: ReturnType<typeof runEnsembleExportPipeline>;
  /** Behaviour hints from optional ensemble MusicXML reference import (additive; no score cloning). */
  referenceInfluence?: ReferenceInfluenceEnvelope;
  /** Populated when `songwriterStyleId === 'frank_zappa'` and harmony precompute ran. */
  frankZappaDeviceReceipts?: string[];
  /** Z10 — Slonimsky cell receipts from BB score build. */
  slonimskyEnsembleCellReceipts?: string[];
}

/** Minimal `CompositionContext` for `precomputeFrankZappaEffectiveHarmonyBars` (locked bars + form sections). */
function buildFrankZappaBigBandCompositionContext(args: {
  seed: number;
  chordBars: string[];
  formPlan: BigBandFormPlan;
}): CompositionContext {
  const tb = args.chordBars.length;
  const sections = args.formPlan.slices.map((sl) => ({
    label: String(sl.phase ?? `slice_${sl.index}`),
    startBar: sl.startBar,
    length: Math.max(1, sl.endBar - sl.startBar + 1),
  }));

  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: 'frank_zappa',
  };

  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: args.seed,
    form: { totalBars: tb, sections },
    lockedHarmonyBarsRaw: [...args.chordBars],
    generationMetadata,
  } as unknown as CompositionContext;
}

function buildBigBandMosaicCompositionContext(args: {
  seed: number;
  chordBars: string[];
  formPlan: BigBandFormPlan;
  mosaicPlan: MosaicModeSectionPlanEntry[];
  songwriterStyleId?: string;
  barMeterMap?: BarMeterMap;
  inheritedMetadata?: GenerationMetadata;
}): CompositionContext {
  const tb = args.chordBars.length;
  const sections = args.formPlan.slices.map((sl) => ({
    label: String(sl.phase ?? `slice_${sl.index}`),
    startBar: sl.startBar,
    length: Math.max(1, sl.endBar - sl.startBar + 1),
  }));

  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    ...(args.songwriterStyleId ? { songwriterStyleId: args.songwriterStyleId } : {}),
    mosaicSectionPlan: args.mosaicPlan,
    parsedCustomProgressionBars: [...args.chordBars],
    ...(args.inheritedMetadata?.mosaicOutputFormat
      ? { mosaicOutputFormat: args.inheritedMetadata.mosaicOutputFormat }
      : {}),
    ...(args.inheritedMetadata?.allowMosaicPostFinalizeInject === true
      ? { allowMosaicPostFinalizeInject: true }
      : {}),
    ...(typeof args.inheritedMetadata?.harmonicVoice === 'string' &&
    args.inheritedMetadata.harmonicVoice.trim() !== ''
      ? { harmonicVoice: args.inheritedMetadata.harmonicVoice.trim() }
      : {}),
  };

  return {
    systemVersion: '2.0.0',
    presetId: 'big_band',
    seed: args.seed,
    form: { totalBars: tb, sections },
    lockedHarmonyBarsRaw: [...args.chordBars],
    generationMetadata,
    ...(args.barMeterMap ? { barMeterMap: args.barMeterMap } : {}),
  } as unknown as CompositionContext;
}

function resolveBigBandMosaicPlan(
  input: BigBandRunInput & { context?: CompositionContext; bbMosaicEnabled?: boolean },
  planning: BigBandRunResult
): MosaicModeSectionPlanEntry[] {
  const explicitPlan = input.context?.generationMetadata?.mosaicSectionPlan;
  const mosaicExplicitOptIn =
    input.bbMosaicEnabled === true ||
    (Array.isArray(explicitPlan) && explicitPlan.length >= 2);
  if (!mosaicExplicitOptIn) return [];

  if (explicitPlan && explicitPlan.length >= 2) {
    return explicitPlan.map((entry) => ({ ...entry }));
  }

  return mapBigBandToMosaicSectionPlan(
    { formPlan: planning.formPlan, sectionPlan: planning.sectionPlan },
    {
      songwriterStyleId:
        typeof input.songwriterStyleId === 'string' ? input.songwriterStyleId.trim() : undefined,
    }
  );
}

function applyBigBandMosaicHarmonyDispatch(
  chordBars: string[],
  planning: BigBandRunResult,
  mosaicPlan: MosaicModeSectionPlanEntry[],
  input: BigBandRunInput & { context?: CompositionContext; barMeterMap?: BarMeterMap }
): { chordBars: string[]; mosaicContext: CompositionContext } {
  const inheritedMeta = input.context?.generationMetadata;
  const mosaicContext = buildBigBandMosaicCompositionContext({
    seed: input.seed,
    chordBars,
    formPlan: planning.formPlan,
    mosaicPlan,
    songwriterStyleId:
      typeof input.songwriterStyleId === 'string' ? input.songwriterStyleId.trim() : undefined,
    barMeterMap: input.barMeterMap,
    inheritedMetadata: inheritedMeta,
  });

  const routing = resolveMosaicSectionStyles(mosaicContext.form, mosaicContext.generationMetadata);
  const tonicMap = buildMosaicTonicMap(mosaicPlan, mosaicContext);
  const merged = precomputeMosaicEffectiveHarmonyBars(mosaicContext, routing, tonicMap);

  return { chordBars: [...merged.bars], mosaicContext };
}

function cloneMeasure(m: MeasureModel): MeasureModel {
  return {
    ...m,
    events: m.events.map((ev) => ({ ...ev })),
  };
}

function spliceScoreSectionMeasures(
  base: ScoreModel,
  fragment: ScoreModel,
  startBar: number,
  endBar: number
): ScoreModel {
  const span = endBar - startBar + 1;
  const out = structuredClone(base) as ScoreModel;
  for (const part of out.parts) {
    const fragPart = fragment.parts.find((p) => p.id === part.id);
    if (!fragPart) continue;
    const kept = part.measures.filter((m) => m.index < startBar || m.index > endBar);
    const inserted = fragPart.measures
      .filter((m) => m.index >= 1 && m.index <= span)
      .map((m) => {
        const cloned = cloneMeasure(m);
        cloned.index = m.index + startBar - 1;
        return cloned;
      });
    part.measures = [...kept, ...inserted].sort((a, b) => a.index - b.index);
  }
  return out;
}

function regenerateBigBandMosaicSection(
  scoreBuildInput: BuildBigBandScoreModelInput,
  mosaicContext: CompositionContext,
  section: MosaicModeSectionPlanEntry,
  retryOrdinal: number
): ScoreModel | null {
  const span = section.endBar - section.startBar + 1;
  const formSlice = scoreBuildInput.formPlan.slices.find(
    (s) => s.startBar === section.startBar && s.endBar === section.endBar
  );
  if (!formSlice) return null;

  const tonicMap = buildMosaicTonicMap(
    mosaicContext.generationMetadata.mosaicSectionPlan ?? [],
    mosaicContext
  );
  const tonicPc = tonicMap[section.sectionLabel] ?? 0;
  const fragmentContext = cloneDuoSectionContext(mosaicContext, section, tonicPc);
  fragmentContext.seed = mosaicContext.seed + retryOrdinal * 9973 + section.sectionLabel.length * 17;

  const entry = getDispatchEntry(section.songwriterStyleId);
  if (!entry) return null;
  entry.precompute(fragmentContext);

  const sectionBars = (fragmentContext.generationMetadata as GenerationMetadata & Record<string, unknown>)[
    entry.effectiveHarmonyKey as string
  ] as string[] | undefined;
  if (!sectionBars || sectionBars.length !== span) return null;

  const fragmentFormPlan: BigBandFormPlan = {
    totalBars: span,
    slices: [{ ...formSlice, index: 0, startBar: 1, endBar: span }],
  };
  const fragmentSectionPlan: BigBandSectionPlan = {
    slices: scoreBuildInput.sectionPlan.slices
      .filter((s) => s.formSliceIndex === formSlice.index)
      .map((s) => ({ ...s, formSliceIndex: 0 })),
  };

  try {
    return buildBigBandScoreModel({
      ...scoreBuildInput,
      seed: scoreBuildInput.seed + retryOrdinal * 9973,
      formPlan: fragmentFormPlan,
      sectionPlan: fragmentSectionPlan,
      chordBars: [...sectionBars],
    });
  } catch (err) {
    console.warn(
      `[bb-mosaic-retry] fragment score build failed for "${section.sectionLabel}" attempt ${retryOrdinal}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

const BB_MOSAIC_OVERALL_THRESHOLD = 6.2;
const BB_MOSAIC_SIGNATURE_THRESHOLD = 6.0;

function duoSectionEvalToMosaicEvalResult(duo: DuoSectionEvalResult): MosaicEvalResult {
  const signatures: MosaicEvalResult['signatures'] = {};
  for (const [key, value] of Object.entries(duo.scores)) {
    if (key === 'overall') continue;
    signatures[key] = {
      value,
      threshold: BB_MOSAIC_SIGNATURE_THRESHOLD,
      pass: value >= BB_MOSAIC_SIGNATURE_THRESHOLD,
    };
  }
  return {
    score: duo.scores.overall ?? 0,
    threshold: BB_MOSAIC_OVERALL_THRESHOLD,
    signatures,
    pass: duo.passed,
  };
}

function runBigBandMosaicEvalAndRetry(
  score: ScoreModel,
  mosaicContext: CompositionContext,
  scoreBuildInput: BuildBigBandScoreModelInput,
  maxRetries = 2
): ScoreModel {
  if (!isMosaicModeActive(mosaicContext)) return score;

  try {
    let evalResults = evaluateMosaicSections(score, mosaicContext);
    let current = score;

    for (const section of evalResults) {
      if (section.passed) continue;
      console.log(`[bb-mosaic] section ${section.sectionLabel} failed GCE — attempting retry`);
      console.warn(
        formatEvalFailureReport(
          section.sectionLabel,
          section.composerId,
          duoSectionEvalToMosaicEvalResult(section),
          maxRetries <= 0
        )
      );
      const planEntry = mosaicContext.generationMetadata.mosaicSectionPlan?.find(
        (s) => s.sectionLabel === section.sectionLabel
      );
      if (!planEntry) continue;

      let retried = false;
      let lastFailedEval: DuoSectionEvalResult | undefined = section;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const fragment = regenerateBigBandMosaicSection(
          scoreBuildInput,
          mosaicContext,
          planEntry,
          attempt
        );
        if (!fragment) continue;

        const trialScore = spliceScoreSectionMeasures(
          current,
          fragment,
          planEntry.startBar,
          planEntry.endBar
        );
        const trialEval = evaluateMosaicSections(trialScore, mosaicContext);
        const sectionResult = trialEval.find((r) => r.sectionLabel === section.sectionLabel);
        if (sectionResult?.passed) {
          current = trialScore;
          retried = true;
          mosaicContext.generationMetadata = {
            ...mosaicContext.generationMetadata,
            mosaicSectionRetryReceipt: `section ${section.sectionLabel} retry attempt ${attempt} passed`,
          };
          console.log(`[bb-mosaic] section ${section.sectionLabel} retry succeeded`);
          break;
        }
        if (sectionResult) {
          lastFailedEval = sectionResult;
        }
      }

      if (!retried) {
        console.warn(`[bb-mosaic] section ${section.sectionLabel} retry exhausted — keeping original output`);
        if (lastFailedEval) {
          console.warn(
            formatEvalFailureReport(
              section.sectionLabel,
              lastFailedEval.composerId,
              duoSectionEvalToMosaicEvalResult(lastFailedEval),
              true
            )
          );
        }
      }
    }

    evalResults = evaluateMosaicSections(current, mosaicContext);
    mosaicContext.generationMetadata = {
      ...mosaicContext.generationMetadata,
      mosaicSectionEvalResults: evalResults,
    };
    return current;
  } catch (err) {
    console.warn(
      '[bb-mosaic] evaluateMosaicSections failed:',
      err instanceof Error ? err.message : String(err)
    );
    mosaicContext.generationMetadata = {
      ...mosaicContext.generationMetadata,
      mosaicSectionEvalResults: [],
    };
    return score;
  }
}

export function runBigBandRealisation(
  input: BigBandRunInput & {
    bpm?: number;
    leadSheet?: LeadSheet;
    /** Raw MusicXML for reference behaviour hints (same payload as app `ensembleLeadSheetMusicXml`). */
    ensembleLeadSheetMusicXml?: string;
    /** Jest / A–B: omit orchestration `wybleVoiceLayout` so the BB score skips Wyble alto/tenor sax separation. */
    suppressWybleVoiceLayoutForTest?: boolean;
    /** Mosaic Mode — optional composition context (format flag + section plan). */
    context?: CompositionContext;
    /** V80a — opt-in BB per-section mosaic dispatch (default off). */
    bbMosaicEnabled?: boolean;
  }
): BigBandRealisationResult {
  const planning = runBigBandMode(input);
  const voicingPlan = planBigBandVoicing(planning.orchestrationPlan);
  const voicingValidation = validateEnsembleVoicing(voicingPlan);

  if (!planning.validation.ok) {
    return {
      planning,
      voicingPlan,
      voicingValidation,
      score: undefined,
      exportPipeline: { ok: false, errors: ['Planning validation failed — score not built'] },
    };
  }

  const referenceInfluence =
    typeof input.ensembleLeadSheetMusicXml === 'string' && input.ensembleLeadSheetMusicXml.trim().length > 0
      ? (() => {
          const refResult = parseMusicXmlReference(input.ensembleLeadSheetMusicXml);
          if (!refResult.ok || !refResult.piece) return undefined;
          const profile = extractReferenceBehaviour(refResult.piece);
          return applyReferenceInfluence(profile, 'big_band', 'hint_only', 'subtle');
        })()
      : undefined;

  const tb = planning.formPlan.totalBars;
  const orbitForm28 = input.formId?.trim() === 'orbit_28';
  let chordBars = deriveChordBarsFromProgressionOrLeadSheet({
    chordProgressionText: typeof input.chordProgressionText === 'string' ? input.chordProgressionText : undefined,
    leadSheet: input.leadSheet,
    totalBars: tb,
    ...(orbitForm28 ? { tileFromBarCount: 28 } : {}),
  });

  let frankZappaDeviceReceipts: string[] | undefined;
  const sw = typeof input.songwriterStyleId === 'string' ? input.songwriterStyleId.trim().toLowerCase() : '';
  if (sw === 'frank_zappa' && chordBars && chordBars.length === tb && tb > 0) {
    const fzCtx = buildFrankZappaBigBandCompositionContext({
      seed: input.seed,
      chordBars,
      formPlan: planning.formPlan,
    });
    precomputeFrankZappaEffectiveHarmonyBars(fzCtx);
    const meta = fzCtx.generationMetadata as GenerationMetadata & {
      frankZappaEffectiveHarmonyBars?: string[];
      frankZappaDeviceReceipts?: string[];
    };
    if (Array.isArray(meta.frankZappaEffectiveHarmonyBars) && meta.frankZappaEffectiveHarmonyBars.length === tb) {
      chordBars = [...meta.frankZappaEffectiveHarmonyBars];
    }
    if (meta.frankZappaDeviceReceipts?.length) {
      frankZappaDeviceReceipts = [...meta.frankZappaDeviceReceipts];
    }
  }

  const mosaicPlan = resolveBigBandMosaicPlan(input, planning);
  let mosaicContext: CompositionContext | undefined;
  if (mosaicPlan.length >= 2 && chordBars && chordBars.length === tb && tb > 0) {
    const dispatched = applyBigBandMosaicHarmonyDispatch(chordBars, planning, mosaicPlan, input);
    chordBars = dispatched.chordBars;
    mosaicContext = dispatched.mosaicContext;
  }

  const wybleLayout =
    input.suppressWybleVoiceLayoutForTest === true ? undefined : planning.orchestrationPlan.wybleVoiceLayout;

  const slonimskyEnsembleCellReceipts: string[] = [];
  const scoreBuildInput: BuildBigBandScoreModelInput = {
      title: planning.title,
      seed: input.seed,
      formPlan: planning.formPlan,
      sectionPlan: planning.sectionPlan,
      era: planning.era,
      chordBars,
      wybleVoiceLayout: wybleLayout,
      orchestrationPlan: planning.orchestrationPlan,
      enhancedPlanning: planning.enhancedPlanning,
      ...(typeof input.songwriterStyleId === 'string' && input.songwriterStyleId.trim()
        ? { songwriterStyleId: input.songwriterStyleId.trim() }
        : {}),
      ...(input.allowedOutsideOverride !== undefined
        ? { allowedOutsideOverride: input.allowedOutsideOverride }
        : {}),
      ...(input.barMeterMap ? { barMeterMap: input.barMeterMap } : {}),
      ...(input.drumIntensity ? { drumIntensity: input.drumIntensity } : {}),
      ...(input.sectionIntensityOverrides && Object.keys(input.sectionIntensityOverrides).length > 0
        ? { sectionIntensityOverrides: input.sectionIntensityOverrides }
        : {}),
      ...(input.figureResponse ? { figureResponse: input.figureResponse } : {}),
      ...(input.feelMode ? { feelMode: input.feelMode } : {}),
      ...(input.drumArticulation ? { drumArticulation: input.drumArticulation } : {}),
      ...(input.suppressDesignatedSaxSoli === true ? { suppressDesignatedSaxSoli: true } : {}),
      ...(input.bigBandArrangementProfile ? { bigBandArrangementProfile: input.bigBandArrangementProfile } : {}),
      ...(input.barDrumIntensityOverrides && Object.keys(input.barDrumIntensityOverrides).length > 0
        ? { barDrumIntensityOverrides: input.barDrumIntensityOverrides }
        : {}),
      ...(input.drumArticulationBarOverrides && Object.keys(input.drumArticulationBarOverrides).length > 0
        ? { drumArticulationBarOverrides: input.drumArticulationBarOverrides }
        : {}),
      ...(input.leadSheet ? { leadSheetMelodyLock: input.leadSheet } : {}),
      ...(planning.sectionArchitectureContext ? { sectionArchitectureContext: planning.sectionArchitectureContext } : {}),
      ...(input.orbit28V2GceFixes ? { orbit28V2GceFixes: input.orbit28V2GceFixes } : {}),
      ...(input.bb101GceFixes ? { bb101GceFixes: input.bb101GceFixes } : {}),
      slonimskyEnsembleCellReceipts,
  };

  let score: ScoreModel;
  let exportPipeline: BigBandRealisationResult['exportPipeline'];
  try {
    score = buildBigBandScoreModel(scoreBuildInput);

    /** `orbit_28_v1` / `orbit_28_v2` / `bb101_v1` use score-builder V2 helpers only — no V64/V5/V6/Steely/V22 post overlays. */
    const profile = input.bigBandArrangementProfile;
    const applyOrbit64FamilyOverlays =
      profile !== undefined &&
      profile !== 'orbit_28_v1' &&
      profile !== 'orbit_28_v2' &&
      profile !== 'bb101_v1';

    if (
      applyOrbit64FamilyOverlays &&
      (profile === 'orbit_v4_64' ||
        profile === 'orbit_v5_64' ||
        profile === 'orbit_v6_64' ||
        profile === 'orbit_steely_v1_64' ||
        profile === 'orbit_steely_v1_1_64' ||
        profile === 'orbit_steely_v1_2_64' ||
        profile === 'orbit_steely_v1_3_64' ||
        profile === 'orbit_steely_v1_4_64' ||
        profile === 'orbit_steely_v1_5_64' ||
        profile === 'orbit_steely_v1_7_64')
    ) {
      applyOrbitBbV64Overlay(score);
    }
    if (
      applyOrbit64FamilyOverlays &&
      (profile === 'orbit_v5_64' ||
        profile === 'orbit_v6_64' ||
        profile === 'orbit_steely_v1_64' ||
        profile === 'orbit_steely_v1_1_64' ||
        profile === 'orbit_steely_v1_2_64' ||
        profile === 'orbit_steely_v1_3_64' ||
        profile === 'orbit_steely_v1_4_64' ||
        profile === 'orbit_steely_v1_5_64' ||
        profile === 'orbit_steely_v1_7_64')
    ) {
      applyOrbitBbV5Extended(score);
    }
    if (applyOrbit64FamilyOverlays && profile === 'orbit_v6_64') {
      applyOrbitBbV6Extended(score);
    } else if (
      applyOrbit64FamilyOverlays &&
      (profile === 'orbit_steely_v1_64' ||
        profile === 'orbit_steely_v1_1_64' ||
        profile === 'orbit_steely_v1_2_64' ||
        profile === 'orbit_steely_v1_3_64' ||
        profile === 'orbit_steely_v1_4_64' ||
        profile === 'orbit_steely_v1_5_64' ||
        profile === 'orbit_steely_v1_7_64')
    ) {
      applyOrbitBbV6Extended(score, 'steely_v1');
      if (profile === 'orbit_steely_v1_1_64' || profile === 'orbit_steely_v1_2_64') {
        applySteelyOrbitV11DrumEnding(score);
      }
      if (
        (profile === 'orbit_steely_v1_2_64' ||
          profile === 'orbit_steely_v1_3_64' ||
          profile === 'orbit_steely_v1_4_64' ||
          profile === 'orbit_steely_v1_5_64' ||
          profile === 'orbit_steely_v1_7_64') &&
        input.leadSheet
      ) {
        applySteelyOrbitV12MotifRecurrence(score, input.leadSheet);
      }
      if (
        profile === 'orbit_steely_v1_3_64' ||
        profile === 'orbit_steely_v1_4_64' ||
        profile === 'orbit_steely_v1_5_64' ||
        profile === 'orbit_steely_v1_7_64'
      ) {
        applySteelyOrbitDrumNarrative(score);
      }
      const steelyMelodicVariant =
        profile === 'orbit_steely_v1_4_64'
          ? ('v14' as const)
          : profile === 'orbit_steely_v1_5_64' || profile === 'orbit_steely_v1_7_64'
            ? ('v15' as const)
            : null;
      if (steelyMelodicVariant && input.leadSheet) {
        applySteelyOrbitMelodicDevelopment(score, input.leadSheet, steelyMelodicVariant);
      }
      if (profile === 'orbit_steely_v1_7_64') {
        applySteelyOrbitV17Finishing(score);
        applySteelyOrbitV22Humanisation(score);
      }
    }

    const context =
      mosaicContext ??
      input.context ??
      planning.sectionArchitectureContext ??
      input.sectionArchitectureContext;
    const planWithTonics = context?.generationMetadata?.mosaicSectionPlan ?? [];
    const mosaicOutputFormat = (
      context?.generationMetadata as GenerationMetadata & {
        mosaicOutputFormat?: 'melody-bass-chords' | 'lead-sheet';
      }
    )?.mosaicOutputFormat;
    if (mosaicOutputFormat === 'lead-sheet') {
      score = applyLeadSheetFormat(score, planWithTonics);
    } else if (mosaicOutputFormat === 'melody-bass-chords') {
      score = applyMelodyBassFormat(score, planWithTonics);
    }

    if (mosaicContext && isMosaicModeActive(mosaicContext)) {
      score = runBigBandMosaicEvalAndRetry(score, mosaicContext, scoreBuildInput);
      score = injectMosaicMotifNotesPostFinalizeBigBand(
        score,
        mosaicContext,
        input.bbMosaicEnabled
      );
    }

    exportPipeline = runEnsembleExportPipeline(score, {
      ...(typeof input.bpm === 'number' && Number.isFinite(input.bpm) ? { bpm: input.bpm } : {}),
    });
  } catch (err) {
    console.error('[runBigBandRealisation] score build or ensemble export pipeline threw:', err);
    throw err;
  }

  return {
    planning,
    voicingPlan,
    voicingValidation,
    score,
    exportPipeline,
    ...(referenceInfluence ? { referenceInfluence } : {}),
    ...(frankZappaDeviceReceipts ? { frankZappaDeviceReceipts } : {}),
    ...(slonimskyEnsembleCellReceipts.length > 0 ? { slonimskyEnsembleCellReceipts } : {}),
  };
}
