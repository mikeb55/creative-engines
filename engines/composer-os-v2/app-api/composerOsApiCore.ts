/**
 * Shared Composer OS app API logic (HTTP routes + Electron IPC). Single source for engine calls.
 */
import * as path from 'path';
import { getPresets } from './getPresets';
import { getStyleModules } from './getStyleModules';
import { generateComposition, type GenerateResult } from './generateComposition';
import { listOutputs } from './listOutputs';
import { openOutputFolder, type OpenOutputFolderResult } from './openOutputFolder';
import { buildDiagnostics } from './buildDiagnostics';
import { friendlyGenerateError, friendlyOutputDirError } from './apiErrorMessages';
import type { GenerateRequest } from './appApiTypes';
import {
  ensureOutputDirectoryForPreset,
  getComposerFilesRoot,
  isPathUnderComposerRoot,
  PRESET_OUTPUT_SUBFOLDER,
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
      styleStack: body.styleStack ?? { primary: 'barry_harris', weights: { primary: 1 } },
      seed: typeof body.seed === 'number' ? body.seed : Math.floor(Math.random() * 1e9),
      locks: body.locks,
    };
    const presetDir = ensureOutputDirectoryForPreset(req_.presetId);
    return generateComposition(req_, presetDir);
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
  let target = composerRoot;
  if (body?.path && typeof body.path === 'string' && body.path.trim()) {
    const resolved = path.resolve(body.path.trim());
    if (!isPathUnderComposerRoot(composerRoot, resolved)) {
      return {
        success: false,
        message: 'That folder is not part of your Composer OS output library.',
      };
    }
    target = resolved;
  }
  return openOutputFolder(target);
}
