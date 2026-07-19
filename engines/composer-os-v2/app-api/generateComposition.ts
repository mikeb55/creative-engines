/**
 * Composer OS V2 — App API: generate composition
 */

import type {
  GenerateRequest,
  GenerateResultEchoManifest,
  ImportEcho,
  ImportHarmonyMode,
  MixedPresetEcho,
  SectionRegenerationParams,
  StyleProfile,
  StyleTransferEcho,
  VariationEcho,
} from './appApiTypes';
import {
  buildGenerateResultEchoes,
  buildGenerateResultEchoManifest,
  v80GoldenPathOptionsFromGenerateRequest,
} from './buildGenerateResultEchoes';
import { runDuoSectionRegeneration } from '../core/regeneration/runDuoSectionRegeneration';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { buildLabeledMusicXmlFilename, manifestPathForMusicXml } from './composerOsOutputPaths';
import { writeOutputManifest } from './writeOutputManifest';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { isClaveGridOverlayEnvEnabled } from '../core/rhythm/claveGridOverlay';
import { validateLockedHarmonyMusicXmlTruthFromFile } from '../core/export/validateLockedHarmonyMusicXml';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { experimentalLabelForLevel } from '../core/creative-controls/experimentalEvaluator';
import { buildUniversalLeadSheetFromCompositionContext } from '../core/lead-sheet/universalLeadSheetBuilder';
import { extractLeadSheetMelodyAnchorsFromMusicXml } from '../core/song-mode/songModeLeadSheetAdapter';
import type { UniversalLeadSheet } from '../core/lead-sheet/universalLeadSheetTypes';
import { mapAppStyleStackToEngine } from './mapStyleStack';
import * as fs from 'fs';
import * as path from 'path';
import { buildChordExportDiagnosticsReceipt } from '../../core/chordExportDiagnostics';
import type { ChordExportDiagnosticsReceipt } from '../../core/chordExportDiagnostics';
import type { GuitarVoice2PolyphonyDiagnostics } from '../core/goldenPath/guitarVoice2PolyphonyDiagnostics';
import type { WybleConsumptionReceipt } from '../core/wyble/wybleConsumptionReceipt';
import { parseBarStringsToCanonicalChords } from '../core/harmony/chordPipeline';
import { isGuitarBassDuoFamily } from '../core/presets/guitarBassDuoPresetIds';
import type { FormId } from '../core/form/formPlanner';
import type { GenerationMetadata } from '../core/compositionContext';
import { IMPORT_HARMONY_POLICY_VERSION } from '../core/importHarmonyPolicy';
import {
  exportDrumGuideBundle,
  shouldExportDrumGuide,
  shouldExportScoreMidi,
} from '../core/export/drumGuideExport';
import { writeScoreMidi } from '../core/export/midiScoreWriter';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildFormSections } from '../core/composer/formController';
import { buildImprovSkeleton, pass2ImprovMutation } from '../core/composer/improvAgent';
import { appendImprovPartToPartwiseXml } from '../core/composer/improvMusicXmlAppend';
import {
  appendMingusCollectiveImprovPart,
  applyMingusGospelShoutInPlace,
  mergeShoutChorusIntoExistingParts,
} from '../core/composer/bigBandShoutMusicXml';
import { buildShoutChorusSection, shoutChorusPlan } from '../core/composer/bigBandSectionWriter';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';
import { applySqContrapuntalPass4MergeOnScore } from '../core/counterpoint/contrapuntalPass4MusicXmlMerge';
import { buildStringQuartetScoreFromContext } from '../core/composer/stringEnsemble';
import { buildVoicingsForContext } from '../core/composer/guitarVoicingEngine';
import type { GuitarVoicing } from '../core/composer/guitarVoicingEngine';
import { importMusicXmlToImportedSong } from '../core/musicXmlDeepImport';
import type { MusicContext } from '../core/music-context/musicContextTypes';
import { buildDuoMusicContextFromScore } from '../core/duo/duoLock';

function isImportExpressionPilotPreset(presetId: string): boolean {
  return isGuitarBassDuoFamily(presetId) || presetId === 'ecm_chamber';
}

function normalizeImportHarmonyMode(input: unknown): ImportHarmonyMode {
  return input === 'lock_harmony' || input === 'blend_harmony' || input === 'free_harmony' ? input : 'free_harmony';
}

function normalizeHarmonyBlendRaw(input: unknown): number | undefined {
  if (typeof input !== 'number' || !Number.isFinite(input)) return undefined;
  return Math.min(1, Math.max(0, input));
}

