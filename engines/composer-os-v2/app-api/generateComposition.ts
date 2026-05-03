/**
 * Composer OS V2 — App API: generate composition
 */

import type { GenerateRequest, ImportHarmonyMode, StyleProfile } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import { writeOutputManifest } from './writeOutputManifest';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
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
import { writeDrumGuide } from '../core/export/midiDrumGuideWriter';

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
  filename?: string;
  filepath?: string;
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
    /** Big Band / String Quartet — `blend_harmony` with 0–1 blend strength (merge gate echo). */
    importHarmonyBlendActive?: boolean;
    /** Present when `importHarmonyBlendActive`; raw blend weight sent by client. */
    importHarmonyBlendEffective?: number;
    motifDevelopmentSummary?: GenerationMetadata['motifDevelopmentSummary'];
    /** Ensemble reference-import hints (Big Band / String Quartet optional MusicXML). */
    referenceSourceKind?: string;
    referenceBehaviourSummary?: string;
    referenceInfluenceMode?: string;
    referenceInfluenceStrength?: string;
    referenceBehaviourHints?: string[];
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
    /** Echo when client sends Slonimsky Chromatic Strength (Song Mode / ensemble). */
    chromaticStrength?: 'off' | 'subtle' | 'prominent';
    importHarmonyMode?: ImportHarmonyMode;
    harmonyBlend?: number;
    debugFixtureMode?: 'indie_dual_guitar_tuning_proof';
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
}

export function generateComposition(req: GenerateRequest, outputDir: string): GenerateResult {
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const duo = isGuitarBassDuoFamily(req.presetId);
  const chordText =
    duo && typeof req.chordProgressionText === 'string' ? req.chordProgressionText : undefined;
  const importLeadSheetXml =
    typeof req.songModeLeadSheetMusicXml === 'string' ? req.songModeLeadSheetMusicXml.trim() : '';
  const importExpressionEnabled = isImportExpressionPilotPreset(req.presetId) && importLeadSheetXml.length > 0;
  const totalBars = req.totalBars ?? (req.presetId === 'ecm_chamber' ? 32 : 8);
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
  const result = runGoldenPath(effectiveSeed, {
    styleStack: mapAppStyleStackToEngine(req.styleStack),
    presetId: req.presetId,
    scoreTitle: req.title,
    harmonyMode: duo ? req.harmonyMode : undefined,
    chordProgressionText: chordText,
    ecmMode: req.presetId === 'ecm_chamber' ? req.ecmMode ?? 'ECM_METHENY_QUARTET' : undefined,
    totalBars: req.totalBars,
    longFormEnabled: req.longFormEnabled,
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
    songModeLeadSheetMelodyAnchors: importedAnchors,
    leadSheetPerformanceBlend: req.leadSheetPerformanceBlend,
    importHarmonyMode: normalizedImportHarmonyMode,
    harmonyBlend: harmonyBlendRaw,
    ...(req.formId ? { formId: req.formId as FormId } : {}),
    ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
    zappaSoloMidiLow: req.zappaSoloMidiLow,
    zappaSoloMidiHigh: req.zappaSoloMidiHigh,
    zappaSoloDensity: req.zappaSoloDensity,
    zappaSoloDissonance: req.zappaSoloDissonance,
    ...(typeof req.primarySongwriterStyle === 'string' &&
    req.primarySongwriterStyle.trim().toLowerCase() === 'frank_zappa'
      ? {
          primarySongwriterStyle: req.primarySongwriterStyle.trim(),
          songModeHookFirstIdentity: true,
          styleProfile: req.styleProfile ?? 'STYLE_ECM',
          ...(typeof req.secondarySongwriterStyle === 'string' && req.secondarySongwriterStyle.trim() !== ''
            ? { secondarySongwriterStyle: req.secondarySongwriterStyle.trim() }
            : {}),
        }
      : {}),
  });
  result.context.generationMetadata.importHarmonyMode = normalizedImportHarmonyMode;
  result.context.generationMetadata.importHarmonyModeSource = importHarmonyModeSource;
  result.context.generationMetadata.harmonyBlendRaw = harmonyBlendRaw;
  // Stage 4: free_harmony is documented default; policy version set in GenerationMetadata (no routing change).
  result.context.generationMetadata.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  if (result.runManifest) {
    result.runManifest.importHarmonyMode = normalizedImportHarmonyMode;
    result.runManifest.importHarmonyModeSource = importHarmonyModeSource;
    result.runManifest.harmonyBlendRaw = harmonyBlendRaw;
    result.runManifest.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  }

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

  let filename: string | undefined;
  let filepath: string | undefined;

  if (result.xml) {
    const ts = new Date().toISOString();
    /** Full precision + seed avoids same-second overwrites (e.g. Try Another back-to-back). */
    const tsSafe = ts.replace(/[:.]/g, '-');
    filename = `composer_os_${req.presetId}_${tsSafe}_${effectiveSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, result.xml, 'utf-8');
    try {
      const barMeterForDrums =
        result.context.barMeterMap ?? result.context.generationMetadata?.barMeterMap;
      const baseName = path.basename(filepath, path.extname(filepath));
      writeDrumGuide(result.score, outputDir, baseName, barMeterForDrums, req.bpm);
    } catch (e) {
      console.warn('Drum guide export failed:', (e as Error)?.message ?? e);
    }
    const locked = result.context.lockedHarmonyBarsRaw;
    if (
      result.context.generationMetadata.customHarmonyLocked === true &&
      locked &&
      locked.length === result.context.form.totalBars
    ) {
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
      songModeSectionBehaviourDescriptors: result.context.generationMetadata.songModeSectionBehaviourDescriptors,
      importHarmonyPolicyVersion: result.context.generationMetadata.importHarmonyPolicyVersion,
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
    diskHarmonyTruthErrors.length > 0 ? [...result.errors, ...diskHarmonyTruthErrors] : result.errors;
  const importWarnings = adaptedImport?.warnings ?? [];
  const allWarnings = [...(result.songModePhraseWarnings ?? []), ...importWarnings];
  const validation = {
    integrityPassed: result.integrityPassed,
    behaviourGatesPassed: result.behaviourGatesPassed,
    mxValidationPassed: result.mxValidationPassed,
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
  const successFinal = result.success && diskHarmonyTruthErrors.length === 0;
  const universalLeadSheet =
    successFinal && result.context
      ? buildUniversalLeadSheetFromCompositionContext(
          result.context,
          scoreTitleResolved ?? `Composer OS ${req.presetId}`
        )
      : undefined;

  return {
    success: successFinal,
    error: successFinal ? undefined : allErrors[0] ?? 'Generation failed',
    productKind: 'musicxml',
    composerOsVersion: COMPOSER_OS_VERSION,
    xml: result.xml,
    filename,
    filepath,
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
      importHarmonyMode: normalizedImportHarmonyMode,
      harmonyBlend: harmonyBlendRaw,
    },
    voice2PolyphonyDiagnostics: result.context.generationMetadata.voice2PolyphonyDiagnostics,
  };
}
