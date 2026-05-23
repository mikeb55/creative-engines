/**
 * String Quartet — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { applyReferenceInfluence } from '../reference-import/applyReferenceInfluence';
import { extractReferenceBehaviour } from '../reference-import/extractReferenceBehaviour';
import { parseMusicXmlReference } from '../reference-import/musicXmlReferenceParser';
import type { ReferenceInfluenceEnvelope } from '../reference-import/referenceReuseTypes';
import { stringQuartetPreset } from '../../presets/stringQuartetPreset';
import { buildQuartetScoreModel } from './quartetScoreBuilder';
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
import type { ScoreModel } from '../score-model/scoreModelTypes';
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
  const chordBars = deriveChordBarsFromProgressionOrLeadSheet({
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

  const slonimskyEnsembleCellReceipts: string[] = [];
  const score = buildQuartetScoreModel({
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
    ...(input.barMeterMap ? { barMeterMap: input.barMeterMap } : {}),
    ...(generationMetadataForScore ? { generationMetadata: generationMetadataForScore } : {}),
    ...(zappaSQEffectiveHarmonyBars && zappaSQEffectiveHarmonyBars.length === tb
      ? { zappaSQEffectiveHarmonyBars }
      : {}),
    slonimskyEnsembleCellReceipts,
  });

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