export interface GenerateResult {
  success: boolean;
  /** Short user-facing failure reason (API / UI). */
  error?: string;
  /** What the Generate action produced (default musicxml when omitted). */
  productKind?: 'musicxml' | 'planning' | 'song_structure';
  /** User-facing note for planning / structural runs (no MusicXML). */
  planningNotice?: string;
  /** Composer OS product version echoed for manifests and UI. */
  composerOsVersion?: string;
  xml?: string;
  /** Riff Generator: bar snapshots for lock/regen/mutate UI. */
  riffCarryForward?: import('../core/riff-generator/riffCarryForward').RiffCarryForward;
  /** Riff Generator: musicality gate result (failedRules for UI labels). */
  riffMusicality?: import('../core/riff-generator/riffMusicalityGate').RiffMusicalityResult;
  /**
   * Riff Generator Phase A honesty — pattern authority is `riffVrbId`; HV is ignored for pattern.
   * Always true on `riff_generator` results.
   */
  harmonicVoiceIgnoredOnRiffPreset?: boolean;
  /**
   * Riff Generator Phase B Iter 1 — read-only HV chord-colour id when gated on.
   * Omitted when `riffUseHvForPattern` is off. Not applied to chords yet.
   */
  riffHvChordColourReadOnly?: string;
  /** V90a — Shared Brain snapshot from riff_generator (handoff to Wyble / Martino). */
  musicContext?: MusicContext;
  /**
   * Riff Generator Phase 1 chord-loop trust — typed→used mismatches after normalizeChordLoop.
   * Present when substitutions and/or unsupported (null→Am7) tokens occurred.
   */
  chordLoopDisclosure?: import('../core/riff-generator/riffChordLoop').RiffChordLoopDisclosure;
  filename?: string;
  filepath?: string;
  /** Full-score `.mid` path when written next to the MusicXML export. */
  midiFilepath?: string;
  /** SD3 drum guide `.mid` when written next to the MusicXML export. */
  drumGuideFilepath?: string;
  /** Band mode Stage 1 — G/B + drum-guide bundle was requested. */
  bandModeEnabled?: boolean;
  /** Drum guide sidecar source when band mode or SD3 guide exported. */
  drumGuideSource?: 'gb_onset_proxy' | 'art_rock_mosaic_grid';
  /**
   * Big Band: primary `filepath` may point at planning JSON; when ensemble MusicXML was written,
   * this is the `.musicxml` path for preview/playback (same folder).
   */
  ensembleMusicXmlFilepath?: string;
  /** SQ→BB workflow payload (sketch / translate steps). */
  sqToBbWorkflow?: import('../core/counterpoint/sqToBbWorkflowTypes').SqToBbWorkflowPayload;
  /** Path to run manifest JSON alongside MusicXML, when written */
  manifestPath?: string;
  /** Guitar–Bass Duo: harmony source when engine ran */
  harmonySource?: 'builtin' | 'custom';
  /** Short progression summary when custom harmony was used */
  customChordProgressionSummary?: string;
  progressionMode?: 'builtin' | 'custom';
  chordProgressionInputRaw?: string;
  parsedCustomProgressionBars?: string[];
  chordProgressionParseFailed?: boolean;
  builtInHarmonyFallbackOccurred?: boolean;
  /** True when written MusicXML harmony matched locked pasted bars (duo custom). */
  customHarmonyMusicXmlTruthPassed?: boolean;
  /** V3.6b — Receipt: echoes generationMetadata.harmonySourceUsed when duo. */
  harmonySourceUsed?: 'builtin' | 'custom';
  styleGrammarLabel?: string;
  styleStackPrimaryModuleId?: string;
  styleStackPrimaryDisplayName?: string;
  userSelectedStyleDisplayNames?: string[];
  userExplicitPrimaryStyle?: boolean;
  /** Guitar–Bass Duo family: receipt mode line when distinct from default duo. */
  duoModeReceiptLabel?: string;
  motifAuthorityLevel?: GenerationMetadata['motifAuthorityLevel'];
  motifDevelopmentSummary?: GenerationMetadata['motifDevelopmentSummary'];
  validation: {
    integrityPassed: boolean;
    behaviourGatesPassed: boolean;
    mxValidationPassed: boolean;
    strictBarMathPassed: boolean;
    exportRoundTripPassed: boolean;
    exportIntegrityPassed: boolean;
    instrumentMetadataPassed: boolean;
    sibeliusSafe: boolean;
    readiness: { shareable: boolean; release: number; mx: number };
    errors: string[];
    warnings?: string[];
    totalBars?: number;
  };
  runManifest?: {
    seed: number;
    presetId: string;
    activeModules: string[];
    timestamp: string;
    scoreTitle?: string;
    ecmMode?: string;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    experimentalCreativeLabel?: string;
    keySignatureInferredTonic?: string;
    keySignatureConfidence?: number;
    keySignatureOverrideUsed?: boolean;
    keySignatureNoneMode?: boolean;
    keySignatureHide?: boolean;
    keySignatureFifths?: number;
    keySignatureExportMode?: 'major' | 'minor';
    keySignatureInferredKey?: string;
    keySignatureInferredMode?: 'major' | 'minor' | 'ambiguous';
    keySignatureInferredFifths?: number;
    keySignatureModeApplied?: 'auto' | 'override' | 'none';
    keySignatureExportKeyWritten?: boolean;
    harmonySourceUsed?: 'builtin' | 'custom';
    styleGrammarLabel?: string;
    styleStackPrimaryModuleId?: string;
    styleStackPrimaryDisplayName?: string;
    userSelectedStyleDisplayNames?: string[];
    userExplicitPrimaryStyle?: boolean;
    duoModeReceiptLabel?: string;
    motifAuthorityLevel?: GenerationMetadata['motifAuthorityLevel'];
    wybleConsumptionReceipt?: WybleConsumptionReceipt;
    songModeStyleSurfaceNotes?: string[];
    songModeDonaldFagenC1Receipt?: string;
    grooveScaffoldReceipt?: GenerationMetadata['grooveScaffoldReceipt'];
    grooveScaffoldReceipts?: GenerationMetadata['grooveScaffoldReceipts'];
    grooveScaffoldDiagnostics?: GenerationMetadata['grooveScaffoldDiagnostics'];
    songModeSectionShapingDiagnostics?: GenerationMetadata['songModeSectionShapingDiagnostics'];
    songModeSectionBehaviourDescriptors?: GenerationMetadata['songModeSectionBehaviourDescriptors'];
    songModeProfileRuleDiagnostics?: GenerationMetadata['songModeProfileRuleDiagnostics'];
    songModeLeadSheetInputApplied?: GenerationMetadata['songModeLeadSheetInputApplied'];
    songModeLeadSheetAnchorStartApplied?: GenerationMetadata['songModeLeadSheetAnchorStartApplied'];
    songModeLeadSheetExpressionStrength?: GenerationMetadata['songModeLeadSheetExpressionStrength'];
    importHarmonyMode?: GenerationMetadata['importHarmonyMode'];
    importHarmonyModeSource?: GenerationMetadata['importHarmonyModeSource'] | 'not_supplied';
    harmonyBlendRaw?: GenerationMetadata['harmonyBlendRaw'];
    importHarmonyPolicyVersion?: GenerationMetadata['importHarmonyPolicyVersion'];
    importHarmonyLockApplied?: GenerationMetadata['importHarmonyLockApplied'];
    importHarmonyLockFallbackReason?: GenerationMetadata['importHarmonyLockFallbackReason'];
    importHarmonyLockedBarsCount?: GenerationMetadata['importHarmonyLockedBarsCount'];
    /**
     * Riff Generator Phase A — HV ignored for riff pattern (`riffVrbId` is sole authority).
     */
    harmonicVoiceIgnoredOnRiffPreset?: boolean;
    /** Phase B Iter 1 — read-only HV chord-colour echo when toggle was on. */
    riffHvChordColourReadOnly?: string;
    /** Big Band / String Quartet — `blend_harmony` with 0–1 blend strength (merge gate echo). */
    importHarmonyBlendActive?: boolean;
    /** Present when `importHarmonyBlendActive`; raw blend weight sent by client. */
    importHarmonyBlendEffective?: number;
    motifDevelopmentSummary?: GenerationMetadata['motifDevelopmentSummary'];
    duoVaultMotifSurvivalTelemetry?: import('../core/run-ledger/runLedgerTypes').DuoVaultMotifSurvivalTelemetryEcho;
    /** Ensemble reference-import hints (Big Band / String Quartet optional MusicXML). */
    referenceSourceKind?: string;
    referenceBehaviourSummary?: string;
    referenceInfluenceMode?: string;
    referenceInfluenceStrength?: string;
    referenceBehaviourHints?: string[];
    /** Section-scoped regen receipt (ensemble / golden path partial score merge). */
    sectionRegenerationReceipt?: string;
    sectionRegenerationPartialScore?: boolean;
    /** Big Band / String Quartet — Z10/Z11 Slonimsky cell receipts from realisation. */
    slonimskyEnsembleCellReceipts?: string[];
    /** Import-harmony lead-sheet telemetry (Song Mode / duo). */
    importHarmonyShouldParseLeadSheetInput?: boolean;
    importHarmonyLeadSheetPipelineStage?: string;
    importHarmonyLeadSheetAdaptDetail?: string;
    importHarmonyChordEventCount?: number;
    importHarmonyTimelineEventCount?: number;
    /** Martino linear engine receipts. */
    martinoStderrExcerpt?: string;
    martinoVersionUsed?: string;
    martinoActivityMap?: string;
    martinoLfvFlags?: Array<{ index: number; out_of_range: boolean }>;
    martinoWarnings?: string[];
    martinoReadinessScore?: number;
    martinoProvenance?: Record<string, unknown>;
    /** V80 — compact import / variation / style-transfer / mixed-preset audit echo. */
    v80Echo?: GenerateResultEchoManifest;
  };
  /** Resolved title used for the score (user or default). */
  scoreTitle?: string;
  /** Unified lead-sheet-ready view (Duo / ECM) when generation succeeded. */
  universalLeadSheet?: UniversalLeadSheet;
  /** Echo of optional client fields for UI receipts (non-musical metadata). */
  requestEcho?: {
    tonalCenter?: string;
    bpm?: number;
    totalBars?: number;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    stylePairing?: { songwriterStyle: string; arrangerStyle: string; era?: string };
    ensembleConfigId?: string;
    primarySongwriterStyle?: string;
    /** Echo for desktop parity — same fields `apiGenerate` forwards to `runAppGeneration`. */
    harmonyMode?: 'builtin' | 'custom' | 'custom_locked';
    longFormEnabled?: boolean;
    styleProfile?: StyleProfile;
    c4Strength?: 'light' | 'medium' | 'strong';
    /** Song Mode: duo intent echo when client sends it. */
    duoIntent?: 'conversational' | 'supportive';
    /** Song Mode V65 P5b: groove scaffold UI echo. */
    grooveScaffold?: GenerateRequest['grooveScaffold'];
    /** Echo when client sends Slonimsky Chromatic Strength (Song Mode / ensemble). */
    chromaticStrength?: 'off' | 'subtle' | 'prominent';
    importHarmonyMode?: ImportHarmonyMode;
    harmonyBlend?: number;
    debugFixtureMode?: 'indie_dual_guitar_tuning_proof';
    /** V44 Style Panel — harmonic + rhythm context key bundle */
    styleGenerationContextKeys?: string[];
    /** Echo when client sends SQ multi-arranger blend VRB (`blend:*` voice id). */
    sqArrangerBlendVoiceId?: string;
    /** Bar-range regen (duo/ECM) — echo without full base XML payload. */
    sectionRegeneration?: Pick<SectionRegenerationParams, 'startBar' | 'endBar'>;
  };
  /** Big Band planning: resolved pairing metadata when `stylePairing` was sent. */
  stylePairingReceipt?: {
    summary: string;
    confidenceScore: number;
    experimentalFlag: boolean;
    songwriterStyle: string;
    arrangerStyle: string;
    era: string | null;
  };
  /** #17 — Per-bar chord export transparency (custom / Wyble harmony paths). */
  chordExportDiagnostics?: ChordExportDiagnosticsReceipt;
  /** Phase 18.2B.1 — Voice-2 polyphony diagnostic (guitar_bass_duo; engine snapshot, read-only). */
  voice2PolyphonyDiagnostics?: GuitarVoice2PolyphonyDiagnostics;
  /** Song Mode — optional vocal lead sheet MusicXML path (Python `songwriting_bridge`). */
  vocalLeadSheetFilepath?: string;
  /** Song Mode — GCE weighted overall (see `core/gce/gceGate.ts`). */
  gceScore?: number;
  /** Song Mode — true when `gceScore` meets the ship gate threshold (≥ 8.0). */
  gceGatePassed?: boolean;
  /** Big Band / String Quartet — Slonimsky Chromatic Strength receipt lines (when set on request). */
  ensembleSlonimskyReceipt?: string[];
  /** Big Band / String Quartet — Z10/Z11 per-bar cell receipts (`z10:bb` / `z11:sq`). */
  slonimskyEnsembleCellReceipts?: string[];
  /** Phase 6+7 — `instrumentGroup === 'guitar'`: voicings for UI fretboard + TAB export. */
  guitarVoicings?: GuitarVoicing[];
  /** Martino linear engine LFV flags echoed at result root. */
  lfvFlags?: Array<{ index: number; out_of_range: boolean }>;
  /** V80k — import IR display strip (absent when no import timeline). */
  importEcho?: ImportEcho;
  /** V80l — variation candidate scores (no score fragments). */
  variationEcho?: VariationEcho;
  /** V80m — style-transfer receipt. */
  styleTransferEcho?: StyleTransferEcho;
  /** V80h — mixed-preset assembly summary. */
  mixedPresetEcho?: MixedPresetEcho;
}

