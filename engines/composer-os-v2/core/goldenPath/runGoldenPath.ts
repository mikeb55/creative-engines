/**
 * Composer OS V2 — Golden path runner
 * preset → feel → section roles → density → register map → behaviours → score → integrity → export → validation → manifest
 */

import type { CompositionContext, HarmonyPipelineStage } from '../compositionContext';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { RunManifest } from '../run-ledger/runLedgerTypes';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { generateGoldenPathDuoScore, type GoldenPathPlans } from './generateGoldenPathDuoScore';
import { planSectionRoles } from '../section-roles/sectionRolePlanner';
import type { SectionRole } from '../section-roles/sectionRoleTypes';
import { planDensityCurve } from '../density/densityCurvePlanner';
import { planGuitarRegisterMap, planBassRegisterMap } from '../register-map/registerMapPlanner';
import { planInteraction } from '../interaction/interactionPlanner';
import { planGuitarBehaviour } from '../instrument-behaviours/guitarBehaviour';
import { planBassBehaviour } from '../instrument-behaviours/uprightBassBehaviour';
import { computeRhythmicConstraints } from '../rhythm-engine/rhythmEngine';
import { generateMotif, type MotifStyleHints } from '../motif/motifGenerator';
import { styleStackToModuleIds, type StyleStack } from '../style-modules/styleModuleTypes';
import { applyStyleStack } from '../style-modules/styleModuleRegistry';
import { placeMotifsAcrossBars, placeMotifsForEcmForm } from '../motif/motifTracker';
import { runScoreIntegrityGate } from '../score-integrity/scoreIntegrityGate';
import { runBehaviourGates } from '../score-integrity/behaviourGates';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateLockedHarmonyMusicXmlTruth } from '../export/validateLockedHarmonyMusicXml';
import { applyKeySignatureToScoreAndContext } from '../harmony/keyInference';
import { validateMusicXmlSchema } from '../export/musicxmlValidation';
import { checkSibeliusSafe } from '../export/sibeliusSafeProfile';
import { validateExportIntegrity } from '../export/exportHardening';
import { runReleaseReadinessGate } from '../readiness/releaseReadinessGate';
import { createRunManifest } from '../run-ledger/createRunManifest';
import { validateScoreModel } from '../score-model/scoreModelValidation';
import { validateStrictBarMath, validateStrictBarMathSibeliusSafe } from '../score-integrity/strictBarMath';
import { getStyleModuleDisplayName } from '../style-modules/styleModuleRegistry';
import { validateExportedMusicXmlBarMath } from '../export/validateMusicXmlBarMath';
import { validateWrittenMusicXmlComplete } from '../export/validateMusicXmlWrittenStrict';
import { validateGuitarBassDuoBassIdentityInMusicXml } from '../export/validateBassIdentityInMusicXml';
import {
  assertDuoEightBarInputTruthEarly,
  runPipelineTruthGates,
  pipelineTruthAllPassed,
  type PipelineTruthReport,
} from '../score-integrity/pipelineTruthGates';
import { resolveScoreTitleForPreset } from '../../app-api/scoreTitleDefaults';
import { scoreJazzDuoBehaviourSoft } from '../score-integrity/jazzDuoBehaviourValidation';
import { scoreFormIdentitySoft } from './duoFormIdentity';
import { scoreNarrativeMomentsSoft } from './duoNarrativeMoments';
import {
  parseChordProgressionInput,
  parseChordProgressionInputWithBarCount,
  normalizeChordToken,
  buildHarmonyPlanFromBars,
  buildChordSymbolPlanFromBars,
} from '../harmony/chordProgressionParser';
import { parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { buildEcmChamberContext, type BuildEcmChamberContextOpts } from '../ecm/buildEcmChamberContext';
import type { EcmChamberMode } from '../ecm/ecmChamberTypes';
import {
  scoreEcmMethenyFeel,
  scoreEcmSchneiderFeel,
  ecmCrossModeSimilarityPenalty,
} from '../ecm/ecmChamberScoring';
import { resolveLongFormRoute } from '../form/longFormRouteResolver';
import {
  buildDuoLongFormCompositionContext,
  buildDuoLongFormCompositionContextFromBars32,
} from '../form/buildLongFormFromDuoSections';
import { placeMotifsLongFormDuo32 } from '../motif/longFormMotifPlanner';
import { planDuoLongFormInteraction } from '../interaction/duoLongFormInteractionMap';
import { evaluateDuoLongFormQuality } from '../quality/duoLongFormQuality';
import { duoGuitarBarSevenIntervalPeakVsBarSixOk } from '../score-integrity/duoLockQuality';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import {
  assertContextMatchesLocked32,
  assertCustomLockedBeforeScoreGeneration,
  assertCustomLockedRouting,
  assertScoreMatchesLockedHarmonyWire,
  logSongModeHarmonyDebug,
} from './customLockedHarmonyRouting';
import { validateSongModeMotifSystem } from '../motif/songModeMotifEngine';
import { validateSongModePhraseEngineV1 } from './songModePhraseEngineV1';
import { partitionSongModePhraseIssues } from '../song-mode/songModePhraseBehaviourRules';
import type { StyleProfile } from '../song-mode/songModeStyleProfile';
import { resolveSongwritingStyles } from '../song-mode/songwriterStyleResolver';
import type { RhythmIntentControl } from '../rhythmIntentTypes';

function appendHarmonyPipelineTrace(ctx: CompositionContext, stage: HarmonyPipelineStage, detail: string): void {
  if (typeof process === 'undefined' || process.env?.COMPOSER_OS_HARMONY_TRACE !== '1') return;
  const m = ctx.generationMetadata;
  if (!m.harmonyPipelineTrace) m.harmonyPipelineTrace = [];
  m.harmonyPipelineTrace.push({ stage, detail });
}

export interface GoldenPathResult {
  success: boolean;
  score: ScoreModel;
  context: CompositionContext;
  plans: GoldenPathPlans;
  xml?: string;
  integrityPassed: boolean;
  behaviourGatesPassed: boolean;
  mxValidationPassed: boolean;
  /** MusicXML schema + structural checks */
  strictBarMathPassed: boolean;
  /** Post-export measure duration sums match score model expectations */
  exportRoundTripPassed: boolean;
  /** Structural / content checks on exported XML (hardening) */
  exportIntegrityPassed: boolean;
  /** Bass part lists as upright/acoustic in MusicXML metadata */
  instrumentMetadataPassed: boolean;
  sibeliusSafe: boolean;
  readiness: { shareable: boolean; release: number; mx: number };
  runManifest: RunManifest;
  errors: string[];
  /** Song Mode: non-blocking phrase behaviour warnings (musical quality; see `songModePhraseBehaviourRules`). */
  songModePhraseWarnings?: string[];
  /** Guitar–Bass Duo 8-bar: input / score / written XML agreement (skip when not applicable). */
  truthReport?: PipelineTruthReport;
}

const BUILTIN_HARMONY: import('../primitives/harmonyTypes').HarmonyPlan = {
  segments: [
    { chord: 'Dmin9', bars: 2 },
    { chord: 'G13', bars: 2 },
    { chord: 'Cmaj9', bars: 2 },
    { chord: 'A7alt', bars: 2 },
  ],
  totalBars: 8,
};

const BUILTIN_CHORD_SYMBOL_PLAN: CompositionContext['chordSymbolPlan'] = {
  segments: [
    { chord: 'Dmin9', startBar: 1, bars: 2 },
    { chord: 'G13', startBar: 3, bars: 2 },
    { chord: 'Cmaj9', startBar: 5, bars: 2 },
    { chord: 'A7alt', startBar: 7, bars: 2 },
  ],
  totalBars: 8,
};

/** V3.6b — Receipt fields: separate harmony source from internal duo grammar / style stack. */
function augmentGuitarBassDuoReceiptMetadata(ctx: CompositionContext, styleStack: StyleStack | undefined): void {
  if (!isGuitarBassDuoFamily(ctx.presetId)) return;
  const primary = styleStack?.primary ?? 'barry_harris';
  const ids = styleStack
    ? ([styleStack.primary, styleStack.secondary, styleStack.colour].filter(Boolean) as string[])
    : [];
  const userSelectedStyleDisplayNames = ids.map((id) => getStyleModuleDisplayName(id));
  ctx.generationMetadata.styleGrammarLabel =
    'Duo default jazz grammar (Barry Harris–derived internal rules)';
  ctx.generationMetadata.harmonySourceUsed = ctx.generationMetadata.harmonySource;
  ctx.generationMetadata.styleStackPrimaryModuleId = primary;
  ctx.generationMetadata.styleStackPrimaryDisplayName = getStyleModuleDisplayName(primary);
  ctx.generationMetadata.userSelectedStyleDisplayNames =
    userSelectedStyleDisplayNames.length > 0 ? userSelectedStyleDisplayNames : undefined;
  ctx.generationMetadata.userExplicitPrimaryStyle = primary !== 'barry_harris';
  if (ctx.presetId === 'guitar_bass_duo_single_line') {
    ctx.generationMetadata.duoModeReceiptLabel = 'Guitar–Bass Duo (Single-Line)';
  }
}

interface BuildGoldenPathContextExtras {
  /** Raw user input when custom mode was used */
  chordProgressionInputRaw?: string;
  /** User intent (always set when known) */
  progressionMode?: 'builtin' | 'custom';
  /** When parse failed — no score produced with that harmony */
  chordProgressionParseFailed?: boolean;
  /** Resolved from RunGoldenPathOptions.harmonyMode or inferred from non-empty chordProgressionText */
  harmonyModeRequested?: 'builtin' | 'custom' | 'custom_locked';
  /** Caller preset (standard duo vs single-line) */
  resolvedPresetId?: string;
}

function buildGoldenPathContext(
  seed: number,
  parsedChordBars?: string[],
  extras?: BuildGoldenPathContextExtras
): CompositionContext {
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const sections = [
    { label: 'A', startBar: 1, length: 4 },
    { label: 'B', startBar: 5, length: 4 },
  ];
  const parseFailed = !!extras?.chordProgressionParseFailed;
  const expandedChordBars = parsedChordBars && parsedChordBars.length === 8
    ? [...parsedChordBars, ...parsedChordBars, ...parsedChordBars, ...parsedChordBars]
    : parsedChordBars;
  const useCustom = !parseFailed && expandedChordBars && expandedChordBars.length === 32;
  const harmony = useCustom ? buildHarmonyPlanFromBars(expandedChordBars) : BUILTIN_HARMONY;
  const sections32 = [
    { label: 'A', startBar: 1, length: 8 },
    { label: 'B', startBar: 9, length: 8 },
    { label: 'A', startBar: 17, length: 8 },
    { label: 'B', startBar: 25, length: 8 },
  ];
  const tb = useCustom ? 32 : 8;
  const form = useCustom
    ? {
        sections: sections32.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
        totalBars: 32,
      }
    : { sections, totalBars: 8 };
  const phrase = useCustom
    ? { segments: sections32.map((s) => ({ ...s, density: undefined })), totalBars: 32 }
    : {
        segments: [
          { label: 'A', startBar: 1, length: 4, density: undefined },
          { label: 'B', startBar: 5, length: 4, density: undefined },
        ],
        totalBars: 8,
      };
  const chordSymbolPlan = useCustom ? buildChordSymbolPlanFromBars(expandedChordBars) : BUILTIN_CHORD_SYMBOL_PLAN;
  const rehearsalMarkPlan = { marks: [{ label: 'A', bar: 1 }, { label: 'B', bar: 5 }] };
  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });

  const sectionRoles = planSectionRoles(sections, { A: 'statement', B: 'contrast' });
  const densityPlan = planDensityCurve(sectionRoles, tb);
  const densityCurve = { segments: densityPlan.segments, totalBars: tb };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [36, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [36, 55],
    },
  };

  const progressionMode: 'builtin' | 'custom' = parseFailed
    ? 'custom'
    : extras?.progressionMode ?? (useCustom ? 'custom' : 'builtin');

  const raw = extras?.chordProgressionInputRaw?.trim();

  return {
    systemVersion: '2.0.0',
    presetId: extras?.resolvedPresetId ?? 'guitar_bass_duo',
    seed,
    form,
    feel,
    harmony,
    motif: { activeMotifs: [], variants: {} },
    phrase,
    register,
    density: densityCurve,
    instrumentProfiles: preset.instrumentProfiles,
    chordSymbolPlan,
    rehearsalMarkPlan,
    lockedHarmonyBarsRaw: useCustom && expandedChordBars ? [...expandedChordBars] : undefined,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: parseFailed ? undefined : useCustom ? 'custom' : 'builtin',
      customChordProgressionSummary: useCustom ? expandedChordBars.join(' | ') : undefined,
      progressionMode,
      chordProgressionInputRaw: raw && raw.length > 0 ? raw : undefined,
      parsedCustomProgressionBars: useCustom ? [...expandedChordBars] : undefined,
      chordProgressionParseFailed: parseFailed || undefined,
      builtInHarmonyFallbackOccurred: false,
      customHarmonyLocked: useCustom && extras?.harmonyModeRequested === 'custom_locked',
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };
}

