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
  ensureOutputDirectoryForPreset,
  getComposerFilesRoot,
  PRESET_OUTPUT_SUBFOLDER,
  resolveComposerLibraryRoot,
  resolveOpenFolderTarget,
} from './composerOsOutputPaths';

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
    };
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
      (req_.presetId === 'song_mode' ||
        req_.presetId === 'guitar_bass_duo' ||
        req_.presetId === 'guitar_bass_duo_single_line') &&
      tb !== undefined &&
      tb !== 8 &&
      tb !== 16 &&
      tb !== 32
    ) {
      return {
        success: false,
        error: 'totalBars must be 8, 16, or 32 for Song Mode and Guitar–Bass Duo presets.',
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
  const resolved = resolveOpenFolderTarget(composerRoot, body);
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
