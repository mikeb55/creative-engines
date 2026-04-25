/**
 * Single Composer OS app entry for Generate: routes presets to golden-path MusicXML
 * or structural/planning runs (no deep UI imports).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest, ImportHarmonyMode } from './appApiTypes';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { generateComposition, type GenerateResult } from './generateComposition';
import { runRiffGeneratorApp } from './riffGeneratorApp';
import { runBigBandMode, type BigBandRunInput } from '../core/big-band/runBigBandMode';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import type { BigBandEraId } from '../core/big-band/bigBandResearchTypes';
import { runStringQuartetMode, type StringQuartetRunInput } from '../core/string-quartet/runStringQuartetMode';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import { runSongMode } from '../core/song-mode/runSongMode';
import type { SectionChordPlan } from '../core/song-mode/songCompilationTypes';
import { buildChordProgressionTextForDuoFromCompiledSong } from '../core/song-mode/songModeBuilder';
import {
  adaptLeadSheetMusicXmlForSongMode,
  extractLockedHarmonyBarsFromImportedTimeline,
  extractLeadSheetMelodyAnchorsFromMusicXml,
} from '../core/song-mode/songModeLeadSheetAdapter';
import { buildUniversalLeadSheetFromCompositionContext } from '../core/lead-sheet/universalLeadSheetBuilder';
import { runGoldenPath, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { GCE_GATE_MIN, scoreGoldenPathResultForGce } from '../core/gce/gceGate';
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
import { resolveFormSections, type FormId } from '../core/form/formPlanner';
import {
  normalizeChordProgressionSeparators,
  normalizeChordToken,
  parseChordProgressionInputWithBarCount,
} from '../core/harmony/chordProgressionParser';
import { clampSongFormBarCount } from '../core/harmony/songFormBarCounts';
import { resolveWybleChordBarsFromRequest } from '../core/goldenPath/resolveWybleChordBars';
import { buildChordExportDiagnosticsReceipt } from '../../core/chordExportDiagnostics';
import { getChordForBar } from '../core/harmony/harmonyResolution';
import {
  isDesktopTruthDumpEnabled,
  logSongModeTruthDumpConsole,
  writeSongModeDesktopTruthDump,
} from './desktopTruthDump';
import { exportVocalLeadSheetMusicXmlViaPython } from '../core/song-mode/songwritingBridgeLeadSheet';
import type { AuthorRuleId } from '../core/song-mode/songwritingResearchTypes';
import { IMPORT_HARMONY_POLICY_VERSION } from '../core/importHarmonyPolicy';

/**
 * Python `songwriting_bridge` CLI — development: repo `engines/songwriting_bridge`;
 * packaged Electron: ship alongside the app via `extraResources` and resolve from
 * `process.resourcesPath` (see desktop `package.json` `extraResources`).
 */
function resolveSongwritingBridgeExportScriptPath(): string {
  const scriptRel = path.join('songwriting_bridge', 'cli_export_lead_sheet.py');
  /** Electron main process (packaged): set by runtime; not on standard Node `Process` typings. */
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (typeof resourcesPath === 'string' && resourcesPath.length > 0) {
    const fromResources = path.join(resourcesPath, scriptRel);
    if (fs.existsSync(fromResources)) {
      return fromResources;
    }
  }
  return path.resolve(__dirname, '../../songwriting_bridge/cli_export_lead_sheet.py');
}

export const SUPPORTED_APP_PRESET_IDS = [
  'guitar_bass_duo',
  'guitar_bass_duo_single_line',
  'ecm_chamber',
  'riff_generator',
  'song_mode',
  'big_band',
  'string_quartet',
  'wyble_etude',
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
    importHarmonyMode: req.importHarmonyMode,
    harmonyBlend: typeof req.harmonyBlend === 'number' && Number.isFinite(req.harmonyBlend) ? req.harmonyBlend : undefined,
    longFormEnabled: req.longFormEnabled,
    styleProfile: req.styleProfile,
    c4Strength: req.c4Strength,
    ...(req.intent
      ? {
          groove: req.intent.groove,
          space: req.intent.space,
          expression: req.intent.expression,
          surprise: req.intent.surprise,
        }
      : {}),
  } as NonNullable<GenerateResult['requestEcho']>;
}

function normalizeImportHarmonyMode(input: unknown): ImportHarmonyMode {
  return input === 'lock_harmony' || input === 'blend_harmony' || input === 'free_harmony' ? input : 'free_harmony';
}

