/**
 * String Quartet — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import {
  evaluateMosaicSections,
  type DuoSectionEvalResult,
} from '../mosaic-mode/evaluateMosaicSections';
import {
  formatEvalFailureReport,
  type MosaicEvalResult,
} from '../mosaic-mode/mosaicEvalDiagnostics';
import { isMosaicModeActive } from '../mosaic-mode/mosaicBarHelpers';
import { getDispatchEntry } from '../mosaic-mode/mosaicComposerDispatch';
import {
  buildMosaicTonicMap,
  cloneDuoSectionContext,
  precomputeMosaicEffectiveHarmonyBars,
  type MosaicModeSectionPlanEntry,
} from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { resolveMosaicSectionStyles } from '../mosaic-mode/resolveMosaicSectionStyles';
import { applyReferenceInfluence } from '../reference-import/applyReferenceInfluence';
import { extractReferenceBehaviour } from '../reference-import/extractReferenceBehaviour';
import { parseMusicXmlReference } from '../reference-import/musicXmlReferenceParser';
import type { ReferenceInfluenceEnvelope } from '../reference-import/referenceReuseTypes';
import { stringQuartetPreset } from '../../presets/stringQuartetPreset';
import { buildQuartetScoreModel, type BuildQuartetScoreModelInput } from './quartetScoreBuilder';
import type { QuartetFormPlan, QuartetTexturePlan } from './quartetPlanTypes';
import { mapStringQuartetToMosaicSectionPlan } from './stringQuartetToMosaicMapper';
import {
  precomputeMosaicSqContrapuntalLines,
  resolveMosaicSqContrapuntalGuides,
} from './precomputeMosaicSqContrapuntalLines';
import {
  isSongwriterFrankZappaStringQuartet,
  precomputeZappaSQEffectiveHarmonyBars,
} from './zappaStringQuartetSlice';
import { deriveChordBarsFromProgressionOrLeadSheet } from '../regeneration/ensembleChordBars';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';
import { planQuartetVoicing } from './quartetVoicingPlanner';
import { runStringQuartetMode, type StringQuartetRunInput, type StringQuartetRunResult } from './runStringQuartetMode';
import { applySqContrapuntalPass4MergeOnScore } from '../counterpoint/contrapuntalPass4MusicXmlMerge';
import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import { applyLeadSheetFormat } from '../goldenPath/generateLeadSheetScore';
import { applyMelodyBassFormat } from '../goldenPath/generateMelodyBassScore';
import type { MeasureModel, ScoreModel } from '../score-model/scoreModelTypes';
import { validateEnsembleVoicing } from '../voicing/voicingValidation';
import type { EnsembleVoicingPlan } from '../voicing/voicingTypes';
import type { BarMeterMap } from '../rhythm/barMeterTypes';

/** Full-bar progression for {@link precomputeZappaSQEffectiveHarmonyBars}: locked text, parsed snapshot, or Frank Zappa duo baseline in metadata. */
function resolveLockedHarmonyBarsRawForZappaSq(
  tb: number,
  chordBars: string[] | undefined,
  meta: GenerationMetadata
): string[] | undefined {
  if (chordBars && chordBars.length === tb) return chordBars;
  const parsed = meta.parsedCustomProgressionBars;
  if (parsed && parsed.length === tb) return parsed;
  return undefined;
}

function hasAuthoritativeChordSourceForZappaSqPrecompute(
  tb: number,
  chordBars: string[] | undefined,
  meta: GenerationMetadata
): boolean {
  if (chordBars && chordBars.length === tb) return true;
  if (meta.parsedCustomProgressionBars && meta.parsedCustomProgressionBars.length === tb) return true;
  if (meta.frankZappaEffectiveHarmonyBars && meta.frankZappaEffectiveHarmonyBars.length === tb) return true;
  return false;
}

function buildZappaStringQuartetPrecomputeContext(params: {
  planning: StringQuartetRunResult;
  seed: number;
  barMeterMap: BarMeterMap | undefined;
  lockedHarmonyBarsRaw: string[] | undefined;
  generationMetadata: GenerationMetadata;
}): CompositionContext {
  const { planning, seed, barMeterMap, lockedHarmonyBarsRaw, generationMetadata } = params;
  const tb = planning.formPlan.totalBars;
  const sections = planning.formPlan.slices.map((s) => ({
    label: String(s.phase),
    startBar: s.startBar,
    length: s.endBar - s.startBar + 1,
  }));
  const preset = stringQuartetPreset;
  return {
    systemVersion: '2.0.0',
    presetId: 'string_quartet',
    seed,
    form: { totalBars: tb, sections },
    feel: preset.defaultFeel,
    harmony: { segments: [], totalBars: tb },
    motif: { activeMotifs: [], variants: {} },
    phrase: { segments: [], totalBars: tb },
    register: {},
    density: { segments: [], totalBars: tb },
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan: { segments: [], totalBars: tb },
    rehearsalMarkPlan: { marks: [] },
    generationMetadata,
    validation: { gates: [], passed: true },
    readiness: {
      release: { passed: true, overall: 1, categories: [] },
      mx: { passed: true, overall: 1, categories: [] },
    },
    ...(lockedHarmonyBarsRaw ? { lockedHarmonyBarsRaw } : {}),
    barMeterMap,
  } as unknown as CompositionContext;
}

