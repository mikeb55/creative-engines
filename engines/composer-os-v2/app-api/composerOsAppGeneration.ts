/**
 * Single Composer OS app entry for Generate: routes presets to golden-path MusicXML
 * or structural/planning runs (no deep UI imports).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { generateComposition, type GenerateResult } from './generateComposition';
import { runRiffGeneratorApp } from './riffGeneratorApp';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import type { BigBandEraId } from '../core/big-band/bigBandResearchTypes';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';
import { runSongMode } from '../core/song-mode/runSongMode';
import { buildChordProgressionTextForDuoFromCompiledSong } from '../core/song-mode/songModeBuilder';
import { buildUniversalLeadSheetFromCompositionContext } from '../core/lead-sheet/universalLeadSheetBuilder';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { logSongModeHarmonyDebug } from '../core/goldenPath/customLockedHarmonyRouting';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { experimentalLabelForLevel } from '../core/creative-controls/experimentalEvaluator';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import {
  assertLockedHarmonyScoreAndXmlMatchBars,
  validateLockedHarmonyMusicXmlTruthFromFile,
} from '../core/export/validateLockedHarmonyMusicXml';
import { writeOutputManifest } from './writeOutputManifest';
import { mapAppStyleStackToEngine } from './mapStyleStack';
import { resolveLongFormRoute } from '../core/form/longFormRouteResolver';
import {
  normalizeChordProgressionSeparators,
  normalizeChordToken,
  parseChordProgressionInputWithBarCount,
} from '../core/harmony/chordProgressionParser';
import { getChordForBar } from '../core/harmony/harmonyResolution';
import {
  isDesktopTruthDumpEnabled,
  logSongModeTruthDumpConsole,
  writeSongModeDesktopTruthDump,
} from './desktopTruthDump';

export const SUPPORTED_APP_PRESET_IDS = [
  'guitar_bass_duo',
  'ecm_chamber',
  'riff_generator',
  'song_mode',
  'big_band',
  'string_quartet',
] as const;

export type SupportedAppPresetId = (typeof SUPPORTED_APP_PRESET_IDS)[number];

function validationForStructural(ok: boolean, errors: string[]): GenerateResult['validation'] {
  return {
    integrityPassed: ok,
    behaviourGatesPassed: ok,
    mxValidationPassed: ok,
    strictBarMathPassed: ok,
    exportRoundTripPassed: ok,
    exportIntegrityPassed: ok,
    instrumentMetadataPassed: ok,
    sibeliusSafe: ok,
    readiness: { shareable: false, release: ok ? 1 : 0, mx: ok ? 1 : 0 },
    errors,
  };
}

function writeArtifactJson(
  outputDir: string,
  filename: string,
  body: Record<string, unknown>
): { filepath: string } {
  fs.mkdirSync(outputDir, { recursive: true });
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf-8');
  return { filepath };
}

function requestEchoFromReq(req: GenerateRequest): NonNullable<GenerateResult['requestEcho']> {
  return {
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
  };
}

function parseBigBandEraFromPairing(era?: string): BigBandEraId | undefined {
  if (era === 'swing' || era === 'bebop' || era === 'post_bop' || era === 'contemporary') {
    return era;
  }
  return undefined;
}

export function runAppGeneration(req: GenerateRequest, outputDir: string): GenerateResult {
  const id = req.presetId as string;
  if (!SUPPORTED_APP_PRESET_IDS.includes(id as SupportedAppPresetId)) {
    return {
      success: false,
      error: `Unsupported preset: ${id}`,
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: validationForStructural(false, [`Unsupported preset: ${id}`]),
      runManifest: {
        seed: req.seed,
        presetId: id,
        activeModules: [],
        timestamp: new Date().toISOString(),
      },
    };
  }

  switch (id) {
    case 'guitar_bass_duo':
    case 'ecm_chamber':
      return { ...generateComposition(req, outputDir), composerOsVersion: COMPOSER_OS_VERSION };
    case 'riff_generator':
      return { ...runRiffGeneratorApp(req, outputDir), composerOsVersion: COMPOSER_OS_VERSION };
    case 'song_mode':
      return runSongStructure(req, outputDir);
    case 'big_band':
      return runBigBandPlanning(req, outputDir);
    case 'string_quartet':
      return runStringQuartetPlanning(req, outputDir);
    default:
      return {
        success: false,
        validation: validationForStructural(false, ['Unreachable preset branch']),
        composerOsVersion: COMPOSER_OS_VERSION,
      };
  }
}

function runSongStructure(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Song Mode Study ${req.seed}`;
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const sm = runSongMode({
    seed: effectiveSeed,
    title,
    primarySongwriterStyle: req.primarySongwriterStyle,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
  });
  const rawCustomHarmony = typeof req.chordProgressionText === 'string' ? req.chordProgressionText.trim() : '';
  const useLockedCustomHarmony = rawCustomHarmony.length > 0;
  let lockedHarmonyBarsAuthoritative: string[] | undefined;
  if (useLockedCustomHarmony) {
    if (process.env.COMPOSER_OS_SONG_MODE_CHORD_DEBUG === '1') {
      const norm = normalizeChordProgressionSeparators(rawCustomHarmony);
      const rawBars = norm.split('|').map((s) => s.trim()).filter(Boolean);
      console.log('[Song Mode chord debug]', {
        rawLength: rawCustomHarmony.length,
        rawHead: rawCustomHarmony.slice(0, 240),
        normalizedHead: norm.slice(0, 240),
        normalizedBarCount: rawBars.length,
      });
    }
    const parse32 = parseChordProgressionInputWithBarCount(rawCustomHarmony, 32);
    if (!parse32.ok) {
      return {
        success: false,
        error: parse32.error,
        productKind: 'musicxml',
        composerOsVersion: COMPOSER_OS_VERSION,
        chordProgressionParseFailed: true,
        validation: validationForStructural(false, [parse32.error]),
        runManifest: {
          seed: effectiveSeed,
          presetId: 'song_mode',
          activeModules: ['song_mode_compile'],
          timestamp: ts,
          scoreTitle: title,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
        },
        scoreTitle: title,
        requestEcho: requestEchoFromReq(req),
      };
    }
    lockedHarmonyBarsAuthoritative = [...parse32.bars];
  }
  /**
   * Without user paste, do not feed the 8-bar song scaffold (verse: Cmaj7→Am7→Fmaj7→G7) into duo32 as
   * `custom` — runGoldenPath would tile it ×4 and bar 2 becomes Am7 instead of any real progression.
   * Use builtin long-form harmony instead until the user supplies 32 pasted bars.
   */
  const lf = resolveLongFormRoute('guitar_bass_duo', {
    totalBars: req.totalBars,
    longFormEnabled: req.longFormEnabled ?? true,
  });
  const useBuiltinDuo32WithoutUserPaste = !useLockedCustomHarmony && lf.kind === 'duo32';
  const chordProgressionText = useLockedCustomHarmony
    ? rawCustomHarmony
    : useBuiltinDuo32WithoutUserPaste
      ? undefined
      : buildChordProgressionTextForDuoFromCompiledSong(sm.compiledSong);
  const harmonyModeForRun: 'builtin' | 'custom' | 'custom_locked' = useLockedCustomHarmony
    ? 'custom_locked'
    : useBuiltinDuo32WithoutUserPaste
      ? 'builtin'
      : 'custom';
  logSongModeHarmonyDebug({
    layer: 'composerOsAppGeneration:runSongStructure',
    uiChordProgressionChars: rawCustomHarmony.length,
    useLockedCustomHarmony,
    harmonyMode: harmonyModeForRun,
    totalBars: req.totalBars ?? 32,
    longFormEnabled: req.longFormEnabled ?? true,
  });
  const gp = runGoldenPath(effectiveSeed, {
    styleStack: mapAppStyleStackToEngine(req.styleStack),
    presetId: 'guitar_bass_duo',
    scoreTitle: title,
    songModeHookFirstIdentity: true,
    /** Explicit default matches UI default when `styleProfile` omitted (legacy clients). */
    styleProfile: req.styleProfile ?? 'STYLE_ECM',
    harmonyMode: harmonyModeForRun,
    chordProgressionText,
    ...(lockedHarmonyBarsAuthoritative
      ? {
          lockedHarmonyBarsRaw: lockedHarmonyBarsAuthoritative,
          parsedChordBars: lockedHarmonyBarsAuthoritative,
        }
      : {}),
    totalBars: req.totalBars ?? 32,
    longFormEnabled: req.longFormEnabled ?? true,
    keySignatureMode: req.keySignatureMode,
    tonalCenterOverride: req.tonalCenterOverride,
    tonalCenter: req.tonalCenter,
    variationEnabled: req.variationEnabled === true ? true : undefined,
    creativeControlLevel: req.creativeControlLevel,
    intent: req.intent,
    c4Strength: req.c4Strength,
    blendStrength: req.blendStrength ?? 'medium',
  });
  const runIdForTruth = `${tsSafe}_${effectiveSeed}`;
  if (isDesktopTruthDumpEnabled()) {
    logSongModeTruthDumpConsole({
      runId: runIdForTruth,
      songModeOutputDir: outputDir,
      req,
      harmonyModeForRun,
      rawCustomHarmony: rawCustomHarmony,
      lockedHarmonyBarsAuthoritative,
      gp,
    });
    writeSongModeDesktopTruthDump({
      runId: runIdForTruth,
      songModeOutputDir: outputDir,
      req,
      harmonyModeForRun,
      rawCustomHarmony: rawCustomHarmony,
      lockedHarmonyBarsAuthoritative,
      gp,
    });
  }
  if (lockedHarmonyBarsAuthoritative?.length === 32) {
    try {
      if (process.env.COMPOSER_OS_DESKTOP_IPC === '1') {
        for (let b = 1; b <= 4; b++) {
          const got = getChordForBar(b, gp.context);
          const exp = lockedHarmonyBarsAuthoritative[b - 1]!;
          if (normalizeChordToken(got) !== normalizeChordToken(exp)) {
            throw new Error(
              `DESKTOP SONG MODE HARMONY: bar ${b} resolved "${got}" !== pasted "${exp}" (authority check bars 1–4)`
            );
          }
        }
      }
      assertLockedHarmonyScoreAndXmlMatchBars(gp.score, gp.xml, lockedHarmonyBarsAuthoritative);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        success: false,
        error: msg,
        productKind: 'musicxml',
        composerOsVersion: COMPOSER_OS_VERSION,
        validation: validationForStructural(false, [msg]),
        runManifest: {
          seed: effectiveSeed,
          presetId: 'song_mode',
          activeModules: ['song_mode_compile'],
          timestamp: ts,
          scoreTitle: title,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
        },
        scoreTitle: title,
        requestEcho: requestEchoFromReq(req),
      };
    }
  }
  const songLayerOk = sm.validation.valid;
  let diskHarmonyTruthErrors: string[] = [];
  let filename: string | undefined;
  let filepath: string | undefined;
  if (gp.xml) {
    filename = `composer_os_song_mode_${tsSafe}_${effectiveSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, gp.xml, 'utf-8');
    const locked = gp.context.lockedHarmonyBarsRaw;
    if (locked && locked.length === gp.context.form.totalBars) {
      const disk = validateLockedHarmonyMusicXmlTruthFromFile(filepath, locked);
      if (!disk.ok) diskHarmonyTruthErrors = disk.errors;
    }
    writeOutputManifest(filepath, {
      presetId: 'song_mode',
      styleStack: gp.runManifest?.activeModules ?? [],
      seed: effectiveSeed,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      timestamp: ts,
      scoreTitle: gp.runManifest?.scoreTitle,
      ecmMode: gp.runManifest?.ecmMode,
      harmonySource: gp.context.generationMetadata.harmonySource,
      customChordProgressionSummary: gp.context.generationMetadata.customChordProgressionSummary,
      progressionMode: gp.context.generationMetadata.progressionMode,
      chordProgressionInputRaw: gp.context.generationMetadata.chordProgressionInputRaw,
      parsedCustomProgressionBars: gp.context.generationMetadata.parsedCustomProgressionBars,
      chordProgressionParseFailed: gp.context.generationMetadata.chordProgressionParseFailed,
      builtInHarmonyFallbackOccurred: gp.context.generationMetadata.builtInHarmonyFallbackOccurred,
      harmonySourceUsed: gp.context.generationMetadata.harmonySourceUsed,
      styleGrammarLabel: gp.context.generationMetadata.styleGrammarLabel,
      styleStackPrimaryModuleId: gp.context.generationMetadata.styleStackPrimaryModuleId,
      styleStackPrimaryDisplayName: gp.context.generationMetadata.styleStackPrimaryDisplayName,
      userSelectedStyleDisplayNames: gp.context.generationMetadata.userSelectedStyleDisplayNames,
      userExplicitPrimaryStyle: gp.context.generationMetadata.userExplicitPrimaryStyle,
      styleProfile: req.styleProfile ?? 'STYLE_ECM',
      chordProgressionSubmittedRaw: gp.runManifest.chordProgressionSubmittedRaw,
      parsedChordBarsSnapshot: gp.runManifest.parsedChordBarsSnapshot,
      pipelineTruthInputStage: gp.runManifest.pipelineTruthInputStage,
      pipelineTruthScoreStage: gp.runManifest.pipelineTruthScoreStage,
      pipelineTruthExportStage: gp.runManifest.pipelineTruthExportStage,
      keySignatureInferredTonic: gp.context.generationMetadata.keySignatureReceipt?.inferredTonicName,
      keySignatureConfidence: gp.context.generationMetadata.keySignatureReceipt?.confidence,
      keySignatureOverrideUsed: gp.context.generationMetadata.keySignatureReceipt?.overrideUsed,
      keySignatureNoneMode: gp.context.generationMetadata.keySignatureReceipt?.noneMode,
      keySignatureHide: gp.context.generationMetadata.keySignatureReceipt?.hideKeySignature,
      keySignatureFifths: gp.context.generationMetadata.keySignatureReceipt?.exportFifths,
      keySignatureExportMode: gp.context.generationMetadata.keySignatureReceipt?.exportMode,
      keySignatureInferredKey: gp.context.generationMetadata.keySignatureReceipt?.inferredKey,
      keySignatureInferredMode: gp.context.generationMetadata.keySignatureReceipt?.inferredMode,
      keySignatureInferredFifths: gp.context.generationMetadata.keySignatureReceipt?.inferredFifths,
      keySignatureModeApplied: gp.context.generationMetadata.keySignatureReceipt?.keySignatureModeApplied,
      keySignatureExportKeyWritten: gp.context.generationMetadata.keySignatureReceipt?.exportKeyWritten,
      c4_hook_rhythm_applied: gp.context.generationMetadata.c4HookRhythmApplied,
      c4_bars_used: gp.context.generationMetadata.c4BarsUsed,
      validation: {
        scoreIntegrity: gp.integrityPassed,
        exportIntegrity: gp.exportIntegrityPassed,
        behaviourGates: gp.behaviourGatesPassed,
        mxValid: gp.mxValidationPassed,
        strictBarMath: gp.strictBarMathPassed,
        exportRoundTrip: gp.exportRoundTripPassed,
        instrumentMetadata: gp.instrumentMetadataPassed,
        sibeliusSafe: gp.sibeliusSafe,
        readinessRelease: gp.readiness.release,
        readinessMx: gp.readiness.mx,
        shareable: gp.readiness.shareable,
        errors: [...gp.errors, ...diskHarmonyTruthErrors],
        warnings: gp.songModePhraseWarnings?.length ? gp.songModePhraseWarnings : undefined,
      },
    });
  }
  const mergedErrors = [...gp.errors, ...diskHarmonyTruthErrors];
  if (!songLayerOk) {
    mergedErrors.push(...sm.validation.errors);
  }
  const validation = {
    integrityPassed: songLayerOk && gp.integrityPassed,
    behaviourGatesPassed: songLayerOk && gp.behaviourGatesPassed,
    mxValidationPassed: songLayerOk && gp.mxValidationPassed,
    strictBarMathPassed: songLayerOk && gp.strictBarMathPassed,
    exportRoundTripPassed: songLayerOk && gp.exportRoundTripPassed,
    exportIntegrityPassed: songLayerOk && gp.exportIntegrityPassed,
    instrumentMetadataPassed: songLayerOk && gp.instrumentMetadataPassed,
    sibeliusSafe: songLayerOk && gp.sibeliusSafe,
    readiness: gp.readiness,
    errors: mergedErrors,
    warnings: gp.songModePhraseWarnings?.length ? gp.songModePhraseWarnings : undefined,
  };
  const success = gp.success && songLayerOk && !!gp.xml && diskHarmonyTruthErrors.length === 0;
  const scoreTitleResolved = gp.runManifest?.scoreTitle ?? title;
  const universalLeadSheet =
    success && gp.context
      ? buildUniversalLeadSheetFromCompositionContext(gp.context, scoreTitleResolved)
      : undefined;
  return {
    success,
    error: success ? undefined : mergedErrors[0] ?? 'Generation failed',
    productKind: 'musicxml',
    xml: gp.xml,
    filename,
    filepath,
    manifestPath: filepath ? manifestPathForMusicXml(filepath) : undefined,
    harmonySource: gp.context.generationMetadata.harmonySource,
    customChordProgressionSummary: gp.context.generationMetadata.customChordProgressionSummary,
    progressionMode: gp.context.generationMetadata.progressionMode,
    chordProgressionInputRaw: gp.context.generationMetadata.chordProgressionInputRaw,
    parsedCustomProgressionBars: gp.context.generationMetadata.parsedCustomProgressionBars,
    chordProgressionParseFailed: gp.context.generationMetadata.chordProgressionParseFailed,
    builtInHarmonyFallbackOccurred: gp.context.generationMetadata.builtInHarmonyFallbackOccurred,
    customHarmonyMusicXmlTruthPassed: gp.context.generationMetadata.customHarmonyMusicXmlTruthPassed,
    harmonySourceUsed: gp.context.generationMetadata.harmonySourceUsed,
    styleGrammarLabel: gp.context.generationMetadata.styleGrammarLabel,
    styleStackPrimaryModuleId: gp.context.generationMetadata.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: gp.context.generationMetadata.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: gp.context.generationMetadata.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: gp.context.generationMetadata.userExplicitPrimaryStyle,
    validation,
    runManifest: gp.runManifest
      ? {
          seed: gp.runManifest.seed,
          presetId: 'song_mode',
          activeModules: Array.from(
            new Set([
              'song_mode_compile',
              'songwriting_research_rules',
              ...(gp.runManifest.activeModules ?? []),
            ])
          ),
          timestamp: gp.runManifest.timestamp,
          scoreTitle: gp.runManifest.scoreTitle,
          ecmMode: gp.runManifest.ecmMode,
          variationId: req.variationId,
          creativeControlLevel: req.creativeControlLevel,
          experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
          harmonySourceUsed: gp.runManifest.harmonySourceUsed,
          styleGrammarLabel: gp.runManifest.styleGrammarLabel,
          styleStackPrimaryModuleId: gp.runManifest.styleStackPrimaryModuleId,
          styleStackPrimaryDisplayName: gp.runManifest.styleStackPrimaryDisplayName,
          userSelectedStyleDisplayNames: gp.runManifest.userSelectedStyleDisplayNames,
          userExplicitPrimaryStyle: gp.runManifest.userExplicitPrimaryStyle,
          keySignatureInferredTonic: gp.runManifest.keySignatureInferredTonic,
          keySignatureConfidence: gp.runManifest.keySignatureConfidence,
          keySignatureOverrideUsed: gp.runManifest.keySignatureOverrideUsed,
          keySignatureNoneMode: gp.runManifest.keySignatureNoneMode,
          keySignatureHide: gp.runManifest.keySignatureHide,
          keySignatureFifths: gp.runManifest.keySignatureFifths,
          keySignatureExportMode: gp.runManifest.keySignatureExportMode,
          keySignatureInferredKey: gp.runManifest.keySignatureInferredKey,
          keySignatureInferredMode: gp.runManifest.keySignatureInferredMode,
          keySignatureInferredFifths: gp.runManifest.keySignatureInferredFifths,
          keySignatureModeApplied: gp.runManifest.keySignatureModeApplied,
          keySignatureExportKeyWritten: gp.runManifest.keySignatureExportKeyWritten,
        }
      : undefined,
    scoreTitle: scoreTitleResolved,
    universalLeadSheet,
    requestEcho: requestEchoFromReq(req),
  };
}

function runBigBandPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Big Band Plan ${req.seed}`;
  const eraFromPairing = parseBigBandEraFromPairing(req.stylePairing?.era);
  const bb = runBigBandMode({
    seed: req.seed,
    title,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    ensembleConfigId: req.ensembleConfigId,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
        }
      : undefined,
    era: eraFromPairing,
  });
  const ok = bb.validation.ok;
  const runSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const filename = `big_band_plan_${tsSafe}_${runSeed}.json`;
  const payload = {
    composerOsArtifact: 'big_band_planning',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'big_band',
    seed: runSeed,
    tonalCenter: req.tonalCenter,
    bpm: req.bpm,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    timestamp: ts,
    title: bb.title,
    validationPassed: ok,
    validationErrors: bb.validation.errors,
    validationWarnings: bb.validation.warnings,
    manifestHints: bb.manifestHints,
    formSequence: bb.manifestHints.bigBandFormSequence,
    orchestrationReady: bb.manifestHints.bigBandOrchestrationReady,
    era: bb.era,
    composerStyle: bb.composerStyle,
    researchParseOk: bb.researchParseOk,
    resolvedRuleCount: bb.resolvedRules.ruleIds.length,
    bebopLineMetadata: bb.bebopLineMetadata,
    enhancedPlanning: bb.enhancedPlanning,
    stylePairingResolution: bb.stylePairingResolution ?? null,
  };
  const { filepath } = writeArtifactJson(outputDir, filename, payload);
  const pairing = bb.stylePairingResolution;
  const stylePairingReceipt = pairing
    ? {
        summary: `${pairing.songwriterStyle} × ${pairing.arrangerStyle}${
          pairing.era != null ? ` · ${pairing.era}` : ''
        }`,
        confidenceScore: pairing.confidenceScore,
        experimentalFlag: pairing.experimentalFlag,
        songwriterStyle: pairing.songwriterStyle,
        arrangerStyle: pairing.arrangerStyle,
        era: pairing.era,
      }
    : undefined;
  return {
    success: ok,
    productKind: 'planning',
    planningNotice: 'Big Band: planning only — no full ensemble MusicXML in this build.',
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, ok ? [] : bb.validation.errors),
    runManifest: {
      seed: runSeed,
      presetId: 'big_band',
      activeModules: ['big_band_plan'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
    stylePairingReceipt,
  };
}

function runStringQuartetPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `String Quartet Plan ${req.seed}`;
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const sq = runStringQuartetMode({ seed: effectiveSeed, title, totalBars: req.totalBars });
  const ok = sq.validation.ok;
  const filename = `string_quartet_plan_${tsSafe}_${effectiveSeed}.json`;
  const payload = {
    composerOsArtifact: 'string_quartet_planning',
    composerOsVersion: COMPOSER_OS_VERSION,
    presetId: 'string_quartet',
    seed: effectiveSeed,
    tonalCenter: req.tonalCenter,
    bpm: req.bpm,
    totalBars: req.totalBars,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
    timestamp: ts,
    title: sq.title,
    validationPassed: ok,
    validationErrors: sq.validation.errors,
    validationWarnings: sq.validation.warnings,
    manifestHints: sq.manifestHints,
    formSequence: sq.manifestHints.stringQuartetFormSequence,
    orchestrationReady: sq.manifestHints.stringQuartetOrchestrationReady,
  };
  const { filepath } = writeArtifactJson(outputDir, filename, payload);
  return {
    success: ok,
    productKind: 'planning',
    planningNotice: 'String Quartet: planning only — no quartet MusicXML in this build.',
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, ok ? [] : sq.validation.errors),
    runManifest: {
      seed: effectiveSeed,
      presetId: 'string_quartet',
      activeModules: ['string_quartet_plan'],
      timestamp: ts,
      scoreTitle: title,
      variationId: req.variationId,
      creativeControlLevel: req.creativeControlLevel,
      experimentalCreativeLabel: experimentalLabelForLevel(req.creativeControlLevel),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
  };
}
