/**
 * Spawn Martino Python bridge (shared by API + desktop IPC).
 */

import { spawn, spawnSync } from 'node:child_process';
import { constants as fsConstants, existsSync, mkdirSync, accessSync } from 'node:fs';
import path from 'node:path';
import { resolveComposerOsRepoRoot } from '../../app-api/systemCheck';
import { ensureOutputDirectoryForPreset } from '../../app-api/composerOsOutputPaths';

const TIMEOUT_MS = 30_000;

type MartinoPaths = {
  repoRoot: string;
  bridgeScript: string;
  generatorScript: string;
  outputDir: string;
};

/** Repo root for martino/ — bundled __dirname is desktop resources, not engines/martino. */
function resolveMartinoRepoRoot(): string {
  const envRoot = process.env.COMPOSER_OS_REPO_ROOT?.trim();
  if (envRoot) {
    const resolved = path.resolve(envRoot);
    if (existsSync(path.join(resolved, 'martino', 'martino_bridge.py'))) {
      return resolved;
    }
  }
  const fromRepoHelper = resolveComposerOsRepoRoot();
  if (existsSync(path.join(fromRepoHelper, 'martino', 'martino_bridge.py'))) {
    return fromRepoHelper;
  }
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, 'martino', 'martino_bridge.py'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return fromRepoHelper;
}

function getMartinoPaths(): MartinoPaths {
  const repoRoot = resolveMartinoRepoRoot();
  return {
    repoRoot,
    bridgeScript: path.join(repoRoot, 'martino', 'martino_bridge.py'),
    generatorScript: path.join(repoRoot, 'martino', 'generator.py'),
    outputDir: ensureOutputDirectoryForPreset('martino_linear'),
  };
}

export interface MartinoEngineResponse {
  ok: boolean;
  outputPath: string;
  versionUsed: string;
  readinessScore?: number;
  warnings: string[];
  activityMapText: string;
  lfvFlags: Array<{ index: number; out_of_range: boolean }>;
  stderrExcerpt: string;
}

function fail(reason: string): MartinoEngineResponse {
  return {
    ok: false,
    outputPath: '',
    versionUsed: '',
    warnings: [],
    activityMapText: '',
    lfvFlags: [],
    stderrExcerpt: reason,
  };
}

function preflight(): MartinoEngineResponse | null {
  const { bridgeScript, generatorScript, outputDir } = getMartinoPaths();
  const pyCheck = spawnSync('py', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (pyCheck.status !== 0) {
    return fail('Python not found. Install Python 3.8+ and ensure py is on your PATH.');
  }
  if (!existsSync(bridgeScript)) return fail(`Missing bridge script: ${bridgeScript}`);
  if (!existsSync(generatorScript)) return fail(`Missing generator script: ${generatorScript}`);
  try {
    accessSync(outputDir, fsConstants.W_OK);
  } catch {
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      return fail(`Martino Linear output folder not writable: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return null;
}

function parseBridgeResult(stdout: string, stderr: string, status: number | null): MartinoEngineResponse {
  if (status !== 0 && !stdout.trim()) {
    return fail(stderr.trim() || `Bridge exited with code ${status}`);
  }
  try {
    const parsed = JSON.parse(stdout.trim()) as MartinoEngineResponse;
    if (!parsed.stderrExcerpt && stderr.trim()) {
      parsed.stderrExcerpt = stderr.trim().slice(0, 500);
    }
    return parsed;
  } catch {
    return fail(stderr.trim() || 'Invalid JSON from martino bridge stdout');
  }
}

function tuneConfigWithLibraryOutput(tuneConfig: Record<string, unknown>): Record<string, unknown> {
  const { outputDir } = getMartinoPaths();
  if (tuneConfig.output_dir) return tuneConfig;
  return { ...tuneConfig, output_dir: outputDir };
}

export function callMartinoEngineSync(tuneConfig: Record<string, unknown>): MartinoEngineResponse {
  const pre = preflight();
  if (pre) return pre;
  const { bridgeScript } = getMartinoPaths();
  const payload = JSON.stringify({ tune_config: tuneConfigWithLibraryOutput(tuneConfig) });
  const result = spawnSync('py', [bridgeScript], {
    input: payload,
    encoding: 'utf8',
    windowsHide: true,
    timeout: TIMEOUT_MS,
  });
  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
    return fail('Engine timeout after 30s');
  }
  return parseBridgeResult(result.stdout ?? '', result.stderr ?? '', result.status);
}

export function callMartinoEngine(tuneConfig: Record<string, unknown>): Promise<MartinoEngineResponse> {
  return new Promise((resolve) => {
    const pre = preflight();
    if (pre) {
      resolve(pre);
      return;
    }
    const { bridgeScript } = getMartinoPaths();
    const payload = JSON.stringify({ tune_config: tuneConfigWithLibraryOutput(tuneConfig) });
    const child = spawn('py', [bridgeScript], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve(fail('Engine timeout after 30s'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve(fail(err.message));
    });
    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve(parseBridgeResult(stdout, stderr, code));
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}