function buildQuartetMosaicCompositionContext(args: {
  seed: number;
  chordBars: string[];
  formPlan: QuartetFormPlan;
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
  };

  return {
    systemVersion: '2.0.0',
    presetId: 'string_quartet',
    seed: args.seed,
    form: { totalBars: tb, sections },
    lockedHarmonyBarsRaw: [...args.chordBars],
    generationMetadata,
    ...(args.barMeterMap ? { barMeterMap: args.barMeterMap } : {}),
  } as unknown as CompositionContext;
}

function resolveQuartetMosaicPlan(
  input: StringQuartetRunInput & { context?: CompositionContext; sqMosaicEnabled?: boolean },
  planning: StringQuartetRunResult
): MosaicModeSectionPlanEntry[] {
  const explicitPlan = input.context?.generationMetadata?.mosaicSectionPlan;
  const mosaicExplicitOptIn =
    input.sqMosaicEnabled === true ||
    (Array.isArray(explicitPlan) && explicitPlan.length >= 2);
  if (!mosaicExplicitOptIn) return [];

  if (explicitPlan && explicitPlan.length >= 2) {
    return explicitPlan.map((entry) => ({ ...entry }));
  }

  return mapStringQuartetToMosaicSectionPlan(
    { formPlan: planning.formPlan, texturePlan: planning.texturePlan },
    {
      songwriterStyleId:
        typeof input.songwriterStyleId === 'string' ? input.songwriterStyleId.trim() : undefined,
    }
  );
}