function buildContextForGoldenPath(seed: number, options?: RunGoldenPathOptions): CompositionContext {
  const presetId = options?.presetId ?? 'guitar_bass_duo';
  if (isGuitarBassDuoFamily(presetId) && options?.harmonyMode === 'custom_locked') {
    const pb = options.parsedChordBars;
    if (pb && pb.length !== 32) {
      throw new Error(
        'CUSTOM HARMONY ROUTING FAILURE at buildContextForGoldenPath: custom_locked requires exactly 32 parsedChordBars.'
      );
    }
    if (!options.lockedHarmonyBarsRaw || options.lockedHarmonyBarsRaw.length !== 32) {
      throw new Error(
        'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked requires lockedHarmonyBarsRaw with exactly 32 bars.'
      );
    }
  }
  /** Song Mode / API inject: custom_locked uses ONLY lockedHarmonyBarsRaw (no planner / no alternate source). */
  if (
    isGuitarBassDuoFamily(presetId) &&
    options?.harmonyMode === 'custom_locked' &&
    options.lockedHarmonyBarsRaw?.length === 32
  ) {
    const bars = [...options.lockedHarmonyBarsRaw];
    const parsed = options.parsedChordBars;
    if (parsed && parsed.length === 32) {
      for (let i = 0; i < 32; i++) {
        if ((bars[i] ?? '') !== (parsed[i] ?? '')) {
          throw new Error(
            'CUSTOM HARMONY NOT REACHING GOLDEN PATH: parsedChordBars must equal lockedHarmonyBarsRaw bar-for-bar.'
          );
        }
      }
    }
    return buildDuoLongFormCompositionContextFromBars32(seed, bars, {
      chordProgressionInputRaw: options?.chordProgressionText?.trim(),
      presetId,
    }).context;
  }
  /** 32 explicit bars → long-form (non–custom_locked only; locked must use branch above). */
  if (isGuitarBassDuoFamily(presetId) && options?.parsedChordBars?.length === 32) {
    if (options.harmonyMode === 'custom_locked') {
      throw new Error(
        'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked must resolve only via lockedHarmonyBarsRaw.'
      );
    }
    assertCustomLockedRouting('buildContextForGoldenPath:32bar', options, options.parsedChordBars);
    return buildDuoLongFormCompositionContextFromBars32(seed, options.parsedChordBars, {
      chordProgressionInputRaw: options?.chordProgressionText?.trim(),
      presetId,
    }).context;
  }
  if (presetId === 'ecm_chamber') {
    const mode: EcmChamberMode = options?.ecmMode ?? 'ECM_METHENY_QUARTET';
    const ecmOpts: BuildEcmChamberContextOpts | undefined =
      options?.ecmTotalBars !== undefined ? { totalBars: options.ecmTotalBars } : undefined;
    return buildEcmChamberContext(seed, mode, ecmOpts);
  }
  const lf = resolveLongFormRoute(presetId, {
    totalBars: options?.totalBars,
    longFormEnabled: options?.longFormEnabled,
  });
  if (lf.kind === 'duo32') {
    if (options?.harmonyMode === 'custom_locked') {
      throw new Error(
        'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked must resolve via lockedHarmonyBarsRaw — illegal tiled/builtin duo32 branch.'
      );
    }
    if (options?.parsedChordBars?.length === 32) {
      assertCustomLockedRouting('buildContextForGoldenPath:duo32', options, options.parsedChordBars);
      return buildDuoLongFormCompositionContextFromBars32(seed, options.parsedChordBars, {
        chordProgressionInputRaw: options?.chordProgressionText?.trim(),
        presetId,
      }).context;
    }
    return buildDuoLongFormCompositionContext(seed, {
      parsedChordBars8: options?.parsedChordBars?.length === 8 ? options.parsedChordBars : undefined,
      presetId,
    }).context;
  }
  const harmonyModeRequested: 'builtin' | 'custom' | 'custom_locked' =
    options?.harmonyMode ?? (options?.chordProgressionText?.trim() ? 'custom' : 'builtin');
  return buildGoldenPathContext(seed, options?.parsedChordBars, {
    chordProgressionInputRaw: options?.chordProgressionText?.trim(),
    progressionMode: options?.parsedChordBars?.length === 8 ? 'custom' : 'builtin',
    harmonyModeRequested,
    resolvedPresetId: presetId,
  });
}

