/**
 * Shared Composer OS app API logic (HTTP routes + Electron IPC). Single source for engine calls.
 */
import * as path from 'path';
import { getPresets } from './getPresets';
import { getStyleModules } from './getStyleModules';
import { type GenerateResult } from './generateComposition';
import { COMPOSER_OS_VERSION } from './composerOsConfig';
import { runAppGeneration, SUPPORTED_APP_PRESET_IDS } from './composerOsAppGeneration';
import type { SupportedAppPresetId } from './composerOsAppGeneration';
import { isSystemCheckDisabled, runSystemCheck } from './systemCheck';
import { listOutputs } from './listOutputs';
import { openOutputFolder, type OpenOutputFolderResult } from './openOutputFolder';
import { buildDiagnostics } from './buildDiagnostics';
import { friendlyGenerateError, friendlyOutputDirError } from './apiErrorMessages';
import type {
  GenerateRequest,
  MelodicVariationPackResponse,
  MelodicVariationPackRequest,
  MelodicVariationPackNoteEvent,
  UiDrumPatternPayload,
  FingerprintReceiptPayload,
  VrbProfilePayload,
} from './appApiTypes';
import type { GrooveScaffoldSettings } from '../core/section-architecture/sectionArchitectureTypes';
import type { Song } from '../core/section-architecture/sectionArchitectureTypes';
import type { RhythmIntentControl } from '../core/rhythmIntentTypes';
import { isStyleProfile } from '../core/song-mode/songModeStyleProfile';
import {
  indieArtPopAlternateTuningWantsDualElectricGuitars,
  normalizeAlternateGuitarTuningRequest,
  styleProfileSupportsAlternateGuitarTuning,
} from '../core/song-mode/alternateGuitarTunings';
import {
  ensureOutputDirectoryForPreset,
  getComposerFilesRoot,
  PRESET_OUTPUT_SUBFOLDER,
  resolveComposerLibraryRoot,
  resolveOpenFolderTarget,
} from './composerOsOutputPaths';
import { isAllowedSongFormBarCount, SONG_FORM_BAR_OPTIONS } from '../core/harmony/songFormBarCounts';
import { isGuitarBassDuoFamily } from '../core/presets/guitarBassDuoPresetIds';
import { coerceAsymmetricRhythmRequestFromUnknown } from '../core/rhythm/asymmetricPresets';
import { sanitizeBarMeterMap } from '../core/rhythm/barMeterTypes';
import {
  parseZappaChainDepth,
  parseZappaEraPreset,
  parseZappaPhraseCharacter,
  parseZappaSymmetryBias,
} from '../core/riff-generator/zappaRiffSoloParams';
import type { IRealVaultOutput } from '../core/irealpro/irealVaultPipeline';
import type { ParsedChart } from '../core/irealpro/parsedChart';
import { buildMusicContextFromVaultOutput } from '../core/music-context/musicContextAdapters';
import type { MusicContext, AnalyticalModeResult } from '../core/music-context/musicContextTypes';
import type { EmotionalDrift } from '../core/harmony/reharmCandidateEngine';
import { formatPdfExtractFailureHint, generateFromPdf } from '../core/pdf';
import type { GceStructureSection } from '../core/gce/gceAutoScorers';
import { normalizeSongwriterStyleKey } from '../core/song-mode/songwriterStyleProfiles';
import {
  generateMelodicVariations,
  scoreMelodicVariationsForPack,
} from '../core/song-mode/melodicVariationPack';
import { runAnalyticalMode } from '../core/analytical/analyticalMode';
import { exportMusicXmlToPdf } from '../core/export/pdfExporter';
import { exportMusicXmlToGuitarPro } from '../core/export/guitarProExporter';

export type { AnalyticalModeResult };

export { getComposerFilesRoot, PRESET_OUTPUT_SUBFOLDER } from './composerOsOutputPaths';

/** @deprecated use getComposerFilesRoot */
export function getConfiguredOutputDir(): string {
  return getComposerFilesRoot();
}

export function displayPathForApi(p: string): string {
  const n = path.normalize(p);
  if (process.platform === 'win32') return n.replace(/\//g, '\\');
  return n;
}

/** IPC / JSON may send numbers as strings — keep routing consistent with tests that pass real numbers. */
function coerceFiniteNumber(n: unknown): number | undefined {
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string' && n.trim() !== '') {
    const v = Number(n);
    if (Number.isFinite(v)) return v;
  }
  return undefined;
}

/**
 * Trim chord line; empty / whitespace-only → undefined so Song Mode does not silently fall back to builtin duo32.
 */
/** IPC/JSON: optional `intent`; pattern omitted → 0.5 (D1 baseline). All numeric fields clamped to [0,1]. */
function coerceIntentFromBody(body: Partial<GenerateRequest>): RhythmIntentControl | undefined {
  const raw = body.intent as unknown;
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const c = (key: keyof RhythmIntentControl): number | undefined => {
    const v = o[key];
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, Math.min(1, n));
  };
  const groove = c('groove');
  const space = c('space');
  const expression = c('expression');
  const surprise = c('surprise');
  const pattern = c('pattern');
  if (groove === undefined || space === undefined || expression === undefined || surprise === undefined) {
    return undefined;
  }
  return {
    groove,
    space,
    expression,
    surprise,
    pattern: pattern ?? 0.5,
  };
}

function coerceSixteenthHits(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: number[] = [];
  for (const x of raw) {
    const n = Math.round(Number(x));
    if (!Number.isFinite(n) || n < 0 || n > 15) continue;
    if (!out.includes(n)) out.push(n);
  }
  return out.length ? out.sort((a, b) => a - b) : undefined;
}

