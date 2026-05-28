/**
 * Spawn Martino Python bridge (shared by API + desktop IPC).
 */

import { spawn, spawnSync } from 'node:child_process';
import { constants as fsConstants, existsSync, mkdirSync, accessSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const BRIDGE_SCRIPT = path.join(REPO_ROOT, 'martino', 'martino_bridge.py');
const GENERATOR_SCRIPT = path.join(REPO_ROOT, 'martino', 'generator.py');
const OUTPUT_DIR = path.join(REPO_ROOT, 'temp', 'martino');
const TIMEOUT_MS = 30_000;

export interface MartinoEngineResponse {
  ok: boolean;
  outputPath: string;
  versionUsed: string;
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
  const pyCheck = spawnSync('py', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (pyCheck.status !== 0) {
    return fail('Python not found. Install Python 3.8+ and ensure py is on your PATH.');
  }
  if (!existsSync(BRIDGE_SCRIPT)) return fail(`Missing bridge script: ${BRIDGE_SCRIPT}`);
  if (!existsSync(GENERATOR_SCRIPT)) return fail(`Missing generator script: ${GENERATOR_SCRIPT}`);
  try {
    accessSync(OUTPUT_DIR, fsConstants.W_OK);
  } catch {
    try {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    } catch (err) {
      return fail(`temp/martino not writable: ${err instanceof Error ? err.message : String(err)}`);
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

export function callMartinoEngineSync(tuneConfig: Record<string, unknown>): MartinoEngineResponse {
  const pre = preflight();
  if (pre) return pre;
  const payload = JSON.stringify({ tune_config: tuneConfig });
  const result = spawnSync('py', [BRIDGE_SCRIPT], {
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
    const payload = JSON.stringify({ tune_config: tuneConfig });
    const child = spawn('py', [BRIDGE_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
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
