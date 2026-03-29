/**
 * Composer OS V2 — App API: generate composition
 */

import type { GenerateRequest, StyleProfile } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import { writeOutputManifest } from './writeOutputManifest';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { validateLockedHarmonyMusicXmlTruthFromFile } from '../core/export/validateLockedHarmonyMusicXml';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { experimentalLabelForLevel } from '../core/creative-controls/experimentalEvaluator';
import { buildUniversalLeadSheetFromCompositionContext } from '../core/lead-sheet/universalLeadSheetBuilder';
import type { UniversalLeadSheet } from '../core/lead-sheet/universalLeadSheetTypes';
import { mapAppStyleStackToEngine } from './mapStyleStack';
import * as fs from 'fs';
import * as path from 'path';

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
}

export function generateComposition(req: GenerateRequest, outputDir: string): GenerateResult {
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const duo = req.presetId === 'guitar_bass_duo';
  const chordText =
    duo && typeof req.chordProgressionText === 'string' ? req.chordProgressionText : undefined;
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
  });
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
    const locked = result.context.lockedHarmonyBarsRaw;
    if (locked && locked.length === result.context.form.totalBars) {
      const disk = validateLockedHarmonyMusicXmlTruthFromFile(filepath, locked);
      if (!disk.ok) diskHarmonyTruthErrors = disk.errors;
    }
    writeOutputManifest(filepath, {
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
      chordProgressionSubmittedRaw: result.runManifest.chordProgressionSubmittedRaw,
      parsedChordBarsSnapshot: result.runManifest.parsedChordBarsSnapshot,
      pipelineTruthInputStage: result.runManifest.pipelineTruthInputStage,
      pipelineTruthScoreStage: result.runManifest.pipelineTruthScoreStage,
      pipelineTruthExportStage: result.runManifest.pipelineTruthExportStage,
      songModeRhythmOverlayPhraseDiagnostics: result.runManifest.songModeRhythmOverlayPhraseDiagnostics,
      songModeRhythmOverlayByPhrase: result.context.generationMetadata.songModeRhythmOverlayByPhrase,
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
    warnings: result.songModePhraseWarnings?.length ? result.songModePhraseWarnings : undefined,
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
        }
      : undefined,
    scoreTitle: scoreTitleResolved,
    universalLeadSheet,
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
    },
  };
}
