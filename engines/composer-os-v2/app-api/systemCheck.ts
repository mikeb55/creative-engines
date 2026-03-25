/**
 * One-click "system check" — runs Composer OS–scoped npm tests from the repo root (no full monorepo chain).
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type SystemCheckStep = {
  id: 'engine' | 'retro' | 'app';
  label: string;
  ok: boolean;
  exitCode: number | null;
};

export type SystemCheckResult = {
  ok: boolean;
  summary: string;
  failureCount: number;
  failuresByCategory: { engine: number; retro: number; app: number };
  steps: SystemCheckStep[];
  /** Truncated combined log for expandable UI */
  detailLog: string;
  repoRoot: string;
};

function npmCmd(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Resolve creative-engines repo root. Prefer COMPOSER_OS_REPO_ROOT (set by Electron main).
 */
export function resolveComposerOsRepoRoot(): string {
  const env = process.env.COMPOSER_OS_REPO_ROOT?.trim();
  if (env) return path.resolve(env);
  const here = __dirname;
  const candidates = [
    path.resolve(here, '..', '..', '..'),
    path.resolve(here, '..', '..'),
    path.resolve(here, '..'),
  ];
  for (const c of candidates) {
    if (
      fs.existsSync(path.join(c, 'package.json')) &&
      fs.existsSync(path.join(c, 'engines', 'composer-os-v2', 'package.json'))
    ) {
      return c;
    }
  }
  return path.resolve(here, '..', '..', '..');
}

const STEPS: Array<{ id: SystemCheckStep['id']; label: string; npmArgs: string[] }> = [
  {
    id: 'engine',
    label: 'Composer OS engine tests',
    npmArgs: ['run', 'test', '--prefix', 'engines/composer-os-v2'],
  },
  {
    id: 'retro',
    label: 'Composer OS retro tests',
    npmArgs: ['run', 'test:retro', '--prefix', 'engines/composer-os-v2'],
  },
  {
    id: 'app',
    label: 'Composer OS app (UI) tests',
    npmArgs: ['run', 'test', '--prefix', 'apps/composer-os-app'],
  },
];

function runNpm(cwd: string, npmArgs: string[]): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(npmCmd(), npmArgs, {
      cwd,
      shell: false,
      env: { ...process.env },
    });
    let out = '';
    const max = 400_000;
    const append = (chunk: string) => {
      out += chunk;
      if (out.length > max) out = out.slice(-max);
    };
    child.stdout?.on('data', (d: Buffer) => append(String(d)));
    child.stderr?.on('data', (d: Buffer) => append(String(d)));
    child.on('close', (code) => resolve({ code: code ?? 1, out }));
    child.on('error', (err) => resolve({ code: 1, out: String(err) }));
  });
}

function buildSummary(
  steps: SystemCheckStep[],
  failuresByCategory: SystemCheckResult['failuresByCategory']
): string {
  const failed = steps.filter((s) => !s.ok);
  if (failed.length === 0) return 'All checks passed.';
  const parts: string[] = [];
  if (failuresByCategory.engine) parts.push('engine tests');
  if (failuresByCategory.retro) parts.push('retro tests');
  if (failuresByCategory.app) parts.push('UI wiring / app tests');
  const cat = parts.length ? parts.join(', ') : 'checks';
  return `${failed.length} failure(s) in ${cat}.`;
}

export async function runSystemCheck(): Promise<SystemCheckResult> {
  const repoRoot = resolveComposerOsRepoRoot();
  const detailChunks: string[] = [];

  if (!fs.existsSync(path.join(repoRoot, 'package.json'))) {
    const msg =
      'Composer OS repo root was not found. System check runs only when npm tests are available (development tree).';
    return {
      ok: false,
      summary: msg,
      failureCount: 1,
      failuresByCategory: { engine: 1, retro: 0, app: 0 },
      steps: [
        {
          id: 'engine',
          label: STEPS[0].label,
          ok: false,
          exitCode: null,
        },
      ],
      detailLog: msg,
      repoRoot,
    };
  }

  const steps: SystemCheckStep[] = [];
  const failuresByCategory = { engine: 0, retro: 0, app: 0 };

  for (const s of STEPS) {
    detailChunks.push(`\n--- ${s.label} ---\n`);
    const { code, out } = await runNpm(repoRoot, s.npmArgs);
    detailChunks.push(out);
    const ok = code === 0;
    steps.push({ id: s.id, label: s.label, ok, exitCode: code });
    if (!ok) {
      failuresByCategory[s.id] = 1;
    }
  }

  const failureCount = steps.filter((x) => !x.ok).length;
  const ok = failureCount === 0;

  return {
    ok,
    summary: buildSummary(steps, failuresByCategory),
    failureCount,
    failuresByCategory,
    steps,
    detailLog: detailChunks.join(''),
    repoRoot,
  };
}

export function isSystemCheckDisabled(): boolean {
  return process.env.COMPOSER_OS_DISABLE_SYSTEM_CHECK === '1';
}
