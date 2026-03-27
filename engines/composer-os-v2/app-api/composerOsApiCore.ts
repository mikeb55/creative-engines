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

export function apiGetPresets(): { presets: ReturnType<typeof getPresets> } {
  return { presets: getPresets() };
}

export function apiGetStyleModules(): { modules: ReturnType<typeof getStyleModules> } {
  return { modules: getStyleModules() };
}

export function apiGenerate(
  body: Partial<GenerateRequest>,
  composerLibraryRoot: string
): GenerateResult | { success: false; error: string; detail?: string } {
  try {
    const rawPreset = typeof body.presetId === 'string' ? body.presetId : undefined;
    const presetIdResolved = rawPreset ?? 'guitar_bass_duo';
    if (!SUPPORTED_APP_PRESET_IDS.includes(presetIdResolved as SupportedAppPresetId)) {
      return {
        success: false,
        error: `Unsupported preset: ${rawPreset ?? '(missing)'}`,
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
        body.harmonyMode === 'custom' || body.harmonyMode === 'builtin' ? body.harmonyMode : undefined,
      chordProgressionText:
        typeof body.chordProgressionText === 'string' ? body.chordProgressionText : undefined,
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
      bpm: typeof body.bpm === 'number' && Number.isFinite(body.bpm) ? body.bpm : undefined,
      totalBars: typeof body.totalBars === 'number' && Number.isFinite(body.totalBars) ? body.totalBars : undefined,
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
