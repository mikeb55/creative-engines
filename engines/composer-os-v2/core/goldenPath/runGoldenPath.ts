/**
 * Composer OS V2 — Golden path runner
 * preset → feel → section roles → density → register map → behaviours → score → integrity → export → validation → manifest
 */

import type { CompositionContext, GenerationMetadata, HarmonyPipelineStage, ImportHarmonyMode } from '../compositionContext';
import { IMPORT_HARMONY_POLICY_VERSION } from '../importHarmonyPolicy';
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
import { validateIndieArtPopDualGuitarIdentityInMusicXml } from '../export/validateIndieArtPopDualGuitarIdentityInMusicXml';
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
import { LONG_FORM_DUO_BARS, resolveLongFormRoute } from '../form/longFormRouteResolver';
import { isAllowedSongFormBarCount } from '../harmony/songFormBarCounts';
import { FormId, resolveFormSections, type FormSection } from '../form/formPlanner';
import {
  buildDuoLongFormCompositionContext,
  buildDuoLongFormCompositionContextFromBars,
  buildDuoLongFormCompositionContextFromBars32,
} from '../form/buildLongFormFromDuoSections';
import { placeMotifsLongFormDuo } from '../motif/longFormMotifPlanner';
import { planDuoLongFormInteraction } from '../interaction/duoLongFormInteractionMap';
import { evaluateDuoLongFormQuality } from '../quality/duoLongFormQuality';
import { duoGuitarBarSevenIntervalPeakVsBarSixOk } from '../score-integrity/duoLockQuality';
import { isGuitarBassDuoFamily } from '../presets/guitarBassDuoPresetIds';
import { wybleVoiceLayoutForPreset } from '../wyble/wybleVoiceLayoutForPreset';
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
import { normalizeStyleProfileId } from '../song-mode/songModeStyleProfile';
import type { AuthorRuleId, ClassicalSongRuleId } from '../song-mode/songwritingResearchTypes';
import { resolveSongwritingStyles } from '../song-mode/songwriterStyleResolver';
import type { AlternateGuitarTuningResolved } from '../song-mode/alternateGuitarTunings';
import {
  appendSongModeStyleSurfaceNotes,
  applyBacharachSongModeSurfaceV1,
  applyDonaldFagenSongwriterSurface,
  applyGrooveSoulStyleSurface,
  applySophisticatedPopStyleSurface,
} from '../song-mode/songModeStyleSurface';
import { applySophisticatedPopHarmonyDressing } from '../song-mode/sophisticatedPopHarmonyDressing';
import { applyBacharachSongModeHarmonyDressing } from '../song-mode/bacharachHarmonyDressing';
import { applyEcmStyleHarmonyMotionPolicy } from '../song-mode/ecmStyleHarmonyPolicy';
import { getSongwriterCompProfile } from '../song-mode/songwriterCompProfile';
import { finalizeSongModeSectionShaping } from '../song-mode/songModeSectionControl';
import type { RhythmIntentControl } from '../rhythmIntentTypes';
import type { StylePairingInput } from '../style-pairing/stylePairingTypes';
import { normalizeChordSymbolsForEra, type EraId } from '../harmony/eraChordNormalizer';
import type { MotifAuthorityLevel } from '../motif/motifAuthorityV1';
import { buildIndieDualGuitarTuningFixtureScore } from '../song-mode/indieDualGuitarTuningFixture';

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
  /**
   * When 8, eight parsed chords stay an 8-bar score (no 8→32 tiling). When absent/≠8, 8 chords still tile ×4 to 32.
   */
  totalBarsForForm?: number;
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
  const wantsEightBarScore = extras?.totalBarsForForm === 8;
  const expandedChordBars =
    parsedChordBars && parsedChordBars.length === 8 && !wantsEightBarScore
      ? [...parsedChordBars, ...parsedChordBars, ...parsedChordBars, ...parsedChordBars]
      : parsedChordBars;
  const useCustom32 = !parseFailed && expandedChordBars && expandedChordBars.length === 32;
  const useCustom8Native =
    !parseFailed && wantsEightBarScore && parsedChordBars && parsedChordBars.length === 8;
  const useCustom = useCustom32 || useCustom8Native;
  const sections32 = [
    { label: 'A', startBar: 1, length: 8 },
    { label: 'B', startBar: 9, length: 8 },
    { label: 'A', startBar: 17, length: 8 },
    { label: 'B', startBar: 25, length: 8 },
  ];
  const tb = useCustom ? (useCustom8Native ? 8 : 32) : 8;
  const harmony = useCustom32
    ? buildHarmonyPlanFromBars(expandedChordBars)
    : useCustom8Native
      ? buildHarmonyPlanFromBars(parsedChordBars!)
      : BUILTIN_HARMONY;
  const form = useCustom32
    ? {
        sections: sections32.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
        totalBars: 32,
      }
    : { sections, totalBars: 8 };
  const phrase = useCustom32
    ? { segments: sections32.map((s) => ({ ...s, density: undefined })), totalBars: 32 }
    : useCustom8Native
      ? {
          segments: [
            { label: 'A', startBar: 1, length: 4, density: undefined },
            { label: 'B', startBar: 5, length: 4, density: undefined },
          ],
          totalBars: 8,
        }
      : {
          segments: [
            { label: 'A', startBar: 1, length: 4, density: undefined },
            { label: 'B', startBar: 5, length: 4, density: undefined },
          ],
          totalBars: 8,
        };
  const chordSymbolPlan = useCustom32
    ? buildChordSymbolPlanFromBars(expandedChordBars)
    : useCustom8Native
      ? buildChordSymbolPlanFromBars(parsedChordBars!)
      : BUILTIN_CHORD_SYMBOL_PLAN;
  const rehearsalMarkPlan = { marks: [{ label: 'A', bar: 1 }, { label: 'B', bar: 5 }] };
  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });

  const sectionRoles = planSectionRoles(sections, { A: 'statement', B: 'contrast' });
  const densityPlan = planDensityCurve(sectionRoles, tb);
  const densityCurve = { segments: densityPlan.segments, totalBars: tb };

  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [40, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [28, 55],
    },
  };

  const progressionMode: 'builtin' | 'custom' = parseFailed
    ? 'custom'
    : extras?.progressionMode ?? (useCustom ? 'custom' : 'builtin');

  const raw = extras?.chordProgressionInputRaw?.trim();

  const barsForLock =
    useCustom32 && expandedChordBars ? expandedChordBars : useCustom8Native && parsedChordBars ? parsedChordBars : undefined;

  const resolvedPresetId = extras?.resolvedPresetId ?? 'guitar_bass_duo';

  return {
    systemVersion: '2.0.0',
    presetId: resolvedPresetId,
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
    lockedHarmonyBarsRaw: barsForLock ? [...barsForLock] : undefined,
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: parseFailed ? undefined : useCustom ? 'custom' : 'builtin',
      customChordProgressionSummary: useCustom && barsForLock ? barsForLock.join(' | ') : undefined,
      progressionMode,
      chordProgressionInputRaw: raw && raw.length > 0 ? raw : undefined,
      parsedCustomProgressionBars: barsForLock ? [...barsForLock] : undefined,
      chordProgressionParseFailed: parseFailed || undefined,
      builtInHarmonyFallbackOccurred: false,
      customHarmonyLocked: useCustom && extras?.harmonyModeRequested === 'custom_locked',
      wybleVoiceLayout: wybleVoiceLayoutForPreset(resolvedPresetId),
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };
}

/** Builtin 8-bar duo cycle (×3 → 24 bars) — matches `buildLongFormFromDuoSections` tiling source. */
const DUO_BUILTIN_EIGHT_BAR_CYCLE: readonly string[] = [
  'Dmin9',
  'G13',
  'Cmaj9',
  'A7alt',
  'Dmin9',
  'G13',
  'Cmaj9',
  'A7alt',
];

function sectionRoleMapForDuoForm(sections: Array<{ label: string }>): Record<string, SectionRole> {
  const n = sections.length;
  if (n <= 1) {
    return Object.fromEntries(sections.map((s) => [s.label, 'statement' as SectionRole]));
  }
  const m: Record<string, SectionRole> = {};
  for (let i = 0; i < n; i++) {
    const lab = sections[i]!.label;
    if (i === 0) m[lab] = 'statement';
    else if (i === n - 1) m[lab] = 'return';
    else m[lab] = i === 1 ? 'contrast' : 'development';
  }
  return m;
}

