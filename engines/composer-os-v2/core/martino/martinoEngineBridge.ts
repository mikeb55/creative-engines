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

let bridgeQueue: Promise<unknown> = Promise.resolve();

function enqueueBridge<T>(fn: () => Promise<T>): Promise<T> {
  const run = bridgeQueue.then(fn, fn);
  bridgeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Packaged Electron: martino ships in `extraResources` → `process.resourcesPath/martino`. */
function packagedMartinoResourcesRoot(): string | null {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (typeof resourcesPath !== 'string' || !resourcesPath.length) {
    return null;
  }
  if (existsSync(path.join(resourcesPath, 'martino', 'martino_bridge.py'))) {
    return resourcesPath;
  }
  return null;
}

/** Repo root for martino/ — bundled __dirname is desktop resources, not engines/martino. */
function resolveMartinoRepoRoot(): string {
  const packagedRoot = packagedMartinoResourcesRoot();
  if (packagedRoot) {
    return packagedRoot;
  }
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
  error?: string;
  provenanceLog?: Array<Record<string, unknown>>;
}

function fail(reason: string, stderrExcerpt = ''): MartinoEngineResponse {
  return {
    ok: false,
    outputPath: '',
    versionUsed: '',
    warnings: [],
    activityMapText: '',
    lfvFlags: [],
    stderrExcerpt: stderrExcerpt.slice(0, 500),
    error: reason,
  };
}

function extractJsonPayload(stdout: string): string | null {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  return stdout.slice(start, end + 1);
}

function preflight(): MartinoEngineResponse | null {
  const pyCheck = spawnSync('py', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (pyCheck.error || pyCheck.status !== 0) {
    return fail('py not found', pyCheck.stderr ?? pyCheck.error?.message ?? '');
  }
  const { bridgeScript, generatorScript, outputDir } = getMartinoPaths();
  if (!existsSync(bridgeScript)) return fail(`Missing bridge script: ${bridgeScript}`);
  if (!existsSync(generatorScript)) return fail(`Missing generator script: ${generatorScript}`);
  try {
    accessSync(outputDir, fsConstants.W_OK);
  } catch {
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      return fail(
        `Martino Linear output folder not writable: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return null;
}

function parseBridgeResult(stdout: string, stderr: string, status: number | null): MartinoEngineResponse {
  if (status !== 0 && !stdout.trim()) {
    const excerpt = stderr.trim().slice(0, 500);
    return fail(excerpt || `Bridge exited with code ${status}`, excerpt);
  }
  const jsonText = extractJsonPayload(stdout);
  if (!jsonText) {
    const excerpt = stderr.trim().slice(0, 500);
    return fail('no JSON in stdout', excerpt || stdout.trim().slice(0, 500));
  }
  try {
    const parsed = JSON.parse(jsonText) as MartinoEngineResponse;
    if (!parsed.stderrExcerpt && stderr.trim()) {
      parsed.stderrExcerpt = stderr.trim().slice(0, 500);
    }
    if (parsed.ok === false && !parsed.error) {
      parsed.error = parsed.stderrExcerpt || 'bridge returned ok:false';
    }
    return parsed;
  } catch {
    const excerpt = stderr.trim().slice(0, 500);
    return fail('malformed JSON', excerpt || jsonText.slice(0, 500));
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
    return fail('bridge timeout');
  }
  return parseBridgeResult(result.stdout ?? '', result.stderr ?? '', result.status);
}

function runMartinoBridgeOnce(tuneConfig: Record<string, unknown>): Promise<MartinoEngineResponse> {
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
      resolve(fail('bridge timeout'));
    }, TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve(fail(err.message, err.message));
    });
    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve(parseBridgeResult(stdout, stderr, code));
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
}

export function callMartinoEngine(tuneConfig: Record<string, unknown>): Promise<MartinoEngineResponse> {
  return enqueueBridge(() => runMartinoBridgeOnce(tuneConfig));
}
