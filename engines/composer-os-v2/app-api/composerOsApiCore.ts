/**
 * Shared Composer OS app API logic (HTTP routes + Electron IPC). Single source for engine calls.
 */
import * as path from 'path';
import { getPresets } from './getPresets';
import { getStyleModules } from './getStyleModules';
import { generateComposition, type GenerateResult } from './generateComposition';
import { listOutputs } from './listOutputs';
import { openOutputFolder } from './openOutputFolder';
import { buildDiagnostics } from './buildDiagnostics';
import { friendlyGenerateError, friendlyOutputDirError } from './apiErrorMessages';
import type { GenerateRequest } from './appApiTypes';

export function getConfiguredOutputDir(): string {
  if (process.env.COMPOSER_OS_OUTPUT_DIR && process.env.COMPOSER_OS_OUTPUT_DIR.trim() !== '') {
    return path.resolve(process.env.COMPOSER_OS_OUTPUT_DIR);
  }
  const repoRoot = path.resolve(__dirname, '..');
  return path.join(repoRoot, 'outputs', 'composer-os-v2');
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
  outputDir: string
): GenerateResult | { success: false; error: string; detail?: string } {
  try {
    const req_: GenerateRequest = {
      presetId: body.presetId ?? 'guitar_bass_duo',
      styleStack: body.styleStack ?? { primary: 'barry_harris', weights: { primary: 1 } },
      seed: typeof body.seed === 'number' ? body.seed : Math.floor(Math.random() * 1e9),
      locks: body.locks,
    };
    return generateComposition(req_, outputDir);
  } catch (err) {
    return {
      success: false,
      error: friendlyGenerateError(err),
      detail: process.env.NODE_ENV === 'development' ? String(err) : undefined,
    };
  }
}

export function apiListOutputs(outputDir: string) {
  try {
    return { outputs: listOutputs(outputDir) };
  } catch (err) {
    throw new Error(friendlyOutputDirError(err));
  }
}

export function apiGetOutputDirectory(outputDir: string) {
  return { path: outputDir, displayPath: displayPathForApi(outputDir) };
}

export function apiGetDiagnostics(outputDir: string, activePort: number) {
  return buildDiagnostics(outputDir, activePort, {
    desktopTransport: activePort === 0 ? 'ipc' : 'http',
  });
}

export async function apiOpenOutputFolder(outputDir: string) {
  return openOutputFolder(outputDir);
}
