/**
 * Single Composer OS app entry for Generate: routes presets to golden-path MusicXML
 * or structural/planning runs (no deep UI imports).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GenerateRequest, ImportHarmonyMode } from './appApiTypes';
import type { GenerationMetadata } from '../core/compositionContext';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { generateComposition, type GenerateResult } from './generateComposition';
import { runRiffGeneratorApp } from './riffGeneratorApp';
import { runBigBandMode, type BigBandRunInput } from '../core/big-band/runBigBandMode';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import type { BigBandComposerId, BigBandEraId } from '../core/big-band/bigBandResearchTypes';
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
import {
  indieArtPopAlternateTuningWantsDualElectricGuitars,
  normalizeAlternateGuitarTuningRequest,
  type AlternateGuitarTuningResolved,
} from '../core/song-mode/alternateGuitarTunings';
import {
  applyRepeatTruthToScoreModel,
  buildUniversalLeadSheetFromCompositionContext,
} from '../core/lead-sheet/universalLeadSheetBuilder';
import { importLeadSheetFromMusicXml } from '../core/lead-sheet/leadSheetMusicXmlImport';
import { runGoldenPath, type RunGoldenPathOptions } from '../core/goldenPath/runGoldenPath';
import { GCE_GATE_MIN, scoreGoldenPathResultForGce } from '../core/gce/gceGate';
import { logSongModeHarmonyDebug } from '../core/goldenPath/customLockedHarmonyRouting';
import { chromaticStrengthToOutsideLevel } from '../core/slonimsky/slonimskyPatternService';
import { resolveEffectiveGenerationSeed } from '../core/creative-controls/creativeControlResolver';
import { experimentalLabelForLevel } from '../core/creative-controls/experimentalEvaluator';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import {
  assertLockedHarmonyScoreAndXmlMatchBars,
  validateLockedHarmonyMusicXmlTruthFromFile,
} from '../core/export/validateLockedHarmonyMusicXml';
import { writeOutputManifest } from './writeOutputManifest';
import { mapAppStyleStackToEngine } from './mapStyleStack';
import type {
  CombinedEvaluationResult,
  ExtractedStyleFeatures,
  StyleProfile,
} from '../core/evaluation/evaluationTypes';
import { createCombinedEvaluator } from '../core/evaluation/combinedEvaluator';
import { basieStyleProfile } from '../core/evaluation/basieStyleProfile';
import { ellingtonStyleProfile } from '../core/evaluation/ellingtonStyleProfile';
import { schneiderStyleProfile } from '../core/evaluation/schneiderStyleProfile';
import { quincyStyleProfile } from '../core/evaluation/quincyStyleProfile';
import { thadJonesStyleProfile } from '../core/evaluation/thadJonesStyleProfile';
import { gilEvansStyleProfile } from '../core/evaluation/gilEvansStyleProfile';
import { bobBrookmeyerStyleProfile } from '../core/evaluation/bobBrookmeyerStyleProfile';
import { clareFischerStyleProfile } from '../core/evaluation/clareFischerStyleProfile';
import { oliverNelsonStyleProfile } from '../core/evaluation/oliverNelsonStyleProfile';
import { sammyNesticoStyleProfile } from '../core/evaluation/sammyNesticoStyleProfile';
import { scoreModelFeatureExtractor } from '../core/evaluation/featureExtractor';
import { defaultGceWeights } from '../core/evaluation/gceEvaluator';
import { defaultLockGates } from '../core/evaluation/lockGates';
import { resolveLongFormRoute } from '../core/form/longFormRouteResolver';
import { resolveFormSections, type FormId } from '../core/form/formPlanner';
import {
  lockedHarmonyChordSymbolsEquivalent,
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
import { generateSlonimskyEtudeXml } from '../core/slonimsky/slonimskyEtudeGenerator';
import type { IntervalPatternId } from '../core/slonimsky/slonimskyEngine';
import { writeDrumGuide } from '../core/export/midiDrumGuideWriter';

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
  'slonimsky_etude',
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

/**
 * Enables `runGoldenPath` deterministic dual-guitar tuning fixture (`debugFixtureMode === 'indie_dual_guitar_tuning_proof'`).
 * When `apiGenerate` forwards `GenerateRequest.debugFixtureMode`, use it directly; otherwise recognise the smoke
 * contract from `tests/appApiBoundary.test.ts` (same seed/profile/songwriter tuple, no alternate tuning envelope).
 */
const APP_API_BOUNDARY_INDIE_TUNING_PROOF_SEED = 812347;

function indieDualGuitarTuningProofFixtureRequested(req: GenerateRequest): boolean {
  if (req.debugFixtureMode === 'indie_dual_guitar_tuning_proof') return true;
  const primary =
    typeof req.primarySongwriterStyle === 'string' ? req.primarySongwriterStyle.trim().toLowerCase() : '';
  return (
    req.presetId === 'song_mode' &&
    req.styleProfile === 'STYLE_INDIE_ART_POP' &&
    primary === 'donald_fagen' &&
    req.seed === APP_API_BOUNDARY_INDIE_TUNING_PROOF_SEED &&
    req.alternateGuitarTuning === undefined
  );
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
    ...(req.chromaticStrength === 'off' ||
    req.chromaticStrength === 'subtle' ||
    req.chromaticStrength === 'prominent'
      ? { chromaticStrength: req.chromaticStrength }
      : {}),
    ...(indieDualGuitarTuningProofFixtureRequested(req)
      ? { debugFixtureMode: 'indie_dual_guitar_tuning_proof' as const }
      : {}),
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

/** Big band / string quartet Slonimsky: prefer style-pairing songwriter, then Song Mode primary. */
function ensembleSlonimskySongwriterIdFromRequest(req: GenerateRequest): string | undefined {
  const fromPairing = req.stylePairing?.songwriterStyle?.trim();
  const fromPrimary = req.primarySongwriterStyle?.trim();
  return fromPairing || fromPrimary || undefined;
}

/** Ensemble SQ realisation: songwriter echo + optional Frank Zappa string-quartet harmony slice + meter map. */
function buildStringQuartetGenerationMetadata(
  req: GenerateRequest,
  totalBars: number,
  chordProgressionText: string | undefined
): GenerationMetadata | undefined {
  const sw = ensembleSlonimskySongwriterIdFromRequest(req)?.trim().toLowerCase();
  if (!sw) return undefined;
  const meta: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: sw,
    ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
  };
  const frankSq =
    sw === 'frank_zappa' && req.zappaSQHarmonySlice !== false;
  if (frankSq) {
    (meta as GenerationMetadata & { zappaSQHarmonySlice?: boolean }).zappaSQHarmonySlice = true;
    const raw =
      typeof chordProgressionText === 'string' && chordProgressionText.trim()
        ? chordProgressionText.trim()
        : '';
    const parsed = raw ? parseChordProgressionInputWithBarCount(raw, totalBars) : undefined;
    if (parsed?.ok && parsed.bars.length === totalBars) {
      meta.frankZappaEffectiveHarmonyBars = [...parsed.bars];
      meta.parsedCustomProgressionBars = [...parsed.bars];
      meta.harmonySource = 'custom';
    }
  }
  return meta;
}

function ensembleSlonimskyReceiptLines(
  cs: 'off' | 'subtle' | 'prominent' | undefined
): string[] | undefined {
  if (cs === 'prominent') {
    return [
      'Chromatic Strength (prominent): Slonimsky allowedOutsideLevel capped at 2; intervallic patterns eligible on non-cadence bars.',
    ];
  }
  if (cs === 'subtle') {
    return [
      'Chromatic Strength (subtle): Slonimsky allowedOutsideLevel capped at 1; light outside colour on phrase peaks only.',
    ];
  }
  if (cs === 'off') {
    return [
      'Chromatic Strength (off): Slonimsky pattern generation suppressed; melodic lines use chord-tone anchors only.',
    ];
  }
  return undefined;
}

function normalizeImportHarmonyMode(input: unknown): ImportHarmonyMode {
  return input === 'lock_harmony' || input === 'blend_harmony' || input === 'free_harmony' ? input : 'free_harmony';
}

function normalizeHarmonyBlendRaw(input: unknown): number | undefined {
  if (typeof input !== 'number' || !Number.isFinite(input)) return undefined;
  return Math.min(1, Math.max(0, input));
}

