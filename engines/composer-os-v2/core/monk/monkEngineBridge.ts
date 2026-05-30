/**
 * Monk Python engine bridge (V105p5).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveComposerOsRepoRoot } from '../../app-api/systemCheck';

const TIMEOUT_MS = 30_000;

export type MonkBridgeRequest = {
  title: string;
  seed?: number;
  mode?: string;
  profile?: string;
  customChords?: string;
};

export type MonkBridgeResult = {
  ok: boolean;
  harmonyBars: string[];
  tempo: number;
  title: string;
  profile: string;
  form: string | null;
  barCount: number;
  seed: number;
  stderrExcerpt: string;
  chromaticNeighbourRate: number;
  tritoneShiftCount: number;
  rhythmicMotifConsistency: number;
  dissonanceResolutionScore: number;
  error?: string;
};

function resolveMonkBridgeScript(): string {
  const envRoot = process.env.COMPOSER_OS_REPO_ROOT?.trim();
  const candidates: string[] = [];
  if (envRoot) {
    candidates.push(path.join(path.resolve(envRoot), 'engines', 'monk-engine', 'monk_bridge.py'));
  }
  const repoRoot = resolveComposerOsRepoRoot();
  candidates.push(path.join(repoRoot, 'engines', 'monk-engine', 'monk_bridge.py'));

  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    candidates.push(path.join(dir, 'engines', 'monk-engine', 'monk_bridge.py'));
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

function emptyMonkBridgeResult(seed: number, error: string, stderrExcerpt = ''): MonkBridgeResult {
  return {
    ok: false,
    harmonyBars: [],
    tempo: 0,
    title: '',
    profile: '',
    form: null,
    barCount: 0,
    seed,
    stderrExcerpt,
    chromaticNeighbourRate: 0,
    tritoneShiftCount: 0,
    rhythmicMotifConsistency: 0,
    dissonanceResolutionScore: 0,
    error,
  };
}

export function callMonkBridgeSync(request: MonkBridgeRequest): MonkBridgeResult {
  const bridgeScript = resolveMonkBridgeScript();
  if (!existsSync(bridgeScript)) {
    return emptyMonkBridgeResult(request.seed ?? 0, `Missing bridge script: ${bridgeScript}`);
  }

  const pyCheck = spawnSync('py', ['--version'], { encoding: 'utf8', windowsHide: true });
  if (pyCheck.error || pyCheck.status !== 0) {
    return emptyMonkBridgeResult(
      request.seed ?? 0,
      'py not found',
      pyCheck.stderr ?? pyCheck.error?.message ?? '',
    );
  }

  const payload = JSON.stringify({
    title: request.title,
    seed: request.seed ?? 42,
    mode: request.mode ?? 'title',
    profile: request.profile ?? 'angular',
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
    return emptyMonkBridgeResult(request.seed ?? 0, 'bridge timeout', 'bridge timeout');
  }

  const jsonText = extractJsonPayload(result.stdout ?? '');
  if (!jsonText) {
    return emptyMonkBridgeResult(
      request.seed ?? 0,
      'no JSON in bridge stdout',
      (result.stderr ?? '').trim().slice(0, 500),
    );
  }

  try {
    const parsed = JSON.parse(jsonText) as MonkBridgeResult;
    if (!parsed.stderrExcerpt && result.stderr?.trim()) {
      parsed.stderrExcerpt = result.stderr.trim().slice(0, 500);
    }
    return parsed;
  } catch {
    return emptyMonkBridgeResult(
      request.seed ?? 0,
      'malformed bridge JSON',
      jsonText.slice(0, 500),
    );
  }
}
