/**
 * Wayne Shorter Python engine bridge (V104p7).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveComposerOsRepoRoot } from '../../app-api/systemCheck';

const TIMEOUT_MS = 30_000;

export type WayneShorterBridgeRequest = {
  title: string;
  seed?: number;
  mode?: string;
  profile?: string;
  customChords?: string;
};

export type WayneShorterBridgeResult = {
  ok: boolean;
  harmonyBars: string[];
  tempo: number;
  title: string;
  profile: string;
  form: string | null;
  barCount: number;
  seed: number;
  stderrExcerpt: string;
  error?: string;
};

function resolveWayneShorterBridgeScript(): string {
  const envRoot = process.env.COMPOSER_OS_REPO_ROOT?.trim();
  const candidates: string[] = [];
  if (envRoot) {
    candidates.push(
      path.join(path.resolve(envRoot), 'engines', 'wayne-shorter-engine', 'wayne_shorter_bridge.py'),
    );
  }
  const repoRoot = resolveComposerOsRepoRoot();
  candidates.push(path.join(repoRoot, 'engines', 'wayne-shorter-engine', 'wayne_shorter_bridge.py'));

  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    candidates.push(path.join(dir, 'engines', 'wayne-shorter-engine', 'wayne_shorter_bridge.py'));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

function extractJsonPayload(stdout: string): string | null {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return stdout.slice(start, end + 1);
}

export function callWayneShorterBridgeSync(
  request: WayneShorterBridgeRequest,
): WayneShorterBridgeResult {
  const bridgeScript = resolveWayneShorterBridgeScript();
  if (!existsSync(bridgeScript)) {
    return {
      ok: false,
      harmonyBars: [],
      tempo: 0,
      title: '',
      profile: '',
      form: null,
      barCount: 0,
      seed: request.seed ?? 0,
      stderrExcerpt: '',
      error: `Missing bridge script: ${bridgeScript}`,
    };
  }

  const pyCheck = spawnSync('py', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (pyCheck.error || pyCheck.status !== 0) {
    return {
      ok: false,
      harmonyBars: [],
      tempo: 0,
      title: '',
      profile: '',
      form: null,
      barCount: 0,
      seed: request.seed ?? 0,
      stderrExcerpt: pyCheck.stderr ?? pyCheck.error?.message ?? '',
      error: 'py not found',
    };
  }

  const payload = JSON.stringify({
    title: request.title,
    seed: request.seed ?? 42,
    mode: request.mode ?? 'title',
    profile: request.profile ?? 'balanced',
    ...(request.customChords ? { custom_chords: request.customChords } : {}),
  });

  const result = spawnSync('py', [bridgeScript], {
    input: payload,
    encoding: 'utf8',
    windowsHide: true,
    timeout: TIMEOUT_MS,
    cwd: path.dirname(bridgeScript),
  });

  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
    return {
      ok: false,
      harmonyBars: [],
      tempo: 0,
      title: '',
      profile: '',
      form: null,
      barCount: 0,
      seed: request.seed ?? 0,
      stderrExcerpt: 'bridge timeout',
      error: 'bridge timeout',
    };
  }

  const jsonText = extractJsonPayload(result.stdout ?? '');
  if (!jsonText) {
    return {
      ok: false,
      harmonyBars: [],
      tempo: 0,
      title: '',
      profile: '',
      form: null,
      barCount: 0,
      seed: request.seed ?? 0,
      stderrExcerpt: (result.stderr ?? '').trim().slice(0, 500),
      error: 'no JSON in bridge stdout',
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as WayneShorterBridgeResult;
    if (!parsed.stderrExcerpt && result.stderr?.trim()) {
      parsed.stderrExcerpt = result.stderr.trim().slice(0, 500);
    }
    return parsed;
  } catch {
    return {
      ok: false,
      harmonyBars: [],
      tempo: 0,
      title: '',
      profile: '',
      form: null,
      barCount: 0,
      seed: request.seed ?? 0,
      stderrExcerpt: jsonText.slice(0, 500),
      error: 'malformed bridge JSON',
    };
  }
}
