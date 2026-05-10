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
import type { BigBandFormPlan } from './bigBandPlanTypes';
import type { CompositionContext } from '../compositionContext';
import type { GenerationMetadata } from '../compositionContext';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import { precomputeFrankZappaEffectiveHarmonyBars } from '../song-mode/frankZappaSlice';
import { applyReferenceInfluence } from '../reference-import/applyReferenceInfluence';
import { extractReferenceBehaviour } from '../reference-import/extractReferenceBehaviour';
import { parseMusicXmlReference } from '../reference-import/musicXmlReferenceParser';
import type { ReferenceInfluenceEnvelope } from '../reference-import/referenceReuseTypes';
import { deriveChordBarsFromProgressionOrLeadSheet } from '../regeneration/ensembleChordBars';
import { planBigBandVoicing } from './bigBandVoicingPlanner';
import { runBigBandMode, type BigBandRunInput, type BigBandRunResult } from './runBigBandMode';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import type { ScoreModel } from '../score-model/scoreModelTypes';
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

export function runBigBandRealisation(
  input: BigBandRunInput & {
    bpm?: number;
    leadSheet?: LeadSheet;
    /** Raw MusicXML for reference behaviour hints (same payload as app `ensembleLeadSheetMusicXml`). */
    ensembleLeadSheetMusicXml?: string;
    /** Jest / A–B: omit orchestration `wybleVoiceLayout` so the BB score skips Wyble alto/tenor sax separation. */
    suppressWybleVoiceLayoutForTest?: boolean;
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
  let chordBars = deriveChordBarsFromProgressionOrLeadSheet({
    chordProgressionText: typeof input.chordProgressionText === 'string' ? input.chordProgressionText : undefined,
    leadSheet: input.leadSheet,
    totalBars: tb,
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

  const wybleLayout =
    input.suppressWybleVoiceLayoutForTest === true ? undefined : planning.orchestrationPlan.wybleVoiceLayout;

  let score: ScoreModel;
  let exportPipeline: BigBandRealisationResult['exportPipeline'];
  try {
    score = buildBigBandScoreModel({
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
    });

    if (
      input.bigBandArrangementProfile === 'orbit_v4_64' ||
      input.bigBandArrangementProfile === 'orbit_v5_64' ||
      input.bigBandArrangementProfile === 'orbit_v6_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_3_64'
    ) {
      applyOrbitBbV64Overlay(score);
    }
    if (
      input.bigBandArrangementProfile === 'orbit_v5_64' ||
      input.bigBandArrangementProfile === 'orbit_v6_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_3_64'
    ) {
      applyOrbitBbV5Extended(score);
    }
    if (input.bigBandArrangementProfile === 'orbit_v6_64') {
      applyOrbitBbV6Extended(score);
    } else if (
      input.bigBandArrangementProfile === 'orbit_steely_v1_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
      input.bigBandArrangementProfile === 'orbit_steely_v1_3_64'
    ) {
      applyOrbitBbV6Extended(score, 'steely_v1');
      if (
        input.bigBandArrangementProfile === 'orbit_steely_v1_1_64' ||
        input.bigBandArrangementProfile === 'orbit_steely_v1_2_64'
      ) {
        applySteelyOrbitV11DrumEnding(score);
      }
      if (
        (input.bigBandArrangementProfile === 'orbit_steely_v1_2_64' ||
          input.bigBandArrangementProfile === 'orbit_steely_v1_3_64') &&
        input.leadSheet
      ) {
        applySteelyOrbitV12MotifRecurrence(score, input.leadSheet);
      }
      if (input.bigBandArrangementProfile === 'orbit_steely_v1_3_64') {
        applySteelyOrbitDrumNarrative(score);
      }
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
  };
}