function coerceMartinoConfigFromBody(
  body: Partial<GenerateRequest>
): import('./appApiTypes').MartinoConfigPayload | undefined {
  const raw = (body as { martinoConfig?: unknown }).martinoConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const progression = Array.isArray(o.progression)
    ? o.progression.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (!progression.length) return undefined;
  const tension = o.dominantTensionDefault;
  const dominantTensionDefault =
    tension === 'medium' || tension === 'high' || tension === 'low' ? tension : 'low';
  const lfvRaw = o.lfv;
  const lfv =
    lfvRaw && typeof lfvRaw === 'object' && !Array.isArray(lfvRaw)
      ? {
          min_fret: Math.max(0, Math.floor(Number((lfvRaw as { min_fret?: unknown }).min_fret) || 5)),
          max_fret: Math.max(0, Math.floor(Number((lfvRaw as { max_fret?: unknown }).max_fret) || 9)),
        }
      : { min_fret: 5, max_fret: 9 };
  const tuneRaw = typeof o.tune === 'string' ? o.tune.trim() : '';
  const perChordOverridesRaw = o.perChordOverrides;
  const perChordOverrides =
    perChordOverridesRaw &&
    typeof perChordOverridesRaw === 'object' &&
    !Array.isArray(perChordOverridesRaw)
      ? (perChordOverridesRaw as Record<number, 'low' | 'medium' | 'high'>)
      : undefined;
  const martinoModeRaw =
    typeof o.martinoMode === 'string'
      ? o.martinoMode.trim()
      : typeof o.martino_mode === 'string'
        ? o.martino_mode.trim()
        : '';
  const barryHarrisProfileRaw =
    typeof o.barryHarrisProfile === 'string'
      ? o.barryHarrisProfile.trim()
      : typeof o.barry_harris_profile === 'string'
        ? o.barry_harris_profile.trim()
        : '';
  const ecmModeRaw =
    o.ecmMode === 'ECM_METHENY_QUARTET' || o.ecmMode === 'ECM_SCHNEIDER_CHAMBER'
      ? o.ecmMode
      : o.ecm_mode === 'ECM_METHENY_QUARTET' || o.ecm_mode === 'ECM_SCHNEIDER_CHAMBER'
        ? o.ecm_mode
        : typeof o.ecm_mode === 'string' && o.ecm_mode.trim()
          ? o.ecm_mode.trim()
          : typeof o.ecmMode === 'string' && o.ecmMode.trim()
            ? o.ecmMode.trim()
            : undefined;
  const ecmChamberModeRaw =
    o.ecmChamberMode === 'angel_song' ||
    o.ecmChamberMode === 'balanced' ||
    o.ecmChamberMode === 'metheny_scofield'
      ? o.ecmChamberMode
      : o.ecm_chamber_mode === 'angel_song' ||
          o.ecm_chamber_mode === 'balanced' ||
          o.ecm_chamber_mode === 'metheny_scofield'
        ? o.ecm_chamber_mode
        : undefined;
  const slonimskyMacroHints =
    o.slonimskyMacroHints !== undefined && o.slonimskyMacroHints !== null
      ? o.slonimskyMacroHints
      : o.slonimsky_macro !== undefined && o.slonimsky_macro !== null
        ? o.slonimsky_macro
        : undefined;
  const tensionMapRaw = o.tension_map;
  const tension_map =
    tensionMapRaw !== undefined &&
    tensionMapRaw !== null &&
    typeof tensionMapRaw === 'object' &&
    !Array.isArray(tensionMapRaw)
      ? (tensionMapRaw as Record<string | number, 'low' | 'medium' | 'high'>)
      : undefined;
  const activities = Array.isArray(o.activities)
    ? o.activities.map((x) => String(x).trim()).filter(Boolean)
    : undefined;
  const barryHarris = martinoModeRaw === 'barry_harris' || o.barry_harris === true;
  return {
    enabled: o.enabled !== false,
    progression,
    ...(tuneRaw ? { tune: tuneRaw } : {}),
    dominantTensionDefault,
    ...(perChordOverrides ? { perChordOverrides } : {}),
    activeActivity:
      typeof o.activeActivity === 'string' && o.activeActivity.trim()
        ? o.activeActivity.trim()
        : 'A1_LINEAR_CORE',
    secondaryActivities: Array.isArray(o.secondaryActivities)
      ? o.secondaryActivities.map((x) => String(x).trim()).filter(Boolean)
      : ['A2_DIAGONAL_BRIDGE'],
    ...(activities?.length ? { activities } : {}),
    choruses: Math.max(1, Math.floor(Number(o.choruses) || 1)),
    asteriskMeasures: Array.isArray(o.asteriskMeasures)
      ? o.asteriskMeasures.map((x) => Math.floor(Number(x))).filter((n) => Number.isFinite(n))
      : [],
    lfv,
    mode: o.mode === 'performance' ? 'performance' : 'teaching',
    ...(martinoModeRaw ? { martinoMode: martinoModeRaw } : {}),
    ...(barryHarris ? { barryHarris: true } : {}),
    ...(martinoModeRaw === 'barry_harris' && barryHarrisProfileRaw
      ? { barryHarrisProfile: barryHarrisProfileRaw }
      : barryHarris && barryHarrisProfileRaw
        ? { barryHarrisProfile: barryHarrisProfileRaw }
        : {}),
    ...(ecmModeRaw ? { ecmMode: ecmModeRaw } : {}),
    ...(ecmChamberModeRaw ? { ecmChamberMode: ecmChamberModeRaw } : {}),
    ...(slonimskyMacroHints !== undefined ? { slonimskyMacroHints } : {}),
    ...(tension_map ? { tension_map } : {}),
  };
}

function coerceFillSchedulerConfigFromBody(
  body: Partial<GenerateRequest>
): import('./appApiTypes').FillSchedulerConfigPayload | undefined {
  const raw = (body as { fillSchedulerConfig?: unknown }).fillSchedulerConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const fillDensity = Number(o.fillDensity);
  if (!Number.isFinite(fillDensity) || fillDensity <= 0) return undefined;
  const fillTypeId = typeof o.fillTypeId === 'string' ? o.fillTypeId.trim() : '';
  if (!fillTypeId) return undefined;
  const sectionBars = Math.max(1, Math.floor(Number(o.sectionBars) || 0));
  const fillPositions = Array.isArray(o.fillPositions)
    ? o.fillPositions
        .map((x) => Math.floor(Number(x)))
        .filter((b) => Number.isFinite(b) && b >= 1 && b <= sectionBars)
    : [];
  const lockedFillPositions = Array.isArray(o.lockedFillPositions)
    ? o.lockedFillPositions
        .map((x) => Math.floor(Number(x)))
        .filter((b) => Number.isFinite(b) && b >= 1 && b <= sectionBars)
    : undefined;
  return {
    fillDensity: Math.max(0, Math.min(1, fillDensity)),
    fillTypeId,
    lockFills: o.lockFills === true,
    sectionBars,
    fillPositions,
    ...(lockedFillPositions?.length ? { lockedFillPositions } : {}),
  };
}

