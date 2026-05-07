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
import type { GenerateRequest } from './appApiTypes';
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
import { sanitizeBarMeterMap } from '../core/rhythm/barMeterTypes';
import type { IRealVaultOutput } from '../core/irealpro/irealVaultPipeline';
import type { ParsedChart } from '../core/irealpro/parsedChart';
import type { EmotionalDrift } from '../core/harmony/reharmCandidateEngine';
import { formatPdfExtractFailureHint, generateFromPdf } from '../core/pdf';

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
      milesDavisContext:
        body.milesDavisContext === 'modal_1959' ||
        body.milesDavisContext === 'quintet_1965' ||
        body.milesDavisContext === 'electric_1970'
          ? body.milesDavisContext
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
  error?: string;
};

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
    return { success: true, output: out.output, parsedChart: out.chart };
  } catch (e) {
    return {
      success: true,
      output: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