export function generateComposition(req: GenerateRequest, outputDir: string): GenerateResult {
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const duo = isGuitarBassDuoFamily(req.presetId);
  const deepImportXml =
    typeof req.musicXmlSource === 'string' && req.musicXmlSource.trim()
      ? req.musicXmlSource.trim()
      : typeof req.songModeLeadSheetMusicXml === 'string' && req.songModeLeadSheetMusicXml.trim()
        ? req.songModeLeadSheetMusicXml.trim()
        : undefined;
  const importedSongResult =
    !req.song && deepImportXml
      ? importMusicXmlToImportedSong(deepImportXml, {
          id: `musicxml_import_${effectiveSeed}`,
          title: req.title ?? 'Imported MusicXML',
          targetTotalBars: req.totalBars,
        })
      : undefined;
  const importedSongHasExplicitSections =
    importedSongResult?.deepImport.sectionStarts.some((s) => s.bar !== 1 || s.label !== 'A') ?? false;
  const effectiveSong =
    req.song ?? (req.importHarmonyMode !== 'free_harmony' && importedSongHasExplicitSections ? importedSongResult?.song : undefined);
  const chordText =
    duo && typeof req.chordProgressionText === 'string' && req.chordProgressionText.trim()
      ? req.chordProgressionText
      : duo && importedSongResult?.lockedHarmonyBars.length && req.importHarmonyMode !== 'free_harmony'
        ? importedSongResult.lockedHarmonyBars.join('|')
        : undefined;
  const importLeadSheetXml =
    typeof req.songModeLeadSheetMusicXml === 'string' ? req.songModeLeadSheetMusicXml.trim() : '';
  const importExpressionEnabled = isImportExpressionPilotPreset(req.presetId) && importLeadSheetXml.length > 0;
  const totalBars = req.totalBars ?? importedSongResult?.song.totalBars ?? (req.presetId === 'ecm_chamber' ? 32 : 8);
  const adaptedImport =
    importExpressionEnabled
      ? extractLeadSheetMelodyAnchorsFromMusicXml(importLeadSheetXml, totalBars, {
          leadSheetPerformanceBlend: req.leadSheetPerformanceBlend,
        })
      : undefined;
  const importedAnchors = adaptedImport?.ok ? adaptedImport.melodyAnchors : undefined;
  const modeExplicitlyProvided = req.importHarmonyMode !== undefined;
  const normalizedImportHarmonyMode = normalizeImportHarmonyMode(req.importHarmonyMode);
  const importHarmonyModeSource: 'defaulted' | 'explicit' = modeExplicitlyProvided ? 'explicit' : 'defaulted';
  const harmonyBlendRaw = normalizeHarmonyBlendRaw(req.harmonyBlend);
  const sectionRegen =
    duo && req.sectionRegeneration
      ? runDuoSectionRegeneration(req, effectiveSeed, totalBars)
      : null;
  if (sectionRegen && !sectionRegen.ok) {
    const err = sectionRegen.error;
    return {
      success: false,
      error: err,
      composerOsVersion: COMPOSER_OS_VERSION,
      productKind: 'musicxml',
      validation: {
        integrityPassed: false,
        behaviourGatesPassed: false,
        mxValidationPassed: false,
        strictBarMathPassed: false,
        exportRoundTripPassed: false,
        exportIntegrityPassed: false,
        instrumentMetadataPassed: false,
        sibeliusSafe: false,
        readiness: { shareable: false, release: 0, mx: 0 },
        errors: [err],
      },
      runManifest: {
        seed: req.seed,
        presetId: req.presetId,
        activeModules: [],
        timestamp: new Date().toISOString(),
      },
    };
  }
  const result =
    sectionRegen && sectionRegen.ok
      ? sectionRegen.result
      : runGoldenPath(effectiveSeed, {
          styleStack: mapAppStyleStackToEngine(req.styleStack),
          presetId: req.presetId,
          scoreTitle: req.title,
          harmonyMode: duo ? req.harmonyMode ?? (importedSongResult ? 'custom_locked' : undefined) : undefined,
          chordProgressionText: chordText,
          ecmMode: req.presetId === 'ecm_chamber' ? req.ecmMode ?? 'ECM_METHENY_QUARTET' : undefined,
          totalBars,
          longFormEnabled: req.longFormEnabled,
          ...(req.mosaicSectionPlan
            ? { mosaicSectionPlan: req.mosaicSectionPlan }
            : {}),
          keySignatureMode: req.keySignatureMode,
          tonalCenterOverride: req.tonalCenterOverride,
          tonalCenter: req.tonalCenter,
          variationEnabled: req.variationEnabled === true ? true : undefined,
          creativeControlLevel: req.creativeControlLevel,
          intent: req.intent,
          c4Strength: req.c4Strength,
          songModeJamesBrownFunkOverlay: req.songModeJamesBrownFunkOverlay === true ? true : undefined,
          blendStrength: req.blendStrength ?? 'medium',
          ...(req.chromaticStrength === 'off' ||
          req.chromaticStrength === 'subtle' ||
          req.chromaticStrength === 'prominent'
            ? { chromaticStrength: req.chromaticStrength }
            : {}),
          ...(req.presetId === 'guitar_bass_duo'
            ? { duoVaultMotifEnabled: req.duoVaultMotifEnabled !== false }
            : {}),
          ...(typeof req.harmonicVoice === 'string' && req.harmonicVoice.trim() !== ''
            ? { harmonicVoice: req.harmonicVoice.trim() }
            : {}),
          songModeLeadSheetMelodyAnchors: importedAnchors,
          leadSheetPerformanceBlend: req.leadSheetPerformanceBlend,
          importHarmonyMode: normalizedImportHarmonyMode,
          harmonyBlend: harmonyBlendRaw,
          ...(req.formId ? { formId: req.formId as FormId } : {}),
          ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
          ...(effectiveSong ? { song: effectiveSong } : {}),
          zappaSoloMidiLow: req.zappaSoloMidiLow,
          zappaSoloMidiHigh: req.zappaSoloMidiHigh,
          zappaSoloDensity: req.zappaSoloDensity,
          zappaSoloDissonance: req.zappaSoloDissonance,
          ...(req.zappaStyleMode === 'compositional' || req.zappaStyleMode === 'bluesrockFerocious'
            ? { zappaStyleMode: req.zappaStyleMode }
            : {}),
          ...(typeof req.primarySongwriterStyle === 'string' &&
          req.primarySongwriterStyle.trim().toLowerCase() === 'frank_zappa'
            ? {
                primarySongwriterStyle: req.primarySongwriterStyle.trim(),
                songModeHookFirstIdentity: true,
                styleProfile: req.styleProfile ?? 'STYLE_ECM',
                ...(typeof req.secondarySongwriterStyle === 'string' &&
                req.secondarySongwriterStyle.trim() !== ''
                  ? { secondarySongwriterStyle: req.secondarySongwriterStyle.trim() }
                  : {}),
              }
            : {}),
          ...(typeof req.stochasticVariance === 'number' ? { stochasticVariance: req.stochasticVariance } : {}),
          ...(typeof req.stochasticRenderOrdinal === 'number'
            ? { stochasticRenderOrdinal: req.stochasticRenderOrdinal }
            : {}),
          ...(isClaveGridOverlayEnvEnabled() && req.claveGridOverlay ? { claveGridOverlay: req.claveGridOverlay } : {}),
          ...v80GoldenPathOptionsFromGenerateRequest(req),
          ...(req.bandModeEnabled === true ? { bandModeEnabled: true as const } : {}),
        });
  result.context.generationMetadata = {
    ...result.context.generationMetadata,
    importHarmonyMode: normalizedImportHarmonyMode,
    importHarmonyModeSource: importHarmonyModeSource,
    harmonyBlendRaw: harmonyBlendRaw,
    ...(req.instrumentGroup ? { uiInstrumentGroup: req.instrumentGroup } : {}),
    ...(req.guitarOutputMode ? { guitarOutputMode: req.guitarOutputMode } : {}),
    ...(req.etudeInstrument ? { etudeInstrument: req.etudeInstrument } : {}),
    ...(req.etudeTechnicalFocus ? { etudeTechnicalFocus: req.etudeTechnicalFocus } : {}),
    ...(req.improvMode ? { improvModeEcho: true } : {}),
    ...(req.improvVoiceId ? { improvVoiceIdEcho: req.improvVoiceId } : {}),
    ...(typeof req.stochasticVariance === 'number' ? { stochasticVarianceEcho: req.stochasticVariance } : {}),
  };
  // Stage 4: free_harmony is documented default; policy version set in GenerationMetadata (no routing change).
  result.context.generationMetadata.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  if (result.runManifest) {
    result.runManifest.importHarmonyMode = normalizedImportHarmonyMode;
    result.runManifest.importHarmonyModeSource = importHarmonyModeSource;
    result.runManifest.harmonyBlendRaw = harmonyBlendRaw;
    result.runManifest.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  }

  const v80Echoes = buildGenerateResultEchoes({
    generationMetadata: result.context.generationMetadata,
    importTimeline: req.importTimeline,
    importHarmonyMode: normalizedImportHarmonyMode,
    exportIntegrityPassed: result.exportIntegrityPassed,
    variationMode: req.variationMode,
  });
  const v80EchoManifest = buildGenerateResultEchoManifest(v80Echoes);

  let chordExportDiagnostics: ChordExportDiagnosticsReceipt | undefined;
  const parsedBarsForDx = result.context?.generationMetadata.parsedCustomProgressionBars;
  if (parsedBarsForDx && parsedBarsForDx.length > 0 && isGuitarBassDuoFamily(req.presetId)) {
    try {
      chordExportDiagnostics = buildChordExportDiagnosticsReceipt(
        parsedBarsForDx,
        parseBarStringsToCanonicalChords(parsedBarsForDx)
      );
    } catch {
      chordExportDiagnostics = undefined;
    }
  }

  let diskHarmonyTruthErrors: string[] = [];
  let phase67MxErrors: string[] = [];
  let guitarVoicingsOut: GuitarVoicing[] | undefined;

  let filename: string | undefined;
  let filepath: string | undefined;
  let midiFilepath: string | undefined;
  let drumGuideFilepath: string | undefined;
  let drumGuideSource: 'gb_onset_proxy' | 'art_rock_mosaic_grid' | undefined;
  let outputXml: string | undefined = result.xml;
  let scoreForDrumGuide = result.score;

  if (result.xml) {
    const ts = new Date().toISOString();
    /** Full precision + seed avoids same-second overwrites (e.g. Try Another back-to-back). */
    const tsSafe = ts.replace(/[:.]/g, '-');
    filename = buildLabeledMusicXmlFilename(
      req.outputLabel,
      effectiveSeed,
      `composer_os_${req.presetId}_${tsSafe}_${effectiveSeed}.musicxml`,
    );
    fs.mkdirSync(outputDir, { recursive: true });
    filepath = path.join(outputDir, filename);
    let xmlOut = result.xml;
    const barMeterForExport = result.context.barMeterMap ?? result.context.generationMetadata?.barMeterMap;

    if (req.instrumentGroup === 'string_quartet') {
      const sqScore = buildStringQuartetScoreFromContext(result.context, result.score);
      const meta = result.context.generationMetadata;
      const vrbId =
        result.context.voiceBundle?.voiceId ??
        meta?.songwriterStyleId ??
        req.primarySongwriterStyle ??
        '';
      const bundle = result.context.voiceBundle ?? getVoiceRuleBundle(String(vrbId));
      if (meta) {
        applySqContrapuntalPass4MergeOnScore(sqScore, meta, bundle);
      }
      const ex = exportScoreModelToMusicXml(sqScore, { barMeterMap: barMeterForExport, bpm: req.bpm });
      if (ex.success && ex.xml) {
        xmlOut = ex.xml;
        scoreForDrumGuide = sqScore;
      } else {
        phase67MxErrors.push(...(ex.errors ?? []).map((e) => `phase67 string_quartet export: ${e}`));
      }
    }

    if (req.instrumentGroup === 'guitar') {
      guitarVoicingsOut = buildVoicingsForContext(result.context, effectiveSeed);
      const mode = req.guitarOutputMode ?? 'notation';
      if (mode === 'tab' || mode === 'both') {
        const ex = exportScoreModelToMusicXml(result.score, {
          barMeterMap: barMeterForExport,
          bpm: req.bpm,
          guitarInstrumentGroupVoicings: guitarVoicingsOut,
          guitarInstrumentGroupTabMode: mode,
        });
        if (ex.success && ex.xml) {
          xmlOut = ex.xml;
        } else {
          phase67MxErrors.push(...(ex.errors ?? []).map((e) => `phase67 guitar export: ${e}`));
        }
      }
    }

    if (req.improvMode) {
      const vid = req.improvVoiceId?.trim() || 'neutral';
      const bundle = getVoiceRuleBundle(vid);
      const formLike = {
        totalBars: result.context.form.totalBars,
        sections: result.context.form.sections,
      };
      const formSections = buildFormSections(formLike, bundle);
      const tb = Math.max(4, Math.min(result.context.form.totalBars, 32));
      const sk = buildImprovSkeleton(effectiveSeed, bundle, tb, formSections);
      const mut = pass2ImprovMutation(sk, bundle, effectiveSeed);
      xmlOut = appendImprovPartToPartwiseXml(xmlOut, {
        skeleton: sk,
        mutation: mut,
        bundle,
        totalBars: tb,
        seed: effectiveSeed,
      });
    }

    if (req.presetId === 'big_band') {
      const ctx = result.context;
      const vb = ctx.voiceBundle;
      const fs = ctx.formSections;
      const shoutSec = fs?.find((s) => s.role === 'shout-chorus');
      if (vb && shoutSec && xmlOut) {
        const binding = ctx.generationMetadata.rhythmMotifBinding;
        const plan = shoutChorusPlan(vb, binding, shoutSec, { sectionLeadBar: shoutSec.barRange[0] });
        try {
          const score = buildShoutChorusSection(ctx, plan);
          if (score) {
            xmlOut = mergeShoutChorusIntoExistingParts(xmlOut, score, vb);
          }
          if (vb.voiceId === 'charles_mingus') {
            if (plan.mingusGospelShoutInject && plan.shoutBarRange) {
              xmlOut = applyMingusGospelShoutInPlace(xmlOut, {
                shoutLo: plan.shoutBarRange[0],
                shoutHi: plan.shoutBarRange[1],
              }, vb);
              console.log(`[MingusOverlay] gospelShout injected at bar ${plan.shoutBarRange[0]}`);
            }
            if (plan.mingusCollectiveImprovOverlay) {
              xmlOut = appendMingusCollectiveImprovPart(xmlOut, ctx.form.totalBars);
              console.log('[MingusOverlay] collectiveImprov part appended');
            }
          }
        } catch (e) {
          phase67MxErrors.push(`bigBand shout export: ${(e as Error)?.message ?? e}`);
        }
      }
    }

    const mxWriteGate = validateMusicXml(xmlOut);
    if (!mxWriteGate.valid) {
      phase67MxErrors.push(...mxWriteGate.errors.map((e) => `musicXmlValidator: ${e}`));
    }

    fs.writeFileSync(filepath, xmlOut, 'utf-8');
    outputXml = xmlOut;
    const skipMidiDrumGuides = result.context.generationMetadata.sectionRegenerationPartialScore === true;
    if (shouldExportDrumGuide(req.skipDrumGuide, req.bandModeEnabled, skipMidiDrumGuides)) {
      try {
        const barMeterForDrums =
          result.context.barMeterMap ?? result.context.generationMetadata?.barMeterMap;
        const baseName = path.basename(filepath, path.extname(filepath));
        const mosaicPlan =
          req.mosaicSectionPlan ?? result.context.generationMetadata?.mosaicSectionPlan;
        const drumResult = exportDrumGuideBundle(scoreForDrumGuide, outputDir, baseName, {
          barMeterMap: barMeterForDrums,
          bpmOverride: req.bpm,
          bandModeEnabled: req.bandModeEnabled,
          mosaicSectionPlan: mosaicPlan,
          compositionContext: result.context,
        });
        if (drumResult) {
          drumGuideFilepath = drumResult.midPath;
          drumGuideSource = drumResult.drumGuideSource;
        }
      } catch (e) {
        console.warn('Drum guide export failed:', (e as Error)?.message ?? e);
      }
    }
    if (shouldExportScoreMidi(req.skipScoreMidiExport, skipMidiDrumGuides)) {
      try {
        const barMeterForScore =
          result.context.barMeterMap ?? result.context.generationMetadata?.barMeterMap;
        const baseName = path.basename(filepath, path.extname(filepath));
        midiFilepath = writeScoreMidi(scoreForDrumGuide, outputDir, baseName, barMeterForScore, req.bpm);
      } catch (e) {
        console.warn('Score MIDI export failed:', (e as Error)?.message ?? e);
      }
    }
    const locked = result.context.lockedHarmonyBarsRaw;
    if (
      result.context.generationMetadata.customHarmonyLocked === true &&
      locked &&
      locked.length === result.context.form.totalBars
    ) {
      // TODO: assertExportTruth — partial context (post-write disk pass; golden path already ran in-memory truth).
      const disk = validateLockedHarmonyMusicXmlTruthFromFile(filepath, locked);
      if (!disk.ok) diskHarmonyTruthErrors = disk.errors;
    }
    writeOutputManifest(filepath, {
      chordExportDiagnostics,
      presetId: req.presetId,
      styleStack: result.runManifest?.activeModules ?? [],
      seed: effectiveSeed,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      timestamp: ts,
      scoreTitle: result.runManifest?.scoreTitle,
      ecmMode: result.runManifest?.ecmMode,
      harmonySource: result.context.generationMetadata.harmonySource,
      customChordProgressionSummary: result.context.generationMetadata.customChordProgressionSummary,
      progressionMode: result.context.generationMetadata.progressionMode,
      chordProgressionInputRaw: result.context.generationMetadata.chordProgressionInputRaw,
      parsedCustomProgressionBars: result.context.generationMetadata.parsedCustomProgressionBars,
      chordProgressionParseFailed: result.context.generationMetadata.chordProgressionParseFailed,
      builtInHarmonyFallbackOccurred: result.context.generationMetadata.builtInHarmonyFallbackOccurred,
      harmonySourceUsed: result.context.generationMetadata.harmonySourceUsed,
      styleGrammarLabel: result.context.generationMetadata.styleGrammarLabel,
      styleStackPrimaryModuleId: result.context.generationMetadata.styleStackPrimaryModuleId,
      styleStackPrimaryDisplayName: result.context.generationMetadata.styleStackPrimaryDisplayName,
      userSelectedStyleDisplayNames: result.context.generationMetadata.userSelectedStyleDisplayNames,
      userExplicitPrimaryStyle: result.context.generationMetadata.userExplicitPrimaryStyle,
      duoModeReceiptLabel: result.context.generationMetadata.duoModeReceiptLabel,
      motifAuthorityLevel: result.context.generationMetadata.motifAuthorityLevel,
      motifDevelopmentSummary: result.context.generationMetadata.motifDevelopmentSummary,
      chordProgressionSubmittedRaw: result.runManifest.chordProgressionSubmittedRaw,
      parsedChordBarsSnapshot: result.runManifest.parsedChordBarsSnapshot,
      pipelineTruthInputStage: result.runManifest.pipelineTruthInputStage,
      pipelineTruthScoreStage: result.runManifest.pipelineTruthScoreStage,
      pipelineTruthExportStage: result.runManifest.pipelineTruthExportStage,
      songModeRhythmOverlayPhraseDiagnostics: result.runManifest.songModeRhythmOverlayPhraseDiagnostics,
      songModeRhythmOverlayByPhrase: result.context.generationMetadata.songModeRhythmOverlayByPhrase,
      rhythmIntentD1Receipt: result.runManifest.rhythmIntentD1Receipt,
      c4_hook_rhythm_applied: result.context.generationMetadata.c4HookRhythmApplied,
      c4_bars_used: result.context.generationMetadata.c4BarsUsed,
      keySignatureInferredTonic: result.context.generationMetadata.keySignatureReceipt?.inferredTonicName,
      keySignatureConfidence: result.context.generationMetadata.keySignatureReceipt?.confidence,
      keySignatureOverrideUsed: result.context.generationMetadata.keySignatureReceipt?.overrideUsed,
      keySignatureNoneMode: result.context.generationMetadata.keySignatureReceipt?.noneMode,
      keySignatureHide: result.context.generationMetadata.keySignatureReceipt?.hideKeySignature,
      keySignatureFifths: result.context.generationMetadata.keySignatureReceipt?.exportFifths,
      keySignatureExportMode: result.context.generationMetadata.keySignatureReceipt?.exportMode,
      keySignatureInferredKey: result.context.generationMetadata.keySignatureReceipt?.inferredKey,
      keySignatureInferredMode: result.context.generationMetadata.keySignatureReceipt?.inferredMode,
      keySignatureInferredFifths: result.context.generationMetadata.keySignatureReceipt?.inferredFifths,
      keySignatureModeApplied: result.context.generationMetadata.keySignatureReceipt?.keySignatureModeApplied,
      keySignatureExportKeyWritten: result.context.generationMetadata.keySignatureReceipt?.exportKeyWritten,
      songModeStyleSurfaceNotes: result.context.generationMetadata.songModeStyleSurfaceNotes,
      songModeDonaldFagenC1Receipt: result.context.generationMetadata.songModeDonaldFagenC1Receipt,
      grooveScaffoldReceipt: result.context.generationMetadata.grooveScaffoldReceipt,
      grooveScaffoldReceipts: result.context.generationMetadata.grooveScaffoldReceipts,
      grooveScaffoldDiagnostics: result.context.generationMetadata.grooveScaffoldDiagnostics,
      songModeSectionBehaviourDescriptors: result.context.generationMetadata.songModeSectionBehaviourDescriptors,
      frankZappaDiffReceipts: result.context.generationMetadata.frankZappaDiffReceipts,
      zappaSectionBehaviorBySection: result.context.generationMetadata.zappaSectionBehaviorBySection,
      importHarmonyPolicyVersion: result.context.generationMetadata.importHarmonyPolicyVersion,
      v80Echo: v80EchoManifest,
      bandMode: req.bandModeEnabled === true ? true : undefined,
      drumGuideSource,
      validation: {
        scoreIntegrity: result.integrityPassed,
        exportIntegrity: result.exportIntegrityPassed,
        behaviourGates: result.behaviourGatesPassed,
        mxValid: result.mxValidationPassed,
        strictBarMath: result.strictBarMathPassed,
        exportRoundTrip: result.exportRoundTripPassed,
        instrumentMetadata: result.instrumentMetadataPassed,
        sibeliusSafe: result.sibeliusSafe,
        readinessRelease: result.readiness.release,
        readinessMx: result.readiness.mx,
        shareable: result.readiness.shareable,
        errors: diskHarmonyTruthErrors.length > 0 ? [...result.errors, ...diskHarmonyTruthErrors] : result.errors,
        warnings: result.songModePhraseWarnings?.length ? result.songModePhraseWarnings : undefined,
      },
    });
  }

  const allErrors =
    diskHarmonyTruthErrors.length > 0 || phase67MxErrors.length > 0
      ? [...result.errors, ...diskHarmonyTruthErrors, ...phase67MxErrors]
      : result.errors;
  const importWarnings = adaptedImport?.warnings ?? [];
  const allWarnings = [...(result.songModePhraseWarnings ?? []), ...importWarnings];
  const validation = {
    integrityPassed: result.integrityPassed,
    behaviourGatesPassed: result.behaviourGatesPassed,
    mxValidationPassed: result.mxValidationPassed && phase67MxErrors.length === 0,
    strictBarMathPassed: result.strictBarMathPassed,
    exportRoundTripPassed: result.exportRoundTripPassed,
    exportIntegrityPassed: result.exportIntegrityPassed,
    instrumentMetadataPassed: result.instrumentMetadataPassed,
    sibeliusSafe: result.sibeliusSafe,
    readiness: result.readiness,
    errors: allErrors,
    warnings: allWarnings.length ? allWarnings : undefined,
  };

  const scoreTitleResolved = result.runManifest?.scoreTitle;
  const successFinal =
    result.success && diskHarmonyTruthErrors.length === 0 && phase67MxErrors.length === 0;
  const universalLeadSheet =
    successFinal && result.context
      ? buildUniversalLeadSheetFromCompositionContext(
          result.context,
          scoreTitleResolved ?? `Composer OS ${req.presetId}`
        )
      : undefined;

  let duoMusicContext: MusicContext | undefined;
  if (duo && successFinal && result.score) {
    try {
      duoMusicContext = buildDuoMusicContextFromScore(result.score);
      duoMusicContext = {
        ...duoMusicContext,
        seed: effectiveSeed,
        ...(typeof req.bpm === 'number' && Number.isFinite(req.bpm) ? { bpm: req.bpm } : {}),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      allErrors.push(msg);
    }
  }
  const successWithDuoLock = successFinal && !(duo && !duoMusicContext && successFinal);

  return {
    success: successWithDuoLock,
    error: successWithDuoLock ? undefined : allErrors[0] ?? 'Generation failed',
    musicContext: duoMusicContext,
    productKind: 'musicxml',
    composerOsVersion: COMPOSER_OS_VERSION,
    xml: outputXml,
    guitarVoicings: guitarVoicingsOut,
    filename,
    filepath,
    midiFilepath,
    drumGuideFilepath,
    bandModeEnabled: req.bandModeEnabled === true ? true : undefined,
    drumGuideSource,
    manifestPath: filepath ? manifestPathForMusicXml(filepath) : undefined,
    harmonySource: result.context.generationMetadata.harmonySource,
    customChordProgressionSummary: result.context.generationMetadata.customChordProgressionSummary,
    progressionMode: result.context.generationMetadata.progressionMode,
    chordProgressionInputRaw: result.context.generationMetadata.chordProgressionInputRaw,
    parsedCustomProgressionBars: result.context.generationMetadata.parsedCustomProgressionBars,
    chordProgressionParseFailed: result.context.generationMetadata.chordProgressionParseFailed,
    builtInHarmonyFallbackOccurred: result.context.generationMetadata.builtInHarmonyFallbackOccurred,
    customHarmonyMusicXmlTruthPassed: result.context.generationMetadata.customHarmonyMusicXmlTruthPassed,
    harmonySourceUsed: result.context.generationMetadata.harmonySourceUsed,
    styleGrammarLabel: result.context.generationMetadata.styleGrammarLabel,
    styleStackPrimaryModuleId: result.context.generationMetadata.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: result.context.generationMetadata.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: result.context.generationMetadata.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: result.context.generationMetadata.userExplicitPrimaryStyle,
    duoModeReceiptLabel: result.context.generationMetadata.duoModeReceiptLabel,
    motifAuthorityLevel: result.context.generationMetadata.motifAuthorityLevel,
    motifDevelopmentSummary: result.context.generationMetadata.motifDevelopmentSummary,
    validation,
    runManifest: result.runManifest
      ? {
          seed: result.runManifest.seed,
          presetId: result.runManifest.presetId,
          activeModules: result.runManifest.activeModules,
          timestamp: result.runManifest.timestamp,
          scoreTitle: result.runManifest.scoreTitle,
          ecmMode: result.runManifest.ecmMode,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
          experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
          harmonySourceUsed: result.runManifest.harmonySourceUsed,
          styleGrammarLabel: result.runManifest.styleGrammarLabel,
          styleStackPrimaryModuleId: result.runManifest.styleStackPrimaryModuleId,
          styleStackPrimaryDisplayName: result.runManifest.styleStackPrimaryDisplayName,
          userSelectedStyleDisplayNames: result.runManifest.userSelectedStyleDisplayNames,
          userExplicitPrimaryStyle: result.runManifest.userExplicitPrimaryStyle,
          duoModeReceiptLabel: result.runManifest.duoModeReceiptLabel,
          motifAuthorityLevel: result.runManifest.motifAuthorityLevel,
          keySignatureInferredTonic: result.runManifest.keySignatureInferredTonic,
          keySignatureConfidence: result.runManifest.keySignatureConfidence,
          keySignatureOverrideUsed: result.runManifest.keySignatureOverrideUsed,
          keySignatureNoneMode: result.runManifest.keySignatureNoneMode,
          keySignatureHide: result.runManifest.keySignatureHide,
          keySignatureFifths: result.runManifest.keySignatureFifths,
          keySignatureExportMode: result.runManifest.keySignatureExportMode,
          keySignatureInferredKey: result.runManifest.keySignatureInferredKey,
          keySignatureInferredMode: result.runManifest.keySignatureInferredMode,
          keySignatureInferredFifths: result.runManifest.keySignatureInferredFifths,
          keySignatureModeApplied: result.runManifest.keySignatureModeApplied,
          keySignatureExportKeyWritten: result.runManifest.keySignatureExportKeyWritten,
          wybleConsumptionReceipt: result.runManifest.wybleConsumptionReceipt,
          songModeStyleSurfaceNotes: result.runManifest.songModeStyleSurfaceNotes,
          songModeDonaldFagenC1Receipt: result.runManifest.songModeDonaldFagenC1Receipt,
          grooveScaffoldReceipt: result.runManifest.grooveScaffoldReceipt,
          grooveScaffoldReceipts: result.runManifest.grooveScaffoldReceipts,
          grooveScaffoldDiagnostics: result.runManifest.grooveScaffoldDiagnostics,
          songModeSectionShapingDiagnostics: result.runManifest.songModeSectionShapingDiagnostics,
          songModeSectionBehaviourDescriptors: result.runManifest.songModeSectionBehaviourDescriptors,
          songModeProfileRuleDiagnostics: result.runManifest.songModeProfileRuleDiagnostics,
          songModeLeadSheetInputApplied: result.runManifest.songModeLeadSheetInputApplied,
          songModeLeadSheetAnchorStartApplied: result.runManifest.songModeLeadSheetAnchorStartApplied,
          songModeLeadSheetExpressionStrength: result.runManifest.songModeLeadSheetExpressionStrength,
          importHarmonyMode: result.runManifest.importHarmonyMode,
          importHarmonyModeSource: result.runManifest.importHarmonyModeSource,
          harmonyBlendRaw: result.runManifest.harmonyBlendRaw,
          importHarmonyPolicyVersion: result.runManifest.importHarmonyPolicyVersion,
          importHarmonyLockApplied: result.runManifest.importHarmonyLockApplied,
          importHarmonyLockFallbackReason: result.runManifest.importHarmonyLockFallbackReason,
          importHarmonyLockedBarsCount: result.runManifest.importHarmonyLockedBarsCount,
          motifDevelopmentSummary: result.runManifest.motifDevelopmentSummary,
          duoVaultMotifEnabled: result.runManifest.duoVaultMotifEnabled,
          duoVaultMotifSurvivalTelemetry: result.runManifest.duoVaultMotifSurvivalTelemetry,
          v80Echo: v80EchoManifest,
        }
      : undefined,
    scoreTitle: scoreTitleResolved,
    universalLeadSheet,
    chordExportDiagnostics,
    requestEcho: {
      tonalCenter: req.tonalCenter,
      bpm: req.bpm,
      totalBars: req.totalBars,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      stylePairing: req.stylePairing,
      ensembleConfigId: req.ensembleConfigId,
      primarySongwriterStyle: req.primarySongwriterStyle,
      harmonyMode: req.harmonyMode,
      longFormEnabled: req.longFormEnabled,
      styleProfile: req.styleProfile,
      c4Strength: req.c4Strength,
      ...(req.grooveScaffold ? { grooveScaffold: req.grooveScaffold } : {}),
      importHarmonyMode: normalizedImportHarmonyMode,
      harmonyBlend: harmonyBlendRaw,
      ...(req.sectionRegeneration
        ? {
            sectionRegeneration: {
              startBar: req.sectionRegeneration.startBar,
              endBar: req.sectionRegeneration.endBar,
            },
          }
        : {}),
      ...(req.presetId === 'guitar_bass_duo' ? { duoVaultMotifEnabled: req.duoVaultMotifEnabled !== false } : {}),
    },
    voice2PolyphonyDiagnostics: result.context.generationMetadata.voice2PolyphonyDiagnostics,
    ...v80Echoes,
  };
}