function resolveExpectedCustomChordBarCount(options?: RunGoldenPathOptions): number {
  const lf = resolveLongFormRoute(options?.presetId ?? 'guitar_bass_duo', {
    totalBars: options?.totalBars,
    longFormEnabled: options?.longFormEnabled,
  });
  if (lf.kind !== 'duo32') return 8;
  /** `custom_locked` always expects 32. For `custom`, runGoldenPath tries 32-then-8 when duo32 (see parse branch). */
  return options?.harmonyMode === 'custom_locked' ? 32 : 8;
}

function extractPitchByInstrument(score: ScoreModel): Array<{ instrument: string; pitches: number[] }> {
  return score.parts.map((p) => {
    const pitches: number[] = [];
    for (const m of p.measures) {
      for (const e of m.events) {
        if (e.kind === 'note') pitches.push(e.pitch);
      }
    }
    return { instrument: p.instrumentIdentity, pitches };
  });
}

/** Slash chords must appear at least once in the bass (pitch class). */
function validateSlashBassHonoured(score: ScoreModel): string[] {
  const out: string[] = [];
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!bass) return out;
  for (const m of bass.measures) {
    const chord = m.chord;
    if (!chord) continue;
    const { slashBassPc } = parseChordSymbol(chord);
    if (slashBassPc === undefined) continue;
    let hit = false;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if ((e as { pitch: number }).pitch % 12 === slashBassPc % 12) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      out.push(`Bar ${m.index}: bass must spell the slash bass pitch for "${chord}".`);
    }
  }
  return out;
}