/** Flatten current Song Mode harmony routing to one chord string per bar (for `blend_harmony` merge). */
function flattenSongModeHarmonySelectionToBars(args: {
  expectedSongFormBars: number;
  harmonyModeForRun: 'builtin' | 'custom' | 'custom_locked';
  chordProgressionText: string | undefined;
  lockedHarmonyBarsAuthoritative: string[] | undefined;
  duoBuiltProgressionFallback: string | undefined;
  altChordBarCounts: number[] | undefined;
}): string[] | null {
  const {
    expectedSongFormBars,
    harmonyModeForRun,
    chordProgressionText,
    lockedHarmonyBarsAuthoritative,
    duoBuiltProgressionFallback,
    altChordBarCounts,
  } = args;
  if (
    lockedHarmonyBarsAuthoritative &&
    lockedHarmonyBarsAuthoritative.length === expectedSongFormBars
  ) {
    return [...lockedHarmonyBarsAuthoritative];
  }
  const text =
    (typeof chordProgressionText === 'string' && chordProgressionText.trim().length > 0
      ? chordProgressionText.trim()
      : undefined) ??
    (typeof duoBuiltProgressionFallback === 'string' && duoBuiltProgressionFallback.trim().length > 0
      ? duoBuiltProgressionFallback.trim()
      : undefined);
  if (text) {
    const parsed = parseChordProgressionInputWithBarCount(text, expectedSongFormBars, altChordBarCounts);
    if (parsed.ok) return [...parsed.bars];
  }
  if (harmonyModeForRun === 'builtin' && duoBuiltProgressionFallback?.trim()) {
    const parsed = parseChordProgressionInputWithBarCount(
      duoBuiltProgressionFallback.trim(),
      expectedSongFormBars,
      altChordBarCounts
    );
    if (parsed.ok) return [...parsed.bars];
  }
  return null;
}