/** 24-bar duo context: avoids `duo32` → `buildDuoLongFormCompositionContext` defaulting to 32 measures. */
function buildDuoTwentyFourBarCompositionContext(
  seed: number,
  formSections: FormSection[],
  bars24: string[],
  opts: {
    presetId: string;
    harmonySource: 'builtin' | 'custom';
    chordProgressionInputRaw?: string;
  }
): CompositionContext {
  const preset = guitarBassDuoPreset;
  const feel = preset.defaultFeel;
  const form = {
    sections: formSections.map((s) => ({ label: s.label, startBar: s.startBar, length: s.length })),
    totalBars: 24,
  };
  const harmony = buildHarmonyPlanFromBars(bars24);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(bars24);
  const phrase = { segments: form.sections.map((s) => ({ ...s, density: undefined })), totalBars: 24 };
  const sectionRoles = planSectionRoles(form.sections, sectionRoleMapForDuoForm(form.sections));
  const densityPlan = planDensityCurve(sectionRoles, 24);
  const densityCurve = { segments: densityPlan.segments, totalBars: 24 };
  const guitarMap = planGuitarRegisterMap(sectionRoles);
  const bassMap = planBassRegisterMap(sectionRoles);
  const register = {
    melody: [55, 79] as [number, number],
    bass: [40, 55] as [number, number],
    byInstrument: {
      clean_electric_guitar: guitarMap.sections[0]?.preferredZone ?? [55, 79],
      acoustic_upright_bass: bassMap.sections[0]?.preferredZone ?? [28, 55],
    },
  };
  const rehearsalMarkPlan = {
    marks: formSections.map((s) => ({ label: s.label, bar: s.startBar })),
  };
  const release = runReleaseReadinessGate({ validationPassed: true, exportValid: true, mxValid: true });
  const raw = opts.chordProgressionInputRaw;
  const context: CompositionContext = {
    systemVersion: '2.0.0',
    presetId: opts.presetId,
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
    lockedHarmonyBarsRaw: [...bars24],
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      harmonySource: opts.harmonySource,
      longFormDuo: true,
      modulationPlanActive: false,
      totalBars: 24,
      ...(opts.harmonySource === 'custom'
        ? {
            customHarmonyLocked: true,
            progressionMode: 'custom' as const,
            customChordProgressionSummary: bars24.join(' | '),
            parsedCustomProgressionBars: [...bars24],
            chordProgressionInputRaw: raw && raw.length > 0 ? raw : undefined,
            builtInHarmonyFallbackOccurred: false,
          }
        : { builtInHarmonyFallbackOccurred: false }),
      wybleVoiceLayout: wybleVoiceLayoutForPreset(opts.presetId),
    },
    validation: { gates: [], passed: true },
    readiness: { release: release.release, mx: release.mx },
  };
  return context;
}

interface EraProfile {
  rhythmBias: number;
  harmonyDensityBias: number;
  syncopationBias: number;
  tempoTargetBpm: [number, number];
  preferredExtensions: string[];
  avoidedExtensions: string[];
  harmonicRhythm: 'fast' | 'medium' | 'slow' | 'variable';
  functionalStrength: 'strong' | 'medium' | 'weak';
}

/**
 * Era profile used by Song Mode overlays (rhythm/syncopation) and downstream harmony weighting.
 */
function resolveEraProfile(era: string): EraProfile {
  const k = era.trim().toLowerCase().replace(/-/g, '_');
  switch (k) {
    case 'swing':
      return {
        rhythmBias: -0.05,
        harmonyDensityBias: -0.15,
        syncopationBias: -0.1,
        tempoTargetBpm: [120, 220],
        preferredExtensions: ['6', 'maj6', '6/9', '7', '9', '7b9'],
        avoidedExtensions: ['7alt', '#11', 'quartal'],
        harmonicRhythm: 'medium',
        functionalStrength: 'strong',
      };
    case 'bebop':
      return {
        rhythmBias: 0.25,
        harmonyDensityBias: 0.2,
        syncopationBias: 0.25,
        tempoTargetBpm: [160, 300],
        preferredExtensions: ['7b9', '7#9', '7#11', '7b13', 'dim7', 'm7b5', 'maj7', '13'],
        avoidedExtensions: ['sus4', 'quartal', 'add9'],
        harmonicRhythm: 'fast',
        functionalStrength: 'strong',
      };
    case 'post_bop':
      return {
        rhythmBias: 0.15,
        harmonyDensityBias: 0.2,
        syncopationBias: 0.15,
        tempoTargetBpm: [60, 280],
        preferredExtensions: ['maj7#11', '7alt', '7sus', 'quartal', 'mMaj7', 'm7b5'],
        avoidedExtensions: ['6', 'maj6'],
        harmonicRhythm: 'variable',
        functionalStrength: 'medium',
      };
    case 'cool_jazz':
      return {
        rhythmBias: -0.15,
        harmonyDensityBias: -0.1,
        syncopationBias: -0.15,
        tempoTargetBpm: [90, 160],
        preferredExtensions: ['maj7', '6/9', 'm7', 'add9', 'maj7#11', 'mMaj7'],
        avoidedExtensions: ['7alt', '7b9', '7#9'],
        harmonicRhythm: 'slow',
        functionalStrength: 'medium',
      };
    case 'hard_bop':
      return {
        rhythmBias: 0.2,
        harmonyDensityBias: 0.15,
        syncopationBias: 0.2,
        tempoTargetBpm: [110, 220],
        preferredExtensions: ['7b9', '7#9', '7#11', '7b13', 'sus4', 'm7', '13'],
        avoidedExtensions: ['quartal', 'add9', 'mMaj7'],
        harmonicRhythm: 'fast',
        functionalStrength: 'strong',
      };
    case 'fusion':
      return {
        rhythmBias: 0.1,
        harmonyDensityBias: 0.1,
        syncopationBias: 0.05,
        tempoTargetBpm: [90, 200],
        preferredExtensions: ['m7', 'm9', 'm11', '7sus', 'maj7#11', '6/9'],
        avoidedExtensions: ['dim7', '7b9', 'bebop vocab'],
        harmonicRhythm: 'slow',
        functionalStrength: 'weak',
      };
    case 'contemporary':
      return {
        rhythmBias: 0,
        harmonyDensityBias: 0,
        syncopationBias: 0,
        tempoTargetBpm: [60, 280],
        preferredExtensions: [],
        avoidedExtensions: [],
        harmonicRhythm: 'variable',
        functionalStrength: 'medium',
      };
    default:
      return {
        rhythmBias: 0,
        harmonyDensityBias: 0,
        syncopationBias: 0,
        tempoTargetBpm: [60, 280],
        preferredExtensions: [],
        avoidedExtensions: [],
        harmonicRhythm: 'variable',
        functionalStrength: 'medium',
      };
  }
}

/** Apply era nudges to existing metadata fields only; call after songwriter/style metadata merges when `era` is set. */
function applyEraBiasToGenerationMetadata(md: GenerationMetadata | undefined, era: string): void {
  if (md == null) return;
  const eraProfile = resolveEraProfile(era);
  md.songwriterSyncopationBias = Math.min(
    1.0,
    (md.songwriterSyncopationBias ?? 0.5) + eraProfile.rhythmBias + eraProfile.syncopationBias
  );
  md.harmonyDensityBias = eraProfile.harmonyDensityBias;
}