function buildGoldenPathPlans(
  seed: number,
  context: CompositionContext,
  options?: RunGoldenPathOptions
): GoldenPathPlans {
  const ecmRoles: Record<string, SectionRole> = { A1: 'statement', B: 'contrast', A2: 'return' };
  const duoRoles8: Record<string, SectionRole> = { A: 'statement', B: 'contrast' };
  const duoRoles32: Record<string, SectionRole> = {
    A: 'statement',
    "A'": 'development',
    B: 'contrast',
    "A''": 'return',
  };
  const isDuoLong = context.presetId === 'guitar_bass_duo' && context.form.totalBars === 32;
  const duoRoles = isDuoLong ? duoRoles32 : duoRoles8;
  const sections = planSectionRoles(context.form.sections, context.presetId === 'ecm_chamber' ? ecmRoles : duoRoles);
  const tb = context.form.totalBars;
  const densityPlan =
    context.presetId === 'ecm_chamber'
      ? { segments: context.density.segments, totalBars: context.density.totalBars }
      : planDensityCurve(sections, tb);
  const guitarMap = planGuitarRegisterMap(sections);
  const bassMap = planBassRegisterMap(sections);
  const guitarBehaviour = planGuitarBehaviour(sections, densityPlan, guitarMap);
  const bassBehaviour = planBassBehaviour(sections, densityPlan, bassMap);
  const rhythmConstraints = computeRhythmicConstraints(context.feel);

  const [guitarReg] = guitarMap.sections[0]?.preferredZone ?? [55, 79];
  const styleStack: StyleStack =
    context.presetId === 'ecm_chamber'
      ? (options?.styleStack ?? ECM_CHAMBER_STYLE_STACK)
      : options?.styleStack ?? DEFAULT_STYLE_STACK;
  const manifestPresetId = options?.presetId ?? 'guitar_bass_duo';
  const scoreTitle = resolveScoreTitleForPreset(manifestPresetId, options?.scoreTitle, options?.ecmMode);
  const stackIds = styleStackToModuleIds(styleStack);
  const motifHints: MotifStyleHints = {
    triadPairs: stackIds.includes('triad_pairs'),
    metheny: stackIds.includes('metheny'),
    bacharach: stackIds.includes('bacharach'),
    duoLock: isGuitarBassDuoFamily(context.presetId),
  };
  const baseMotifs = generateMotif(seed, guitarReg, guitarReg + 20, motifHints);
  const placements =
    context.presetId === 'ecm_chamber'
      ? placeMotifsForEcmForm(baseMotifs, seed, context.form.totalBars)
      : isDuoLong
        ? placeMotifsLongFormDuo32(baseMotifs, seed)
        : placeMotifsAcrossBars(baseMotifs, seed, isGuitarBassDuoFamily(context.presetId));
  const motifState = { baseMotifs, placements };

  const interactionPlan = isDuoLong
    ? planDuoLongFormInteraction(sections, tb)
    : planInteraction(sections, tb);

  return {
    sections,
    guitarMap,
    bassMap,
    densityPlan,
    guitarBehaviour,
    bassBehaviour,
    rhythmConstraints,
    motifState,
    styleStack,
    interactionPlan,
    scoreTitle,
  };
}

function harmonyParseFailureGoldenPathResult(
  seed: number,
  options: RunGoldenPathOptions | undefined,
  message: string
): GoldenPathResult {
  const context = buildGoldenPathContext(seed, undefined, {
    chordProgressionParseFailed: true,
    chordProgressionInputRaw: options?.chordProgressionText?.trim(),
    progressionMode: 'custom',
    resolvedPresetId: options?.presetId ?? 'guitar_bass_duo',
  });
  const plans = buildGoldenPathPlans(seed, context, options);
  const emptyScore: ScoreModel = {
    title: plans.scoreTitle,
    parts: [],
    timeSignature: { beats: 4, beatType: 4 },
  };
  return {
    success: false,
    score: emptyScore,
    context,
    plans,
    xml: undefined,
    integrityPassed: false,
    behaviourGatesPassed: false,
    mxValidationPassed: false,
    strictBarMathPassed: false,
    exportRoundTripPassed: false,
    exportIntegrityPassed: false,
    instrumentMetadataPassed: false,
    sibeliusSafe: false,
    readiness: { shareable: false, release: 0, mx: 0 },
    runManifest: createRunManifest({
      version: '2.0.0',
      seed,
      presetId: options?.presetId ?? 'guitar_bass_duo',
      scoreTitle: plans.scoreTitle,
      activeModules: [],
      feelMode: context.feel.mode,
      instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
      readinessScores: { release: 0, mx: 0 },
      validationPassed: false,
      validationErrors: [message],
      exportTarget: undefined,
      timestamp: new Date().toISOString(),
    }),
    errors: [message],
    songModePhraseWarnings: [],
  };
}

const DEFAULT_STYLE_STACK: StyleStack = {
  primary: 'barry_harris',
  secondary: 'metheny',
  colour: 'triad_pairs',
  weights: { primary: 0.6, secondary: 0.25, colour: 0.15 },
};

/** ECM chamber: avoid Barry Harris / triad-pair conformance that assumes the duo ii–V cycle. */
const ECM_CHAMBER_STYLE_STACK: StyleStack = {
  primary: 'metheny',
  weights: { primary: 1 },
};