function coerceDrumLoopPathFromBody(body: Partial<GenerateRequest>): string | undefined {
  const raw = (body as { drumLoopPath?: unknown }).drumLoopPath;
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function coerceUiDrumPatternFromBody(body: Partial<GenerateRequest>): UiDrumPatternPayload | undefined {
  const raw = (body as { uiDrumPattern?: unknown }).uiDrumPattern;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const drummerId = typeof o.drummerId === 'string' ? o.drummerId.trim() : '';
  const patternName = typeof o.patternName === 'string' ? o.patternName.trim() : '';
  if (!drummerId || !patternName) return undefined;
  const kicks = coerceSixteenthHits(o.kicks);
  const snares = coerceSixteenthHits(o.snares);
  const hats = coerceSixteenthHits(o.hats);
  const ride = coerceSixteenthHits(o.ride);
  if (!kicks || !snares || !hats || !ride) return undefined;
  return {
    drummerId,
    patternName,
    feel: typeof o.feel === 'string' && o.feel.trim() ? o.feel.trim() : 'swing',
    meter: typeof o.meter === 'string' && o.meter.trim() ? o.meter.trim() : '4/4',
    kicks,
    snares,
    hats,
    ride,
    ...(typeof o.drummerName === 'string' && o.drummerName.trim() ? { drummerName: o.drummerName.trim() } : {}),
    ...(typeof o.presetId === 'string' && o.presetId.trim() ? { presetId: o.presetId.trim() } : {}),
    ...(typeof o.description === 'string' && o.description.trim() ? { description: o.description.trim() } : {}),
  };
}

function coerceGrooveScaffoldFromBody(body: Partial<GenerateRequest>): GrooveScaffoldSettings | undefined {
  const raw = body.grooveScaffold;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const g = raw as GrooveScaffoldSettings;
  if (g.enabled !== true) return undefined;
  const feel =
    g.feel === 'swing' ||
    g.feel === 'funk' ||
    g.feel === 'rock' ||
    g.feel === 'bossa' ||
    g.feel === 'ballad' ||
    g.feel === 'odd_meter'
      ? g.feel
      : undefined;
  const density = g.density === 'sparse' || g.density === 'medium' || g.density === 'dense' ? g.density : undefined;
  const fillFrequency =
    g.fillFrequency === 'sparse' || g.fillFrequency === 'normal' || g.fillFrequency === 'dense'
      ? g.fillFrequency
      : undefined;
  return {
    enabled: true,
    ...(feel ? { feel } : {}),
    ...(density ? { density } : {}),
    ...(fillFrequency ? { fillFrequency } : {}),
  };
}

function coerceFingerprintReceiptFromBody(
  body: Partial<GenerateRequest>
): FingerprintReceiptPayload | undefined {
  const raw = (body as { fingerprintReceipt?: unknown }).fingerprintReceipt;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!id || !name) return undefined;
  const params =
    o.params && typeof o.params === 'object' && !Array.isArray(o.params)
      ? (o.params as Record<string, unknown>)
      : {};
  return {
    id,
    name,
    description: typeof o.description === 'string' ? o.description.trim() : '',
    params,
  };
}

function coerceBigBandConfigFromBody(body: Partial<GenerateRequest>): GenerateRequest['bigBandConfig'] {
  const raw = (body as { bigBandConfig?: unknown }).bigBandConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const styleId = typeof o.styleId === 'string' ? o.styleId.trim() : '';
  const bandStyle = o.bandStyle;
  if (
    !styleId ||
    bandStyle !== 'basie' &&
      bandStyle !== 'ellington' &&
      bandStyle !== 'kenton' &&
      bandStyle !== 'rich' &&
      bandStyle !== 'thad'
  ) {
    return undefined;
  }
  const sections =
    o.sections && typeof o.sections === 'object' && !Array.isArray(o.sections)
      ? (o.sections as Record<string, unknown>)
      : {};
  return {
    styleId,
    bandStyle,
    soliMode: o.soliMode === true,
    shoutChorus: o.shoutChorus === true,
    sections,
    ...(typeof o.drumStyleId === 'string' && o.drumStyleId.trim()
      ? { drumStyleId: o.drumStyleId.trim() }
      : {}),
  };
}

function coerceStringQuartetConfigFromBody(
  body: Partial<GenerateRequest>
): GenerateRequest['stringQuartetConfig'] {
  const raw = (body as { stringQuartetConfig?: unknown }).stringQuartetConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const voicingStyle = typeof o.voicingStyle === 'string' ? o.voicingStyle.trim() : '';
  const texture = typeof o.texture === 'string' ? o.texture.trim() : '';
  const stylePreset = typeof o.stylePreset === 'string' ? o.stylePreset.trim() : '';
  if (!voicingStyle || !texture || !stylePreset) return undefined;
  const voices = Array.isArray(o.voices)
    ? o.voices.filter((v) => v && typeof v === 'object' && !Array.isArray(v))
    : [];
  return { voicingStyle, texture, stylePreset, voices: voices as Array<Record<string, unknown>> };
}

function coerceContrapuntalConfigFromBody(
  body: Partial<GenerateRequest>
): GenerateRequest['contrapuntalConfig'] {
  const raw = (body as { contrapuntalConfig?: unknown }).contrapuntalConfig;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const voiceCount = Math.round(Number(o.voiceCount));
  if (!Number.isFinite(voiceCount) || voiceCount < 2 || voiceCount > 6) return undefined;
  const speciesPairs = Array.isArray(o.speciesPairs)
    ? o.speciesPairs
        .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
        .map((p) => {
          const row = p as Record<string, unknown>;
          const pairKey = typeof row.pairKey === 'string' ? row.pairKey.trim() : '';
          const species = typeof row.species === 'string' ? row.species.trim() : 'free';
          const voiceA = Math.round(Number(row.voiceA));
          const voiceB = Math.round(Number(row.voiceB));
          if (!pairKey) return null;
          return { pairKey, voiceA, voiceB, species };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : [];
  const cfRaw = o.cantusFirmus;
  const cf =
    cfRaw && typeof cfRaw === 'object' && !Array.isArray(cfRaw)
      ? (cfRaw as Record<string, unknown>)
      : {};
  const source = cf.source === 'custom' ? 'custom' : 'active_section';
  const rules =
    o.rules && typeof o.rules === 'object' && !Array.isArray(o.rules)
      ? (o.rules as Record<string, boolean>)
      : {};
  const stylePreset = typeof o.stylePreset === 'string' ? o.stylePreset.trim() : 'palestrina';
  return {
    voiceCount,
    speciesPairs,
    cantusFirmus: {
      source,
      customEntry: typeof cf.customEntry === 'string' ? cf.customEntry.trim() : '',
      directionBias:
        cf.directionBias === 'ascending' ||
        cf.directionBias === 'descending' ||
        cf.directionBias === 'arch'
          ? cf.directionBias
          : 'free',
    },
    rules,
    stylePreset,
  };
}

function coerceVrbProfileFromBody(body: Partial<GenerateRequest>): VrbProfilePayload | undefined {
  const raw = (body as { vrbProfile?: unknown }).vrbProfile;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const presetId = typeof o.presetId === 'string' ? o.presetId.trim() : '';
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!presetId || !name) return undefined;
  const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, n));
  };
  return {
    presetId,
    name,
    roomSize: clamp(o.roomSize, 0, 1, 0.5),
    decay: clamp(o.decay, 0.1, 8, 2),
    predelay: clamp(o.predelay, 0, 80, 12),
    damping: clamp(o.damping, 0, 1, 0.5),
    diffusion: clamp(o.diffusion, 0, 1, 0.6),
    character: typeof o.character === 'string' ? o.character.trim() : '',
  };
}

function coerceSongFromBody(body: Partial<GenerateRequest>): Song | undefined {
  const raw = (body as { song?: unknown }).song;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const s = raw as Song;
  if (typeof s.schemaVersion !== 'number' || !Array.isArray(s.sections)) return undefined;
  return s;
}