function buildContextForGoldenPath(seed: number, options?: RunGoldenPathOptions): CompositionContext {
  const ctx = ((): CompositionContext => {
  const presetId = options?.presetId ?? 'guitar_bass_duo';
  /** Song Mode / API inject: custom_locked uses ONLY lockedHarmonyBarsRaw (no planner / no alternate source). */
  if (isGuitarBassDuoFamily(presetId) && options?.harmonyMode === 'custom_locked' && options.lockedHarmonyBarsRaw) {
    const n = options.lockedHarmonyBarsRaw.length;
    if (!isAllowedSongFormBarCount(n)) {
      throw new Error(
        `CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked requires lockedHarmonyBarsRaw length in allowed song-form counts (got ${n}).`
      );
    }
    const pb = options.parsedChordBars;
    if (pb && pb.length !== n) {
      throw new Error(
        `CUSTOM HARMONY ROUTING FAILURE at buildContextForGoldenPath: custom_locked parsedChordBars length ${pb.length} !== locked ${n}.`
      );
    }
    const bars = [...options.lockedHarmonyBarsRaw];
    const parsed = options.parsedChordBars;
    if (parsed && parsed.length === n) {
      for (let i = 0; i < n; i++) {
        if ((bars[i] ?? '') !== (parsed[i] ?? '')) {
          throw new Error(
            'CUSTOM HARMONY NOT REACHING GOLDEN PATH: parsedChordBars must equal lockedHarmonyBarsRaw bar-for-bar.'
          );
        }
      }
    }
    const useLongFormLockedFromBars =
      n === 16 ||
      n === 32 ||
      (n % 8 === 0 && n >= 40 && n <= 64);
    if (useLongFormLockedFromBars) {
      return buildDuoLongFormCompositionContextFromBars(seed, bars, {
        chordProgressionInputRaw: options?.chordProgressionText?.trim(),
        presetId,
      }).context;
    }
    return buildGoldenPathContext(seed, bars, {
      chordProgressionInputRaw: options?.chordProgressionText?.trim(),
      progressionMode: 'custom',
      harmonyModeRequested: 'custom_locked',
      resolvedPresetId: presetId,
      totalBarsForForm: 8,
    });
  }
  /** 16 / 32 / 40–64 explicit bars → long-form FromBars (non–custom_locked; locked uses branch above). */
  const parsedLen = options?.parsedChordBars?.length ?? 0;
  const parsedLongFormFromBars =
    parsedLen === 16 ||
    parsedLen === 32 ||
    (parsedLen % 8 === 0 && parsedLen >= 40 && parsedLen <= 64);
  if (isGuitarBassDuoFamily(presetId) && options?.parsedChordBars && parsedLongFormFromBars) {
    if (options.harmonyMode === 'custom_locked') {
      throw new Error(
        'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked must resolve only via lockedHarmonyBarsRaw.'
      );
    }
    assertCustomLockedRouting(
      `buildContextForGoldenPath:${parsedLen}bar`,
      options,
      options.parsedChordBars
    );
    return buildDuoLongFormCompositionContextFromBars(seed, options.parsedChordBars, {
      chordProgressionInputRaw: options?.chordProgressionText?.trim(),
      presetId,
    }).context;
  }
  if (presetId === 'ecm_chamber') {
    const mode: EcmChamberMode = options?.ecmMode ?? 'ECM_METHENY_QUARTET';
    const requestedEcmBars = options?.ecmTotalBars ?? options?.totalBars;
    const ecmOpts: BuildEcmChamberContextOpts | undefined =
      requestedEcmBars !== undefined ? { totalBars: requestedEcmBars } : undefined;
    return buildEcmChamberContext(seed, mode, ecmOpts);
  }
  /** 24-bar forms (through3, aba, blues24, aab): do not use duo32 builder (always 32 measures). */
  if (isGuitarBassDuoFamily(presetId) && options?.formId) {
    const formSections24 = resolveFormSections(options.formId);
    const sum24 = formSections24.reduce((sum, s) => sum + s.length, 0);
    if (sum24 === 24 && options.harmonyMode !== 'custom_locked') {
      const p = options.parsedChordBars;
      const pid = options.presetId ?? 'guitar_bass_duo';
      if (p?.length === 24) {
        return buildDuoTwentyFourBarCompositionContext(seed, formSections24, p, {
          presetId: pid,
          harmonySource: 'custom',
          chordProgressionInputRaw: options.chordProgressionText?.trim(),
        });
      }
      if (p?.length === 8) {
        const b24 = [...p, ...p, ...p];
        return buildDuoTwentyFourBarCompositionContext(seed, formSections24, b24, {
          presetId: pid,
          harmonySource: 'custom',
          chordProgressionInputRaw: options.chordProgressionText?.trim(),
        });
      }
      if (!p?.length) {
        const builtin24 = Array.from({ length: 24 }, (_, i) => DUO_BUILTIN_EIGHT_BAR_CYCLE[i % 8]!);
        return buildDuoTwentyFourBarCompositionContext(seed, formSections24, builtin24, {
          presetId: pid,
          harmonySource: 'builtin',
        });
      }
    }
  }
  const lf = resolveLongFormRoute(presetId, {
    totalBars: options?.totalBars,
    longFormEnabled: options?.longFormEnabled,
  });
  if (lf.kind === 'duo16') {
    if (options?.harmonyMode === 'custom_locked') {
      throw new Error(
        'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked must resolve via lockedHarmonyBarsRaw — illegal duo16 tiled branch.'
      );
    }
    return buildDuoLongFormCompositionContext(seed, {
      targetTotalBars: 16,
      parsedChordBars8: options?.parsedChordBars?.length === 8 ? options.parsedChordBars : undefined,
      presetId,
    }).context;
  }
  if (lf.kind === 'duo32') {
    if (options?.harmonyMode === 'custom_locked') {
      throw new Error(
        'CUSTOM HARMONY NOT REACHING GOLDEN PATH: custom_locked must resolve via lockedHarmonyBarsRaw — illegal tiled/builtin duo32 branch.'
      );
    }
    const lfTb = lf.totalBars ?? LONG_FORM_DUO_BARS;
    return buildDuoLongFormCompositionContext(seed, {
      targetTotalBars: lfTb,
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
    totalBarsForForm: options?.totalBars,
  });
  })();
  const resolvedEra = options?.stylePairing?.era ?? options?.era;
  if (resolvedEra != null) {
    ctx.generationMetadata = {
      ...ctx.generationMetadata,
      era: resolvedEra ?? undefined,
    };
  }
  return ctx;
}

function resolveExpectedCustomChordBarCount(options?: RunGoldenPathOptions): number {
  if (options?.harmonyMode === 'custom_locked' && typeof options.totalBars === 'number') {
    const tb = options.totalBars;
    if (isAllowedSongFormBarCount(tb)) return tb;
  }
  const lf = resolveLongFormRoute(options?.presetId ?? 'guitar_bass_duo', {
    totalBars: options?.totalBars,
    longFormEnabled: options?.longFormEnabled,
  });
  if (lf.kind === 'standard8') return 8;
  if (lf.kind === 'duo16') return 16;
  if (lf.kind === 'duo32') {
    if (options?.formId) {
      const sumForm = resolveFormSections(options.formId).reduce((sum, s) => sum + s.length, 0);
      if (sumForm === 24) return 24;
    }
    return lf.totalBars ?? LONG_FORM_DUO_BARS;
  }
  return 8;
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

/** Slash chords: if any bass note matches the slash pitch class in the bar → ok; else emit a non-blocking warning (does not fail render). */
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
      const pc = (((e as { pitch: number }).pitch % 12) + 12) % 12;
      const sb = ((slashBassPc % 12) + 12) % 12;
      if (pc === sb) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      out.push(
        `Bar ${m.index}: slash bass pitch class not found in bass notes for "${chord}" (warning).`
      );
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
  const duoRoleCycle: SectionRole[] = ['statement', 'development', 'contrast', 'return'];
  function duoRolesForLongFormSections(
    formSections: Array<{ label: string; startBar: number; length: number }>
  ): Record<string, SectionRole> {
    const m: Record<string, SectionRole> = {};
    for (const s of formSections) {
      const idx = Math.max(0, Math.floor((s.startBar - 1) / 8));
      m[s.label] = duoRoleCycle[idx % 4]!;
    }
    return m;
  }
  const isDuoLong = isGuitarBassDuoFamily(context.presetId) && context.form.totalBars > 8;
  const duoRoles = isDuoLong ? duoRolesForLongFormSections(context.form.sections) : duoRoles8;
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
        ? placeMotifsLongFormDuo(baseMotifs, seed, context.form.totalBars)
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
  /** Export/score tempo in BPM for the generated ScoreModel. */
  bpm?: number;
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
  /** Phase 19: explicit musical form selection.
   *  If omitted, form is inferred from totalBars
   *  and longFormEnabled as before. */
  formId?: FormId;
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
  /** Song Mode LeadSheet pilot: compact per-bar melody anchors from imported lead sheet. */
  songModeLeadSheetMelodyAnchors?: Array<{ bar: number; midi: number; velocityHint?: number; connectionHint?: number }>;
  /** Imported LeadSheet expression shaping vs engine defaults (0–1); omitted uses engine default blend. */
  leadSheetPerformanceBlend?: number;
  /** Stage 2: normalized mode echo for imported harmony routing (metadata-only in this stage). */
  importHarmonyMode?: ImportHarmonyMode;
  /** Stage 2: bounded reharm blend echo (metadata-only in this stage). */
  harmonyBlend?: number;
  /** Song Mode: optional secondary songwriter style key (for inspectability metadata). */
  secondarySongwriterStyle?: string;
  /** Song Mode: optional author overlay id (for inspectability metadata). */
  authorOverlay?: string;
  /** Song Mode v1 (Indie Art Pop): resolved optional alternate tuning envelope. */
  alternateGuitarTuning?: AlternateGuitarTuningResolved;
  /** Song Mode: optional classical overlay id (for inspectability metadata). */
  classicalOverlay?: string;
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
  /** Feature flag: Motif Authority V1 (default off). */
  motifAuthorityV1?: boolean;
  /** Pilot motif policy level (default `soft` when V1 is requested). */
  motifAuthorityLevel?: MotifAuthorityLevel;
  /** Diagnostic-only deterministic Song Mode Indie tuning proof fixture. */
  debugFixtureMode?: 'indie_dual_guitar_tuning_proof';
  /** Optional era hint (e.g. `stylePairing.era`); copied to `generationMetadata.era` when set. */
  era?: string;
  /** Optional style-pairing envelope (UI/app parity). */
  stylePairing?: StylePairingInput | null;
  /**
   * Jest / diagnostics: omit `wybleVoiceLayout` after context build so duo scores can be
   * compared against the default portable Wyble map without forking the full planner.
   */
  suppressWybleVoiceLayoutForTest?: boolean;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function applyIndieArtPopAlternateTuningPolicy(
  context: CompositionContext,
  tuning: AlternateGuitarTuningResolved | undefined
): void {
  if (!tuning) {
    return;
  }
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) {
    console.log(
      '[DualTuning] applyIndieArtPopAlternateTuningPolicy skip',
      JSON.stringify({ reason: 'songModeHookFirstIdentity_not_true', mode: tuning.mode })
    );
    return;
  }
  if (normalizeStyleProfileId(context.generationMetadata?.styleProfile) !== 'STYLE_INDIE_ART_POP') {
    console.log(
      '[DualTuning] applyIndieArtPopAlternateTuningPolicy skip',
      JSON.stringify({ reason: 'styleProfile_not_indie', mode: tuning.mode, sp: context.generationMetadata?.styleProfile })
    );
    return;
  }

  const next: GenerationMetadata = {
    ...context.generationMetadata,
    alternateGuitarTuning: tuning,
    altTuningDroneTendency: tuning.mode === 'standard' ? 0 : tuning.mode === 'shared' ? 0.12 : 0.2,
    altTuningRegisterBias:
      tuning.mode === 'separate' ? 'high' : tuning.mode === 'shared' && tuning.shared?.presetId !== 'standard' ? 'low' : 'neutral',
    altTuningSplitRoleActive: tuning.mode === 'separate',
  };

  if (tuning.mode !== 'standard') {
    next.songwriterDensityBias = clamp01((next.songwriterDensityBias ?? 0.5) - (tuning.mode === 'separate' ? 0.08 : 0.04));
  }
  if (tuning.mode === 'separate') {
    next.songwriterSyncopationBias = clamp01((next.songwriterSyncopationBias ?? 0.5) + 0.03);
  }

  const g = context.register.byInstrument?.clean_electric_guitar;
  if (g && g.length === 2) {
    const shift = next.altTuningRegisterBias === 'high' ? 3 : next.altTuningRegisterBias === 'low' ? -3 : 0;
    context.register = {
      ...context.register,
      byInstrument: {
        ...context.register.byInstrument,
        clean_electric_guitar: [g[0] + shift, g[1] + shift],
      },
    };
  }

  context.generationMetadata = next;
  if (tuning.mode !== 'standard') {
    appendSongModeStyleSurfaceNotes(
      context.generationMetadata,
      tuning.mode === 'separate'
        ? ['Indie Art Pop alt tuning: separate guitar tunings enabled (light drone/register/split-role nudges).']
        : ['Indie Art Pop alt tuning: shared alternate tuning enabled (light drone/register nudges).']
    );
  }
}

function isIndieArtPopDualGuitarRoute(context: CompositionContext): boolean {
  return (
    context.generationMetadata?.songModeHookFirstIdentity === true &&
    isGuitarBassDuoFamily(context.presetId) &&
    normalizeStyleProfileId(context.generationMetadata?.styleProfile) === 'STYLE_INDIE_ART_POP' &&
    context.generationMetadata?.alternateGuitarTuning?.mode === 'separate'
  );
}

function hasAnySimultaneousPolyphony(part: ScoreModel['parts'][number]): boolean {
  for (const m of part.measures) {
    const notes = m.events
      .filter((e): e is Extract<typeof e, { kind: 'note' }> => e.kind === 'note')
      .map((e) => ({ start: e.startBeat, end: e.startBeat + e.duration }))
      .sort((a, b) => a.start - b.start);
    for (let i = 0; i < notes.length - 1; i++) {
      if (notes[i + 1]!.start < notes[i]!.end - 1e-6) return true;
    }
  }
  return false;
}

const MOTIF_PHASE1_SONG_MODE_WRITERS = new Set(['wayne_shorter', 'barry_harris', 'donald_fagen', 'bacharach']);

function isMotifAuthorityPilotPreset(
  presetId: string,
  options?: RunGoldenPathOptions,
  context?: CompositionContext
): boolean {
  if (presetId === 'ecm_chamber') return true;
  const isSongModeRoute = isGuitarBassDuoFamily(presetId);
  if (!isSongModeRoute) return false;
  const writerId = options?.primarySongwriterStyle ?? context?.generationMetadata?.songwriterStyleId;
  const songModeIdentityRequested =
    options?.songModeHookFirstIdentity === true ||
    context?.generationMetadata?.songModeHookFirstIdentity === true;
  if (!songModeIdentityRequested) return false;
  if (!writerId || !MOTIF_PHASE1_SONG_MODE_WRITERS.has(writerId)) return false;
  // Hybrid pilot (Shorter melody + Barry harmony) is an allowed subset of pilot Song Mode routes.
  if (writerId === 'wayne_shorter') {
    return options?.styleStack?.primary === 'barry_harris';
  }
  return true;
}

function resolveMotifAuthorityLevel(options: RunGoldenPathOptions | undefined): MotifAuthorityLevel {
  const explicit = options?.motifAuthorityLevel;
  if (explicit === 'off' || explicit === 'soft' || explicit === 'strong') return explicit;
  const requested = options?.motifAuthorityV1 === true || process.env?.COMPOSER_OS_MOTIF_AUTHORITY_V1 === '1';
  return requested ? 'soft' : 'off';
}

function normalizeEraId(era: string | undefined): EraId | null {
  if (!era) return null;
  const k = era.trim().toLowerCase().replace(/-/g, '_');
  if (
    k === 'swing' ||
    k === 'bebop' ||
    k === 'cool_jazz' ||
    k === 'hard_bop' ||
    k === 'post_bop' ||
    k === 'fusion' ||
    k === 'contemporary'
  ) {
    return k;
  }
  return null;
}

/**
 * Shared blend mapping for imported phrase-expression routes.
 * Keeps low blend audible while leaving room for stronger high-blend pull.
 */
function resolveLeadSheetExpressionStrengthFromBlend(blendRaw: number | undefined): number {
  const clamped = typeof blendRaw === 'number' && Number.isFinite(blendRaw) ? Math.min(1, Math.max(0, blendRaw)) : 0.55;
  return Math.min(1, Math.max(0, 0.15 + 0.85 * clamped));
}

/** Offsets tried by the duo lock (requested seed + each offset). */
export const GOLDEN_PATH_VARIANT_SEED_OFFSETS = [0, 10007, 20011, 30011, 40009, 50021] as const;

export function candidateSeedsForGoldenPath(requestedSeed: number): number[] {
  return GOLDEN_PATH_VARIANT_SEED_OFFSETS.map((o) => requestedSeed + o);
}

type ScoreSizeProbe = {
  totalParts: number;
  totalMeasures: number;
  totalEvents: number;
  roughObjects: number;
  eventsPerPart: number[];
};

type EcmPhaseProbeExtras = Record<string, string | number | boolean | undefined>;

function estimateScoreSize(score: unknown): ScoreSizeProbe {
  const s = (score ?? {}) as { parts?: Array<{ measures?: Array<{ events?: unknown[] }> }> };
  const parts = Array.isArray(s.parts) ? s.parts : [];
  let totalMeasures = 0;
  let totalEvents = 0;
  let roughObjects = 1; // root score object
  const eventsPerPart: number[] = [];
  for (const part of parts) {
    roughObjects += 1;
    const measures = Array.isArray(part?.measures) ? part.measures : [];
    totalMeasures += measures.length;
    roughObjects += measures.length;
    let partEvents = 0;
    for (const measure of measures) {
      const events = Array.isArray(measure?.events) ? measure.events : [];
      partEvents += events.length;
      totalEvents += events.length;
      roughObjects += events.length;
    }
    eventsPerPart.push(partEvents);
  }
  return {
    totalParts: parts.length,
    totalMeasures,
    totalEvents,
    roughObjects,
    eventsPerPart,
  };
}

function logEcmPhaseProbe(enabled: boolean, phase: string, score?: unknown, extras?: EcmPhaseProbeExtras): void {
  if (!enabled || typeof process === 'undefined' || typeof process.memoryUsage !== 'function') return;
  const mu = process.memoryUsage();
  const scoreSize = score ? estimateScoreSize(score) : null;
  const extraFields = extras
    ? Object.entries(extras)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ')
    : '';
  const scoreFields = scoreSize
    ? ` parts=${scoreSize.totalParts} measures=${scoreSize.totalMeasures} events=${scoreSize.totalEvents} roughObjects=${scoreSize.roughObjects}`
    : '';
  console.log(
    `[ECM_PHASE_PROBE] phase=${phase} heapUsed=${mu.heapUsed} heapTotal=${mu.heapTotal} rss=${mu.rss}${scoreFields}${extraFields ? ` ${extraFields}` : ''}`
  );
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

  const hasLockedBars =
    opts?.harmonyMode === 'custom_locked' &&
    opts.lockedHarmonyBarsRaw &&
    isAllowedSongFormBarCount(opts.lockedHarmonyBarsRaw.length);
  if (
    isGuitarBassDuoFamily(presetIdEarly) &&
    (harmonyMode === 'custom' || harmonyMode === 'custom_locked') &&
    !(opts?.chordProgressionText?.trim()) &&
    !hasLockedBars
  ) {
    return harmonyParseFailureGoldenPathResult(
      seed,
      opts,
      `Custom chord progression is empty. Enter exactly ${expectedBars} bars separated by |.`
    );
  }

  let resolved: RunGoldenPathOptions | undefined = opts;
  if (isGuitarBassDuoFamily(presetIdEarly) && hasLockedBars) {
    const n = opts!.lockedHarmonyBarsRaw!.length;
    const finalBars = [...opts!.lockedHarmonyBarsRaw!];
    const text = opts?.chordProgressionText?.trim();
    if (text) {
      const p = parseChordProgressionInputWithBarCount(text, n);
      if (p.ok) {
        for (let i = 0; i < n; i++) {
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
    resolved = { ...opts!, parsedChordBars: finalBars, lockedHarmonyBarsRaw: finalBars };
    assertCustomLockedRouting('runGoldenPath:lockedInject', resolved, finalBars);
    logSongModeHarmonyDebug({
      layer: 'runGoldenPath',
      harmonyMode: 'custom_locked',
      parsedCustomProgressionBarsLength: finalBars.length,
      expectedBars: n,
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
    if (isGuitarBassDuoFamily(presetIdEarly) && lfParse.kind === 'duo32' && opts?.harmonyMode !== 'custom_locked') {
      const formBarSum =
        opts?.formId != null
          ? resolveFormSections(opts.formId).reduce((sum, s) => sum + s.length, 0)
          : undefined;
      if (formBarSum === 24 || opts?.totalBars === 24) {
        const p24 = parseChordProgressionInputWithBarCount(text, 24, [8]);
        if (!p24.ok) {
          return harmonyParseFailureGoldenPathResult(
            seed,
            opts,
            `Invalid chord progression — not applied. ${p24.error}`
          );
        }
        parsed =
          p24.bars.length === 24
            ? p24
            : { ok: true, bars: [...p24.bars, ...p24.bars, ...p24.bars] };
      } else {
        const tbLong = lfParse.totalBars ?? LONG_FORM_DUO_BARS;
        const pLong = parseChordProgressionInputWithBarCount(text, tbLong);
        if (pLong.ok) {
          parsed = pLong;
        } else {
          const p8 = parseChordProgressionInputWithBarCount(text, 8);
          if (!p8.ok) {
            return harmonyParseFailureGoldenPathResult(
              seed,
              opts,
              `Invalid chord progression — not applied. Long-form (${tbLong} bars): ${pLong.error} — or 8-bar tile: ${p8.error}`
            );
          }
          parsed = p8;
        }
      }
    } else if (isGuitarBassDuoFamily(presetIdEarly) && lfParse.kind === 'duo16' && opts?.harmonyMode !== 'custom_locked') {
      const p16 = parseChordProgressionInputWithBarCount(text, 16);
      if (p16.ok) {
        parsed = p16;
      } else {
        const p8 = parseChordProgressionInputWithBarCount(text, 8);
        if (!p8.ok) {
          return harmonyParseFailureGoldenPathResult(
            seed,
            opts,
            `Invalid chord progression — not applied. Long-form (16 bars): ${p16.error} — or 8-bar tile: ${p8.error}`
          );
        }
        parsed = { ok: true, bars: [...p8.bars, ...p8.bars] };
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
  const allSeeds = candidateSeedsForGoldenPath(seed);
  // ECM-specific OOM mitigation: keep a small candidate sweep budget at 32-bar chamber complexity.
  // Non-ECM presets preserve the full 6-seed sweep behavior.
  const seeds =
    (resolved?.presetId ?? options?.presetId ?? 'guitar_bass_duo') === 'ecm_chamber'
      ? allSeeds.slice(0, 3)
      : allSeeds;
  const isEcmChamber =
    (resolved?.presetId ?? options?.presetId ?? 'guitar_bass_duo') === 'ecm_chamber' &&
    process.env?.COMPOSER_OS_DEBUG_ECM_ATTEMPTS === '1';
  let best: GoldenPathResult | null = null;
  let bestSoft = -Infinity;
  let last: GoldenPathResult | null = null;
  for (let attemptIndex = 0; attemptIndex < seeds.length; attemptIndex++) {
    const s = seeds[attemptIndex]!;
    if (isEcmChamber) {
      const targetBars = resolved?.totalBars ?? options?.totalBars ?? 0;
      console.log(`[ECM_SIZE_PROBE] attempt_start attempt=${attemptIndex + 1}/${seeds.length} seed=${s} targetBars=${targetBars}`);
    }
    const r = runGoldenPathOnce(s, resolved);
    if (isEcmChamber) {
      const size = estimateScoreSize(r.score);
      const bars = r.context?.form?.totalBars ?? resolved?.totalBars ?? options?.totalBars ?? 0;
      console.log(
        `[ECM_SIZE_PROBE] attempt=${attemptIndex + 1}/${seeds.length} seed=${s} bars=${bars} parts=${size.totalParts} ` +
          `measures=${size.totalMeasures} events=${size.totalEvents} roughObjects=${size.roughObjects} ` +
          `eventsPerPart=[${size.eventsPerPart.join(',')}]`
      );
    }
    last = r;
    if (isEcmChamber) {
      const lastSize = estimateScoreSize(r.score);
      console.log(
        `[ECM_SIZE_PROBE] last_update attempt=${attemptIndex + 1} measures=${lastSize.totalMeasures} ` +
          `events=${lastSize.totalEvents} roughObjects=${lastSize.roughObjects}`
      );
    }
    if (r.success) {
      const pid = resolved?.presetId ?? 'guitar_bass_duo';
      /** Duo-family parity: same bar-6 vs bar-7 melodic-interval sweep filter as standard duo (Wyble single-line included). */
      if (isGuitarBassDuoFamily(pid) && !duoGuitarBarSevenIntervalPeakVsBarSixOk(r.score)) {
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
        if (isEcmChamber) {
          const bestSize = estimateScoreSize(r.score);
          console.log(
            `[ECM_SIZE_PROBE] best_update attempt=${attemptIndex + 1} soft=${soft.toFixed(4)} ` +
              `measures=${bestSize.totalMeasures} events=${bestSize.totalEvents} roughObjects=${bestSize.roughObjects}`
          );
        }
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
  const isIndieTuningFixture = options?.debugFixtureMode === 'indie_dual_guitar_tuning_proof';
  const probeEcm =
    (options?.presetId ?? 'guitar_bass_duo') === 'ecm_chamber' &&
    process.env?.COMPOSER_OS_DEBUG_ECM_PHASE === '1';
  logEcmPhaseProbe(probeEcm, 'start', undefined, { seed, targetBars: options?.totalBars ?? 0 });

  let effectiveOptions = options;
  if (effectiveOptions?.formId) {
    const formSections = resolveFormSections(effectiveOptions.formId);
    const formTotalBars = formSections.reduce((sum, s) => sum + s.length, 0);
    effectiveOptions = { ...effectiveOptions, totalBars: formTotalBars };
  }
  const context = buildContextForGoldenPath(seed, effectiveOptions);
  const motifAuthorityLevelRequested = resolveMotifAuthorityLevel(options);
  const motifAuthorityEligible = isMotifAuthorityPilotPreset(
    options?.presetId ?? context.presetId,
    options,
    context
  );
  const motifAuthorityActive = motifAuthorityEligible && motifAuthorityLevelRequested !== 'off';
  if (motifAuthorityEligible) {
    context.generationMetadata = {
      ...context.generationMetadata,
      motifAuthorityV1: motifAuthorityActive,
      motifAuthorityLevel: motifAuthorityLevelRequested,
    };
  }
  logEcmPhaseProbe(probeEcm, 'after_context_build', undefined, {
    bars: context.form.totalBars,
    chordPlanSegments: context.chordSymbolPlan?.segments?.length ?? 0,
  });
  if (options?.suppressWybleVoiceLayoutForTest === true) {
    context.generationMetadata = {
      ...context.generationMetadata,
      wybleVoiceLayout: undefined,
    };
  }
  if (options?.formId) {
    const formSections = resolveFormSections(options.formId);
    context.form = {
      ...context.form,
      sections: formSections,
      totalBars: formSections.reduce((sum, s) => sum + s.length, 0),
    };
  }
  if (options?.creativeControlLevel) {
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeRhythmStrength: options.creativeControlLevel,
    };
  }
  // From Stage 4 onward, importHarmonyPolicyVersion === 2 whenever import-harmony fields are written here
  // (normalized mode / blend echo for manifests — not a routing switch).
  if (options?.importHarmonyMode !== undefined || options?.harmonyBlend !== undefined) {
    context.generationMetadata = {
      ...context.generationMetadata,
      importHarmonyMode: options.importHarmonyMode,
      harmonyBlendRaw:
        typeof options.harmonyBlend === 'number' && Number.isFinite(options.harmonyBlend) ? options.harmonyBlend : undefined,
      importHarmonyPolicyVersion: IMPORT_HARMONY_POLICY_VERSION,
    };
  }
  if (options?.songModeHookFirstIdentity) {
    /** Song Mode: explicit STYLE_ECM default when `styleProfile` omitted (legacy callers). */
    const styleProfileResolved: StyleProfile = normalizeStyleProfileId(options.styleProfile) ?? 'STYLE_ECM';
    const isLeadSheetPhase1Writer =
      options.primarySongwriterStyle === 'donald_fagen' || options.primarySongwriterStyle === 'barry_harris';
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeHookFirstIdentity: true,
      styleProfile: styleProfileResolved,
      songModeLeadSheetMelodyAnchors:
        isLeadSheetPhase1Writer && options.songModeLeadSheetMelodyAnchors?.length
          ? options.songModeLeadSheetMelodyAnchors
          : undefined,
      songModeLeadSheetInputApplied:
        isLeadSheetPhase1Writer && options.songModeLeadSheetMelodyAnchors?.length
          ? true
          : undefined,
      songModeLeadSheetPerformanceBlend:
        isLeadSheetPhase1Writer && options.songModeLeadSheetMelodyAnchors?.length
          ? options.leadSheetPerformanceBlend
          : undefined,
      songModeLeadSheetExpressionStrength:
        isLeadSheetPhase1Writer && options.songModeLeadSheetMelodyAnchors?.length
          ? resolveLeadSheetExpressionStrengthFromBlend(options.leadSheetPerformanceBlend)
          : undefined,
    };
  }
  const importExpressionPresetEnabled =
    isGuitarBassDuoFamily(context.presetId) || context.presetId === 'ecm_chamber';
  if (importExpressionPresetEnabled && options?.songModeLeadSheetMelodyAnchors?.length) {
    context.generationMetadata = {
      ...context.generationMetadata,
      songModeLeadSheetMelodyAnchors: options.songModeLeadSheetMelodyAnchors,
      songModeLeadSheetInputApplied: true,
      songModeLeadSheetPerformanceBlend: options.leadSheetPerformanceBlend,
      songModeLeadSheetExpressionStrength: resolveLeadSheetExpressionStrengthFromBlend(options.leadSheetPerformanceBlend),
    };
  }
  if (options?.songModeHookFirstIdentity && options?.primarySongwriterStyle) {
    const resolution = resolveSongwritingStyles({
      primary: options.primarySongwriterStyle,
      secondary: options.secondarySongwriterStyle,
      authorOverlay: options.authorOverlay as AuthorRuleId | undefined,
      classicalOverlay: options.classicalOverlay as ClassicalSongRuleId | undefined,
    });
    const p = resolution.blendedProfile;
    context.generationMetadata = {
      ...context.generationMetadata,
      songwriterHookRepetitionBias: p.hookRepetitionBias,
      songwriterPhraseRegularity: p.phraseRegularity,
      songwriterSyncopationBias: p.syncopationBias,
      songwriterDensityBias: p.densityBias,
      songwriterStyleId: resolution.primaryId,
      fagenMuChordBias: p.fagenMuChordBias ?? 0,
      fagenLydianMajorBias: p.fagenLydianMajorBias ?? 0,
      fagenAlteredDominantBias: p.fagenAlteredDominantBias ?? 0,
      fagenRootAvoidanceMelody: p.fagenRootAvoidanceMelody ?? 0,
      fagenSlashChordDensity: p.fagenSlashChordDensity ?? 0,
      bacharachDeceptiveCadenceRate: p.bacharachDeceptiveCadenceRate ?? 0,
      bacharachChromaticVoiceLeading: p.bacharachChromaticVoiceLeading ?? 0,
      bacharachModalMixtureLevel: p.bacharachModalMixtureLevel ?? 0,
      bacharachCadentialAmbiguity: p.bacharachCadentialAmbiguity ?? 0,
      bacharachPedalUsage: p.bacharachPedalUsage ?? 0,
      songModeProfileRuleDiagnostics: {
        styleProfile: context.generationMetadata.styleProfile,
        primarySongwriterStyleId: resolution.primaryId,
        secondarySongwriterStyleId: resolution.secondaryId,
        authorOverlayId: resolution.authorOverlayId,
        classicalOverlayId: resolution.classicalOverlayId,
        styleFingerprint: resolution.styleFingerprint,
        resolvedRuleIds: resolution.resolvedRuleIds,
      },
    };
    const compProfile = getSongwriterCompProfile(resolution.primaryId);
    if (compProfile?.primaryCompInstrument === 'keys') {
      const syncBase = context.generationMetadata.songwriterSyncopationBias ?? 0.5;
      context.generationMetadata = {
        ...context.generationMetadata,
        songModeSongwriterKeysCompActive: true,
        songModeSongwriterCompProfileId: compProfile.id,
        songModeProfileRuleDiagnostics: {
          ...(context.generationMetadata.songModeProfileRuleDiagnostics ?? {}),
          songwriterCompProfileId: compProfile.id,
        },
        ...(compProfile.id === 'bacharach'
          ? { songwriterSyncopationBias: Math.min(1, syncBase + 0.05) }
          : {}),
      };
      appendSongModeStyleSurfaceNotes(context.generationMetadata, compProfile.receiptLines);
    }
  }
  if (options?.songModeHookFirstIdentity) {
    applyDonaldFagenSongwriterSurface(context.generationMetadata, options.primarySongwriterStyle);
  }
  if (options?.songModeHookFirstIdentity) {
    applyGrooveSoulStyleSurface(context.generationMetadata, context.generationMetadata.styleProfile);
  }
  if (options?.songModeHookFirstIdentity) {
    applySophisticatedPopStyleSurface(context.generationMetadata, context.generationMetadata.styleProfile);
  }
  if (options?.songModeHookFirstIdentity) {
    applySophisticatedPopHarmonyDressing(context);
  }
  if (options?.songModeHookFirstIdentity) {
    applyBacharachSongModeSurfaceV1(context.generationMetadata, options.primarySongwriterStyle);
  }
  if (options?.songModeHookFirstIdentity) {
    applyBacharachSongModeHarmonyDressing(context);
  }
  if (options?.songModeHookFirstIdentity) {
    applyIndieArtPopAlternateTuningPolicy(context, options?.alternateGuitarTuning);
    if (options?.alternateGuitarTuning) {
      const md = context.generationMetadata;
      const dual = isIndieArtPopDualGuitarRoute(context);
      console.log(
        '[DualTuning] after applyIndieArtPopAlternateTuningPolicy',
        JSON.stringify({
          inputAltMode: options.alternateGuitarTuning?.mode,
          metadataAltMode: md?.alternateGuitarTuning?.mode ?? null,
          isIndieDualGuitarRouteFlag: dual,
        })
      );
    }
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

  const eraForNormalization = normalizeEraId((options?.stylePairing?.era as string | undefined) ?? options?.era);
  if (options?.songModeHookFirstIdentity && eraForNormalization && options?.harmonyMode !== 'custom_locked') {
    const segments = context.chordSymbolPlan?.segments;
    if (segments && segments.length > 0) {
      const rewritten = normalizeChordSymbolsForEra(
        segments.map((s) => s.chord),
        eraForNormalization
      );
      for (let i = 0; i < segments.length; i++) {
        segments[i]!.chord = rewritten[i] ?? segments[i]!.chord;
      }
    }
  }

  /** Era bias after songwriter / surfaces / blend — stacks on `songwriterSyncopationBias` (not `songModeRhythmStrength`, which is an enum). */
  const eraForBias = options?.stylePairing?.era ?? options?.era;
  if (eraForBias != null) {
    applyEraBiasToGenerationMetadata(context.generationMetadata, eraForBias);
  }

  if (options?.songModeHookFirstIdentity) {
    applyEcmStyleHarmonyMotionPolicy(context);
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

  logEcmPhaseProbe(probeEcm, 'before_plan_build');
  let plans: GoldenPathPlans;
  try {
    plans = buildGoldenPathPlans(seed, context, options);
  } finally {
    logEcmPhaseProbe(probeEcm, 'after_plan_build', undefined, {
      bars: context.form.totalBars,
    });
  }
  const { sections, densityPlan, guitarBehaviour, bassBehaviour, rhythmConstraints, motifState, styleStack, interactionPlan } =
    plans;

  const appliedContext = styleStack ? applyStyleStack(context, styleStack) : context;
  augmentGuitarBassDuoReceiptMetadata(appliedContext, styleStack);
  errors.push(...assertDuoEightBarInputTruthEarly(appliedContext, options));
  logEcmPhaseProbe(probeEcm, 'before_render', undefined, {
    ecmShapingEnabled: options?.ecmShapingEnabled,
    orchestrationEnabled: options?.orchestrationEnabled,
    identityCellEnabled: options?.identityCellEnabled,
  });
  let score: ScoreModel | undefined;
  try {
    if (options?.debugFixtureMode === 'indie_dual_guitar_tuning_proof') {
      score = buildIndieDualGuitarTuningFixtureScore();
      appliedContext.generationMetadata = {
        ...appliedContext.generationMetadata,
        songModeStyleSurfaceNotes: [
          ...(appliedContext.generationMetadata.songModeStyleSurfaceNotes ?? []),
          'Diagnostic fixture: deterministic dual-guitar tuning proof score emitted through standard export pipeline.',
        ],
      };
    } else {
      score = generateGoldenPathDuoScore(appliedContext, plans, {
        bpm: options?.bpm,
        variationEnabled: options?.variationEnabled === true,
        ecmShapingEnabled: options?.ecmShapingEnabled,
        orchestrationEnabled: options?.orchestrationEnabled,
        identityCellEnabled: options?.identityCellEnabled,
      });
    }
  } finally {
    logEcmPhaseProbe(probeEcm, 'after_render', score, {
      bars: appliedContext.form.totalBars,
    });
  }
  if (!score) {
    throw new Error('generateGoldenPathDuoScore did not produce a score');
  }
  logEcmPhaseProbe(probeEcm, 'before_post', score);
  if (options?.songModeHookFirstIdentity) {
    finalizeSongModeSectionShaping(appliedContext.generationMetadata);
  }
  if (options?.formId && context.form?.sections) {
    (score as unknown as {
      formSections?: { startBar: number; label: string }[];
    }).formSections = context.form.sections.map((s) => ({
      startBar: s.startBar,
      label: s.label,
    }));
  }
  if (
    appliedContext.generationMetadata?.songModeHookFirstIdentity &&
    options?.debugFixtureMode !== 'indie_dual_guitar_tuning_proof'
  ) {
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
      /** Song Mode: sliding-window motif coverage can read low while harmony/line quality is strong — non-blocking (same routing as hook contour). */
      const slidingMotifCoverageWarning = 'motif-mapped notes <50% in sliding window';
      for (const issue of motifIssues) {
        const routeToPhraseWarnings =
          issue.includes(contourWarning) ||
          issue.includes(literalWarning) ||
          issue.includes(similarityWarning) ||
          issue.includes(slidingMotifCoverageWarning);
        if (routeToPhraseWarnings) {
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
    assertScoreMatchesLockedHarmonyWire(score, options, appliedContext);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  applyKeySignatureToScoreAndContext(score, appliedContext, {
    keySignatureMode: options?.keySignatureMode,
    tonalCenterOverride: options?.tonalCenterOverride,
    tonalCenter: options?.tonalCenter,
  });

  const slashBassWarnings = validateSlashBassHonoured(score);
  if (slashBassWarnings.length > 0) {
    songModePhraseWarnings = [...songModePhraseWarnings, ...slashBassWarnings];
  }

  const modelValidation = isIndieTuningFixture ? { valid: true, errors: [] } : validateScoreModel(score);
  if (!modelValidation.valid) errors.push(...modelValidation.errors);

  // Rhythm is finalized + validated once inside generateGoldenPathDuoScore; parts/measures/events are frozen — read-only gate.
  const strictBarMath = isIndieTuningFixture ? { valid: true, errors: [] } : validateStrictBarMath(score);
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

  const integrityResult = isIndieTuningFixture
    ? { passed: true, errors: [] as string[] }
    : runScoreIntegrityGate({
        bars,
        instruments: context.instrumentProfiles,
        chordSymbols,
        rehearsalMarks,
        chordSymbolsRequired: true,
        rehearsalMarksRequired: true,
        pitchByInstrument: extractPitchByInstrument(score),
      });
  if (!integrityResult.passed) errors.push(...integrityResult.errors);

  const behaviourResult =
    options?.debugFixtureMode === 'indie_dual_guitar_tuning_proof'
      ? { allValid: true, rhythmValid: true, errors: [], duoIdentityWarnings: [] as string[] }
      : runBehaviourGates(
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
  const dualGuitarRoute = isIndieArtPopDualGuitarRoute(appliedContext);
  if (dualGuitarRoute) {
    const filtered = behaviourResult.errors.filter((e) => !/bass|jazz duo/i.test(e));
    errors.push(...filtered);
  } else {
    errors.push(...behaviourResult.errors);
  }
  const behaviourGatesPassedResolved =
    dualGuitarRoute ? behaviourResult.errors.filter((e) => !/bass|jazz duo/i.test(e)).length === 0 : behaviourResult.allValid;
  logEcmPhaseProbe(probeEcm, 'after_post', score, {
    errors: errors.length,
    phraseWarnings: songModePhraseWarnings.length,
  });
  if (appliedContext.generationMetadata?.songModeHookFirstIdentity) {
    songModePhraseWarnings.push(...behaviourResult.duoIdentityWarnings);
  }
  if (dualGuitarRoute) {
    const g1 = score.parts.find((p) => p.id === 'guitar');
    const g2 = score.parts.find((p) => p.id === 'guitar_2');
    if (!g1 || !g2) {
      errors.push('Indie Art Pop dual-guitar route must contain guitar and guitar_2 parts.');
    } else if (!hasAnySimultaneousPolyphony(g1) && !hasAnySimultaneousPolyphony(g2)) {
      errors.push('Indie Art Pop dual-guitar route produced strictly monophonic output in both guitar parts.');
    }
  }

  const preserveLiterals =
    appliedContext.generationMetadata.customHarmonyLocked === true ||
    !!(appliedContext.lockedHarmonyBarsRaw && appliedContext.lockedHarmonyBarsRaw.length > 0);
  const guitarMeasureCount = score.parts[0]?.measures.length ?? 0;
  const lockedForExport = appliedContext.lockedHarmonyBarsRaw;
  const mdEx = appliedContext.generationMetadata;
  const tbEx = appliedContext.form.totalBars;
  const bwEx = mdEx?.brianWilsonEffectiveHarmonyBars;
  const swEx = mdEx?.stevieWonderEffectiveHarmonyBars;
  const rhEx = mdEx?.radioheadEffectiveHarmonyBars;
  const barsForLockedExportTruth =
    mdEx?.songwriterStyleId === 'brian_wilson' && Array.isArray(bwEx) && bwEx.length === tbEx
      ? bwEx
      : mdEx?.songwriterStyleId === 'stevie_wonder' && Array.isArray(swEx) && swEx.length === tbEx
        ? swEx
        : mdEx?.songwriterStyleId === 'radiohead' && Array.isArray(rhEx) && rhEx.length === tbEx
          ? rhEx
          : lockedForExport;
  const assertLockedExport =
    barsForLockedExportTruth &&
    barsForLockedExportTruth.length === guitarMeasureCount &&
    guitarMeasureCount > 0 &&
    appliedContext.generationMetadata?.harmonySource === 'custom' &&
    appliedContext.generationMetadata?.builtInHarmonyFallbackOccurred !== true
      ? [...barsForLockedExportTruth]
      : undefined;
  logEcmPhaseProbe(probeEcm, 'before_export', score, {
    guitarMeasures: guitarMeasureCount,
  });
  let exportResult: ReturnType<typeof exportScoreModelToMusicXml>;
  try {
    exportResult = exportScoreModelToMusicXml(score, {
      preserveChordKindLiterals: preserveLiterals,
      assertLockedHarmonyBars: assertLockedExport,
    });
  } finally {
    logEcmPhaseProbe(probeEcm, 'after_export', score);
  }
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
    if (isIndieTuningFixture) {
      exportIntegrityPassed = true;
    } else {
      const exportIntegrity = validateExportIntegrity(xml);
      exportIntegrityPassed = exportIntegrity.valid;
      if (!exportIntegrity.valid) errors.push(...exportIntegrity.errors);
    }

    const mxBar = validateExportedMusicXmlBarMath(xml);
    const writtenComplete = validateWrittenMusicXmlComplete(score, xml);
    exportRoundTripPassed = mxBar.valid && writtenComplete.valid;
    if (!mxBar.valid) errors.push(...mxBar.errors);
    if (!writtenComplete.valid) errors.push(...writtenComplete.errors);

    if (dualGuitarRoute) {
      const dualGuitarMeta = validateIndieArtPopDualGuitarIdentityInMusicXml(xml);
      instrumentMetadataPassed = dualGuitarMeta.valid;
      if (!dualGuitarMeta.valid) errors.push(...dualGuitarMeta.errors);
    } else {
      const bassMeta = validateGuitarBassDuoBassIdentityInMusicXml(xml);
      instrumentMetadataPassed = bassMeta.valid;
      if (!bassMeta.valid) errors.push(...bassMeta.errors);
    }

    const lockedBars = appliedContext.lockedHarmonyBarsRaw;
    const mdLt = appliedContext.generationMetadata;
    const tbLt = appliedContext.form.totalBars;
    const bwLt = mdLt?.brianWilsonEffectiveHarmonyBars;
    const swLt = mdLt?.stevieWonderEffectiveHarmonyBars;
    const rhLt = mdLt?.radioheadEffectiveHarmonyBars;
    const expectedBarsForLockedTruth =
      mdLt?.songwriterStyleId === 'brian_wilson' && Array.isArray(bwLt) && bwLt.length === tbLt
        ? bwLt
        : mdLt?.songwriterStyleId === 'stevie_wonder' && Array.isArray(swLt) && swLt.length === tbLt
          ? swLt
          : mdLt?.songwriterStyleId === 'radiohead' && Array.isArray(rhLt) && rhLt.length === tbLt
            ? rhLt
            : lockedBars;
    if (!isIndieTuningFixture && expectedBarsForLockedTruth && expectedBarsForLockedTruth.length === appliedContext.form.totalBars) {
      const lockedTruth = validateLockedHarmonyMusicXmlTruth(xml, expectedBarsForLockedTruth);
      appliedContext.generationMetadata.customHarmonyMusicXmlTruthPassed = lockedTruth.ok;
      if (!lockedTruth.ok) errors.push(...lockedTruth.errors);
    }
  } else {
    errors.push(...exportResult.errors);
  }

  const truthReport = isIndieTuningFixture
    ? {
        submittedChordString: null,
        parsedBars: null,
        scoreBars: null,
        writtenXmlBars: null,
        inputStage: 'skip' as const,
        scoreStage: 'skip' as const,
        exportStage: 'skip' as const,
        errors: [] as string[],
      }
    : runPipelineTruthGates({
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
      behaviourGatesPassedResolved &&
      strictBarMath.valid &&
      instrumentMetadataPassed &&
      pipelineTruthAllPassed(truthReport),
    exportValid: exportResult.success,
    mxValid: mxValidationPassed && exportRoundTripPassed,
    rhythmicCorrect: behaviourResult.rhythmValid,
    registerCorrect: integrityResult.passed,
    sibeliusSafe,
    chordRehearsalComplete:
      isIndieTuningFixture ||
      (chordSymbols.length >=
        (context.presetId === 'ecm_chamber' || isGuitarBassDuoFamily(context.presetId)
          ? context.form.totalBars
          : 8) &&
        rehearsalMarks.length >= 2),
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
      behaviourGatesPassedResolved &&
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
    voice2PolyphonyDiagnostics: appliedContext.generationMetadata.voice2PolyphonyDiagnostics,
    wybleConsumptionReceipt: score.wybleConsumptionReceipt ?? appliedContext.generationMetadata.wybleConsumptionReceipt,
    songModeStyleSurfaceNotes: appliedContext.generationMetadata.songModeStyleSurfaceNotes,
    songModeDonaldFagenC1Receipt: appliedContext.generationMetadata.songModeDonaldFagenC1Receipt,
    songModeSectionShapingDiagnostics: appliedContext.generationMetadata.songModeSectionShapingDiagnostics,
    songModeSectionBehaviourDescriptors: appliedContext.generationMetadata.songModeSectionBehaviourDescriptors,
    songModeProfileRuleDiagnostics: {
      ...(appliedContext.generationMetadata.songModeProfileRuleDiagnostics ?? {}),
      bacharachSongModeRuleBundleId: appliedContext.generationMetadata.bacharachSongModeRuleBundleId,
      behaviourSourceIds:
        appliedContext.generationMetadata.songModeSectionBehaviourDescriptors?.map((d) => d.sliceId) ?? [],
    },
    songModeLeadSheetInputApplied: appliedContext.generationMetadata.songModeLeadSheetInputApplied,
    songModeLeadSheetAnchorStartApplied: appliedContext.generationMetadata.songModeLeadSheetAnchorStartApplied,
    songModeLeadSheetExpressionStrength: appliedContext.generationMetadata.songModeLeadSheetExpressionStrength,
    importHarmonyMode: appliedContext.generationMetadata.importHarmonyMode,
    importHarmonyModeSource: appliedContext.generationMetadata.importHarmonyModeSource,
    harmonyBlendRaw: appliedContext.generationMetadata.harmonyBlendRaw,
    importHarmonyPolicyVersion: appliedContext.generationMetadata.importHarmonyPolicyVersion,
    importHarmonyLockApplied: appliedContext.generationMetadata.importHarmonyLockApplied,
    importHarmonyLockFallbackReason: appliedContext.generationMetadata.importHarmonyLockFallbackReason,
    importHarmonyLockedBarsCount: appliedContext.generationMetadata.importHarmonyLockedBarsCount,
    motifAuthorityLevel: appliedContext.generationMetadata.motifAuthorityLevel,
    motifDevelopmentSummary: appliedContext.generationMetadata.motifDevelopmentSummary,
  });

  const success =
    modelValidation.valid &&
    strictBarMath.valid &&
    integrityResult.passed &&
    behaviourGatesPassedResolved &&
    exportResult.success &&
    mxValidationPassed &&
    exportIntegrityPassed &&
    exportRoundTripPassed &&
    instrumentMetadataPassed &&
    pipelineTruthAllPassed(truthReport) &&
    errors.length === 0;
  logEcmPhaseProbe(probeEcm, 'before_return', score, {
    success,
    errors: errors.length,
    warnings: songModePhraseWarnings.length,
    xmlBytes: xml?.length ?? 0,
  });

  return {
    success,
    score,
    /** Must be `appliedContext`: style modules shallow-clone context; score build mutates that object (e.g. songModeCoreMotifs). */
    context: appliedContext,
    plans,
    xml,
    integrityPassed: integrityResult.passed,
    behaviourGatesPassed: behaviourGatesPassedResolved,
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