export interface RunGoldenPathOptions {
  styleStack?: StyleStack;
  presetId?: string;
  /** User-provided work title; default comes from resolveScoreTitleForPreset */
  scoreTitle?: string;
  /** Guitar–Bass Duo: explicit mode (custom requires non-empty `chordProgressionText`) */
  harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
  /** Guitar–Bass Duo: `|`-separated chords (8 bars default; 32 when long-form Song Mode / duo32) */
  chordProgressionText?: string;
  /** Filled by runGoldenPath after a successful parse (internal) */
  parsedChordBars?: string[];
  /** Same strings as `parsedChordBars` after parse — authoritative for custom_locked routing checks */
  lockedHarmonyBarsRaw?: string[];
  /** ECM Chamber: distinct Metheny vs Schneider modes */
  ecmMode?: EcmChamberMode;
  /** ECM Chamber: override default bar count (e.g. 32 for extended regression tests). */
  ecmTotalBars?: number;
  /** Guitar–Bass Duo: opt-in 32-bar long-form (with `totalBars: 32`). */
  totalBars?: number;
  longFormEnabled?: boolean;
  /** V3.4 — key signature: infer (default), user override, or hide. */
  keySignatureMode?: 'auto' | 'override' | 'none';
  /** When `keySignatureMode` is `override`, e.g. `Bb`, `F# minor`. */
  tonalCenterOverride?: string;
  /** Echo of UI tonal centre — used for override when `tonalCenterOverride` omitted. */
  tonalCenter?: string;
  /** When true, apply deterministic chord-safe pitch mutation to guitar melody after duo build (Duo / ECM). */
  variationEnabled?: boolean;
  /** ECM: aesthetic shaping pass after variation (default on). */
  ecmShapingEnabled?: boolean;
  /** Duo / ECM: orchestration pass after ECM shaping (default on). */
  orchestrationEnabled?: boolean;
  /** ECM chamber: identity cell A1→B→A2 (default on). */
  identityCellEnabled?: boolean;
  /** Song Mode: hook-first guitar melody (bar 1 motif, bar 25 varied return). */
  songModeHookFirstIdentity?: boolean;
  /** Song Mode: Style Engine profile (default STYLE_ECM applied in handler if omitted). */
  styleProfile?: StyleProfile;
  /** Song Mode: primary songwriter style key (resolved to blended profile biases on context). */
  primarySongwriterStyle?: string;
  /** Song Mode Phase C2: scales phrase rhythm intent (Stable / Balanced / Surprise). */
  creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
  /** Song Mode Phase C3: James Brown funk overlay (opt-in; tests / manual). */
  songModeJamesBrownFunkOverlay?: boolean;
  /** D1: optional rhythm intent (engine-only; resolved in C5 path before Song Mode overlays). */
  intent?: RhythmIntentControl;
  /** Guitar–Bass Duo: C4 hook rhythm layer strength (metadata → `generationMetadata.c4Strength`). */
  c4Strength?: 'light' | 'medium' | 'strong';
  /** Song Mode C5 blend strength (metadata → `generationMetadata.blendStrength`). */
  blendStrength?: 'light' | 'medium' | 'strong';
}

/** Offsets tried by the duo lock (requested seed + each offset). */
export const GOLDEN_PATH_VARIANT_SEED_OFFSETS = [0, 10007, 20011, 30011, 40009, 50021] as const;

export function candidateSeedsForGoldenPath(requestedSeed: number): number[] {
  return GOLDEN_PATH_VARIANT_SEED_OFFSETS.map((o) => requestedSeed + o);
}

export function runGoldenPath(seed: number = 12345, options?: RunGoldenPathOptions): GoldenPathResult {
  let opts = options ? { ...options } : undefined;
  const presetIdEarly = opts?.presetId ?? 'guitar_bass_duo';
  if (!isGuitarBassDuoFamily(presetIdEarly)) {
    opts = {
      ...(opts ?? {}),
      harmonyMode: 'builtin',
      chordProgressionText: undefined,
      parsedChordBars: undefined,
    };
  }

  const inferredCustom = !!(opts?.chordProgressionText?.trim());
  const harmonyMode: 'builtin' | 'custom' | 'custom_locked' =
    opts?.harmonyMode ?? (inferredCustom ? 'custom' : 'builtin');

  if (harmonyMode === 'builtin') {
    opts = opts ? { ...opts, chordProgressionText: undefined, parsedChordBars: undefined } : undefined;
  }

  const expectedBars = resolveExpectedCustomChordBarCount(opts);

  if (
    isGuitarBassDuoFamily(presetIdEarly) &&
    (harmonyMode === 'custom' || harmonyMode === 'custom_locked') &&
    !(opts?.chordProgressionText?.trim())
  ) {
    return harmonyParseFailureGoldenPathResult(
      seed,
      opts,
      `Custom chord progression is empty. Enter exactly ${expectedBars} bars separated by |.`
    );
  }

  let resolved: RunGoldenPathOptions | undefined = opts;
  if (
    isGuitarBassDuoFamily(presetIdEarly) &&
    opts?.harmonyMode === 'custom_locked' &&
    opts.lockedHarmonyBarsRaw?.length === 32
  ) {
    const finalBars = [...opts.lockedHarmonyBarsRaw];
    const text = opts.chordProgressionText?.trim();
    if (text) {
      const p = parseChordProgressionInputWithBarCount(text, 32);
      if (p.ok) {
        for (let i = 0; i < 32; i++) {
          if (normalizeChordToken(p.bars[i] ?? '') !== normalizeChordToken(finalBars[i] ?? '')) {
            return harmonyParseFailureGoldenPathResult(
              seed,
              opts,
              'CUSTOM HARMONY NOT REACHING GOLDEN PATH: chordProgressionText disagrees with lockedHarmonyBarsRaw.'
            );
          }
        }
      }
    }
    resolved = { ...opts, parsedChordBars: finalBars, lockedHarmonyBarsRaw: finalBars };
    assertCustomLockedRouting('runGoldenPath:lockedInject', resolved, finalBars);
    logSongModeHarmonyDebug({
      layer: 'runGoldenPath',
      harmonyMode: 'custom_locked',
      parsedCustomProgressionBarsLength: finalBars.length,
      expectedBars: 32,
      firstBar: finalBars[0],
      lockedHarmonyBarsRawLength: finalBars.length,
      source: 'lockedHarmonyBarsRaw_authoritative',
    });
  } else if (opts?.chordProgressionText?.trim()) {
    const text = opts.chordProgressionText.trim();
    const lfParse = resolveLongFormRoute(presetIdEarly, {
      totalBars: opts?.totalBars,
      longFormEnabled: opts?.longFormEnabled,
    });
    let parsed: { ok: true; bars: string[] } | { ok: false; error: string };
    if (presetIdEarly === 'guitar_bass_duo' && lfParse.kind === 'duo32' && opts?.harmonyMode !== 'custom_locked') {
      const p32 = parseChordProgressionInputWithBarCount(text, 32);
      if (p32.ok) {
        parsed = p32;
      } else {
        const p8 = parseChordProgressionInputWithBarCount(text, 8);
        if (!p8.ok) {
          return harmonyParseFailureGoldenPathResult(
            seed,
            opts,
            `Invalid chord progression — not applied. Long-form (32 bars): ${p32.error} — or 8-bar tile: ${p8.error}`
          );
        }
        parsed = p8;
      }
    } else {
      const single = parseChordProgressionInputWithBarCount(text, expectedBars);
      if (!single.ok) {
        return harmonyParseFailureGoldenPathResult(
          seed,
          opts,
          `Invalid chord progression — not applied. ${single.error}`
        );
      }
      parsed = single;
    }
    if (typeof process !== 'undefined' && process.env?.COMPOSER_OS_DEBUG_CUSTOM_CHORDS === '1') {
      console.log('[V3.5] USING CUSTOM CHORDS:', parsed.bars);
    }
    const lockedCopy = [...parsed.bars];
    resolved = { ...opts, parsedChordBars: parsed.bars, lockedHarmonyBarsRaw: lockedCopy };
    assertCustomLockedRouting('runGoldenPath:afterParse', resolved, parsed.bars);
    logSongModeHarmonyDebug({
      layer: 'runGoldenPath',
      harmonyMode: resolved.harmonyMode ?? (opts.chordProgressionText?.trim() ? 'custom' : 'builtin'),
      parsedCustomProgressionBarsLength: parsed.bars.length,
      expectedBars: parsed.bars.length,
      firstBar: parsed.bars[0],
      lockedHarmonyBarsRawLength: lockedCopy.length,
    });
  }
  const seeds = candidateSeedsForGoldenPath(seed);
  let best: GoldenPathResult | null = null;
  let bestSoft = -Infinity;
  let last: GoldenPathResult | null = null;
  for (const s of seeds) {
    const r = runGoldenPathOnce(s, resolved);
    last = r;
    if (r.success) {
      const pid = resolved?.presetId ?? 'guitar_bass_duo';
      if (pid === 'guitar_bass_duo' && !duoGuitarBarSevenIntervalPeakVsBarSixOk(r.score)) {
        continue;
      }
      const soft =
        pid === 'ecm_chamber'
          ? (() => {
              const mode = resolved?.ecmMode ?? 'ECM_METHENY_QUARTET';
              const base =
                mode === 'ECM_SCHNEIDER_CHAMBER'
                  ? scoreEcmSchneiderFeel(r.score, r.context, r.plans)
                  : scoreEcmMethenyFeel(r.score, r.context, r.plans);
              return base - ecmCrossModeSimilarityPenalty(r.score, r.context, mode);
            })()
          : scoreJazzDuoBehaviourSoft(r.score) +
            scoreFormIdentitySoft(r.score, {
              motifState: r.plans.motifState,
              styleStack: r.plans.styleStack,
              compositionContext: r.context,
            }) +
            scoreNarrativeMomentsSoft(r.score) +
            (r.context.generationMetadata?.longFormDuo
              ? evaluateDuoLongFormQuality(r.score, r.context).total * 0.15
              : 0);
      if (soft > bestSoft) {
        bestSoft = soft;
        best = r;
      }
    }
  }
  return best ?? last!;
}