function applyQuartetMosaicHarmonyDispatch(
  chordBars: string[],
  planning: StringQuartetRunResult,
  mosaicPlan: MosaicModeSectionPlanEntry[],
  input: StringQuartetRunInput & { context?: CompositionContext; barMeterMap?: BarMeterMap }
): { chordBars: string[]; mosaicContext: CompositionContext } {
  const inheritedMeta = input.context?.generationMetadata;
  const mosaicContext = buildQuartetMosaicCompositionContext({
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

function regenerateQuartetMosaicSection(
  scoreBuildInput: BuildQuartetScoreModelInput,
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

  const fragmentFormPlan: QuartetFormPlan = {
    totalBars: span,
    slices: [{ ...formSlice, index: 0, startBar: 1, endBar: span }],
  };
  const fragmentTexturePlan: QuartetTexturePlan = {
    slices: scoreBuildInput.texturePlan.slices
      .filter((s) => s.formSliceIndex === formSlice.index)
      .map((s) => ({ ...s, formSliceIndex: 0 })),
  };

  try {
    return buildQuartetScoreModel({
      ...scoreBuildInput,
      seed: scoreBuildInput.seed + retryOrdinal * 9973,
      formPlan: fragmentFormPlan,
      texturePlan: fragmentTexturePlan,
      chordBars: [...sectionBars],
    });
  } catch (err) {
    console.warn(
      `[sq-mosaic-retry] fragment score build failed for "${section.sectionLabel}" attempt ${retryOrdinal}:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

const SQ_MOSAIC_OVERALL_THRESHOLD = 6.2;
const SQ_MOSAIC_SIGNATURE_THRESHOLD = 6.0;

function duoSectionEvalToMosaicEvalResult(duo: DuoSectionEvalResult): MosaicEvalResult {
  const signatures: MosaicEvalResult['signatures'] = {};
  for (const [key, value] of Object.entries(duo.scores)) {
    if (key === 'overall') continue;
    signatures[key] = {
      value,
      threshold: SQ_MOSAIC_SIGNATURE_THRESHOLD,
      pass: value >= SQ_MOSAIC_SIGNATURE_THRESHOLD,
    };
  }
  return {
    score: duo.scores.overall ?? 0,
    threshold: SQ_MOSAIC_OVERALL_THRESHOLD,
    signatures,
    pass: duo.passed,
  };
}

function runQuartetMosaicEvalAndRetry(
  score: ScoreModel,
  mosaicContext: CompositionContext,
  scoreBuildInput: BuildQuartetScoreModelInput,
  maxRetries = 2
): ScoreModel {
  if (!isMosaicModeActive(mosaicContext)) return score;

  try {
    let evalResults = evaluateMosaicSections(score, mosaicContext);
    let current = score;

    for (const section of evalResults) {
      if (section.passed) continue;
      console.log(`[sq-mosaic] section ${section.sectionLabel} failed GCE — attempting retry`);
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
      if ((planEntry as MosaicModeSectionPlanEntry & { presetRole?: string }).presetRole !== 'string_quartet') {
        continue;
      }

      let retried = false;
      let lastFailedEval: DuoSectionEvalResult | undefined = section;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const fragment = regenerateQuartetMosaicSection(
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
          console.log(`[sq-mosaic] section ${section.sectionLabel} retry succeeded`);
          break;
        }
        if (sectionResult) {
          lastFailedEval = sectionResult;
        }
      }

      if (!retried) {
        console.warn(`[sq-mosaic] section ${section.sectionLabel} retry exhausted — keeping original output`);
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
      '[sq-mosaic] evaluateMosaicSections failed:',
      err instanceof Error ? err.message : String(err)
    );
    mosaicContext.generationMetadata = {
      ...mosaicContext.generationMetadata,
      mosaicSectionEvalResults: [],
    };
    return score;
  }
}

export interface QuartetRealisationResult {
  planning: StringQuartetRunResult;
  voicingPlan: EnsembleVoicingPlan;
  voicingValidation: ReturnType<typeof validateEnsembleVoicing>;
  score: ScoreModel | undefined;
  exportPipeline: ReturnType<typeof runEnsembleExportPipeline>;
  /** Behaviour hints from optional ensemble MusicXML reference import (additive; no score cloning). */
  referenceInfluence?: ReferenceInfluenceEnvelope;
  /** Harmony metadata passed into score build (post–SQ precompute when applicable); for manifests / smoke. */
  ensembleHarmonyMetadata?: GenerationMetadata;
}

export function runQuartetRealisation(
  input: StringQuartetRunInput & {
    era?: BigBandEraId;
    bpm?: number;
    leadSheet?: LeadSheet;
    /** Raw MusicXML for reference behaviour hints (same payload as app `ensembleLeadSheetMusicXml`). */
    ensembleLeadSheetMusicXml?: string;
    /** Jest / A–B: omit orchestration `wybleVoiceLayout` so the quartet score build skips the Wyble inner-line chord-tone swap. */
    suppressWybleVoiceLayoutForTest?: boolean;
    /** Optional per-bar meters (1-based); omit for all 4/4 — same semantics as golden-path `barMeterMap`. */
    barMeterMap?: BarMeterMap;
    /** When set with Frank Zappa string-quartet slice flags, drives SQ harmony precompute + score builder Zappa path. */
    generationMetadata?: GenerationMetadata;
    /** Mosaic Mode — optional composition context (format flag + section plan). */
    context?: CompositionContext;
    /** V80e — opt-in SQ per-section mosaic dispatch (default off). */
    sqMosaicEnabled?: boolean;
    blendStrength?: 'light' | 'medium' | 'strong';
    duoIntent?: 'conversational' | 'supportive';
  }
): QuartetRealisationResult {
  const planning = runStringQuartetMode(input);
  const voicingPlan = planQuartetVoicing(planning.orchestrationPlan);
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
          return applyReferenceInfluence(profile, 'string_quartet', 'hint_only', 'subtle');
        })()
      : undefined;

  const tb = planning.formPlan.totalBars;
  let chordBars = deriveChordBarsFromProgressionOrLeadSheet({
    chordProgressionText: typeof input.chordProgressionText === 'string' ? input.chordProgressionText : undefined,
    leadSheet: input.leadSheet,
    totalBars: tb,
  });

  const wybleLayout =
    input.suppressWybleVoiceLayoutForTest === true ? undefined : planning.orchestrationPlan.wybleVoiceLayout;

  let generationMetadataForScore: GenerationMetadata | undefined = input.generationMetadata;
  let zappaSQEffectiveHarmonyBars: string[] | undefined;

  if (
    input.generationMetadata &&
    isSongwriterFrankZappaStringQuartet(input.generationMetadata) &&
    hasAuthoritativeChordSourceForZappaSqPrecompute(tb, chordBars, input.generationMetadata)
  ) {
    const genMetaMutable: GenerationMetadata = { ...input.generationMetadata };
    const lockedRaw = resolveLockedHarmonyBarsRawForZappaSq(tb, chordBars, genMetaMutable);
    const zappaCtx = buildZappaStringQuartetPrecomputeContext({
      planning,
      seed: input.seed,
      barMeterMap: input.barMeterMap,
      lockedHarmonyBarsRaw: lockedRaw,
      generationMetadata: genMetaMutable,
    });
    precomputeZappaSQEffectiveHarmonyBars(zappaCtx);
    generationMetadataForScore = zappaCtx.generationMetadata as GenerationMetadata;
    const sqBars = (generationMetadataForScore as { zappaSQEffectiveHarmonyBars?: string[] }).zappaSQEffectiveHarmonyBars;
    zappaSQEffectiveHarmonyBars = Array.isArray(sqBars) ? sqBars : undefined;
  }

  const mosaicPlan = resolveQuartetMosaicPlan(input, planning);
  let mosaicContext: CompositionContext | undefined;
  if (mosaicPlan.length >= 2 && chordBars && chordBars.length === tb && tb > 0) {
    const dispatched = applyQuartetMosaicHarmonyDispatch(chordBars, planning, mosaicPlan, input);
    chordBars = dispatched.chordBars;
    mosaicContext = dispatched.mosaicContext;
  }

  const primarySongwriterId =
    typeof input.songwriterStyleId === 'string' && input.songwriterStyleId.trim()
      ? input.songwriterStyleId.trim()
      : mosaicContext?.generationMetadata?.songwriterStyleId ?? 'bartok';

  if (mosaicContext) {
    const guides = resolveMosaicSqContrapuntalGuides(
      mosaicContext,
      primarySongwriterId,
      input.sqMosaicEnabled
    );
    if (guides) {
      precomputeMosaicSqContrapuntalLines(mosaicContext, guides, primarySongwriterId);
      const mosaicMeta = mosaicContext.generationMetadata;
      generationMetadataForScore = {
        ...(generationMetadataForScore ?? { generatedAt: new Date().toISOString() }),
        ...mosaicMeta,
        contrapuntalLineSet: mosaicMeta.contrapuntalLineSet,
        mosaicSqContrapuntalGuides: guides,
      };
    }
  }

  const slonimskyEnsembleCellReceipts: string[] = [];
  const scoreBuildInput: BuildQuartetScoreModelInput = {
    title: planning.title,
    seed: input.seed,
    formPlan: planning.formPlan,
    texturePlan: planning.texturePlan,
    era: input.era,
    chordBars,
    wybleVoiceLayout: wybleLayout,
    ...(typeof input.songwriterStyleId === 'string' && input.songwriterStyleId.trim()
      ? { songwriterStyleId: input.songwriterStyleId.trim() }
      : {}),
    ...(input.allowedOutsideOverride !== undefined
      ? { allowedOutsideOverride: input.allowedOutsideOverride }
      : {}),
    ...(input.blendStrength === 'light' || input.blendStrength === 'medium' || input.blendStrength === 'strong'
      ? { blendStrength: input.blendStrength }
      : {}),
    ...(input.duoIntent === 'conversational' || input.duoIntent === 'supportive'
      ? { duoIntent: input.duoIntent }
      : {}),
    ...(input.barMeterMap ? { barMeterMap: input.barMeterMap } : {}),
    ...(generationMetadataForScore ? { generationMetadata: generationMetadataForScore } : {}),
    ...(zappaSQEffectiveHarmonyBars && zappaSQEffectiveHarmonyBars.length === tb
      ? { zappaSQEffectiveHarmonyBars }
      : {}),
    ...(planning.sectionArchitectureContext ? { sectionArchitectureContext: planning.sectionArchitectureContext } : {}),
    slonimskyEnsembleCellReceipts,
  };

  let score = buildQuartetScoreModel(scoreBuildInput);

  if (slonimskyEnsembleCellReceipts.length > 0) {
    const base = generationMetadataForScore ?? { generatedAt: new Date().toISOString() };
    generationMetadataForScore = {
      ...base,
      slonimskyEnsembleCellReceipts: [
        ...(base.slonimskyEnsembleCellReceipts ?? []),
        ...slonimskyEnsembleCellReceipts,
      ],
    };
  }

  const metaForMerge = generationMetadataForScore ?? input.generationMetadata;
  if (metaForMerge) {
    const swId =
      typeof input.songwriterStyleId === 'string' && input.songwriterStyleId.trim()
        ? input.songwriterStyleId.trim()
        : metaForMerge.songwriterStyleId ?? '';
    const bundle = swId ? getVoiceRuleBundle(swId) : undefined;
    applySqContrapuntalPass4MergeOnScore(score, metaForMerge, bundle);
  }

  if (mosaicContext && isMosaicModeActive(mosaicContext)) {
    score = runQuartetMosaicEvalAndRetry(score, mosaicContext, scoreBuildInput);
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

  const exportPipeline = runEnsembleExportPipeline(score, {
    ...(typeof input.bpm === 'number' && Number.isFinite(input.bpm) ? { bpm: input.bpm } : {}),
    ...(input.barMeterMap ? { barMeterMap: input.barMeterMap } : {}),
  });

  return {
    planning,
    voicingPlan,
    voicingValidation,
    score,
    exportPipeline,
    ...(referenceInfluence ? { referenceInfluence } : {}),
    ...(generationMetadataForScore ? { ensembleHarmonyMetadata: generationMetadataForScore } : {}),
  };
}
