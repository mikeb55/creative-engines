/**
 * Shared Composer OS app API logic (HTTP routes + Electron IPC). Single source for engine calls.
 */
import * as path from 'path';
import { getPresets } from './getPresets';
import { getStyleModules } from './getStyleModules';
import { type GenerateResult } from './generateComposition';
import { runAppGeneration } from './composerOsAppGeneration';
import { listOutputs } from './listOutputs';
import { openOutputFolder, type OpenOutputFolderResult } from './openOutputFolder';
import { buildDiagnostics } from './buildDiagnostics';
import { friendlyGenerateError, friendlyOutputDirError } from './apiErrorMessages';
import type { GenerateRequest } from './appApiTypes';
import {
  ensureOutputDirectoryForPreset,
  getComposerFilesRoot,
  PRESET_OUTPUT_SUBFOLDER,
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
  _composerRoot: string
): GenerateResult | { success: false; error: string; detail?: string } {
  try {
    const req_: GenerateRequest = {
      presetId: body.presetId ?? 'guitar_bass_duo',
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
    };
    const presetDir = ensureOutputDirectoryForPreset(req_.presetId);
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
  const root = getComposerFilesRoot();
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