function normalizeChordProgressionText(body: Partial<GenerateRequest>): string | undefined {
  const raw = body.chordProgressionText;
  if (typeof raw !== 'string') return undefined;
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

export function apiGetPresets(): { presets: ReturnType<typeof getPresets> } {
  return { presets: getPresets() };
}

export function apiGetStyleModules(): { modules: ReturnType<typeof getStyleModules> } {
  return { modules: getStyleModules() };
}

export interface ComposerOsRuntimeBuildInfo {
  composerOsVersion: string;
  desktopAppVersion?: string;
  ipcBundlePath?: string;
  ipcBundleSha256?: string;
  stampIpcSha256?: string;
  apiBundleSha256FromStamp?: string;
  stampMatchesLiveIpc?: string;
  buildStampJson?: string;
  truthDumpEnabled: boolean;
}

/**
 * Electron main + IPC bundle: proves which engine code is loaded (env set in `main.ts` before `require(desktop-ipc.bundle.cjs)`).
 */
export function getComposerOsRuntimeBuildInfo(): ComposerOsRuntimeBuildInfo {
  return {
    composerOsVersion: COMPOSER_OS_VERSION,
    desktopAppVersion: process.env.COMPOSER_OS_DESKTOP_APP_VERSION,
    ipcBundlePath: process.env.COMPOSER_OS_IPC_BUNDLE_PATH,
    ipcBundleSha256: process.env.COMPOSER_OS_IPC_BUNDLE_SHA256,
    stampIpcSha256: process.env.COMPOSER_OS_STAMP_IPC_SHA256,
    apiBundleSha256FromStamp: process.env.COMPOSER_OS_API_BUNDLE_SHA256,
    stampMatchesLiveIpc: process.env.COMPOSER_OS_STAMP_IPC_MATCH,
    buildStampJson: process.env.COMPOSER_OS_BUILD_STAMP_JSON,
    truthDumpEnabled:
      process.env.COMPOSER_OS_DESKTOP_IPC === '1' && process.env.COMPOSER_OS_TRUTH_DUMP === '1',
  };
}

/**
 * Desktop / HTTP entry: must mirror every `GenerateRequest` field the UI sends.
 * Previously dropped `longFormEnabled` / key fields and passed raw `chordProgressionText` without trim —
 * whitespace-only strings looked “set” here but became empty after engine trim → silent Song Mode fallback to builtin duo32.
 */
export function apiGenerate(
  body: Partial<GenerateRequest>,
  composerLibraryRoot: string
): GenerateResult | { success: false; error: string; detail?: string } {
  try {
    const rawPreset = typeof body.presetId === 'string' ? body.presetId.trim() : undefined;
    /**
     * Default preset is duo. If IPC/JSON omits `presetId` but sends Song Mode fields (desktop parity),
     * route to `song_mode` — otherwise requests default to `guitar_bass_duo` and never hit `runSongStructure`
     * (built-in duo32 harmony instead of pasted 32 bars).
     */
    let presetIdResolved = rawPreset ?? 'guitar_bass_duo';
    if (!rawPreset && typeof body.primarySongwriterStyle === 'string' && body.primarySongwriterStyle.trim() !== '') {
      presetIdResolved = 'song_mode';
    }
    if (!SUPPORTED_APP_PRESET_IDS.includes(presetIdResolved as SupportedAppPresetId)) {
      return {
        success: false,
        error: `Unsupported preset: ${rawPreset ?? '(missing)'}`,
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    const chordProgressionText = normalizeChordProgressionText(body);
    if (body.harmonyMode === 'custom_locked' && !chordProgressionText) {
      return {
        success: false,
        error: 'harmonyMode custom_locked requires non-empty chordProgressionText (after trim).',
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    const req_: GenerateRequest = {
      presetId: presetIdResolved,
      styleStack: body.styleStack ?? {
        primary: 'barry_harris',
        styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
      },
      seed: typeof body.seed === 'number' ? body.seed : Math.floor(Math.random() * 1e9),
      locks: body.locks,
      title: typeof body.title === 'string' ? body.title : undefined,
      harmonyMode:
        body.harmonyMode === 'custom' ||
        body.harmonyMode === 'builtin' ||
        body.harmonyMode === 'custom_locked'
          ? body.harmonyMode
          : undefined,
      chordProgressionText,
      ecmMode:
        body.ecmMode === 'ECM_METHENY_QUARTET' || body.ecmMode === 'ECM_SCHNEIDER_CHAMBER'
          ? body.ecmMode
          : undefined,
      variationId: typeof body.variationId === 'string' ? body.variationId : undefined,
      variationEnabled:
        typeof body.variationEnabled === 'boolean' ? body.variationEnabled : undefined,
      creativeControlLevel:
        body.creativeControlLevel === 'stable' ||
        body.creativeControlLevel === 'balanced' ||
        body.creativeControlLevel === 'surprise'
          ? body.creativeControlLevel
          : undefined,
      tonalCenter: typeof body.tonalCenter === 'string' ? body.tonalCenter : undefined,
      bpm: coerceFiniteNumber(body.bpm),
      totalBars: coerceFiniteNumber(body.totalBars),
      longFormEnabled: typeof body.longFormEnabled === 'boolean' ? body.longFormEnabled : undefined,
      keySignatureMode:
        body.keySignatureMode === 'auto' ||
        body.keySignatureMode === 'override' ||
        body.keySignatureMode === 'none'
          ? body.keySignatureMode
          : undefined,
      tonalCenterOverride:
        typeof body.tonalCenterOverride === 'string' && body.tonalCenterOverride.trim()
          ? body.tonalCenterOverride.trim()
          : undefined,
      primarySongwriterStyle:
        typeof body.primarySongwriterStyle === 'string' ? body.primarySongwriterStyle : undefined,
      secondarySongwriterStyle:
        typeof body.secondarySongwriterStyle === 'string' && body.secondarySongwriterStyle.trim() !== ''
          ? body.secondarySongwriterStyle.trim()
          : undefined,
      authorOverlay:
        typeof body.authorOverlay === 'string' && body.authorOverlay.trim() !== ''
          ? body.authorOverlay.trim()
          : undefined,
      alternateGuitarTuning:
        body.alternateGuitarTuning &&
        typeof body.alternateGuitarTuning === 'object' &&
        ((body.alternateGuitarTuning as { mode?: unknown }).mode === 'standard' ||
          (body.alternateGuitarTuning as { mode?: unknown }).mode === 'shared' ||
          (body.alternateGuitarTuning as { mode?: unknown }).mode === 'separate')
          ? (body.alternateGuitarTuning as GenerateRequest['alternateGuitarTuning'])
          : undefined,
      ensembleConfigId:
        body.ensembleConfigId === 'full_band' ||
        body.ensembleConfigId === 'medium_band' ||
        body.ensembleConfigId === 'small_band' ||
        body.ensembleConfigId === 'reeds_only' ||
        body.ensembleConfigId === 'brass_only' ||
        body.ensembleConfigId === 'custom'
          ? body.ensembleConfigId
          : undefined,
      stylePairing:
        body.stylePairing &&
        typeof body.stylePairing === 'object' &&
        typeof (body.stylePairing as { songwriterStyle?: unknown }).songwriterStyle === 'string' &&
        typeof (body.stylePairing as { arrangerStyle?: unknown }).arrangerStyle === 'string'
          ? {
              songwriterStyle: (body.stylePairing as { songwriterStyle: string }).songwriterStyle,
              arrangerStyle: (body.stylePairing as { arrangerStyle: string }).arrangerStyle,
              era:
                typeof (body.stylePairing as { era?: unknown }).era === 'string'
                  ? (body.stylePairing as { era: string }).era
                  : undefined,
            }
          : undefined,
      riffStyle:
        body.riffStyle === 'metheny' ||
        body.riffStyle === 'scofield' ||
        body.riffStyle === 'funk' ||
        body.riffStyle === 'neutral'
          ? body.riffStyle
          : undefined,
      riffDensity:
        body.riffDensity === 'sparse' ||
        body.riffDensity === 'medium' ||
        body.riffDensity === 'dense'
          ? body.riffDensity
          : undefined,
      riffGrid: body.riffGrid === 'sixteenth' || body.riffGrid === 'eighth' ? body.riffGrid : undefined,
      riffLineMode:
        body.riffLineMode === 'single_line' ||
        body.riffLineMode === 'guitar_bass' ||
        body.riffLineMode === 'octave_double'
          ? body.riffLineMode
          : undefined,
      riffBass: body.riffBass === true ? true : undefined,
      riffSolo: body.riffSolo === true ? true : undefined,
      riffVrbId: typeof body.riffVrbId === 'string' && body.riffVrbId.trim() ? body.riffVrbId.trim() : undefined,
      riffOddMeterPreset:
        body.riffOddMeterPreset === 'meter5' ||
        body.riffOddMeterPreset === 'meter7' ||
        body.riffOddMeterPreset === 'meter9' ||
        body.riffOddMeterPreset === 'meter10' ||
        body.riffOddMeterPreset === 'mahavishnu' ||
        body.riffOddMeterPreset === 'fripp' ||
        body.riffOddMeterPreset === 'weatherReport'
          ? body.riffOddMeterPreset
          : undefined,
      riffOp:
        body.riffOp === 'regenerate' || body.riffOp === 'mutate' ? body.riffOp : undefined,
      riffBarLocks: Array.isArray(body.riffBarLocks)
        ? body.riffBarLocks.map((x) => x === true)
        : undefined,
      riffCarryForward:
        body.riffCarryForward &&
        typeof body.riffCarryForward === 'object' &&
        Array.isArray((body.riffCarryForward as { bars?: unknown }).bars)
          ? (body.riffCarryForward as import('../core/riff-generator/riffCarryForward').RiffCarryForward)
          : undefined,
      styleProfile: isStyleProfile(body.styleProfile) ? body.styleProfile : undefined,
      ecmChamberMode:
        body.ecmChamberMode === 'angel_song' ||
        body.ecmChamberMode === 'balanced' ||
        body.ecmChamberMode === 'metheny_scofield'
          ? body.ecmChamberMode
          : undefined,
      intent: coerceIntentFromBody(body),
      c4Strength:
        body.c4Strength === 'light' ||
        body.c4Strength === 'medium' ||
        body.c4Strength === 'strong'
          ? body.c4Strength
          : undefined,
      songModeJamesBrownFunkOverlay: body.songModeJamesBrownFunkOverlay === true ? true : undefined,
      blendStrength:
        body.blendStrength === 'light' ||
        body.blendStrength === 'medium' ||
        body.blendStrength === 'strong'
          ? body.blendStrength
          : undefined,
      duoIntent:
        body.duoIntent === 'conversational' || body.duoIntent === 'supportive' ? body.duoIntent : undefined,
      chromaticStrength:
        body.chromaticStrength === 'off' ||
        body.chromaticStrength === 'subtle' ||
        body.chromaticStrength === 'prominent'
          ? body.chromaticStrength
          : undefined,
      formId: typeof body.formId === 'string' && body.formId.trim() !== '' ? body.formId.trim() : undefined,
      includeVocalLeadSheet: body.includeVocalLeadSheet === true ? true : undefined,
      __generateCorrelationId:
        typeof (body as { __generateCorrelationId?: unknown }).__generateCorrelationId === 'string' &&
        (body as { __generateCorrelationId: string }).__generateCorrelationId.trim() !== ''
          ? (body as { __generateCorrelationId: string }).__generateCorrelationId.trim()
          : undefined,
      barMeterMap: sanitizeBarMeterMap(
        typeof body.barMeterMap === 'object' && body.barMeterMap !== null && !Array.isArray(body.barMeterMap)
          ? (body.barMeterMap as GenerateRequest['barMeterMap'])
          : undefined
      ),
      asymmetricRhythm: coerceAsymmetricRhythmRequestFromUnknown(
        (body as { asymmetricRhythm?: unknown }).asymmetricRhythm
      ),
      frippPolymeterSecondaryPresetId:
        typeof (body as { frippPolymeterSecondaryPresetId?: unknown }).frippPolymeterSecondaryPresetId === 'string' &&
        (body as { frippPolymeterSecondaryPresetId: string }).frippPolymeterSecondaryPresetId.trim()
          ? (body as { frippPolymeterSecondaryPresetId: string }).frippPolymeterSecondaryPresetId.trim()
          : undefined,
      zappaSoloMidiLow: coerceFiniteNumber(body.zappaSoloMidiLow),
      zappaSoloMidiHigh: coerceFiniteNumber(body.zappaSoloMidiHigh),
      zappaSoloDensity:
        body.zappaSoloDensity === 'low' ||
        body.zappaSoloDensity === 'medium' ||
        body.zappaSoloDensity === 'high'
          ? body.zappaSoloDensity
          : undefined,
      zappaSoloDissonance:
        body.zappaSoloDissonance === 'mild' ||
        body.zappaSoloDissonance === 'moderate' ||
        body.zappaSoloDissonance === 'extreme'
          ? body.zappaSoloDissonance
          : undefined,
      frankZappaContext:
        body.frankZappaContext === 'avant_rock' ||
        body.frankZappaContext === 'big_band' ||
        body.frankZappaContext === 'futuristic_jazz'
          ? body.frankZappaContext
          : undefined,
      zappaStyleMode:
        body.zappaStyleMode === 'compositional' || body.zappaStyleMode === 'bluesrockFerocious'
          ? body.zappaStyleMode
          : undefined,
      zappaEraPreset: parseZappaEraPreset(body.zappaEraPreset),
      zappaPhraseCharacter: parseZappaPhraseCharacter(body.zappaPhraseCharacter),
      zappaSymmetryBias: parseZappaSymmetryBias(body.zappaSymmetryBias),
      zappaChainDepth: parseZappaChainDepth(body.zappaChainDepth),
      milesDavisContext:
        body.milesDavisContext === 'modal_1959' ||
        body.milesDavisContext === 'quintet_1965' ||
        body.milesDavisContext === 'electric_1970'
          ? body.milesDavisContext
          : undefined,
      thadPhase:
        body.thadPhase === 'swing' || body.thadPhase === 'ballad' || body.thadPhase === 'groove'
          ? body.thadPhase
          : undefined,
      basieTestamentMode:
        body.basieTestamentMode === 'old_testament' || body.basieTestamentMode === 'new_testament'
          ? body.basieTestamentMode
          : undefined,
      joniPhase:
        body.joniPhase === 'folk_modal' || body.joniPhase === 'jazz_folk' || body.joniPhase === 'modal_jazz'
          ? body.joniPhase
          : undefined,
      bernardHerrmannContext:
        body.bernardHerrmannContext === 'bh:thriller_mode' ||
        body.bernardHerrmannContext === 'bh:romantic_mode' ||
        body.bernardHerrmannContext === 'bh:minimal_pulse'
          ? body.bernardHerrmannContext
          : undefined,
      johnWilliamsContext:
        body.johnWilliamsContext === 'jw:heroic_mode' ||
        body.johnWilliamsContext === 'jw:magic_mode' ||
        body.johnWilliamsContext === 'jw:drama_mode'
          ? body.johnWilliamsContext
          : undefined,
      ennioMorriconeContext:
        body.ennioMorriconeContext === 'em:spaghetti_mode' ||
        body.ennioMorriconeContext === 'em:lyric_mode' ||
        body.ennioMorriconeContext === 'em:serial_tension'
          ? body.ennioMorriconeContext
          : undefined,
      ninoRotaContext:
        body.ninoRotaContext === 'nr:waltz_mode' ||
        body.ninoRotaContext === 'nr:carnival_mode' ||
        body.ninoRotaContext === 'nr:godfather_mode'
          ? body.ninoRotaContext
          : undefined,
      jerryGoldsmithContext:
        body.jerryGoldsmithContext === 'jg:action_mode' ||
        body.jerryGoldsmithContext === 'jg:lyric_mode' ||
        body.jerryGoldsmithContext === 'jg:suspense_mode'
          ? body.jerryGoldsmithContext
          : undefined,
      philipGlassContext:
        body.philipGlassContext === 'pg:minimal_pulse' ||
        body.philipGlassContext === 'pg:lyrical_minimal' ||
        body.philipGlassContext === 'pg:dark_pedal'
          ? body.philipGlassContext
          : undefined,
      reichProcess:
        body.reichProcess === 'phasing' || body.reichProcess === 'additive' || body.reichProcess === 'cycle'
          ? body.reichProcess
          : undefined,
      hansZimmerContext:
        body.hansZimmerContext === 'hz:epic_mode' ||
        body.hansZimmerContext === 'hz:introspective_mode' ||
        body.hansZimmerContext === 'hz:tension_mode'
          ? body.hansZimmerContext
          : undefined,
      angeloBadalamentiContext:
        body.angeloBadalamentiContext === 'ab:dream_pop' ||
        body.angeloBadalamentiContext === 'ab:mystery_mode' ||
        body.angeloBadalamentiContext === 'ab:romantic_dark'
          ? body.angeloBadalamentiContext
          : undefined,
      bartokContext:
        body.bartokContext === 'mikrokosmos' ||
        body.bartokContext === 'string_quartet' ||
        body.bartokContext === 'music_for_strings'
          ? body.bartokContext
          : undefined,
      gershwinContext:
        body.gershwinContext === 'song_aaba' ||
        body.gershwinContext === 'rhapsody' ||
        body.gershwinContext === 'rhythm_changes'
          ? body.gershwinContext
          : undefined,
      arvoPartContext:
        body.arvoPartContext === 'fur_alina' ||
        body.arvoPartContext === 'spiegel' ||
        body.arvoPartContext === 'fratres'
          ? body.arvoPartContext
          : undefined,
      arvoPartTintinnabuli: (() => {
        const raw = (body as { arvoPartTintinnabuli?: unknown }).arvoPartTintinnabuli;
        if (!raw || typeof raw !== 'object') return undefined;
        const o = raw as Record<string, unknown>;
        const triadRoot = typeof o.triadRoot === 'string' ? o.triadRoot.trim() : undefined;
        const position =
          o.position === 'above' || o.position === 'below' || o.position === 'alternating'
            ? o.position
            : undefined;
        const mode = o.mode === 'M1' || o.mode === 'M2' ? o.mode : undefined;
        const triadQuality = o.triadQuality === 'major' || o.triadQuality === 'minor' ? o.triadQuality : undefined;
        if (!triadRoot && !position && !mode && !triadQuality) return undefined;
        return {
          ...(triadRoot ? { triadRoot } : {}),
          ...(position ? { position } : {}),
          ...(mode ? { mode } : {}),
          ...(triadQuality ? { triadQuality } : {}),
        };
      })(),
      princeContext:
        body.princeContext === 'purple_rain' ||
        body.princeContext === 'sign_o_times' ||
        body.princeContext === 'kiss'
          ? body.princeContext
          : undefined,
      beatlesContext:
        body.beatlesContext === 'merseybeat_1962' ||
        body.beatlesContext === 'rubber_soul_1965' ||
        body.beatlesContext === 'abbey_road_1968'
          ? body.beatlesContext
          : undefined,
      beatlesFormTemplate:
        body.beatlesFormTemplate === 'vv_br_v' ||
        body.beatlesFormTemplate === 'verse_chorus' ||
        body.beatlesFormTemplate === 'legacy_vc'
          ? body.beatlesFormTemplate
          : undefined,
      beatlesMelodicLens:
        body.beatlesMelodicLens === 'neutral' ||
        body.beatlesMelodicLens === 'lennon' ||
        body.beatlesMelodicLens === 'mccartney' ||
        body.beatlesMelodicLens === 'blended'
          ? body.beatlesMelodicLens
          : undefined,
      radioheadMelodicContext:
        body.radioheadMelodicContext === 'acoustic' || body.radioheadMelodicContext === 'electronic'
          ? body.radioheadMelodicContext
          : undefined,
      felaKutiContext:
        body.felaKutiContext === 'zombie_1977' ||
        body.felaKutiContext === 'water_no_get_enemy' ||
        body.felaKutiContext === 'lady_1972'
          ? body.felaKutiContext
          : undefined,
      felaPercussionFeelOverride:
        body.felaPercussionFeelOverride === 'straight' ||
        body.felaPercussionFeelOverride === 'swing' ||
        body.felaPercussionFeelOverride === 'afrobeat'
          ? body.felaPercussionFeelOverride
          : undefined,
      styleGenerationContextKeys: (() => {
        const raw = (body as { styleGenerationContextKeys?: unknown }).styleGenerationContextKeys;
        if (!Array.isArray(raw)) return undefined;
        const out = raw
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim());
        return out.length ? out : undefined;
      })(),
      sqRhythmEngineId: (() => {
        const v = (body as { sqRhythmEngineId?: unknown }).sqRhythmEngineId;
        if (v === 'bartok_bulgarian_aksak') return 'bartok_bulgarian_aksak' as const;
        if (v === 'free_proportional') return 'free_proportional' as const;
        if (v === 'baroque_dance') return 'baroque_dance' as const;
        if (v === 'reich_phasing_grid') return 'reich_phasing_grid' as const;
        if (v === 'viennese_waltz') return 'viennese_waltz' as const;
        if (v === 'jewish_klezmer') return 'jewish_klezmer' as const;
        return undefined;
      })(),
      sqArrangerVrb: (() => {
        const raw = (body as { sqArrangerVrb?: unknown }).sqArrangerVrb;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
        const vid = (raw as { voiceId?: unknown }).voiceId;
        if (typeof vid !== 'string' || !vid.trim()) return undefined;
        return raw as GenerateRequest['sqArrangerVrb'];
      })(),
      slonimskyPatternId: (() => {
        if (typeof body.slonimskyPatternId === 'string' && body.slonimskyPatternId.trim() !== '') {
          return body.slonimskyPatternId.trim();
        }
        const alt = (body as { patternId?: unknown }).patternId;
        return typeof alt === 'string' && alt.trim() !== '' ? alt.trim() : undefined;
      })(),
      slonimskyKeyPc: (() => {
        const k = coerceFiniteNumber(body.slonimskyKeyPc);
        if (k === undefined) return undefined;
        const i = Math.round(k);
        if (i < 0 || i > 11) return undefined;
        return i;
      })(),
      slonimskyCycleKeys: body.slonimskyCycleKeys === true ? true : undefined,
      song: coerceSongFromBody(body),
      grooveScaffold: coerceGrooveScaffoldFromBody(body),
      uiDrumPattern: coerceUiDrumPatternFromBody(body),
      drumLoopPath: coerceDrumLoopPathFromBody(body),
      fillSchedulerConfig: coerceFillSchedulerConfigFromBody(body),
      fingerprintReceipt: coerceFingerprintReceiptFromBody(body),
      vrbProfile: coerceVrbProfileFromBody(body),
      bigBandConfig: coerceBigBandConfigFromBody(body),
      stringQuartetConfig: coerceStringQuartetConfigFromBody(body),
      contrapuntalConfig: coerceContrapuntalConfigFromBody(body),
      martinoConfig: coerceMartinoConfigFromBody(body),
    };
    const genCorr = req_.__generateCorrelationId;
    if (genCorr != null) {
      const normalizedAlt = normalizeAlternateGuitarTuningRequest(req_.alternateGuitarTuning);
      console.log('[GEN-CORR] apiGenerate:normalized-req', {
        corr: genCorr,
        presetId: req_.presetId,
        styleProfile: req_.styleProfile,
        alternateGuitarTuningRaw: req_.alternateGuitarTuning,
        alternateGuitarTuningNormalized: normalizedAlt,
        indieDualElectric:
          req_.presetId === 'song_mode' &&
          styleProfileSupportsAlternateGuitarTuning(req_.styleProfile) &&
          indieArtPopAlternateTuningWantsDualElectricGuitars(normalizedAlt ?? undefined),
      });
    }
    /** Riff writes only under `<library root>/Riffs` — never fall back to env/AppData if the root is missing. */
    let presetDir: string;
    if (req_.presetId === 'riff_generator') {
      const root = composerLibraryRoot?.trim();
      if (!root) {
        return {
          success: false,
          error:
            'Riff Generator: Composer OS library root was not provided. Restart the desktop app or regenerate from a supported client.',
          composerOsVersion: COMPOSER_OS_VERSION,
        };
      }
      presetDir = ensureOutputDirectoryForPreset('riff_generator', root);
    } else {
      presetDir = ensureOutputDirectoryForPreset(req_.presetId, composerLibraryRoot);
    }
    if (
      process.env.COMPOSER_OS_DESKTOP_IPC === '1' &&
      process.env.COMPOSER_OS_TRUTH_DUMP === '1' &&
      req_.presetId === 'song_mode'
    ) {
      console.log('[composer-os truth] apiGenerate normalized request', JSON.stringify(req_, null, 2));
    }
    const tb = req_.totalBars;
    if (
      (req_.presetId === 'big_band' || req_.presetId === 'string_quartet') &&
      tb !== undefined &&
      ![16, 24, 32, 40, 42, 48, 64].includes(tb)
    ) {
      return {
        success: false,
        error: 'totalBars must be 16, 24, 32, 40, 42, 48, or 64 for Big Band and String Quartet.',
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    if (
      (req_.presetId === 'song_mode' || isGuitarBassDuoFamily(req_.presetId)) &&
      tb !== undefined &&
      !isAllowedSongFormBarCount(tb)
    ) {
      return {
        success: false,
        error: `totalBars must be one of: ${SONG_FORM_BAR_OPTIONS.join(', ')} for Song Mode and Guitar–Bass Duo presets.`,
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    const altForIndieGuard = normalizeAlternateGuitarTuningRequest(req_.alternateGuitarTuning);
    if (
      req_.styleProfile === 'STYLE_INDIE_ART_POP' &&
      altForIndieGuard?.mode === 'separate' &&
      (altForIndieGuard.guitar1?.presetId === 'standard' || altForIndieGuard.guitar2?.presetId === 'standard')
    ) {
      return {
        success: false,
        error:
          'Indie Art Pop separate tuning: requires both Guitar 1 and Guitar 2 to use non-standard tunings.',
        composerOsVersion: COMPOSER_OS_VERSION,
      };
    }
    return runAppGeneration(req_, presetDir);
  } catch (err) {
    return {
      success: false,
      error: friendlyGenerateError(err),
      detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    };
  }
}

export function apiListOutputs(composerRoot: string) {
  try {
    return { outputs: listOutputs(composerRoot) };
  } catch (err) {
    throw new Error(friendlyOutputDirError(err));
  }
}

export function apiGetOutputDirectory(composerRoot: string) {
  const root = resolveComposerLibraryRoot(composerRoot);
  return {
    path: root,
    displayPath: displayPathForApi(root),
    presetFolders: { ...PRESET_OUTPUT_SUBFOLDER },
  };
}

export function apiGetDiagnostics(outputDir: string, activePort: number) {
  return buildDiagnostics(outputDir, activePort, {
    desktopTransport: activePort === 0 ? 'ipc' : 'http',
  });
}

export async function apiOpenOutputFolder(
  composerRoot: string,
  body?: { path?: string }
): Promise<OpenOutputFolderResult> {
  console.log('[API][handler] apiOpenOutputFolder entry', { composerRoot, body });
  const resolved = resolveOpenFolderTarget(composerRoot, body);
  console.log('[API][handler] apiOpenOutputFolder resolved', resolved);
  if (!resolved.ok) {
    return { success: false, message: resolved.message };
  }
  return openOutputFolder(resolved.target);
}

export async function apiSystemCheck(): Promise<
  Awaited<ReturnType<typeof runSystemCheck>> | { success: false; error: string; blocked?: true }
> {
  if (isSystemCheckDisabled()) {
    return {
      success: false,
      error: 'System check is disabled (COMPOSER_OS_DISABLE_SYSTEM_CHECK).',
      blocked: true,
    };
  }
  return runSystemCheck();
}

export type PdfGenerateFromPdfRequest = {
  pdfBase64: string;
  pageNumber?: number;
  mode?: 'solo' | 'melody';
  tuningId?: string;
  riffStyle?: string;
  drift?: EmotionalDrift;
  seed?: number;
  duoIntent?: 'conversational' | 'supportive';
  songwriterStyleId?: string;
  chorusCount?: number;
};

export type PdfGenerateFromPdfResponse = {
  success: true;
  output: IRealVaultOutput | null;
  /** Same chart used for {@link output} — enables client-side vault remix without re-OCR. */
  parsedChart?: ParsedChart | null;
  musicContext?: MusicContext;
  error?: string;
};

export type {
  MelodicVariationPackRequest,
  MelodicVariationPackResponse,
  MelodicVariationPackNoteEvent,
  MelodicVariationPackSuccessResponse,
} from './appApiTypes';

export type MelodicVariationPackApiBody = MelodicVariationPackRequest & {
  /** Optional section map for GCE Structure & Form (defaults to one section spanning `chords`). */
  sections?: Array<{ label: string; barStart: number; barEnd: number; role?: string }>;
};

/**
 * Motif mutations + GCE overall via {@link scoreResultForGce} (same auto-scorers as gate).
 * Dedup threshold 0.92 is applied inside {@link generateMelodicVariations} before scoring.
 */
export function apiMelodicVariationPack(
  body: Partial<MelodicVariationPackApiBody>
): MelodicVariationPackResponse {
  const melody = body.melody;
  if (!Array.isArray(melody) || melody.length === 0) {
    return { success: false, error: 'melody must be a non-empty array of { pitch, duration }.' };
  }
  const chords = body.chords;
  if (!Array.isArray(chords) || chords.length === 0) {
    return { success: false, error: 'chords must be a non-empty string array.' };
  }
  for (const n of melody) {
    if (
      !n ||
      typeof (n as { pitch?: unknown }).pitch !== 'number' ||
      typeof (n as { duration?: unknown }).duration !== 'number'
    ) {
      return { success: false, error: 'Each melody note needs numeric pitch and duration.' };
    }
  }

  const vcRaw = body.variationCount;
  if (typeof vcRaw !== 'number' || !Number.isFinite(vcRaw)) {
    return { success: false, error: 'variationCount must be a finite number (clamped to 3–5).' };
  }
  const variationSlots = Math.max(3, Math.min(5, Math.floor(vcRaw)));

  const sidRaw = body.songwriterId;
  if (typeof sidRaw !== 'string' || !sidRaw.trim()) {
    return { success: false, error: 'songwriterId is required.' };
  }
  const songwriterResolved = normalizeSongwriterStyleKey(sidRaw);
  if (!songwriterResolved) {
    return { success: false, error: `Unknown songwriterId: ${sidRaw.trim()}` };
  }

  const m = melody as MelodicVariationPackNoteEvent[];
  const candidates = generateMelodicVariations(m, variationSlots);
  const sections: GceStructureSection[] =
    body.sections && body.sections.length > 0
      ? body.sections.map((s) => ({
          label: s.label,
          barStart: s.barStart,
          barEnd: s.barEnd,
          role: s.role ?? s.label,
        }))
      : [{ label: 'A', barStart: 1, barEnd: Math.max(1, chords.length), role: 'A' }];
  const scored = scoreMelodicVariationsForPack(candidates, {
    chords,
    sections,
    songwriterId: songwriterResolved,
  });
  const top = scored.slice(0, variationSlots);
  return {
    success: true,
    scoringMode: 'melody-only',
    melody: melody.map((x) => ({ pitch: x.pitch, duration: x.duration })),
    variations: top.map((s) => ({
      melody: s.variation.notes.map((n) => ({ pitch: n.pitch, duration: n.duration })),
      gceScore: s.gceScore,
      transform: s.variation.transform,
    })),
  };
}

/**
 * Node-only: render PDF page → vision → vault riff (same as {@link generateFromPdf}).
 * Call from HTTP or Electron IPC; not for browser bundles.
 */
export async function apiPdfGenerateFromPdf(
  body: PdfGenerateFromPdfRequest
): Promise<PdfGenerateFromPdfResponse> {
  if (typeof body?.pdfBase64 !== 'string' || body.pdfBase64.length === 0) {
    return { success: true, output: null, error: 'Missing pdfBase64.' };
  }
  try {
    const buf = Buffer.from(body.pdfBase64, 'base64');
    if (buf.length === 0) {
      return { success: true, output: null, error: 'Could not decode PDF (empty buffer).' };
    }
    const uint = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const pageNum = coerceFiniteNumber(body.pageNumber);
    const out = await generateFromPdf(uint, {
      pageNumber: pageNum !== undefined ? Math.max(1, Math.floor(pageNum)) : 1,
      mode: body.mode,
      tuningId: body.tuningId,
      riffStyle: body.riffStyle,
      drift: body.drift,
      seed: body.seed,
      duoIntent: body.duoIntent,
      songwriterStyleId: body.songwriterStyleId,
      chorusCount: body.chorusCount,
    });
    if (!out) {
      return {
        success: true,
        output: null,
        error: formatPdfExtractFailureHint(),
      };
    }
    const musicContext = buildMusicContextFromVaultOutput(out.output, out.chart);
    return { success: true, output: out.output, parsedChart: out.chart, musicContext };
  } catch (e) {
    return {
      success: true,
      output: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function apiAnalyse(
  req: { chords: string[]; key?: string }
):
  | { success: true; result: AnalyticalModeResult }
  | { success: false; error: string } {
  try {
    const chords = req?.chords;
    if (!Array.isArray(chords) || chords.length === 0) {
      return { success: false, error: 'chords must be a non-empty string array.' };
    }
    const result = runAnalyticalMode(chords, req.key);
    return { success: true, result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function apiExportPdf(req: {
  musicXmlPath: string;
  outputPath: string;
}): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    if (!req?.musicXmlPath?.trim() || !req?.outputPath?.trim()) {
      return { success: false, error: 'musicXmlPath and outputPath are required.' };
    }
    return await exportMusicXmlToPdf(req.musicXmlPath.trim(), req.outputPath.trim());
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function apiExportGuitarPro(req: {
  musicXmlPath: string;
  outputPath: string;
}): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    if (!req?.musicXmlPath?.trim() || !req?.outputPath?.trim()) {
      return { success: false, error: 'musicXmlPath and outputPath are required.' };
    }
    return await exportMusicXmlToGuitarPro(req.musicXmlPath.trim(), req.outputPath.trim());
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