/**
 * Single seed, no duo lock candidate sweep — use for deterministic inspection / tests.
 * For `custom_locked` / parsed text, pass `parsedChordBars` + `lockedHarmonyBarsRaw` as `runGoldenPath` does after its resolve step; text alone is not enough.
 */
export function runGoldenPathOnce(seed: number, options?: RunGoldenPathOptions): GoldenPathResult {
  const errors: string[] = [];
  let songModePhraseWarnings: string[] = [];

  const context = buildContextForGoldenPath(seed, options);
  if (options?.creativeControlLevel) {
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeRhythmStrength: options.creativeControlLevel,
    };
  }
  if (options?.songModeHookFirstIdentity) {
    /** Song Mode: explicit STYLE_ECM default when `styleProfile` omitted (legacy callers). */
    const styleProfileResolved: StyleProfile = options.styleProfile ?? 'STYLE_ECM';
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeHookFirstIdentity: true,
      styleProfile: styleProfileResolved,
    };
  }
  if (options?.songModeHookFirstIdentity && options?.primarySongwriterStyle) {
    const resolution = resolveSongwritingStyles({
      primary: options.primarySongwriterStyle,
    });
    const p = resolution.blendedProfile;
    context.generationMetadata = {
      ...context.generationMetadata,
      songwriterHookRepetitionBias: p.hookRepetitionBias,
      songwriterPhraseRegularity: p.phraseRegularity,
      songwriterSyncopationBias: p.syncopationBias,
      songwriterDensityBias: p.densityBias,
      songwriterStyleId: resolution.primaryId,
    };
  }
  if (options?.songModeJamesBrownFunkOverlay === true) {
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeJamesBrownFunkOverlay: true,
    };
  }
  if (options?.intent !== undefined) {
    context.generationMetadata = {
      ...context.generationMetadata,
      rhythmIntentRaw: options.intent,
    };
  }
  if (
    options?.c4Strength === 'light' ||
    options?.c4Strength === 'medium' ||
    options?.c4Strength === 'strong'
  ) {
    context.generationMetadata = {
      ...context.generationMetadata,
      c4Strength: options.c4Strength,
    };
  }
  if (
    options?.blendStrength === 'light' ||
    options?.blendStrength === 'medium' ||
    options?.blendStrength === 'strong'
  ) {
    context.generationMetadata = {
      ...context.generationMetadata,
      blendStrength: options.blendStrength,
    };
  }

  appendHarmonyPipelineTrace(context, 'composition_context', [
    `totalBars=${context.form.totalBars}`,
    `harmonySource=${context.generationMetadata.harmonySource ?? 'n/a'}`,
    `lockedBars=${context.lockedHarmonyBarsRaw?.length ?? 0}`,
    `contracts=${context.lockedHarmonyBarContracts?.length ?? 0}`,
    `userChordSemantics=${context.generationMetadata.harmonySource === 'custom' && context.generationMetadata.builtInHarmonyFallbackOccurred !== true}`,
  ].join(' '));

  assertContextMatchesLocked32('runGoldenPathOnce:afterBuildContext', context, options);
  assertCustomLockedBeforeScoreGeneration(context, options);

  const plans = buildGoldenPathPlans(seed, context, options);
  const { sections, densityPlan, guitarBehaviour, bassBehaviour, rhythmConstraints, motifState, styleStack, interactionPlan } =
    plans;

  const appliedContext = styleStack ? applyStyleStack(context, styleStack) : context;
  augmentGuitarBassDuoReceiptMetadata(appliedContext, styleStack);
  errors.push(...assertDuoEightBarInputTruthEarly(appliedContext, options));
  const score = generateGoldenPathDuoScore(appliedContext, plans, {
    variationEnabled: options?.variationEnabled === true,
    ecmShapingEnabled: options?.ecmShapingEnabled,
    orchestrationEnabled: options?.orchestrationEnabled,
    identityCellEnabled: options?.identityCellEnabled,
  });
  if (appliedContext.generationMetadata?.songModeHookFirstIdentity) {
    const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    if (guitar) {
      const md = appliedContext.generationMetadata;
      const motifIssues = validateSongModeMotifSystem(
        guitar,
        appliedContext,
        md.songModeCoreMotifs,
        md.songModeMotifCount ?? 1
      );
      const contourWarning = 'return lost contour identity';
      const literalWarning = 'literal repetition';
      const similarityWarning = 'return similarity';
      for (const issue of motifIssues) {
        if (issue.includes(contourWarning) || issue.includes(literalWarning) || issue.includes(similarityWarning)) {
          songModePhraseWarnings = [...(songModePhraseWarnings ?? []), issue];
        } else {
          errors.push(issue);
        }
      }
      const phraseIssues = validateSongModePhraseEngineV1(guitar, appliedContext);
      const { critical, warnings } = partitionSongModePhraseIssues(phraseIssues);
      errors.push(...critical);
      songModePhraseWarnings = [...(songModePhraseWarnings ?? []), ...warnings];
    }
  }
  appendHarmonyPipelineTrace(appliedContext, 'score_builder', 'generateGoldenPathDuoScore finished');
  try {
    assertScoreMatchesLockedHarmonyWire(score, options);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  applyKeySignatureToScoreAndContext(score, appliedContext, {
    keySignatureMode: options?.keySignatureMode,
    tonalCenterOverride: options?.tonalCenterOverride,
    tonalCenter: options?.tonalCenter,
  });

  errors.push(...validateSlashBassHonoured(score));

  const modelValidation = validateScoreModel(score);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);

  // Rhythm is finalized + validated once inside generateGoldenPathDuoScore; parts/measures/events are frozen — read-only gate.
  const strictBarMath = validateStrictBarMath(score);
  if (!strictBarMath.valid) {
    errors.push(...strictBarMath.errors);
    const rich = validateStrictBarMathSibeliusSafe(score);
    const seen = new Set<string>();
    for (const d of rich.details) {
      const line = `[bar-math-debug] part=${d.partId} (${d.instrumentIdentity}) bar=${d.measureIndex} voice=${d.voice} sum=${d.summedDuration} cursorEnd=${d.timelineCursorEnd} events=${d.eventsJson}`;
      if (seen.has(line)) continue;
      seen.add(line);
      errors.push(line);
    }
  }

  const bars = score.parts[0]?.measures.map((m) => ({ index: m.index - 1, duration: 4 })) ?? [];
  const chordByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.chord) chordByBar.set(m.index, m.chord);
    }
  }
  const chordSymbols = Array.from(chordByBar.entries()).map(([bar, chord]) => ({ bar, chord }));
  const rehearsalByBar = new Map<number, string>();
  for (const p of score.parts) {
    for (const m of p.measures) {
      if (m.rehearsalMark) rehearsalByBar.set(m.index, m.rehearsalMark);
    }
  }
  const rehearsalMarks = Array.from(rehearsalByBar.entries()).map(([bar, label]) => ({ bar, label }));

  const integrityResult = runScoreIntegrityGate({
    bars,
    instruments: context.instrumentProfiles,
    chordSymbols,
    rehearsalMarks,
    chordSymbolsRequired: true,
    rehearsalMarksRequired: true,
    pitchByInstrument: extractPitchByInstrument(score),
  });
  if (!integrityResult.passed) errors.push(...integrityResult.errors);

  const behaviourResult = runBehaviourGates(
    score,
    rhythmConstraints,
    guitarBehaviour,
    bassBehaviour,
    sections,
    densityPlan,
    {
      motifState,
      styleStack,
      interactionPlan,
      presetId: context.presetId,
      compositionContext: appliedContext,
    }
  );
  errors.push(...behaviourResult.errors);
  if (appliedContext.generationMetadata?.songModeHookFirstIdentity) {
    songModePhraseWarnings.push(...behaviourResult.duoIdentityWarnings);
  }

  const preserveLiterals =
    appliedContext.generationMetadata.customHarmonyLocked === true ||
    !!(appliedContext.lockedHarmonyBarsRaw && appliedContext.lockedHarmonyBarsRaw.length > 0);
  const guitarMeasureCount = score.parts[0]?.measures.length ?? 0;
  const lockedForExport = appliedContext.lockedHarmonyBarsRaw;
  const assertLockedExport =
    lockedForExport &&
    lockedForExport.length === guitarMeasureCount &&
    guitarMeasureCount > 0 &&
    appliedContext.generationMetadata?.harmonySource === 'custom' &&
    appliedContext.generationMetadata?.builtInHarmonyFallbackOccurred !== true
      ? [...lockedForExport]
      : undefined;
  const exportResult = exportScoreModelToMusicXml(score, {
    preserveChordKindLiterals: preserveLiterals,
    assertLockedHarmonyBars: assertLockedExport,
  });
  let xml: string | undefined;
  let mxValidationPassed = false;
  let sibeliusSafe = false;
  let exportIntegrityPassed = true;
  let exportRoundTripPassed = false;
  let instrumentMetadataPassed = false;
  if (exportResult.success && exportResult.xml) {
    xml = exportResult.xml;
    appendHarmonyPipelineTrace(appliedContext, 'musicxml_export', `bytes=${xml.length} customHarmonyTruth=${appliedContext.generationMetadata.customHarmonyMusicXmlTruthPassed ?? 'n/a'}`);
    mxValidationPassed = validateMusicXmlSchema(xml).valid;
    sibeliusSafe = checkSibeliusSafe(xml).safe;
    const exportIntegrity = validateExportIntegrity(xml);
    exportIntegrityPassed = exportIntegrity.valid;
    if (!exportIntegrity.valid) errors.push(...exportIntegrity.errors);

    const mxBar = validateExportedMusicXmlBarMath(xml);
    const writtenComplete = validateWrittenMusicXmlComplete(score, xml);
    exportRoundTripPassed = mxBar.valid && writtenComplete.valid;
    if (!mxBar.valid) errors.push(...mxBar.errors);
    if (!writtenComplete.valid) errors.push(...writtenComplete.errors);

    const bassMeta = validateGuitarBassDuoBassIdentityInMusicXml(xml);
    instrumentMetadataPassed = bassMeta.valid;
    if (!bassMeta.valid) errors.push(...bassMeta.errors);

    const lockedBars = appliedContext.lockedHarmonyBarsRaw;
    if (lockedBars && lockedBars.length === appliedContext.form.totalBars) {
      const lockedTruth = validateLockedHarmonyMusicXmlTruth(xml, lockedBars);
      appliedContext.generationMetadata.customHarmonyMusicXmlTruthPassed = lockedTruth.ok;
      if (!lockedTruth.ok) errors.push(...lockedTruth.errors);
    }
  } else {
    errors.push(...exportResult.errors);
  }

  const truthReport = runPipelineTruthGates({
    context: appliedContext,
    options,
    score,
    xml,
  });
  errors.push(...truthReport.errors);

  const readinessResult = runReleaseReadinessGate({
    validationPassed:
      integrityResult.passed &&
      modelValidation.valid &&
      behaviourResult.allValid &&
      strictBarMath.valid &&
      instrumentMetadataPassed &&
      pipelineTruthAllPassed(truthReport),
    exportValid: exportResult.success,
    mxValid: mxValidationPassed && exportRoundTripPassed,
    rhythmicCorrect: behaviourResult.rhythmValid,
    registerCorrect: integrityResult.passed,
    sibeliusSafe,
    chordRehearsalComplete:
      chordSymbols.length >=
        (context.presetId === 'ecm_chamber' || isGuitarBassDuoFamily(context.presetId)
          ? context.form.totalBars
          : 8) && rehearsalMarks.length >= 2,
    exportIntegrity: exportIntegrityPassed,
    exportRoundTrip: exportRoundTripPassed,
    phraseBehaviourWarningCount: songModePhraseWarnings.length,
  });

  const manifestPresetId = options?.presetId ?? 'guitar_bass_duo';
  const scoreTitle = plans.scoreTitle;
  const ecmMode = options?.ecmMode;

  const ksRec = appliedContext.generationMetadata.keySignatureReceipt;
  const runManifest = createRunManifest({
    version: '2.0.0',
    seed,
    presetId: manifestPresetId,
    ecmMode: manifestPresetId === 'ecm_chamber' && ecmMode ? ecmMode : undefined,
    scoreTitle,
    activeModules: (() => {
      if (!styleStack) return [];
      const a: string[] = [styleStack.primary];
      if (styleStack.secondary) a.push(styleStack.secondary);
      if (styleStack.colour) a.push(styleStack.colour);
      return a;
    })(),
    feelMode: context.feel.mode,
    instrumentProfiles: context.instrumentProfiles.map((p) => p.instrumentIdentity),
    readinessScores: { release: readinessResult.release.overall, mx: readinessResult.mx.overall },
    validationPassed:
      integrityResult.passed &&
      behaviourResult.allValid &&
      strictBarMath.valid &&
      exportRoundTripPassed &&
      instrumentMetadataPassed &&
      pipelineTruthAllPassed(truthReport),
    validationErrors: errors.length > 0 ? errors : undefined,
    validationWarnings: songModePhraseWarnings.length > 0 ? songModePhraseWarnings : undefined,
    exportTarget: xml ? 'musicxml' : undefined,
    timestamp: new Date().toISOString(),
    keySignatureInferredTonic: ksRec?.inferredTonicName,
    keySignatureConfidence: ksRec?.confidence,
    keySignatureOverrideUsed: ksRec?.overrideUsed,
    keySignatureNoneMode: ksRec?.noneMode,
    keySignatureHide: ksRec?.hideKeySignature,
    keySignatureFifths: ksRec?.exportFifths,
    keySignatureExportMode: ksRec?.exportMode,
    keySignatureInferredKey: ksRec?.inferredKey,
    keySignatureInferredMode: ksRec?.inferredMode,
    keySignatureInferredFifths: ksRec?.inferredFifths,
    keySignatureModeApplied: ksRec?.keySignatureModeApplied,
    keySignatureExportKeyWritten: ksRec?.exportKeyWritten,
    harmonySourceUsed: appliedContext.generationMetadata.harmonySource,
    styleGrammarLabel: appliedContext.generationMetadata.styleGrammarLabel,
    styleStackPrimaryModuleId: appliedContext.generationMetadata.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: appliedContext.generationMetadata.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: appliedContext.generationMetadata.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: appliedContext.generationMetadata.userExplicitPrimaryStyle,
    chordProgressionSubmittedRaw: appliedContext.generationMetadata.chordProgressionInputRaw,
    parsedChordBarsSnapshot: appliedContext.generationMetadata.parsedCustomProgressionBars,
    pipelineTruthInputStage: truthReport.inputStage,
    pipelineTruthScoreStage: truthReport.scoreStage,
    pipelineTruthExportStage: truthReport.exportStage,
    songModeRhythmOverlayPhraseDiagnostics: appliedContext.generationMetadata.songModeRhythmOverlayByPhrase
      ? JSON.stringify(
          appliedContext.generationMetadata.songModeRhythmOverlayByPhrase.map((x) => ({
            phraseIndex: x.phraseIndex,
            overlayRhythmProfile: x.overlayRhythmProfile,
            rhythmIntentSummary: x.rhythmIntentSummary,
          }))
        )
      : undefined,
    songModeJamesBrownFunkReceiptTag: appliedContext.generationMetadata.songModeJamesBrownFunkReceiptTag,
    rhythmIntentD1Receipt: (() => {
      const md = appliedContext.generationMetadata;
      if (!md.rhythmIntentResolvedByPhrase?.length) return undefined;
      return JSON.stringify({
        raw: md.rhythmIntentResolutionLog?.rawEcho ?? null,
        clamped: md.rhythmIntentResolutionLog?.clampApplied ?? null,
        phraseCount: md.rhythmIntentResolutionLog?.phraseCount ?? md.rhythmIntentResolvedByPhrase.length,
        resolvedByPhrase: md.rhythmIntentResolvedByPhrase,
      });
    })(),
    duoModeReceiptLabel: appliedContext.generationMetadata.duoModeReceiptLabel,
  });

  const success =
    modelValidation.valid &&
    strictBarMath.valid &&
    integrityResult.passed &&
    behaviourResult.allValid &&
    exportResult.success &&
    mxValidationPassed &&
    exportIntegrityPassed &&
    exportRoundTripPassed &&
    instrumentMetadataPassed &&
    pipelineTruthAllPassed(truthReport) &&
    errors.length === 0;

  return {
    success,
    score,
    /** Must be `appliedContext`: style modules shallow-clone context; score build mutates that object (e.g. songModeCoreMotifs). */
    context: appliedContext,
    plans,
    xml,
    integrityPassed: integrityResult.passed,
    behaviourGatesPassed: behaviourResult.allValid,
    mxValidationPassed,
    strictBarMathPassed: strictBarMath.valid,
    exportRoundTripPassed,
    exportIntegrityPassed,
    instrumentMetadataPassed,
    sibeliusSafe,
    readiness: {
      shareable: readinessResult.shareable,
      release: readinessResult.release.overall,
      mx: readinessResult.mx.overall,
    },
    runManifest,
    errors,
    songModePhraseWarnings,
    truthReport,
  };
}