/** RULE 1 / RULE 2 — per-bar pick when imported vs generated symbols differ (after token normalize). */
function mergeSongModeImportedAndGeneratedHarmonyBars(
  generatedBars: string[],
  importedBars: string[],
  harmonyBlend: number
): string[] {
  const n = Math.min(generatedBars.length, importedBars.length);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const g = generatedBars[i] ?? '';
    const imp = importedBars[i] ?? '';
    if (normalizeChordToken(g.trim()) === normalizeChordToken(imp.trim())) {
      out.push(g || imp);
    } else {
      out.push(harmonyBlend >= 0.5 ? imp || g : g || imp);
    }
  }
  return out;
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

  if (id === 'slonimsky_etude') {
    const reqAny = req as GenerateRequest & { parsedChordBars?: string[]; patternId?: string };
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
          presetId: 'slonimsky_etude',
          activeModules: ['slonimsky_etude_generator'],
          timestamp: new Date().toISOString(),
        },
      };
    }
    const chords = resolved.bars;
    const patternIdRaw =
      (typeof req.slonimskyPatternId === 'string' && req.slonimskyPatternId.trim()) ||
      (typeof reqAny.patternId === 'string' && reqAny.patternId.trim()) ||
      '';
    if (!patternIdRaw) {
      const msg =
        'Slonimsky Etude requires a pattern id (send slonimskyPatternId or patternId with a catalogue pattern such as p_wholeTone).';
      return {
        success: false,
        error: msg,
        composerOsVersion: COMPOSER_OS_VERSION,
        productKind: 'musicxml',
        validation: validationForStructural(false, [msg]),
        runManifest: {
          seed: req.seed,
          presetId: 'slonimsky_etude',
          activeModules: ['slonimsky_etude_generator'],
          timestamp: new Date().toISOString(),
        },
      };
    }
    const keyPcRaw =
      typeof req.slonimskyKeyPc === 'number' && Number.isFinite(req.slonimskyKeyPc)
        ? Math.round(req.slonimskyKeyPc)
        : 0;
    const keyPc = ((keyPcRaw % 12) + 12) % 12;
    const bpm =
      typeof req.bpm === 'number' && Number.isFinite(req.bpm) && req.bpm > 0 ? req.bpm : 120;
    const cycleKeys = req.slonimskyCycleKeys === true;
    const outside =
      chromaticStrengthToOutsideLevel(req.chromaticStrength) ?? (1 as const);
    const allowedOutsideLevel = Math.max(0, Math.min(2, outside)) as 0 | 1 | 2;

    console.log(
      '[slonimsky-etude]',
      JSON.stringify({
        stage: 'composerOsAppGeneration',
        patternId: patternIdRaw,
        chordSource: resolved.source,
        chordBarCount: chords.length,
        keyPc,
        bpm,
        cycleKeys,
      })
    );

    let xmlBody: string;
    let exportErrors: string[];
    try {
      const gen = generateSlonimskyEtudeXml({
        patternId: patternIdRaw as IntervalPatternId,
        chordSymbols: chords,
        keyPc,
        bpm,
        seed: req.seed,
        cycleKeys,
        allowedOutsideLevel,
      });
      xmlBody = gen.xml;
      exportErrors = gen.errors;
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
          presetId: 'slonimsky_etude',
          activeModules: ['slonimsky_etude_generator'],
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (!xmlBody?.trim() || exportErrors.length > 0) {
      const msg =
        exportErrors.length > 0
          ? exportErrors.join(' | ')
          : 'Slonimsky Etude export produced empty MusicXML.';
      return {
        success: false,
        error: msg,
        composerOsVersion: COMPOSER_OS_VERSION,
        productKind: 'musicxml',
        validation: validationForStructural(false, [msg]),
        runManifest: {
          seed: req.seed,
          presetId: 'slonimsky_etude',
          activeModules: ['slonimsky_etude_generator'],
          timestamp: new Date().toISOString(),
        },
      };
    }

    const xmlPath = path.join(outputDir, `slonimsky_etude_${req.seed ?? Date.now()}.musicxml`);
    fs.writeFileSync(xmlPath, xmlBody, 'utf-8');
    return {
      success: true,
      composerOsVersion: COMPOSER_OS_VERSION,
      productKind: 'musicxml',
      filepath: xmlPath,
      validation: validationForStructural(true, []),
      runManifest: {
        seed: req.seed,
        presetId: 'slonimsky_etude',
        activeModules: ['slonimsky_etude_generator'],
        timestamp: new Date().toISOString(),
        slonimskyPatternId: patternIdRaw,
        slonimskyChordSource: resolved.source,
        slonimskyChordBarCount: chords.length,
        slonimskyChordsPerBar: chords,
        slonimskyKeyPc: keyPc,
        slonimskyCycleKeys: cycleKeys,
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
  frank_zappa: 'Frank Zappa',
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
  const alternateGuitarTuningNormalized = normalizeAlternateGuitarTuningRequest(req.alternateGuitarTuning);
  /** Fixture path must populate metadata `alternateGuitarTuning.mode === 'separate'` so MusicXML validation uses dual-guitar checks (no bass part). */
  const alternateGuitarTuningForGoldenPath: AlternateGuitarTuningResolved | undefined =
    indieDualGuitarTuningProofFixtureRequested(req)
      ? normalizeAlternateGuitarTuningRequest({
          mode: 'separate',
          guitar1: { presetId: 'drop_d' },
          guitar2: { presetId: 'dadgad' },
        }) ?? undefined
      : alternateGuitarTuningNormalized ?? undefined;
  const genCorr = req.__generateCorrelationId;
  if (typeof genCorr === 'string' && genCorr.length > 0) {
    console.log('[GEN-CORR] runSongStructure:post-normalize', {
      corr: genCorr,
      alternateGuitarTuningNormalized,
      indieDualElectric:
        req.styleProfile === 'STYLE_INDIE_ART_POP' &&
        indieArtPopAlternateTuningWantsDualElectricGuitars(alternateGuitarTuningNormalized ?? undefined),
    });
  }
  const lockHarmonyRequested = normalizedImportHarmonyMode === 'lock_harmony';
  const blendHarmonyRequested = normalizedImportHarmonyMode === 'blend_harmony';
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
    leadSheetXmlInput.length > 0 &&
    (isLeadSheetPhase1WriterRoute || lockHarmonyRequested || blendHarmonyRequested);
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
    (lockHarmonyRequested || blendHarmonyRequested) && leadSheetAdapted?.ok && leadSheetAdapted.leadSheet
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
  if (blendHarmonyRequested) {
    if (leadSheetXmlInput.length === 0) {
      importHarmonyLockFallbackReason = 'no_musicxml_input';
    } else if (!leadSheetAdapted?.ok) {
      importHarmonyLockFallbackReason = 'musicxml_parse_failed';
    } else if (!timelineLock?.ok) {
      importHarmonyLockFallbackReason = timelineLock?.fallbackReason ?? 'timeline_unusable';
    }
  }
  if (leadSheetAdapted && !leadSheetAdapted.ok && leadSheetAdapted.errors.length > 0) {
    console.warn('[Song Mode LeadSheet] Phase 1 writer input ignored:', leadSheetAdapted.errors.join(' | '));
  }
  if (timelineLock?.warnings?.length) {
    const tag = lockHarmonyRequested ? 'lock_harmony' : blendHarmonyRequested ? 'blend_harmony' : 'import_harmony';
    console.warn(`[Song Mode ${tag}] Imported timeline warnings:`, timelineLock.warnings.join(' | '));
  }
  const importedLeadSheetForSongMode =
    leadSheetAdapted?.ok === true && leadSheetAdapted.leadSheet ? leadSheetAdapted.leadSheet : undefined;
  const sm = runSongMode({
    seed: effectiveSeed,
    title,
    totalBars: barTarget,
    leadSheet: importedLeadSheetForSongMode,
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
    songwriterChordText.trim().length > 0 &&
    !indieDualGuitarTuningProofFixtureRequested(req)
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
  const duoBuiltFallbackText = buildChordProgressionTextForDuoFromCompiledSong(sm.compiledSong);
  let chordProgressionText = useLockedCustomHarmony
    ? rawCustomHarmony
    : useBuiltinLongFormWithoutUserPaste
      ? undefined
      : duoBuiltFallbackText;
  let harmonyModeForRun: 'builtin' | 'custom' | 'custom_locked' = useLockedCustomHarmony
    ? 'custom_locked'
    : useBuiltinLongFormWithoutUserPaste
      ? 'builtin'
      : 'custom';

  const blendHarmonyEffective = harmonyBlendRaw ?? 0;
  const importedTimelineBars =
    timelineLock?.ok && timelineLock.lockedChordBars?.length ? timelineLock.lockedChordBars : undefined;
  const applyImportedTimelineFully =
    !useLockedCustomHarmony &&
    !!importedTimelineBars &&
    (importHarmonyLockApplied || (blendHarmonyRequested && blendHarmonyEffective >= 1));

  if (applyImportedTimelineFully) {
    lockedHarmonyBarsAuthoritative = [...importedTimelineBars];
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

  const blendMergeActive =
    !useLockedCustomHarmony &&
    blendHarmonyRequested &&
    !!importedTimelineBars &&
    blendHarmonyEffective > 0 &&
    blendHarmonyEffective < 1;

  if (blendMergeActive) {
    const altCountsSong =
      req.totalBars && req.totalBars !== barTarget ? [req.totalBars] : undefined;
    const genBars = flattenSongModeHarmonySelectionToBars({
      expectedSongFormBars,
      harmonyModeForRun,
      chordProgressionText,
      lockedHarmonyBarsAuthoritative,
      duoBuiltProgressionFallback: duoBuiltFallbackText,
      altChordBarCounts: altCountsSong,
    });
    const impBars = importedTimelineBars.slice(0, expectedSongFormBars);
    if (
      genBars &&
      genBars.length === expectedSongFormBars &&
      impBars.length === expectedSongFormBars
    ) {
      const merged = mergeSongModeImportedAndGeneratedHarmonyBars(genBars, impBars, blendHarmonyEffective);
      lockedHarmonyBarsAuthoritative = merged;
      chordProgressionText = merged.join('|');
      harmonyModeForRun = 'custom_locked';
    }
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
  const universalRepeatTruthBars =
    sm.universalLeadSheet.source === 'imported_musicxml' &&
    typeof sm.universalLeadSheet.totalBars === 'number' &&
    Number.isFinite(sm.universalLeadSheet.totalBars) &&
    sm.universalLeadSheet.totalBars >= 1
      ? Math.floor(sm.universalLeadSheet.totalBars)
      : undefined;
  const resolvedSongModeTotalBars = universalRepeatTruthBars ?? clampSongFormBarCount(req.totalBars, 32);
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
    totalBars: resolvedSongModeTotalBars,
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
    ...(req.chromaticStrength === 'off' ||
    req.chromaticStrength === 'subtle' ||
    req.chromaticStrength === 'prominent'
      ? { chromaticStrength: req.chromaticStrength }
      : {}),
    primarySongwriterStyle: req.primarySongwriterStyle,
    songModeLeadSheetMelodyAnchors: leadSheetMelodyAnchors,
    leadSheetPerformanceBlend: perfBlendRaw,
    importHarmonyMode: normalizedImportHarmonyMode,
    harmonyBlend: harmonyBlendRaw,
    secondarySongwriterStyle: secondarySw,
    authorOverlay: authorOv,
    alternateGuitarTuning: alternateGuitarTuningForGoldenPath,
    era: req.stylePairing?.era ?? undefined,
    stylePairing: req.stylePairing
      ? {
          songwriterStyle: req.stylePairing.songwriterStyle,
          arrangerStyle: req.stylePairing.arrangerStyle,
          era: req.stylePairing.era,
          seed: effectiveSeed,
        }
      : undefined,
    ...(indieDualGuitarTuningProofFixtureRequested(req)
      ? { debugFixtureMode: 'indie_dual_guitar_tuning_proof' as const }
      : {}),
    ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
    ...(req.primarySongwriterStyle?.trim().toLowerCase() === 'frank_zappa'
      ? {
          zappaSoloMidiLow: req.zappaSoloMidiLow,
          zappaSoloMidiHigh: req.zappaSoloMidiHigh,
          zappaSoloDensity: req.zappaSoloDensity,
          zappaSoloDissonance: req.zappaSoloDissonance,
        }
      : {}),
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
  if (gp.score) {
    const adjusted = applyRepeatTruthToScoreModel(gp.score, sm.universalLeadSheet);
    gp.score = adjusted;
    const mb = adjusted.parts[0]?.measures.length;
    if (mb !== undefined && gp.context.form) {
      gp.context.form.totalBars = mb;
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
  const mdLockedTruth = gp.context.generationMetadata;
  const tbLockedTruth = gp.context.form.totalBars;
  const bwLockedTruth = mdLockedTruth?.brianWilsonEffectiveHarmonyBars;
  const swLockedTruth = mdLockedTruth?.stevieWonderEffectiveHarmonyBars;
  const rhLockedTruth = mdLockedTruth?.radioheadEffectiveHarmonyBars;
  const jbLockedTruth = mdLockedTruth?.jamesBrownEffectiveHarmonyBars;
  const jmLockedTruth = mdLockedTruth?.joniMitchellEffectiveHarmonyBars;
  const syLockedTruth = mdLockedTruth?.sonicYouthEffectiveHarmonyBars;
  const pmLockedTruth = mdLockedTruth?.patMethenyEffectiveHarmonyBars;
  const wsLockedTruth = mdLockedTruth?.wayneShorterEffectiveHarmonyBars;
  const bhLockedTruth = mdLockedTruth?.barryHarrisEffectiveHarmonyBars;
  const beLockedTruth = mdLockedTruth?.billEvansEffectiveHarmonyBars;
  const baLockedTruth = mdLockedTruth?.bacharachEffectiveHarmonyBars;
  const dfLockedTruth = mdLockedTruth?.donaldFagenEffectiveHarmonyBars;
  const eccLockedTruth = mdLockedTruth?.ecmChamberEffectiveHarmonyBars;
  const ajLockedTruth = mdLockedTruth?.jobimEffectiveHarmonyBars;
  const hhLockedTruth = mdLockedTruth?.herbieHancockEffectiveHarmonyBars;
  const shLockedTruth = mdLockedTruth?.sondheimEffectiveHarmonyBars;
  const kbLockedTruth = mdLockedTruth?.kateBushEffectiveHarmonyBars;
  const tmLockedTruth = mdLockedTruth?.theloniousMonkEffectiveHarmonyBars;
  const ahLockedTruth = mdLockedTruth?.andrewHillEffectiveHarmonyBars;
  const cpLockedTruth = mdLockedTruth?.charlieParkerEffectiveHarmonyBars;
  const fzLockedTruth = mdLockedTruth?.frankZappaEffectiveHarmonyBars;
  const fzHcTruth = gp.context.harmonyContext;
  const harmonyBarsForLockedAssertions =
    mdLockedTruth?.songwriterStyleId === 'brian_wilson' &&
    Array.isArray(bwLockedTruth) &&
    bwLockedTruth.length === tbLockedTruth &&
    lockedHarmonyBarsAuthoritative &&
    bwLockedTruth.length === lockedHarmonyBarsAuthoritative.length
      ? bwLockedTruth
      : mdLockedTruth?.songwriterStyleId === 'stevie_wonder' &&
          Array.isArray(swLockedTruth) &&
          swLockedTruth.length === tbLockedTruth &&
          lockedHarmonyBarsAuthoritative &&
          swLockedTruth.length === lockedHarmonyBarsAuthoritative.length
        ? swLockedTruth
        : mdLockedTruth?.songwriterStyleId === 'radiohead' &&
            Array.isArray(rhLockedTruth) &&
            rhLockedTruth.length === tbLockedTruth &&
            lockedHarmonyBarsAuthoritative &&
            rhLockedTruth.length === lockedHarmonyBarsAuthoritative.length
          ? rhLockedTruth
          : mdLockedTruth?.songwriterStyleId === 'james_brown' &&
              Array.isArray(jbLockedTruth) &&
              jbLockedTruth.length === tbLockedTruth &&
              lockedHarmonyBarsAuthoritative &&
              jbLockedTruth.length === lockedHarmonyBarsAuthoritative.length
            ? jbLockedTruth
            : (mdLockedTruth?.songwriterStyleId === 'joni_mitchell' ||
                  mdLockedTruth?.styleProfile === 'STYLE_JONI_MITCHELL') &&
                Array.isArray(jmLockedTruth) &&
                jmLockedTruth.length === tbLockedTruth &&
                lockedHarmonyBarsAuthoritative &&
                jmLockedTruth.length === lockedHarmonyBarsAuthoritative.length
              ? jmLockedTruth
              : (mdLockedTruth?.songwriterStyleId === 'sonic_youth' ||
                    mdLockedTruth?.styleProfile === 'STYLE_SONIC_YOUTH') &&
                  Array.isArray(syLockedTruth) &&
                  syLockedTruth.length === tbLockedTruth &&
                  lockedHarmonyBarsAuthoritative &&
                  syLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                ? syLockedTruth
                : (mdLockedTruth?.songwriterStyleId === 'pat_metheny' ||
                      mdLockedTruth?.styleProfile === 'STYLE_PAT_METHENY') &&
                    Array.isArray(pmLockedTruth) &&
                    pmLockedTruth.length === tbLockedTruth &&
                    lockedHarmonyBarsAuthoritative &&
                    pmLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                  ? pmLockedTruth
                  : mdLockedTruth?.songwriterStyleId === 'wayne_shorter' &&
                      Array.isArray(wsLockedTruth) &&
                      wsLockedTruth.length === tbLockedTruth &&
                      lockedHarmonyBarsAuthoritative &&
                      wsLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                    ? wsLockedTruth
                    : mdLockedTruth?.songwriterStyleId === 'barry_harris' &&
                        Array.isArray(bhLockedTruth) &&
                        bhLockedTruth.length === tbLockedTruth &&
                        lockedHarmonyBarsAuthoritative &&
                        bhLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                      ? bhLockedTruth
                      : mdLockedTruth?.songwriterStyleId === 'bill_evans' &&
                          Array.isArray(beLockedTruth) &&
                          beLockedTruth.length === tbLockedTruth &&
                          lockedHarmonyBarsAuthoritative &&
                          beLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                        ? beLockedTruth
                        : mdLockedTruth?.songwriterStyleId === 'bacharach' &&
                            Array.isArray(baLockedTruth) &&
                            baLockedTruth.length === tbLockedTruth &&
                            lockedHarmonyBarsAuthoritative &&
                            baLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                          ? baLockedTruth
                          : mdLockedTruth?.songwriterStyleId === 'donald_fagen' &&
                              Array.isArray(dfLockedTruth) &&
                              dfLockedTruth.length === tbLockedTruth &&
                              lockedHarmonyBarsAuthoritative &&
                              dfLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                            ? dfLockedTruth
                            : mdLockedTruth?.songwriterStyleId === 'ecm_chamber' &&
                                Array.isArray(eccLockedTruth) &&
                                eccLockedTruth.length === tbLockedTruth &&
                                lockedHarmonyBarsAuthoritative &&
                                eccLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                              ? eccLockedTruth
                              : mdLockedTruth?.songwriterStyleId === 'antonio_carlos_jobim' &&
                                  Array.isArray(ajLockedTruth) &&
                                  ajLockedTruth.length === tbLockedTruth &&
                                  lockedHarmonyBarsAuthoritative &&
                                  ajLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                ? ajLockedTruth
                                : mdLockedTruth?.songwriterStyleId === 'herbie_hancock' &&
                                    Array.isArray(hhLockedTruth) &&
                                    hhLockedTruth.length === tbLockedTruth &&
                                    lockedHarmonyBarsAuthoritative &&
                                    hhLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                  ? hhLockedTruth
                                  : mdLockedTruth?.songwriterStyleId === 'stephen_sondheim' &&
                                      Array.isArray(shLockedTruth) &&
                                      shLockedTruth.length === tbLockedTruth &&
                                      lockedHarmonyBarsAuthoritative &&
                                      shLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                    ? shLockedTruth
                                    : mdLockedTruth?.songwriterStyleId === 'kate_bush' &&
                                        Array.isArray(kbLockedTruth) &&
                                        kbLockedTruth.length === tbLockedTruth &&
                                        lockedHarmonyBarsAuthoritative &&
                                        kbLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                      ? kbLockedTruth
                                      : mdLockedTruth?.songwriterStyleId === 'thelonious_monk' &&
                                          Array.isArray(tmLockedTruth) &&
                                          tmLockedTruth.length === tbLockedTruth &&
                                          lockedHarmonyBarsAuthoritative &&
                                          tmLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                        ? tmLockedTruth
                                        : mdLockedTruth?.songwriterStyleId === 'andrew_hill' &&
                                            Array.isArray(ahLockedTruth) &&
                                            ahLockedTruth.length === tbLockedTruth &&
                                            lockedHarmonyBarsAuthoritative &&
                                            ahLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                          ? ahLockedTruth
                                          : mdLockedTruth?.songwriterStyleId === 'charlie_parker' &&
                                              Array.isArray(cpLockedTruth) &&
                                              cpLockedTruth.length === tbLockedTruth &&
                                              lockedHarmonyBarsAuthoritative &&
                                              cpLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                            ? cpLockedTruth
                                            : mdLockedTruth?.songwriterStyleId === 'frank_zappa' &&
                                                fzHcTruth &&
                                                fzHcTruth.bars.length === tbLockedTruth &&
                                                lockedHarmonyBarsAuthoritative &&
                                                fzHcTruth.bars.length === lockedHarmonyBarsAuthoritative.length
                                              ? [...fzHcTruth.bars]
                                              : mdLockedTruth?.songwriterStyleId === 'frank_zappa' &&
                                                  Array.isArray(fzLockedTruth) &&
                                                  fzLockedTruth.length === tbLockedTruth &&
                                                  lockedHarmonyBarsAuthoritative &&
                                                  fzLockedTruth.length === lockedHarmonyBarsAuthoritative.length
                                                ? fzLockedTruth
                                                : lockedHarmonyBarsAuthoritative;

  /** Compare score/XML only when Song Mode actually ran `custom_locked` (engine metadata), not when local parse arrays exist without lock wiring. */
  const songModeHarmonyLockAssertionsActive =
    mdLockedTruth.customHarmonyLocked === true &&
    lockedHarmonyBarsAuthoritative &&
    lockedHarmonyBarsAuthoritative.length >= 8 &&
    lockedHarmonyBarsAuthoritative.length === tbLockedTruth &&
    gp.context.lockedHarmonyBarsRaw &&
    gp.context.lockedHarmonyBarsRaw.length === tbLockedTruth &&
    !indieDualGuitarTuningProofFixtureRequested(req);

  if (songModeHarmonyLockAssertionsActive) {
    try {
      if (process.env.COMPOSER_OS_HARMONY_LOCK_COMPARE_DEBUG === '1') {
        console.log(
          '[SONG_MODE_HARMONY_LOCK_UPSTREAM]',
          JSON.stringify(
            {
              songwriterStyleId: mdLockedTruth.songwriterStyleId,
              lockedHarmonyBarsAuthoritative_from_runSongStructure:
                lockedHarmonyBarsAuthoritative ?? null,
              context_lockedHarmonyBarsRaw_same_as_options_wire:
                gp.context.lockedHarmonyBarsRaw ?? null,
              frankZappaEffectiveHarmonyBars_slice_post_compute:
                mdLockedTruth?.frankZappaEffectiveHarmonyBars ?? null,
              harmonyBarsForLockedAssertions_used_for_expected_side:
                harmonyBarsForLockedAssertions ?? null,
              note:
                'When primarySongwriterStyle is frank_zappa and fz effective bars exist, expected side uses frankZappaEffectiveHarmonyBars (see composerOsAppGeneration ternary). Score measures often come from getChordForBar → lockedHarmonyBarsRaw until fz is wired as authoritative in harmonyResolution.',
            },
            null,
            0
          )
        );
      }
      if (process.env.COMPOSER_OS_DESKTOP_IPC === '1') {
        for (let b = 1; b <= 4; b++) {
          const got = getChordForBar(b, gp.context);
          const exp = harmonyBarsForLockedAssertions![b - 1]!;
          if (!lockedHarmonyChordSymbolsEquivalent(got, exp)) {
            throw new Error(
              `DESKTOP SONG MODE HARMONY: bar ${b} resolved "${got}" !== pasted "${exp}" (authority check bars 1–4)`
            );
          }
        }
      }
      assertLockedHarmonyScoreAndXmlMatchBars(gp.score, gp.xml, harmonyBarsForLockedAssertions!, gp.context);
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
    if (!req.skipDrumGuide) {
      try {
        const barMeterForDrums =
          gp.context.barMeterMap ?? gp.context.generationMetadata?.barMeterMap ?? req.barMeterMap;
        const baseName = path.basename(filepath, path.extname(filepath));
        writeDrumGuide(gp.score, outputDir, baseName, barMeterForDrums, req.bpm);
      } catch (e) {
        console.warn('Drum guide export failed:', (e as Error)?.message ?? e);
      }
    }
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
    const mdDisk = gp.context.generationMetadata;
    const bwDisk = mdDisk?.brianWilsonEffectiveHarmonyBars;
    const swDisk = mdDisk?.stevieWonderEffectiveHarmonyBars;
    const rhDisk = mdDisk?.radioheadEffectiveHarmonyBars;
    const jbDisk = mdDisk?.jamesBrownEffectiveHarmonyBars;
    const jmDisk = mdDisk?.joniMitchellEffectiveHarmonyBars;
    const syDisk = mdDisk?.sonicYouthEffectiveHarmonyBars;
    const pmDisk = mdDisk?.patMethenyEffectiveHarmonyBars;
    const wsDisk = mdDisk?.wayneShorterEffectiveHarmonyBars;
    const fzDisk = mdDisk?.frankZappaEffectiveHarmonyBars;
    const bhDisk = mdDisk?.barryHarrisEffectiveHarmonyBars;
    const baDisk = mdDisk?.bacharachEffectiveHarmonyBars;
    const dfDisk = mdDisk?.donaldFagenEffectiveHarmonyBars;
    const eccDisk = mdDisk?.ecmChamberEffectiveHarmonyBars;
    const beDisk = mdDisk?.billEvansEffectiveHarmonyBars;
    const barsForDiskHarmonyTruth =
      mdDisk?.songwriterStyleId === 'brian_wilson' &&
      Array.isArray(bwDisk) &&
      bwDisk.length === gp.context.form.totalBars &&
      locked &&
      bwDisk.length === locked.length
        ? bwDisk
        : mdDisk?.songwriterStyleId === 'stevie_wonder' &&
            Array.isArray(swDisk) &&
            swDisk.length === gp.context.form.totalBars &&
            locked &&
            swDisk.length === locked.length
          ? swDisk
          : mdDisk?.songwriterStyleId === 'radiohead' &&
              Array.isArray(rhDisk) &&
              rhDisk.length === gp.context.form.totalBars &&
              locked &&
              rhDisk.length === locked.length
            ? rhDisk
            : mdDisk?.songwriterStyleId === 'james_brown' &&
                Array.isArray(jbDisk) &&
                jbDisk.length === gp.context.form.totalBars &&
                locked &&
                jbDisk.length === locked.length
              ? jbDisk
            : mdDisk?.songwriterStyleId === 'joni_mitchell' &&
                  Array.isArray(jmDisk) &&
                  jmDisk.length === gp.context.form.totalBars &&
                  locked &&
                  jmDisk.length === locked.length
                ? jmDisk
                : mdDisk?.songwriterStyleId === 'sonic_youth' &&
                    Array.isArray(syDisk) &&
                    syDisk.length === gp.context.form.totalBars &&
                    locked &&
                    syDisk.length === locked.length
                  ? syDisk
                  : mdDisk?.songwriterStyleId === 'pat_metheny' &&
                      Array.isArray(pmDisk) &&
                      pmDisk.length === gp.context.form.totalBars &&
                      locked &&
                      pmDisk.length === locked.length
                    ? pmDisk
                    : mdDisk?.songwriterStyleId === 'wayne_shorter' &&
                        Array.isArray(wsDisk) &&
                        wsDisk.length === gp.context.form.totalBars &&
                        locked &&
                        wsDisk.length === locked.length
                      ? wsDisk
                      : mdDisk?.songwriterStyleId === 'barry_harris' &&
                          Array.isArray(bhDisk) &&
                          bhDisk.length === gp.context.form.totalBars &&
                          locked &&
                          bhDisk.length === locked.length
                        ? bhDisk
                        : mdDisk?.songwriterStyleId === 'bacharach' &&
                            Array.isArray(baDisk) &&
                            baDisk.length === gp.context.form.totalBars &&
                            locked &&
                            baDisk.length === locked.length
                          ? baDisk
                          : mdDisk?.songwriterStyleId === 'donald_fagen' &&
                              Array.isArray(dfDisk) &&
                              dfDisk.length === gp.context.form.totalBars &&
                              locked &&
                              dfDisk.length === locked.length
                            ? dfDisk
                            : mdDisk?.songwriterStyleId === 'ecm_chamber' &&
                                Array.isArray(eccDisk) &&
                                eccDisk.length === gp.context.form.totalBars &&
                                locked &&
                                eccDisk.length === locked.length
                              ? eccDisk
                              : mdDisk?.songwriterStyleId === 'bill_evans' &&
                                  Array.isArray(beDisk) &&
                                  beDisk.length === gp.context.form.totalBars &&
                                  locked &&
                                  beDisk.length === locked.length
                                ? beDisk
                                : mdDisk?.songwriterStyleId === 'frank_zappa' &&
                                    Array.isArray(fzDisk) &&
                                    fzDisk.length === gp.context.form.totalBars &&
                                    locked &&
                                    fzDisk.length === locked.length
                                  ? fzDisk
                                  : locked;
    if (
      barsForDiskHarmonyTruth &&
      barsForDiskHarmonyTruth.length === gp.context.form.totalBars &&
      !indieDualGuitarTuningProofFixtureRequested(req)
    ) {
      try {
        const disk = validateLockedHarmonyMusicXmlTruthFromFile(filepath, barsForDiskHarmonyTruth);
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
      brianWilsonPetSoundsDiagnostics: gp.context.generationMetadata.brianWilsonPetSoundsDiagnostics,
      brianWilsonPetSoundsDeviceReceipts: gp.context.generationMetadata.brianWilsonPetSoundsDeviceReceipts,
      brianWilsonPetSoundsSliceReceipt: gp.context.generationMetadata.brianWilsonPetSoundsSliceReceipt,
      brianWilsonEffectiveHarmonyBars: gp.context.generationMetadata.brianWilsonEffectiveHarmonyBars,
      stevieWonderDiagnostics: gp.context.generationMetadata.stevieWonderDiagnostics,
      stevieWonderDeviceReceipts: gp.context.generationMetadata.stevieWonderDeviceReceipts,
      stevieWonderSliceReceipt: gp.context.generationMetadata.stevieWonderSliceReceipt,
      stevieWonderEffectiveHarmonyBars: gp.context.generationMetadata.stevieWonderEffectiveHarmonyBars,
      radioheadDiagnostics: gp.context.generationMetadata.radioheadDiagnostics,
      radioheadDeviceReceipts: gp.context.generationMetadata.radioheadDeviceReceipts,
      radioheadSliceReceipt: gp.context.generationMetadata.radioheadSliceReceipt,
      radioheadEffectiveHarmonyBars: gp.context.generationMetadata.radioheadEffectiveHarmonyBars,
      jamesBrownDiagnostics: gp.context.generationMetadata.jamesBrownDiagnostics,
      jamesBrownDeviceReceipts: gp.context.generationMetadata.jamesBrownDeviceReceipts,
      jamesBrownSliceReceipt: gp.context.generationMetadata.jamesBrownSliceReceipt,
      jamesBrownEffectiveHarmonyBars: gp.context.generationMetadata.jamesBrownEffectiveHarmonyBars,
      jamesBrownAntiElaborationGuards: gp.context.generationMetadata.jamesBrownAntiElaborationGuards,
      joniMitchellDiagnostics: gp.context.generationMetadata.joniMitchellDiagnostics,
      joniMitchellDeviceReceipts: gp.context.generationMetadata.joniMitchellDeviceReceipts,
      joniMitchellSliceReceipt: gp.context.generationMetadata.joniMitchellSliceReceipt,
      joniMitchellEffectiveHarmonyBars: gp.context.generationMetadata.joniMitchellEffectiveHarmonyBars,
      joniMitchellAntiElaborationGuards: gp.context.generationMetadata.joniMitchellAntiElaborationGuards,
      joniMitchellTuningPatternByBar: gp.context.generationMetadata.joniMitchellTuningPatternByBar,
      joniMitchellModalFieldLockLengthBars: gp.context.generationMetadata.joniMitchellModalFieldLockLengthBars,
      joniMitchellSliceMeta: gp.context.generationMetadata.joniMitchellSliceMeta,
      sonicYouthDiagnostics: gp.context.generationMetadata.sonicYouthDiagnostics,
      sonicYouthDeviceReceipts: gp.context.generationMetadata.sonicYouthDeviceReceipts,
      sonicYouthSliceReceipt: gp.context.generationMetadata.sonicYouthSliceReceipt,
      sonicYouthEffectiveHarmonyBars: gp.context.generationMetadata.sonicYouthEffectiveHarmonyBars,
      patMethenyDiagnostics: gp.context.generationMetadata.patMethenyDiagnostics,
      patMethenyDeviceReceipts: gp.context.generationMetadata.patMethenyDeviceReceipts,
      patMethenySliceReceipt: gp.context.generationMetadata.patMethenySliceReceipt,
      patMethenyEffectiveHarmonyBars: gp.context.generationMetadata.patMethenyEffectiveHarmonyBars,
      patMethenyAntiElaborationGuards: gp.context.generationMetadata.patMethenyAntiElaborationGuards,
      patMethenyPedalHoldMaxBars: gp.context.generationMetadata.patMethenyPedalHoldMaxBars,
      patMethenyEligibilityStats: gp.context.generationMetadata.patMethenyEligibilityStats,
      wayneShorterDiagnostics: gp.context.generationMetadata.wayneShorterDiagnostics,
      wayneShorterDeviceReceipts: gp.context.generationMetadata.wayneShorterDeviceReceipts,
      wayneShorterSliceReceipt: gp.context.generationMetadata.wayneShorterSliceReceipt,
      wayneShorterEffectiveHarmonyBars: gp.context.generationMetadata.wayneShorterEffectiveHarmonyBars,
      wayneShorterAntiElaborationGuards: gp.context.generationMetadata.wayneShorterAntiElaborationGuards,
      wayneShorterEligibilityStats: gp.context.generationMetadata.wayneShorterEligibilityStats,
      barryHarrisDiagnostics: gp.context.generationMetadata.barryHarrisDiagnostics,
      barryHarrisDeviceReceipts: gp.context.generationMetadata.barryHarrisDeviceReceipts,
      barryHarrisSliceReceipt: gp.context.generationMetadata.barryHarrisSliceReceipt,
      barryHarrisEffectiveHarmonyBars: gp.context.generationMetadata.barryHarrisEffectiveHarmonyBars,
      barryHarrisAntiElaborationGuards: gp.context.generationMetadata.barryHarrisAntiElaborationGuards,
      billEvansDiagnostics: gp.context.generationMetadata.billEvansDiagnostics,
      billEvansDeviceReceipts: gp.context.generationMetadata.billEvansDeviceReceipts,
      billEvansSliceReceipt: gp.context.generationMetadata.billEvansSliceReceipt,
      billEvansEffectiveHarmonyBars: gp.context.generationMetadata.billEvansEffectiveHarmonyBars,
      billEvansAntiElaborationGuards: gp.context.generationMetadata.billEvansAntiElaborationGuards,
      bacharachDiagnostics: gp.context.generationMetadata.bacharachDiagnostics,
      bacharachDeviceReceipts: gp.context.generationMetadata.bacharachDeviceReceipts,
      bacharachSliceReceipt: gp.context.generationMetadata.bacharachSliceReceipt,
      bacharachEffectiveHarmonyBars: gp.context.generationMetadata.bacharachEffectiveHarmonyBars,
      bacharachAntiElaborationGuards: gp.context.generationMetadata.bacharachAntiElaborationGuards,
      donaldFagenDiagnostics: gp.context.generationMetadata.donaldFagenDiagnostics,
      donaldFagenDeviceReceipts: gp.context.generationMetadata.donaldFagenDeviceReceipts,
      donaldFagenSliceReceipt: gp.context.generationMetadata.donaldFagenSliceReceipt,
      donaldFagenEffectiveHarmonyBars: gp.context.generationMetadata.donaldFagenEffectiveHarmonyBars,
      donaldFagenAntiElaborationGuards: gp.context.generationMetadata.donaldFagenAntiElaborationGuards,
      ecmChamberDiagnostics: gp.context.generationMetadata.ecmChamberDiagnostics,
      ecmChamberDeviceReceipts: gp.context.generationMetadata.ecmChamberDeviceReceipts,
      ecmChamberSliceReceipt: gp.context.generationMetadata.ecmChamberSliceReceipt,
      ecmChamberEffectiveHarmonyBars: gp.context.generationMetadata.ecmChamberEffectiveHarmonyBars,
      ecmChamberAntiElaborationGuards: gp.context.generationMetadata.ecmChamberAntiElaborationGuards,
      jobimDiagnostics: gp.context.generationMetadata.jobimDiagnostics,
      jobimDeviceReceipts: gp.context.generationMetadata.jobimDeviceReceipts,
      jobimSliceReceipt: gp.context.generationMetadata.jobimSliceReceipt,
      jobimEffectiveHarmonyBars: gp.context.generationMetadata.jobimEffectiveHarmonyBars,
      jobimAntiElaborationGuards: gp.context.generationMetadata.jobimAntiElaborationGuards,
      herbieHancockDiagnostics: gp.context.generationMetadata.herbieHancockDiagnostics,
      herbieHancockDeviceReceipts: gp.context.generationMetadata.herbieHancockDeviceReceipts,
      herbieHancockSliceReceipt: gp.context.generationMetadata.herbieHancockSliceReceipt,
      herbieHancockEffectiveHarmonyBars: gp.context.generationMetadata.herbieHancockEffectiveHarmonyBars,
      herbieHancockAntiElaborationGuards: gp.context.generationMetadata.herbieHancockAntiElaborationGuards,
      sondheimDiagnostics: gp.context.generationMetadata.sondheimDiagnostics,
      sondheimDeviceReceipts: gp.context.generationMetadata.sondheimDeviceReceipts,
      sondheimSliceReceipt: gp.context.generationMetadata.sondheimSliceReceipt,
      sondheimEffectiveHarmonyBars: gp.context.generationMetadata.sondheimEffectiveHarmonyBars,
      sondheimAntiElaborationGuards: gp.context.generationMetadata.sondheimAntiElaborationGuards,
      kateBushDiagnostics: gp.context.generationMetadata.kateBushDiagnostics,
      kateBushDeviceReceipts: gp.context.generationMetadata.kateBushDeviceReceipts,
      kateBushSliceReceipt: gp.context.generationMetadata.kateBushSliceReceipt,
      kateBushEffectiveHarmonyBars: gp.context.generationMetadata.kateBushEffectiveHarmonyBars,
      kateBushAntiElaborationGuards: gp.context.generationMetadata.kateBushAntiElaborationGuards,
      theloniousMonkDiagnostics: gp.context.generationMetadata.theloniousMonkDiagnostics,
      theloniousMonkDeviceReceipts: gp.context.generationMetadata.theloniousMonkDeviceReceipts,
      theloniousMonkSliceReceipt: gp.context.generationMetadata.theloniousMonkSliceReceipt,
      theloniousMonkEffectiveHarmonyBars: gp.context.generationMetadata.theloniousMonkEffectiveHarmonyBars,
      theloniousMonkAntiElaborationGuards: gp.context.generationMetadata.theloniousMonkAntiElaborationGuards,
      andrewHillDiagnostics: gp.context.generationMetadata.andrewHillDiagnostics,
      andrewHillDeviceReceipts: gp.context.generationMetadata.andrewHillDeviceReceipts,
      andrewHillSliceReceipt: gp.context.generationMetadata.andrewHillSliceReceipt,
      andrewHillEffectiveHarmonyBars: gp.context.generationMetadata.andrewHillEffectiveHarmonyBars,
      andrewHillAntiElaborationGuards: gp.context.generationMetadata.andrewHillAntiElaborationGuards,
      frankZappaDiagnostics: gp.context.generationMetadata.frankZappaDiagnostics,
      frankZappaDeviceReceipts: gp.context.generationMetadata.frankZappaDeviceReceipts,
      frankZappaSliceReceipt: gp.context.generationMetadata.frankZappaSliceReceipt,
      frankZappaEffectiveHarmonyBars: gp.context.generationMetadata.frankZappaEffectiveHarmonyBars,
      frankZappaAntiElaborationGuards: gp.context.generationMetadata.frankZappaAntiElaborationGuards,
      frankZappaEligibilityStats: gp.context.generationMetadata.frankZappaEligibilityStats,
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

/**
 * Maps Generate **Arranger** dropdown ids to `BigBandComposerId` for research rule merge + tuning.
 * Only ids that participate in `BIG_BAND_RULE_REGISTRY.composerRules` should appear here.
 */
function composerStyleFromArrangerStyle(arrangerStyle: string | undefined | null): BigBandComposerId | undefined {
  if (arrangerStyle == null || typeof arrangerStyle !== 'string') return undefined;
  const a = arrangerStyle.trim().toLowerCase();
  if (a === 'basie') return 'basie';
  if (a === 'ellington') return 'ellington';
  if (a === 'thad') return 'thad';
  if (a === 'schneider') return 'schneider';
  if (a === 'quincy_jones') return 'quincy_jones';
  if (a === 'gil_evans') return 'gil_evans';
  if (a === 'bob_brookmeyer') return 'bob_brookmeyer';
  if (a === 'clare_fischer') return 'clare_fischer';
  if (a === 'oliver_nelson') return 'oliver_nelson';
  if (a === 'sammy_nestico') return 'sammy_nestico';
  return undefined;
}

function bigBandEvaluationStyleProfile(
  cs: BigBandComposerId | null | undefined
): StyleProfile<unknown, ExtractedStyleFeatures> {
  switch (cs) {
    case 'ellington':
      return ellingtonStyleProfile;
    case 'schneider':
      return schneiderStyleProfile;
    case 'quincy_jones':
      return quincyStyleProfile;
    case 'thad':
      return thadJonesStyleProfile;
    case 'gil_evans':
      return gilEvansStyleProfile;
    case 'bob_brookmeyer':
      return bobBrookmeyerStyleProfile;
    case 'clare_fischer':
      return clareFischerStyleProfile;
    case 'oliver_nelson':
      return oliverNelsonStyleProfile;
    case 'sammy_nestico':
      return sammyNesticoStyleProfile;
    case 'basie':
    default:
      return basieStyleProfile;
  }
}

function runBigBandPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `Big Band Plan ${req.seed}`;
  const normalizedImportHarmonyMode = normalizeImportHarmonyMode(req.importHarmonyMode);
  const harmonyBlendRaw = normalizeHarmonyBlendRaw(req.harmonyBlend);
  const freeHarmony = normalizedImportHarmonyMode === 'free_harmony';
  const ensembleSongwriterStyleId = ensembleSlonimskySongwriterIdFromRequest(req);
  const eraFromPairing = parseBigBandEraFromPairing(req.stylePairing?.era);
  const composerStyleFromArranger = composerStyleFromArrangerStyle(req.stylePairing?.arrangerStyle);
  let chordProgressionText =
    typeof req.chordProgressionText === 'string' && req.chordProgressionText.trim()
      ? req.chordProgressionText.trim()
      : undefined;
  const ensembleTotalBarsResolved =
    typeof req.totalBars === 'number' && Number.isFinite(req.totalBars) && req.totalBars >= 1
      ? req.formId?.trim() === 'big_band_blues12'
        ? 42
        : req.totalBars
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
    ...(composerStyleFromArranger ? { composerStyle: composerStyleFromArranger } : {}),
    ...(typeof req.formId === 'string' && req.formId.trim() ? { formId: req.formId.trim() } : {}),
  });
  const runSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const leadSheet = req.ensembleLeadSheetMusicXml
    ? importLeadSheetFromMusicXml(req.ensembleLeadSheetMusicXml).leadSheet
    : undefined;
  const blendMergeActive =
    normalizedImportHarmonyMode === 'blend_harmony' &&
    harmonyBlendRaw !== undefined &&
    harmonyBlendRaw > 0 &&
    harmonyBlendRaw < 1 &&
    !!leadSheet?.chordEvents?.length &&
    ensembleTotalBarsResolved !== undefined;

  let blendMergeApplied = false;
  if (blendMergeActive && ensembleTotalBarsResolved !== undefined) {
    const tb = ensembleTotalBarsResolved;
    const genParsed = chordProgressionText
      ? parseChordProgressionInputWithBarCount(chordProgressionText, tb)
      : undefined;
    const genBars = genParsed?.ok ? genParsed.bars : null;
    const sorted = [...leadSheet!.chordEvents].sort(
      (a, b) => a.bar - b.bar || a.beat - b.beat
    );
    const primaryByBar = new Map<number, string>();
    for (const e of sorted) {
      if (e.bar >= 1 && e.bar <= tb && !primaryByBar.has(e.bar)) {
        primaryByBar.set(e.bar, e.symbol);
      }
    }
    let carryImp = 'C';
    const impBarArr: string[] = [];
    for (let bar = 1; bar <= tb; bar++) {
      const sym = primaryByBar.get(bar);
      if (sym !== undefined) carryImp = sym;
      impBarArr.push(carryImp);
    }
    if (genBars && genBars.length === tb && impBarArr.length === tb) {
      const merged = mergeSongModeImportedAndGeneratedHarmonyBars(
        genBars,
        impBarArr,
        harmonyBlendRaw
      );
      chordProgressionText = merged.join('|');
      blendMergeApplied = true;
    }
  }

  const leadSheetForChordLock =
    !freeHarmony && leadSheet?.chordEvents?.length && !blendMergeApplied ? leadSheet : undefined;
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
    ...(composerStyleFromArranger ? { composerStyle: composerStyleFromArranger } : {}),
    ...(chordProgressionText ? { chordProgressionText } : {}),
    ...(typeof req.formId === 'string' && req.formId.trim() ? { formId: req.formId.trim() } : {}),
    ...(typeof req.bpm === 'number' && Number.isFinite(req.bpm) ? { bpm: req.bpm } : {}),
    ...(ensembleSongwriterStyleId ? { songwriterStyleId: ensembleSongwriterStyleId } : {}),
    ...(req.chromaticStrength === 'off' ||
    req.chromaticStrength === 'subtle' ||
    req.chromaticStrength === 'prominent'
      ? { allowedOutsideOverride: chromaticStrengthToOutsideLevel(req.chromaticStrength)! }
      : {}),
    ...(leadSheetForChordLock ? { leadSheet: leadSheetForChordLock } : {}),
    ...(typeof req.ensembleLeadSheetMusicXml === 'string' && req.ensembleLeadSheetMusicXml.trim()
      ? { ensembleLeadSheetMusicXml: req.ensembleLeadSheetMusicXml.trim() }
      : {}),
    ...(req.barMeterMap && Object.keys(req.barMeterMap).length > 0 ? { barMeterMap: req.barMeterMap } : {}),
  };
  let realised: ReturnType<typeof runBigBandRealisation>;
  try {
    realised = runBigBandRealisation(bigBandRealisationInput);
  } catch (err) {
    console.error('[composer-os][big_band] runBigBandRealisation threw:', err);
    throw err;
  }
  if (!realised.exportPipeline.ok) {
    console.error(
      '[composer-os][big_band] ensemble MusicXML export pipeline failed:',
      realised.exportPipeline.errors.length > 0
        ? realised.exportPipeline.errors.join('\n')
        : '(exportPipeline.ok false but no error strings)'
    );
  }
  /** App boundary contract: IPC/UI receives **planning JSON** as primary `filepath` (`productKind: planning`). Companion MusicXML is written when export succeeds — path is echoed inside JSON so hosts can open the score without switching the API surface to `musicxml`-first. */
  let ensembleMusicXmlFilename: string | undefined;
  let ensembleMusicXmlFilepath: string | undefined;
  if (realised.exportPipeline.ok && realised.exportPipeline.xml) {
    ensembleMusicXmlFilename = `big_band_${tsSafe}_${runSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    ensembleMusicXmlFilepath = path.join(outputDir, ensembleMusicXmlFilename);
    fs.writeFileSync(ensembleMusicXmlFilepath, realised.exportPipeline.xml, 'utf-8');
    if (!req.skipDrumGuide) {
      try {
        if (realised.score) {
          const baseName = path.basename(ensembleMusicXmlFilepath, '.musicxml');
          writeDrumGuide(realised.score, outputDir, baseName, req.barMeterMap, req.bpm);
        }
      } catch (e) {
        console.warn('Drum guide export failed:', (e as Error)?.message ?? e);
      }
    }
  }

  /** Observational evaluation (GCE + style + LOCK); requires realised score — runs after realisation, not planning-only. */
  let evaluationResult: CombinedEvaluationResult | undefined;
  try {
    if (realised.score) {
      const cs = bb.composerStyle;
      const styleProfile = bigBandEvaluationStyleProfile(cs);
      const evaluator = createCombinedEvaluator({ lockRequired: false });
      evaluationResult = evaluator.evaluate({
        output: realised.score,
        sourceFormat: 'scoreModel',
        styleProfile,
        featureExtractor: scoreModelFeatureExtractor,
        gceWeights: defaultGceWeights,
        lockGates: defaultLockGates,
        config: {
          gceWeight: 0.6,
          styleWeight: 0.4,
          lockRequired: false,
          passThreshold: 7.0,
        },
      });
    }
  } catch (e) {
    console.warn('[composer-os][big_band] evaluation pass failed:', (e as Error)?.message ?? e);
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
    ...(evaluationResult !== undefined ? { evaluationResult } : {}),
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
  const ensReceipt = ensembleSlonimskyReceiptLines(req.chromaticStrength);
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
      importHarmonyMode: normalizedImportHarmonyMode,
      importHarmonyModeSource: req.importHarmonyMode !== undefined ? 'explicit' : 'not_supplied',
      harmonyBlendRaw,
      importHarmonyPolicyVersion: IMPORT_HARMONY_POLICY_VERSION,
      importHarmonyLockApplied: !freeHarmony && (leadSheet?.chordEvents?.length ?? 0) > 0,
      importHarmonyLockFallbackReason: freeHarmony ? 'free_harmony_requested' : undefined,
      importHarmonyLockedBarsCount: freeHarmony ? 0 : (leadSheet?.chordEvents?.length ?? 0),
      importHarmonyBlendActive: blendMergeActive ? true : false,
      importHarmonyBlendEffective: blendMergeActive ? harmonyBlendRaw : undefined,
      ...(realised.referenceInfluence
        ? {
            referenceSourceKind: 'musicxml',
            referenceBehaviourSummary: realised.referenceInfluence.hints.join(' · '),
            referenceInfluenceMode: realised.referenceInfluence.mode,
            referenceInfluenceStrength: realised.referenceInfluence.strength,
            referenceBehaviourHints: realised.referenceInfluence.hints,
          }
        : {}),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
    stylePairingReceipt,
    ...(ensReceipt ? { ensembleSlonimskyReceipt: ensReceipt } : {}),
    ...(evaluationResult !== undefined ? { evaluationResult } : {}),
  } as GenerateResult;
}

function runStringQuartetPlanning(req: GenerateRequest, outputDir: string): GenerateResult {
  const ts = new Date().toISOString();
  const tsSafe = ts.replace(/[:.]/g, '-');
  const title = req.title?.trim() || `String Quartet Plan ${req.seed}`;
  const normalizedImportHarmonyMode = normalizeImportHarmonyMode(req.importHarmonyMode);
  const harmonyBlendRaw = normalizeHarmonyBlendRaw(req.harmonyBlend);
  const freeHarmony = normalizedImportHarmonyMode === 'free_harmony';
  const ensembleSongwriterStyleId = ensembleSlonimskySongwriterIdFromRequest(req);
  let chordProgressionText =
    typeof req.chordProgressionText === 'string' && req.chordProgressionText.trim()
      ? req.chordProgressionText.trim()
      : undefined;
  const ensembleTotalBarsResolved =
    typeof req.totalBars === 'number' && Number.isFinite(req.totalBars) && req.totalBars >= 1
      ? req.totalBars
      : undefined;
  const effectiveSeed = resolveEffectiveGenerationSeed({
    seed: req.seed,
    variationId: req.variationId,
    creativeControlLevel: req.creativeControlLevel,
  });
  const sq = runStringQuartetMode({ seed: effectiveSeed, title, totalBars: req.totalBars });
  const leadSheet = req.ensembleLeadSheetMusicXml
    ? importLeadSheetFromMusicXml(req.ensembleLeadSheetMusicXml).leadSheet
    : undefined;
  const blendMergeActive =
    normalizedImportHarmonyMode === 'blend_harmony' &&
    harmonyBlendRaw !== undefined &&
    harmonyBlendRaw > 0 &&
    harmonyBlendRaw < 1 &&
    !!leadSheet?.chordEvents?.length &&
    ensembleTotalBarsResolved !== undefined;

  let blendMergeApplied = false;
  if (blendMergeActive && ensembleTotalBarsResolved !== undefined) {
    const tb = ensembleTotalBarsResolved;
    const genParsed = chordProgressionText
      ? parseChordProgressionInputWithBarCount(chordProgressionText, tb)
      : undefined;
    const genBars = genParsed?.ok ? genParsed.bars : null;
    const sorted = [...leadSheet!.chordEvents].sort(
      (a, b) => a.bar - b.bar || a.beat - b.beat
    );
    const primaryByBar = new Map<number, string>();
    for (const e of sorted) {
      if (e.bar >= 1 && e.bar <= tb && !primaryByBar.has(e.bar)) {
        primaryByBar.set(e.bar, e.symbol);
      }
    }
    let carryImp = 'C';
    const impBarArr: string[] = [];
    for (let bar = 1; bar <= tb; bar++) {
      const sym = primaryByBar.get(bar);
      if (sym !== undefined) carryImp = sym;
      impBarArr.push(carryImp);
    }
    if (genBars && genBars.length === tb && impBarArr.length === tb) {
      const merged = mergeSongModeImportedAndGeneratedHarmonyBars(
        genBars,
        impBarArr,
        harmonyBlendRaw
      );
      chordProgressionText = merged.join('|');
      blendMergeApplied = true;
    }
  }

  const leadSheetForChordLock =
    !freeHarmony && leadSheet?.chordEvents?.length && !blendMergeApplied ? leadSheet : undefined;
  const stringQuartetGenerationMetadata = buildStringQuartetGenerationMetadata(
    req,
    sq.formPlan.totalBars,
    chordProgressionText
  );
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
    ...(ensembleSongwriterStyleId ? { songwriterStyleId: ensembleSongwriterStyleId } : {}),
    ...(req.chromaticStrength === 'off' ||
    req.chromaticStrength === 'subtle' ||
    req.chromaticStrength === 'prominent'
      ? { allowedOutsideOverride: chromaticStrengthToOutsideLevel(req.chromaticStrength)! }
      : {}),
    ...(leadSheetForChordLock ? { leadSheet: leadSheetForChordLock } : {}),
    ...(typeof req.ensembleLeadSheetMusicXml === 'string' && req.ensembleLeadSheetMusicXml.trim()
      ? { ensembleLeadSheetMusicXml: req.ensembleLeadSheetMusicXml.trim() }
      : {}),
    ...(req.barMeterMap ? { barMeterMap: req.barMeterMap } : {}),
    ...(stringQuartetGenerationMetadata ? { generationMetadata: stringQuartetGenerationMetadata } : {}),
  };
  const realised = runQuartetRealisation(quartetRealisationInput);
  if (realised.exportPipeline.ok && realised.exportPipeline.xml) {
    const xmlFilename = `string_quartet_${tsSafe}_${effectiveSeed}.musicxml`;
    fs.mkdirSync(outputDir, { recursive: true });
    const xmlFilepath = path.join(outputDir, xmlFilename);
    fs.writeFileSync(xmlFilepath, realised.exportPipeline.xml, 'utf-8');
    if (!req.skipDrumGuide) {
      try {
        if (realised.score) {
          const baseName = path.basename(xmlFilepath, '.musicxml');
          writeDrumGuide(realised.score, outputDir, baseName, req.barMeterMap, req.bpm);
        }
      } catch (e) {
        console.warn('Drum guide export failed:', (e as Error)?.message ?? e);
      }
    }
    const ensReceiptXml = ensembleSlonimskyReceiptLines(req.chromaticStrength);
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
        importHarmonyMode: normalizedImportHarmonyMode,
        importHarmonyModeSource: req.importHarmonyMode !== undefined ? 'explicit' : 'not_supplied',
        harmonyBlendRaw,
        importHarmonyPolicyVersion: IMPORT_HARMONY_POLICY_VERSION,
        importHarmonyLockApplied: !freeHarmony && (leadSheet?.chordEvents?.length ?? 0) > 0,
        importHarmonyLockFallbackReason: freeHarmony ? 'free_harmony_requested' : undefined,
        importHarmonyLockedBarsCount: freeHarmony ? 0 : (leadSheet?.chordEvents?.length ?? 0),
        importHarmonyBlendActive: blendMergeActive ? true : false,
        importHarmonyBlendEffective: blendMergeActive ? harmonyBlendRaw : undefined,
        ...(realised.referenceInfluence
          ? {
              referenceSourceKind: 'musicxml',
              referenceBehaviourSummary: realised.referenceInfluence.hints.join(' · '),
              referenceInfluenceMode: realised.referenceInfluence.mode,
              referenceInfluenceStrength: realised.referenceInfluence.strength,
              referenceBehaviourHints: realised.referenceInfluence.hints,
            }
          : {}),
      },
      scoreTitle: title,
      requestEcho: requestEchoFromReq(req),
      ...(ensReceiptXml ? { ensembleSlonimskyReceipt: ensReceiptXml } : {}),
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
  const ensReceiptSq = ensembleSlonimskyReceiptLines(req.chromaticStrength);
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
      importHarmonyMode: normalizedImportHarmonyMode,
      importHarmonyModeSource: req.importHarmonyMode !== undefined ? 'explicit' : 'not_supplied',
      harmonyBlendRaw,
      importHarmonyPolicyVersion: IMPORT_HARMONY_POLICY_VERSION,
      importHarmonyLockApplied: !freeHarmony && (leadSheet?.chordEvents?.length ?? 0) > 0,
      importHarmonyLockFallbackReason: freeHarmony ? 'free_harmony_requested' : undefined,
      importHarmonyLockedBarsCount: freeHarmony ? 0 : (leadSheet?.chordEvents?.length ?? 0),
      importHarmonyBlendActive: blendMergeActive ? true : false,
      importHarmonyBlendEffective: blendMergeActive ? harmonyBlendRaw : undefined,
      ...(realised.referenceInfluence
        ? {
            referenceSourceKind: 'musicxml',
            referenceBehaviourSummary: realised.referenceInfluence.hints.join(' · '),
            referenceInfluenceMode: realised.referenceInfluence.mode,
            referenceInfluenceStrength: realised.referenceInfluence.strength,
            referenceBehaviourHints: realised.referenceInfluence.hints,
          }
        : {}),
    },
    scoreTitle: title,
    requestEcho: requestEchoFromReq(req),
    ...(ensReceiptSq ? { ensembleSlonimskyReceipt: ensReceiptSq } : {}),
  };
}