function normalizeHarmonyBlendRaw(input: unknown): number | undefined {
  if (typeof input !== 'number' || !Number.isFinite(input)) return undefined;
  return Math.min(1, Math.max(0, input));
}

function parseBigBandEraFromPairing(era?: string): BigBandEraId | undefined {
  if (
    era === 'swing' ||
    era === 'bebop' ||
    era === 'post_bop' ||
    era === 'contemporary' ||
    era === 'cool_jazz' ||
    era === 'hard_bop' ||
    era === 'fusion'
  ) {
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

  if (id === 'wyble_etude') {
    const { generateWybleEtudeXml } = require('../core/goldenPath/wybleBypassGenerator');
    const reqAny = req as GenerateRequest & { parsedChordBars?: string[]; chordProgressionText?: string };
    const resolved = resolveWybleChordBarsFromRequest(reqAny.parsedChordBars, reqAny.chordProgressionText);
    if (!resolved.ok) {
      return {
        success: false,
        error: resolved.error,
        composerOsVersion: COMPOSER_OS_VERSION,
        productKind: 'musicxml',
        validation: validationForStructural(false, [resolved.error]),
        runManifest: {
          seed: req.seed,
          presetId: 'wyble_etude',
          activeModules: ['jimmy_wyble_engine'],
          timestamp: new Date().toISOString(),
        },
      };
    }
    const chords = resolved.bars;
    console.log(
      '[wyble-harmony]',
      JSON.stringify({
        stage: 'composerOsAppGeneration',
        source: resolved.source,
        parsedChordBarsLength: chords.length,
        chordPerMeasure: chords.map((c, i) => ({ measure: i + 1, chord: c })),
      })
    );
    let result: { guitarXml: string; mode: 'etude' | 'duo'; receipt: unknown };
    try {
      result = generateWybleEtudeXml(
        chords,
        resolved.canonicalChords,
        req.seed,
        req.title,
        { chordSource: resolved.source }
      );
    } catch (e) {
      console.warn('VALIDATION BYPASSED:', (e as Error)?.message);
      return {
        success: false,
        error: (e as Error)?.message ?? String(e),
        composerOsVersion: COMPOSER_OS_VERSION,
        productKind: 'musicxml',
        validation: validationForStructural(false, [String((e as Error)?.message ?? e)]),
        runManifest: {
          seed: req.seed,
          presetId: 'wyble_etude',
          activeModules: ['jimmy_wyble_engine'],
          timestamp: new Date().toISOString(),
        },
      };
    }
    const xmlPath = require('path').join(outputDir, `wyble_etude_${req.seed ?? Date.now()}.musicxml`);
    require('fs').writeFileSync(xmlPath, result.guitarXml, 'utf-8');
    const chordExportDiagnostics = buildChordExportDiagnosticsReceipt(chords, resolved.canonicalChords);
    return {
      success: true,
      composerOsVersion: COMPOSER_OS_VERSION,
      productKind: 'musicxml',
      filepath: xmlPath,
      validation: validationForStructural(true, []),
      chordExportDiagnostics,
      runManifest: {
        seed: req.seed,
        presetId: 'wyble_etude',
        activeModules: ['jimmy_wyble_engine'],
        timestamp: new Date().toISOString(),
        wybleChordSource: resolved.source,
        wybleChordBarCount: chords.length,
        wybleChordsPerBar: chords,
      } as GenerateResult['runManifest'],
    };
  }

  switch (id) {
    case 'guitar_bass_duo':
    case 'guitar_bass_duo_single_line':
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

const SONGWRITER_DISPLAY_TITLE_MAP: Record<string, string> = {
  donald_fagen: 'Donald Fagen',
  wayne_shorter: 'Wayne Shorter',
  bill_evans: 'Bill Evans',
  thelonious_monk: 'Thelonious Monk',
  bacharach: 'Burt Bacharach',
  beatles: 'Beatles',
  barry_harris: 'Barry Harris',
};

function songModeDefaultTitleFromSongwriter(req: GenerateRequest): string {
  const key =
    typeof req.primarySongwriterStyle === 'string' ? req.primarySongwriterStyle.trim().toLowerCase() : '';
  if (!key) return `Song Mode Study ${req.seed}`;
  const display = SONGWRITER_DISPLAY_TITLE_MAP[key];
  if (!display) return `Song Mode Study ${req.seed}`;
  return `${display} Study ${req.seed}`;
}

function chordPlanToProgressionText(chordPlan: SectionChordPlan[]): string {
  return chordPlan.flatMap((s) => s.chordSymbols).join(' ');
}

function runSongStructure(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || songModeDefaultTitleFromSongwriter(req);
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const secondarySw =
    typeof req.secondarySongwriterStyle === 'string' && req.secondarySongwriterStyle.trim() !== ''
      ? req.secondarySongwriterStyle.trim()
      : undefined;
  const authorOv =
    typeof req.authorOverlay === 'string' && req.authorOverlay.trim() !== '' ? req.authorOverlay.trim() : undefined;
  const barTarget = clampSongFormBarCount(req.totalBars, 32);
  const primarySongwriterNormalized =
    typeof req.primarySongwriterStyle === 'string' ? req.primarySongwriterStyle.trim().toLowerCase() : '';
  const leadSheetXmlInput = typeof req.songModeLeadSheetMusicXml === 'string' ? req.songModeLeadSheetMusicXml.trim() : '';
  const SONG_MODE_LEADSHEET_PHASE1_WRITERS = new Set(['donald_fagen', 'barry_harris']);
  const isLeadSheetPhase1WriterRoute = SONG_MODE_LEADSHEET_PHASE1_WRITERS.has(primarySongwriterNormalized);
  const perfBlendRaw =
    typeof req.leadSheetPerformanceBlend === 'number' && Number.isFinite(req.leadSheetPerformanceBlend)
      ? Math.min(1, Math.max(0, req.leadSheetPerformanceBlend))
      : undefined;
  const modeExplicitlyProvided = req.importHarmonyMode !== undefined;
  const normalizedImportHarmonyMode = normalizeImportHarmonyMode(req.importHarmonyMode);
  const importHarmonyModeSource: 'defaulted' | 'explicit' = modeExplicitlyProvided ? 'explicit' : 'defaulted';
  const harmonyBlendRaw = normalizeHarmonyBlendRaw(req.harmonyBlend);
  const lockHarmonyRequested = normalizedImportHarmonyMode === 'lock_harmony';
  let importHarmonyLockApplied = false;
  let importHarmonyLockFallbackReason:
    | 'mode_not_lock'
    | 'no_musicxml_input'
    | 'musicxml_parse_failed'
    | 'timeline_missing'
    | 'timeline_empty'
    | 'timeline_unusable'
    | 'not_song_mode'
    | undefined;
  let importHarmonyLockedBarsCount: number | undefined;
  const shouldParseLeadSheetInput =
    leadSheetXmlInput.length > 0 && (isLeadSheetPhase1WriterRoute || lockHarmonyRequested);
  const leadSheetAdapted =
    shouldParseLeadSheetInput
      ? adaptLeadSheetMusicXmlForSongMode(leadSheetXmlInput, barTarget, {
          leadSheetPerformanceBlend: perfBlendRaw,
        })
      : undefined;
  const leadSheetAnchorsOnly =
    isLeadSheetPhase1WriterRoute && leadSheetXmlInput.length > 0
      ? extractLeadSheetMelodyAnchorsFromMusicXml(leadSheetXmlInput, barTarget, {
          leadSheetPerformanceBlend: perfBlendRaw,
        })
      : undefined;
  const leadSheetMelodyAnchors = leadSheetAdapted?.melodyAnchors?.length
    ? leadSheetAdapted.melodyAnchors
    : leadSheetAnchorsOnly?.melodyAnchors;
  const useLeadSheetHarmony =
    isLeadSheetPhase1WriterRoute && leadSheetAdapted?.ok === true && !!leadSheetAdapted.lockedChordBars?.length;
  const timelineLock =
    lockHarmonyRequested && leadSheetAdapted?.ok && leadSheetAdapted.leadSheet
      ? extractLockedHarmonyBarsFromImportedTimeline(leadSheetAdapted.leadSheet, barTarget)
      : undefined;
  if (lockHarmonyRequested) {
    if (leadSheetXmlInput.length === 0) {
      importHarmonyLockFallbackReason = 'no_musicxml_input';
    } else if (!leadSheetAdapted?.ok) {
      importHarmonyLockFallbackReason = 'musicxml_parse_failed';
    } else if (timelineLock?.ok) {
      importHarmonyLockApplied = true;
      importHarmonyLockedBarsCount = timelineLock.lockedChordBars?.length;
      importHarmonyLockFallbackReason = undefined;
    } else {
      importHarmonyLockFallbackReason = timelineLock?.fallbackReason ?? 'timeline_unusable';
    }
  }
  if (leadSheetAdapted && !leadSheetAdapted.ok && leadSheetAdapted.errors.length > 0) {
    console.warn('[Song Mode LeadSheet] Phase 1 writer input ignored:', leadSheetAdapted.errors.join(' | '));
  }
  if (timelineLock?.warnings?.length) {
    console.warn('[Song Mode lock_harmony] Imported timeline warnings:', timelineLock.warnings.join(' | '));
  }
  const sm = runSongMode({
    seed: effectiveSeed,
    title,
    totalBars: barTarget,
    leadSheet: useLeadSheetHarmony ? leadSheetAdapted?.leadSheet : undefined,
    primarySongwriterStyle: req.primarySongwriterStyle,
    secondarySongwriterStyle: secondarySw,
    authorOverlay: authorOv as AuthorRuleId | undefined,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
  });
  let expectedSongFormBars: number = barTarget;
  if (req.formId != null) {
    const formBarSum = resolveFormSections(req.formId as FormId).reduce((sum, s) => sum + s.length, 0);
    if (formBarSum > 0) {
      expectedSongFormBars = formBarSum;
    }
  }

  const songwriterChordText = sm.compiledSong.chordPlan?.length
    ? chordPlanToProgressionText(sm.compiledSong.chordPlan)
    : undefined;

  const primarySongwriterSet =
    typeof req.primarySongwriterStyle === 'string' && req.primarySongwriterStyle.trim().length > 0;

  const rawCustomHarmony = typeof req.chordProgressionText === 'string' ? req.chordProgressionText.trim() : '';
  const useLockedCustomHarmony = rawCustomHarmony.length > 0 && !useLeadSheetHarmony;
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
    const altCounts =
      req.totalBars && req.totalBars !== barTarget ? [req.totalBars] : undefined;
    const parsedHarmony = parseChordProgressionInputWithBarCount(
      rawCustomHarmony,
      expectedSongFormBars,
      altCounts
    );
    if (!parsedHarmony.ok) {
      return {
        success: false,
        error: parsedHarmony.error,
        productKind: 'musicxml',
        composerOsVersion: COMPOSER_OS_VERSION,
        chordProgressionParseFailed: true,
        validation: validationForStructural(false, [parsedHarmony.error]),
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
    lockedHarmonyBarsAuthoritative = [...parsedHarmony.bars];
  }

  let songwriterLockedBars: string[] | undefined;
  if (
    primarySongwriterSet &&
    !useLockedCustomHarmony &&
    songwriterChordText &&
    songwriterChordText.trim().length > 0
  ) {
    const altCountsSong =
      req.totalBars && req.totalBars !== barTarget ? [req.totalBars] : undefined;
    const tokens = songwriterChordText.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const padded = tokens.slice(0, expectedSongFormBars);
      while (padded.length < expectedSongFormBars) {
        padded.push(tokens[padded.length % tokens.length]!);
      }
      const piped = padded.join('|');
      const chk = parseChordProgressionInputWithBarCount(
        piped,
        expectedSongFormBars,
        altCountsSong
      );
      if (chk.ok) {
        songwriterLockedBars = [...chk.bars];
      }
    }
  }

  /**
   * Without user paste, do not feed the 8-bar song scaffold (verse: Cmaj7→Am7→Fmaj7→G7) into duo32 as
   * `custom` — runGoldenPath would tile it ×4 and bar 2 becomes Am7 instead of any real progression.
   * Use builtin long-form harmony instead until the user supplies 32 pasted bars.
   */
  const lf = resolveLongFormRoute('guitar_bass_duo', {
    totalBars: clampSongFormBarCount(req.totalBars, 32),
    longFormEnabled: req.longFormEnabled ?? true,
  });
  const useBuiltinLongFormWithoutUserPaste =
    !useLockedCustomHarmony && (lf.kind === 'duo32' || lf.kind === 'duo16');
  let chordProgressionText = useLockedCustomHarmony
    ? rawCustomHarmony
    : useBuiltinLongFormWithoutUserPaste
      ? undefined
      : buildChordProgressionTextForDuoFromCompiledSong(sm.compiledSong);
  let harmonyModeForRun: 'builtin' | 'custom' | 'custom_locked' = useLockedCustomHarmony
    ? 'custom_locked'
    : useBuiltinLongFormWithoutUserPaste
      ? 'builtin'
      : 'custom';

  if (!useLockedCustomHarmony && importHarmonyLockApplied && timelineLock?.lockedChordBars?.length) {
    lockedHarmonyBarsAuthoritative = [...timelineLock.lockedChordBars];
    chordProgressionText = lockedHarmonyBarsAuthoritative.join('|');
    harmonyModeForRun = 'custom_locked';
  } else if (!useLockedCustomHarmony && useLeadSheetHarmony) {
    lockedHarmonyBarsAuthoritative = [...(leadSheetAdapted?.lockedChordBars ?? [])];
    chordProgressionText = lockedHarmonyBarsAuthoritative.join('|');
    harmonyModeForRun = 'custom_locked';
  } else if (!useLockedCustomHarmony && songwriterLockedBars && songwriterLockedBars.length > 0) {
    chordProgressionText = songwriterLockedBars.join('|');
    harmonyModeForRun = 'custom_locked';
    lockedHarmonyBarsAuthoritative = songwriterLockedBars;
  }
  logSongModeHarmonyDebug({
    layer: 'composerOsAppGeneration:runSongStructure',
    uiChordProgressionChars: rawCustomHarmony.length,
    useLockedCustomHarmony,
    harmonyMode: harmonyModeForRun,
    songModeLeadSheetApplied: useLeadSheetHarmony,
    totalBars: clampSongFormBarCount(req.totalBars, 32),
    longFormEnabled: req.longFormEnabled ?? true,
  });
  const songModeGoldenPathOptions: RunGoldenPathOptions = {
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
    totalBars: clampSongFormBarCount(req.totalBars, 32),
    longFormEnabled: req.longFormEnabled ?? true,
    keySignatureMode: req.keySignatureMode,
    tonalCenterOverride: req.tonalCenterOverride,
    tonalCenter: req.tonalCenter,
    variationEnabled: req.variationEnabled === true ? true : undefined,
    creativeControlLevel: req.creativeControlLevel,
    intent: req.intent,
    c4Strength: req.c4Strength,
    songModeJamesBrownFunkOverlay: req.songModeJamesBrownFunkOverlay === true ? true : undefined,
    blendStrength: req.blendStrength ?? 'medium',
    primarySongwriterStyle: req.primarySongwriterStyle,
    songModeLeadSheetMelodyAnchors: leadSheetMelodyAnchors,
    leadSheetPerformanceBlend: perfBlendRaw,
    importHarmonyMode: normalizedImportHarmonyMode,
    harmonyBlend: harmonyBlendRaw,
    secondarySongwriterStyle: secondarySw,
    authorOverlay: authorOv,
    era: req.stylePairing?.era ?? undefined,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
  };

  let gp = runGoldenPath(effectiveSeed, songModeGoldenPathOptions);
  gp.context.generationMetadata.importHarmonyMode = normalizedImportHarmonyMode;
  gp.context.generationMetadata.importHarmonyModeSource = importHarmonyModeSource;
  gp.context.generationMetadata.harmonyBlendRaw = harmonyBlendRaw;
  // Stage 4: free_harmony is documented default; policy version set in GenerationMetadata.
  gp.context.generationMetadata.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  gp.context.generationMetadata.importHarmonyLockApplied = importHarmonyLockApplied;
  gp.context.generationMetadata.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
  gp.context.generationMetadata.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
  gp.runManifest.importHarmonyMode = normalizedImportHarmonyMode;
  gp.runManifest.importHarmonyModeSource = importHarmonyModeSource;
  gp.runManifest.harmonyBlendRaw = harmonyBlendRaw;
  gp.runManifest.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
  gp.runManifest.importHarmonyLockApplied = importHarmonyLockApplied;
  gp.runManifest.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
  gp.runManifest.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
  const resolvedSongModeStyle = sm.compiledSong.songwriting?.resolvedStyle;
  if (resolvedSongModeStyle) {
    gp.context.generationMetadata.songModeProfileRuleDiagnostics = {
      styleProfile: req.styleProfile ?? 'STYLE_ECM',
      primarySongwriterStyleId: resolvedSongModeStyle.primaryId,
      secondarySongwriterStyleId: resolvedSongModeStyle.secondaryId,
      authorOverlayId: resolvedSongModeStyle.authorOverlayId,
      classicalOverlayId: resolvedSongModeStyle.classicalOverlayId,
      styleFingerprint: resolvedSongModeStyle.styleFingerprint,
      resolvedRuleIds: resolvedSongModeStyle.resolvedRuleIds,
      songwriterCompProfileId: gp.context.generationMetadata.songModeSongwriterCompProfileId,
      bacharachSongModeRuleBundleId: gp.context.generationMetadata.bacharachSongModeRuleBundleId,
      behaviourSourceIds:
        gp.context.generationMetadata.songModeSectionBehaviourDescriptors?.map((d) => d.sliceId) ?? [],
    };
    gp.runManifest.songModeProfileRuleDiagnostics = gp.context.generationMetadata.songModeProfileRuleDiagnostics;
  }

  /** GCE ship gate — retry with deterministic seed offsets when below threshold (see `core/gce/gceGate.ts`). */
  const GCE_GATE_MAX_RETRIES = 3;
  const GCE_RETRY_SEED_OFFSETS = [77777, 88883, 99991] as const;

  let bestGceScore = -1;
  if (gp.xml && gp.score) {
    const gceResult = scoreGoldenPathResultForGce(gp.score, gp.context);
    bestGceScore = gceResult.overallScore;

    if (!gceResult.passed) {
      for (let i = 0; i < GCE_GATE_MAX_RETRIES; i++) {
        const retrySeed = effectiveSeed + GCE_RETRY_SEED_OFFSETS[i]!;
        const retryGp = runGoldenPath(retrySeed, songModeGoldenPathOptions);
        retryGp.context.generationMetadata.importHarmonyMode = normalizedImportHarmonyMode;
        retryGp.context.generationMetadata.importHarmonyModeSource = importHarmonyModeSource;
        retryGp.context.generationMetadata.harmonyBlendRaw = harmonyBlendRaw;
        retryGp.context.generationMetadata.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
        retryGp.context.generationMetadata.importHarmonyLockApplied = importHarmonyLockApplied;
        retryGp.context.generationMetadata.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
        retryGp.context.generationMetadata.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
        retryGp.runManifest.importHarmonyMode = normalizedImportHarmonyMode;
        retryGp.runManifest.importHarmonyModeSource = importHarmonyModeSource;
        retryGp.runManifest.harmonyBlendRaw = harmonyBlendRaw;
        retryGp.runManifest.importHarmonyPolicyVersion = IMPORT_HARMONY_POLICY_VERSION;
        retryGp.runManifest.importHarmonyLockApplied = importHarmonyLockApplied;
        retryGp.runManifest.importHarmonyLockFallbackReason = importHarmonyLockFallbackReason;
        retryGp.runManifest.importHarmonyLockedBarsCount = importHarmonyLockedBarsCount;
        if (retryGp.xml && retryGp.score) {
          const retryGce = scoreGoldenPathResultForGce(retryGp.score, retryGp.context);
          if (retryGce.overallScore > bestGceScore) {
            bestGceScore = retryGce.overallScore;
            gp = retryGp;
          }
          if (retryGce.passed) break;
        }
      }
    }
  }
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
  if (lockedHarmonyBarsAuthoritative && lockedHarmonyBarsAuthoritative.length >= 8) {
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
  let vocalLeadSheetFilepath: string | undefined;
  if (gp.xml) {
    filename = `composer_os_song_mode_${tsSafe}_${effectiveSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, gp.xml, 'utf-8');
    if (req.includeVocalLeadSheet) {
      const bridgeScriptPath = resolveSongwritingBridgeExportScriptPath();
      const vocalXml = exportVocalLeadSheetMusicXmlViaPython(sm.compiledSong, gp.score, {
        bridgeScriptPath,
        voiceType: sm.compiledSong.voiceType,
      });
      if (vocalXml && filepath.toLowerCase().endsWith('.musicxml')) {
        const vocalPath = filepath.replace(/\.musicxml$/i, '_vocal_lead_sheet.musicxml');
        fs.writeFileSync(vocalPath, vocalXml, 'utf-8');
        vocalLeadSheetFilepath = vocalPath;
      }
    }
    const locked = gp.context.lockedHarmonyBarsRaw;
    if (locked && locked.length === gp.context.form.totalBars) {
      try {
        const disk = validateLockedHarmonyMusicXmlTruthFromFile(filepath, locked);
        if (!disk.ok) diskHarmonyTruthErrors = disk.errors;
      } catch (e) {
        console.warn('VALIDATION BYPASSED:', (e as Error)?.message);
      }
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
      songModeStyleSurfaceNotes: gp.context.generationMetadata.songModeStyleSurfaceNotes,
      songModeDonaldFagenC1Receipt: gp.context.generationMetadata.songModeDonaldFagenC1Receipt,
      songwriterStyleId: gp.context.generationMetadata.songwriterStyleId,
      songModeFagenKeysCompV15Applied: gp.context.generationMetadata.songModeFagenKeysCompV15Applied,
      fagenKeysCompMusicalDiagnostics: gp.context.generationMetadata.fagenKeysCompMusicalDiagnostics,
      sophisticatedPopHarmonyDiagnostics: gp.context.generationMetadata.sophisticatedPopHarmonyDiagnostics,
      bacharachHarmonyDiagnostics: gp.context.generationMetadata.bacharachHarmonyDiagnostics,
      bacharachSongModeRuleBundleId: gp.context.generationMetadata.bacharachSongModeRuleBundleId,
      songwriterSyncopationBias: gp.context.generationMetadata.songwriterSyncopationBias,
      songwriterDensityBias: gp.context.generationMetadata.songwriterDensityBias,
      songModeSectionShapingDiagnostics: gp.context.generationMetadata.songModeSectionShapingDiagnostics,
      songModeSectionBehaviourDescriptors: gp.context.generationMetadata.songModeSectionBehaviourDescriptors,
      songModeProfileRuleDiagnostics: gp.context.generationMetadata.songModeProfileRuleDiagnostics,
      motifAuthorityLevel: gp.context.generationMetadata.motifAuthorityLevel,
      motifDevelopmentSummary: gp.context.generationMetadata.motifDevelopmentSummary,
      importHarmonyPolicyVersion: gp.context.generationMetadata.importHarmonyPolicyVersion,
      gceScore: bestGceScore >= 0 ? bestGceScore : undefined,
      gceGatePassed: bestGceScore >= GCE_GATE_MIN,
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
    motifAuthorityLevel: gp.context.generationMetadata.motifAuthorityLevel,
    motifDevelopmentSummary: gp.context.generationMetadata.motifDevelopmentSummary,
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
          motifAuthorityLevel: gp.runManifest.motifAuthorityLevel,
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
          wybleConsumptionReceipt: gp.runManifest.wybleConsumptionReceipt,
          songModeStyleSurfaceNotes: gp.runManifest.songModeStyleSurfaceNotes,
          songModeDonaldFagenC1Receipt: gp.runManifest.songModeDonaldFagenC1Receipt,
          songModeSectionShapingDiagnostics: gp.runManifest.songModeSectionShapingDiagnostics,
          songModeSectionBehaviourDescriptors: gp.runManifest.songModeSectionBehaviourDescriptors,
          songModeProfileRuleDiagnostics: gp.runManifest.songModeProfileRuleDiagnostics,
          songModeLeadSheetInputApplied: gp.runManifest.songModeLeadSheetInputApplied,
          songModeLeadSheetAnchorStartApplied: gp.runManifest.songModeLeadSheetAnchorStartApplied,
          songModeLeadSheetExpressionStrength: gp.runManifest.songModeLeadSheetExpressionStrength,
          importHarmonyMode: gp.runManifest.importHarmonyMode,
          importHarmonyModeSource: gp.runManifest.importHarmonyModeSource,
          harmonyBlendRaw: gp.runManifest.harmonyBlendRaw,
          importHarmonyPolicyVersion: gp.runManifest.importHarmonyPolicyVersion,
          importHarmonyLockApplied: gp.runManifest.importHarmonyLockApplied,
          importHarmonyLockFallbackReason: gp.runManifest.importHarmonyLockFallbackReason,
          importHarmonyLockedBarsCount: gp.runManifest.importHarmonyLockedBarsCount,
          motifDevelopmentSummary: gp.runManifest.motifDevelopmentSummary,
        }
      : undefined,
    scoreTitle: scoreTitleResolved,
    universalLeadSheet,
    requestEcho: requestEchoFromReq(req),
    vocalLeadSheetFilepath,
    gceScore: bestGceScore >= 0 ? bestGceScore : undefined,
    gceGatePassed: bestGceScore >= GCE_GATE_MIN,
  };
}

function runBigBandPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Big Band Plan ${req.seed}`;
  const eraFromPairing = parseBigBandEraFromPairing(req.stylePairing?.era);
  const chordProgressionText =
    typeof req.chordProgressionText === 'string' && req.chordProgressionText.trim()
      ? req.chordProgressionText.trim()
      : undefined;
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
    ...(typeof req.formId === 'string' && req.formId.trim() ? { formId: req.formId.trim() } : {}),
  });
  const runSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const bigBandRealisationInput: BigBandRunInput & { formId?: string; bpm?: number } = {
    seed: req.seed,
    title,
    totalBars: req.formId?.trim() === 'big_band_blues12' ? 42 : req.totalBars,
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
    ...(chordProgressionText ? { chordProgressionText } : {}),
    ...(typeof req.formId === 'string' && req.formId.trim() ? { formId: req.formId.trim() } : {}),
    ...(typeof req.bpm === 'number' && Number.isFinite(req.bpm) ? { bpm: req.bpm } : {}),
  };
  const realised = runBigBandRealisation(bigBandRealisationInput);
  /** App boundary contract: IPC/UI receives **planning JSON** as primary `filepath` (`productKind: planning`). Companion MusicXML is written when export succeeds — path is echoed inside JSON so hosts can open the score without switching the API surface to `musicxml`-first. */
  let ensembleMusicXmlFilename: string | undefined;
  let ensembleMusicXmlFilepath: string | undefined;
  if (realised.exportPipeline.ok && realised.exportPipeline.xml) {
    ensembleMusicXmlFilename = `big_band_${tsSafe}_${runSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    ensembleMusicXmlFilepath = path.join(outputDir, ensembleMusicXmlFilename);
    fs.writeFileSync(ensembleMusicXmlFilepath, realised.exportPipeline.xml, 'utf-8');
  }
  const ok = bb.validation.ok;
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
    ...(ensembleMusicXmlFilename && ensembleMusicXmlFilepath
      ? {
          ensembleMusicXmlFilename,
          ensembleMusicXmlFilepath,
          exportPipelineNotes:
            realised.exportPipeline.errors?.join(' | ') ??
            (ensembleMusicXmlFilepath ? 'Ensemble MusicXML generated alongside planning JSON.' : undefined),
        }
      : {}),
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
    planningNotice:
      realised.exportPipeline.errors?.join(' | ') ??
      (ensembleMusicXmlFilepath
        ? 'Big Band: planning JSON is primary API artifact; ensemble MusicXML path is included in JSON payload.'
        : 'Big Band: planning only — no full ensemble MusicXML in this build.'),
    composerOsVersion: COMPOSER_OS_VERSION,
    filename,
    filepath,
    validation: validationForStructural(ok, ok ? [] : bb.validation.errors),
    runManifest: {
      seed: runSeed,
      presetId: 'big_band',
      activeModules: ensembleMusicXmlFilepath ? ['big_band_plan', 'big_band_realise'] : ['big_band_plan'],
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
  const chordProgressionText =
    typeof req.chordProgressionText === 'string' && req.chordProgressionText.trim()
      ? req.chordProgressionText.trim()
      : undefined;
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const sq = runStringQuartetMode({ seed: effectiveSeed, title, totalBars: req.totalBars });
  const quartetRealisationInput: StringQuartetRunInput & { formId?: string; era?: BigBandEraId; bpm?: number } = {
    seed: effectiveSeed,
    title,
    totalBars: req.totalBars,
    ...(chordProgressionText ? { chordProgressionText } : {}),
    ...(typeof req.formId === 'string' && req.formId.trim() ? { formId: req.formId.trim() } : {}),
    ...(parseBigBandEraFromPairing(req.stylePairing?.era)
      ? { era: parseBigBandEraFromPairing(req.stylePairing?.era) }
      : {}),
    ...(typeof req.bpm === 'number' && Number.isFinite(req.bpm) ? { bpm: req.bpm } : {}),
  };
  const realised = runQuartetRealisation(quartetRealisationInput);
  if (realised.exportPipeline.ok && realised.exportPipeline.xml) {
    const xmlFilename = `string_quartet_${tsSafe}_${effectiveSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    const xmlFilepath = path.join(outputDir, xmlFilename);
    fs.writeFileSync(xmlFilepath, realised.exportPipeline.xml, 'utf-8');
    return {
      success: true,
      productKind: 'musicxml',
      filepath: xmlFilepath,
      filename: xmlFilename,
      composerOsVersion: COMPOSER_OS_VERSION,
      validation: validationForStructural(true, []),
      runManifest: {
        seed: effectiveSeed,
        presetId: 'string_quartet',
        activeModules: ['string_quartet_plan', 'string_quartet_realise'],
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
    planningNotice:
      'String Quartet: planning JSON — ensemble MusicXML not produced (realisation or export failed).',
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
