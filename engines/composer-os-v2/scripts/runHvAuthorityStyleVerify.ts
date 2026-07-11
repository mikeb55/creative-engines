/**
 * HV authority per-style verification harness (80-style rollout).
 *
 * Parent: child-per-seed with wall-clock timeout; incremental JSON flush.
 * Worker: one seed PRIMARY vs HV probe.
 *
 * Usage (from engines/composer-os-v2):
 *   npx tsx --tsconfig ../../tsconfig.json scripts/runHvAuthorityStyleVerify.ts bill_evans
 *   npx tsx --tsconfig ../../tsconfig.json scripts/runHvAuthorityStyleVerify.ts bill_evans --seed 133
 *   npx tsx --tsconfig ../../tsconfig.json scripts/runHvAuthorityStyleVerify.ts bill_evans --fail-fast
 *   npx tsx --tsconfig ../../tsconfig.json scripts/runHvAuthorityStyleVerify.ts bill_evans --gce-delta-threshold 0.3
 *
 * Do not confuse with runHvAuthorityPhase0Verify.ts (Phase 0 infra).
 */

import { createHash } from 'crypto';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { resolveEffectiveStyleIdentity } from '../core/authority/resolveEffectiveStyleIdentity';
import { getCapabilityEntry } from '../core/authority/harmonicVoiceCapabilityRegistry';
import { defaultStyleProfileForPrimarySongwriter } from '../core/song-mode/songModeStyleProfileDefaults';
import {
  evaluateHardGates,
  stripFromContext,
  type HardGateId,
} from './eval/verlaineGbdWriterEvalCore';
import {
  GCE_GATE_HARMONIC_BAR_TARGET,
  scoreFrankZappaResultForGce,
  scoreGoldenPathResultForGce,
} from '../core/gce/gceGate';
import { resolveGceScorerRouting } from '../core/gce/resolveEffectiveGceStyle';

const DEFAULT_SEEDS = [133, 12345, 24680, 42069, 50021, 75001, 77777, 88888, 99999] as const;
const DEFAULT_HV_PRIMARY = 'barry_harris';
const DEFAULT_BARS = 32;
const DEFAULT_TIMEOUT_MS = 45_000;
/** Absolute |GCE_HV - GCE_PRIMARY| above this → SOFT_DIFF (gates still agree). */
const DEFAULT_GCE_DELTA_THRESHOLD = 0.3;

const SCRIPT_DIR = path.resolve(__dirname);
const ENGINE_ROOT = path.resolve(SCRIPT_DIR, '..');
const REPO_ROOT = path.resolve(ENGINE_ROOT, '../..');
const RESOLVER_REL = 'engines/composer-os-v2/core/authority/resolveEffectiveStyleIdentity.ts';
const BASELINE_PATH = path.join(SCRIPT_DIR, 'hvAuthorityStyleVerify.baselines.json');
const DEFAULT_OUT_DIR = path.join(SCRIPT_DIR, '_hvVerifyOut');

type SeedVerdict = 'PASS' | 'SOFT_DIFF' | 'DIVERGE' | 'FAIL';
type OverallVerdict = 'PASS' | 'DIVERGE' | 'FAIL';

type VariantResult = {
  label: string;
  generationSuccess: boolean;
  exportIntegrityPassed: boolean;
  lockPass: boolean;
  gceOverall: number | null;
  hardGateFailures: HardGateId[];
  harmonyAuthorityStyleId: string;
  harmonicVoice: string | undefined;
  harmonicVoiceScorerMismatch: string | undefined;
  effBarsPresent: boolean;
  timedOut?: boolean;
  error?: string;
};

type SeedRow = {
  seed: number;
  verdict: SeedVerdict;
  primary: VariantResult | null;
  hv: VariantResult | null;
  gateAgreement: boolean | null;
  gceDelta: number | null;
  detail?: string;
};

type StyleSummary = {
  totalSeeds: number;
  passCount: number;
  softDiffCount: number;
  divergeCount: number;
  failCount: number;
  allSeedsExecuted: boolean;
  overallVerdict: OverallVerdict;
};

type VerifyResult = {
  styleId: string;
  hvPrimary: string;
  totalBars: number;
  seeds: number[];
  failFast: boolean;
  timeoutMs: number;
  gceDeltaThreshold: number;
  startedAt: string;
  finishedAt: string | null;
  resolverZeroDiff: boolean;
  resolverHashActual: string;
  resolverHashExpected: string;
  overall: OverallVerdict | null;
  summary: StyleSummary | null;
  rows: SeedRow[];
};

type CliArgs = {
  styleId: string;
  seeds: number[];
  hvPrimary: string;
  totalBars: number;
  timeoutMs: number;
  failFast: boolean;
  outDir: string;
  skipResolverHash: boolean;
  worker: boolean;
  workerOut: string | null;
  gceDeltaThreshold: number;
};

function parseArgs(argv: string[]): CliArgs {
  let styleId = '';
  let seeds: number[] | null = null;
  let hvPrimary = DEFAULT_HV_PRIMARY;
  let totalBars = DEFAULT_BARS;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let failFast = false;
  let outDir = DEFAULT_OUT_DIR;
  let skipResolverHash = false;
  let worker = false;
  let workerOut: string | null = null;
  let gceDeltaThreshold = DEFAULT_GCE_DELTA_THRESHOLD;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--worker') {
      worker = true;
      continue;
    }
    if (a === '--worker-out' && argv[i + 1]) {
      workerOut = path.resolve(argv[++i]!);
      continue;
    }
    if (a === '--fail-fast') {
      failFast = true;
      continue;
    }
    if (a === '--skip-resolver-hash') {
      skipResolverHash = true;
      continue;
    }
    if (a === '--seed' && argv[i + 1]) {
      seeds = [Number(argv[++i])];
      continue;
    }
    if (a === '--seeds' && argv[i + 1]) {
      seeds = argv[++i]!.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
      continue;
    }
    if (a === '--primary' && argv[i + 1]) {
      hvPrimary = argv[++i]!.trim();
      continue;
    }
    if (a === '--bars' && argv[i + 1]) {
      totalBars = Number(argv[++i]);
      continue;
    }
    if (a === '--timeout-ms' && argv[i + 1]) {
      timeoutMs = Number(argv[++i]);
      continue;
    }
    if (a === '--gce-delta-threshold' && argv[i + 1]) {
      gceDeltaThreshold = Number(argv[++i]);
      continue;
    }
    if (a === '--out-dir' && argv[i + 1]) {
      outDir = path.resolve(argv[++i]!);
      continue;
    }
    if (a === '--style' && argv[i + 1]) {
      styleId = argv[++i]!.trim();
      continue;
    }
    if (!a.startsWith('-') && !styleId) {
      styleId = a.trim();
    }
  }

  if (!styleId) {
    console.error(
      'Usage: runHvAuthorityStyleVerify.ts <styleId> [--seed N | --seeds a,b,c] [--primary barry_harris] [--fail-fast] [--gce-delta-threshold 0.3]'
    );
    process.exit(1);
  }

  return {
    styleId,
    seeds: seeds && seeds.length ? seeds : [...DEFAULT_SEEDS],
    hvPrimary,
    totalBars,
    timeoutMs,
    failFast,
    outDir,
    skipResolverHash,
    worker,
    workerOut,
    gceDeltaThreshold,
  };
}

function buildOpts(
  seed: number,
  totalBars: number,
  opts: { primary: string; harmonicVoice?: string; title: string }
) {
  return {
    presetId: 'guitar_bass_duo' as const,
    totalBars,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    primarySongwriterStyle: opts.primary,
    creativeControlLevel: 'balanced' as const,
    styleProfile: defaultStyleProfileForPrimarySongwriter(opts.primary) ?? 'STYLE_MODERN_JAZZ',
    scoreTitle: opts.title,
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
}

function effBarsPresent(
  styleId: string,
  meta: Record<string, unknown> | undefined,
  totalBars: number
): boolean {
  const entry = getCapabilityEntry(styleId);
  const key = entry?.effectiveHarmonyBarsKey;
  if (!key || !meta) return false;
  const bars = meta[key as string];
  return Array.isArray(bars) && bars.length === totalBars;
}

function scoreVariant(
  seed: number,
  styleId: string,
  totalBars: number,
  label: string,
  runOpts: ReturnType<typeof buildOpts>
): VariantResult {
  const result = runGoldenPathOnce(seed, runOpts);
  const meta = result.context?.generationMetadata as Record<string, unknown> | undefined;
  const harmonyAuthorityStyleId = result.context
    ? resolveEffectiveStyleIdentity(result.context).harmonyAuthorityStyleId
    : '';
  const eff = effBarsPresent(styleId, meta, totalBars);

  if (!result.score || !result.context) {
    return {
      label,
      generationSuccess: result.success,
      exportIntegrityPassed: result.exportIntegrityPassed,
      lockPass: false,
      gceOverall: null,
      hardGateFailures: [],
      harmonyAuthorityStyleId,
      harmonicVoice: meta?.harmonicVoice as string | undefined,
      harmonicVoiceScorerMismatch: meta?.harmonicVoiceScorerMismatch as string | undefined,
      effBarsPresent: eff,
      error: 'missing score or context',
    };
  }

  const strip = stripFromContext(result.context);
  const hard = evaluateHardGates(result.score, result.context, strip);
  const hardGateFailures = hard.gates.filter((g) => !g.pass).map((g) => g.id);
  const routing = resolveGceScorerRouting(result.context);
  const gate = routing.routeFrankZappaScorer
    ? scoreFrankZappaResultForGce(result.score, result.context, GCE_GATE_HARMONIC_BAR_TARGET)
    : scoreGoldenPathResultForGce(result.score, result.context, GCE_GATE_HARMONIC_BAR_TARGET);

  return {
    label,
    generationSuccess: result.success,
    exportIntegrityPassed: result.exportIntegrityPassed,
    lockPass: result.exportIntegrityPassed && hard.allPass,
    gceOverall: gate.overallScore,
    hardGateFailures,
    harmonyAuthorityStyleId,
    harmonicVoice: meta?.harmonicVoice as string | undefined,
    harmonicVoiceScorerMismatch:
      gate.harmonicVoiceScorerMismatch ?? (meta?.harmonicVoiceScorerMismatch as string | undefined),
    effBarsPresent: eff,
  };
}

function gatesEqual(a: HardGateId[], b: HardGateId[]): boolean {
  return [...a].sort().join(',') === [...b].sort().join(',');
}

function classifySeedVerdict(
  gateAgreement: boolean,
  gceDelta: number | null,
  gceDeltaThreshold: number
): SeedVerdict {
  if (!gateAgreement) return 'DIVERGE';
  if (gceDelta != null && Math.abs(gceDelta) > gceDeltaThreshold) return 'SOFT_DIFF';
  return 'PASS';
}

function isVariantShape(v: unknown): v is VariantResult {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.label === 'string' &&
    typeof o.generationSuccess === 'boolean' &&
    typeof o.exportIntegrityPassed === 'boolean' &&
    typeof o.lockPass === 'boolean' &&
    (o.gceOverall === null || typeof o.gceOverall === 'number') &&
    Array.isArray(o.hardGateFailures) &&
    typeof o.harmonyAuthorityStyleId === 'string' &&
    typeof o.effBarsPresent === 'boolean'
  );
}

/** Parent-side validation of worker JSON — corrupt/truncated → FAIL corrupt_output. */
function parseAndValidateSeedRow(raw: string, expectedSeed: number): SeedRow {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      seed: expectedSeed,
      verdict: 'FAIL',
      primary: null,
      hv: null,
      gateAgreement: null,
      gceDelta: null,
      detail: 'corrupt_output',
    };
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      seed: expectedSeed,
      verdict: 'FAIL',
      primary: null,
      hv: null,
      gateAgreement: null,
      gceDelta: null,
      detail: 'corrupt_output',
    };
  }
  const o = parsed as Record<string, unknown>;
  const verdictOk =
    o.verdict === 'PASS' ||
    o.verdict === 'SOFT_DIFF' ||
    o.verdict === 'DIVERGE' ||
    o.verdict === 'FAIL';
  if (typeof o.seed !== 'number' || !verdictOk) {
    return {
      seed: expectedSeed,
      verdict: 'FAIL',
      primary: null,
      hv: null,
      gateAgreement: null,
      gceDelta: null,
      detail: 'corrupt_output',
    };
  }
  // FAIL rows may omit variants (crash) or include timeout variants.
  if (o.verdict === 'FAIL') {
    if (o.primary != null && !isVariantShape(o.primary)) {
      return {
        seed: expectedSeed,
        verdict: 'FAIL',
        primary: null,
        hv: null,
        gateAgreement: null,
        gceDelta: null,
        detail: 'corrupt_output',
      };
    }
    if (o.hv != null && !isVariantShape(o.hv)) {
      return {
        seed: expectedSeed,
        verdict: 'FAIL',
        primary: null,
        hv: null,
        gateAgreement: null,
        gceDelta: null,
        detail: 'corrupt_output',
      };
    }
    return o as unknown as SeedRow;
  }
  // PASS / SOFT_DIFF / DIVERGE require both variants + gateAgreement boolean.
  if (!isVariantShape(o.primary) || !isVariantShape(o.hv) || typeof o.gateAgreement !== 'boolean') {
    return {
      seed: expectedSeed,
      verdict: 'FAIL',
      primary: null,
      hv: null,
      gateAgreement: null,
      gceDelta: null,
      detail: 'corrupt_output',
    };
  }
  if (o.gceDelta != null && typeof o.gceDelta !== 'number') {
    return {
      seed: expectedSeed,
      verdict: 'FAIL',
      primary: null,
      hv: null,
      gateAgreement: null,
      gceDelta: null,
      detail: 'corrupt_output',
    };
  }
  return o as unknown as SeedRow;
}

function runWorkerSeed(args: CliArgs): SeedRow {
  const seed = args.seeds[0]!;
  const styleId = args.styleId;
  try {
    const primary = scoreVariant(
      seed,
      styleId,
      args.totalBars,
      `${styleId} primary`,
      buildOpts(seed, args.totalBars, {
        primary: styleId,
        title: `hv-verify ${styleId} primary seed ${seed}`,
      })
    );
    const hv = scoreVariant(
      seed,
      styleId,
      args.totalBars,
      `${args.hvPrimary} primary + ${styleId} HV`,
      buildOpts(seed, args.totalBars, {
        primary: args.hvPrimary,
        harmonicVoice: styleId,
        title: `hv-verify ${styleId} hv seed ${seed}`,
      })
    );

    if (primary.error || hv.error) {
      return {
        seed,
        verdict: 'FAIL',
        primary,
        hv,
        gateAgreement: null,
        gceDelta: null,
        detail: primary.error || hv.error,
      };
    }

    const gateAgreement =
      primary.lockPass === hv.lockPass && gatesEqual(primary.hardGateFailures, hv.hardGateFailures);
    const gceDelta =
      primary.gceOverall != null && hv.gceOverall != null
        ? Math.round((hv.gceOverall - primary.gceOverall) * 10) / 10
        : null;

    return {
      seed,
      verdict: classifySeedVerdict(gateAgreement, gceDelta, args.gceDeltaThreshold),
      primary,
      hv,
      gateAgreement,
      gceDelta,
    };
  } catch (err) {
    return {
      seed,
      verdict: 'FAIL',
      primary: null,
      hv: null,
      gateAgreement: null,
      gceDelta: null,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function sha256File(absPath: string): string {
  return createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function checkResolverHash(): {
  ok: boolean;
  actual: string;
  expected: string;
} {
  const resolverAbs = path.join(REPO_ROOT, RESOLVER_REL);
  const actual = sha256File(resolverAbs);
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
    'resolveEffectiveStyleIdentity.ts': string;
  };
  const expected = baseline['resolveEffectiveStyleIdentity.ts'];
  return { ok: actual === expected, actual, expected };
}

function buildSummary(
  rows: SeedRow[],
  plannedSeeds: number[],
  resolverOk: boolean,
  finished: boolean
): StyleSummary {
  const passCount = rows.filter((r) => r.verdict === 'PASS').length;
  const softDiffCount = rows.filter((r) => r.verdict === 'SOFT_DIFF').length;
  const divergeCount = rows.filter((r) => r.verdict === 'DIVERGE').length;
  const failCount = rows.filter((r) => r.verdict === 'FAIL').length;
  let overallVerdict: OverallVerdict = 'PASS';
  if (!resolverOk) overallVerdict = 'FAIL';
  else if (divergeCount > 0) overallVerdict = 'DIVERGE';
  else if (failCount > 0) overallVerdict = 'FAIL';
  else if (rows.length === 0) overallVerdict = 'FAIL';
  return {
    totalSeeds: rows.length,
    passCount,
    softDiffCount,
    divergeCount,
    failCount,
    allSeedsExecuted: finished && rows.length === plannedSeeds.length,
    overallVerdict,
  };
}

function overallFromSummary(summary: StyleSummary | null, resolverOk: boolean): OverallVerdict {
  if (!resolverOk) return 'FAIL';
  if (!summary) return 'FAIL';
  return summary.overallVerdict;
}

function flushResult(outPath: string, result: VerifyResult): void {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = outPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(result, null, 2), 'utf8');
  fs.renameSync(tmp, outPath);
}

function printTable(result: VerifyResult): void {
  const lines: string[] = [];
  lines.push(
    [
      'seed',
      'verdict',
      'lock P/HV',
      'gates P',
      'gates HV',
      'GCE P->HV',
      'delta',
      'auth',
      'eff',
      'HV_SCORER',
    ].join('\t')
  );
  for (const r of result.rows) {
    const p = r.primary;
    const h = r.hv;
    lines.push(
      [
        r.seed,
        r.verdict,
        `${p?.lockPass ?? '?'}/${h?.lockPass ?? '?'}`,
        (p?.hardGateFailures ?? []).join('|') || (p?.timedOut ? 'timeout' : 'none'),
        (h?.hardGateFailures ?? []).join('|') || (h?.timedOut ? 'timeout' : 'none'),
        `${p?.gceOverall ?? '?'}->${h?.gceOverall ?? '?'}`,
        r.gceDelta ?? '?',
        h?.harmonyAuthorityStyleId ?? p?.harmonyAuthorityStyleId ?? '?',
        `${p?.effBarsPresent ?? '?'}/${h?.effBarsPresent ?? '?'}`,
        h?.harmonicVoiceScorerMismatch ?? 'none',
      ].join('\t')
    );
  }
  lines.push(`OVERALL: ${result.overall}`);
  lines.push(`resolverZeroDiff: ${result.resolverZeroDiff}`);
  lines.push(`resolverHash: ${result.resolverHashActual}`);
  if (result.summary) {
    lines.push(
      `summary: pass=${result.summary.passCount} softDiff=${result.summary.softDiffCount} diverge=${result.summary.divergeCount} fail=${result.summary.failCount} allExecuted=${result.summary.allSeedsExecuted}`
    );
  }
  console.log(lines.join('\n'));
}

function timeoutVariant(label: string): VariantResult {
  return {
    label,
    generationSuccess: false,
    exportIntegrityPassed: false,
    lockPass: false,
    gceOverall: null,
    hardGateFailures: [],
    harmonyAuthorityStyleId: '',
    harmonicVoice: undefined,
    harmonicVoiceScorerMismatch: undefined,
    effBarsPresent: false,
    timedOut: true,
    error: 'FAIL:timeout',
  };
}

function runChildSeed(args: CliArgs, seed: number, workerOutPath: string): Promise<SeedRow> {
  return new Promise((resolve) => {
    const scriptPath = path.join(SCRIPT_DIR, 'runHvAuthorityStyleVerify.ts');
    const tsconfig = path.join(REPO_ROOT, 'tsconfig.json');
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    try {
      if (fs.existsSync(workerOutPath)) fs.unlinkSync(workerOutPath);
    } catch {
      /* ignore */
    }

    const childArgs = [
      'tsx',
      '--tsconfig',
      tsconfig,
      scriptPath,
      '--worker',
      '--style',
      args.styleId,
      '--seed',
      String(seed),
      '--primary',
      args.hvPrimary,
      '--bars',
      String(args.totalBars),
      '--gce-delta-threshold',
      String(args.gceDeltaThreshold),
      '--worker-out',
      workerOutPath,
    ];

    const child = spawn(npx, childArgs, {
      cwd: ENGINE_ROOT,
      shell: true,
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      resolve({
        seed,
        verdict: 'FAIL',
        primary: timeoutVariant(`${args.styleId} primary`),
        hv: timeoutVariant(`${args.hvPrimary} primary + ${args.styleId} HV`),
        gateAgreement: null,
        gceDelta: null,
        detail: 'FAIL:timeout',
      });
    }, args.timeoutMs);

    child.stderr.on('data', (buf: Buffer) => {
      stderr += buf.toString('utf8');
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (!fs.existsSync(workerOutPath)) {
        resolve({
          seed,
          verdict: 'FAIL',
          primary: null,
          hv: null,
          gateAgreement: null,
          gceDelta: null,
          detail: 'corrupt_output',
        });
        return;
      }
      try {
        const raw = fs.readFileSync(workerOutPath, 'utf8');
        resolve(parseAndValidateSeedRow(raw, seed));
      } catch {
        resolve({
          seed,
          verdict: 'FAIL',
          primary: null,
          hv: null,
          gateAgreement: null,
          gceDelta: null,
          detail: 'corrupt_output',
        });
      }
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        seed,
        verdict: 'FAIL',
        primary: null,
        hv: null,
        gateAgreement: null,
        gceDelta: null,
        detail: err.message,
      });
    });
  });
}

async function runParent(args: CliArgs): Promise<void> {
  const hash = args.skipResolverHash
    ? { ok: true, actual: 'skipped', expected: 'skipped' }
    : checkResolverHash();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(args.outDir, `${args.styleId}-${stamp}.json`);

  const result: VerifyResult = {
    styleId: args.styleId,
    hvPrimary: args.hvPrimary,
    totalBars: args.totalBars,
    seeds: args.seeds,
    failFast: args.failFast,
    timeoutMs: args.timeoutMs,
    gceDeltaThreshold: args.gceDeltaThreshold,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    resolverZeroDiff: hash.ok,
    resolverHashActual: hash.actual,
    resolverHashExpected: hash.expected,
    overall: null,
    summary: null,
    rows: [],
  };

  result.summary = buildSummary(result.rows, args.seeds, result.resolverZeroDiff, false);
  result.overall = overallFromSummary(result.summary, result.resolverZeroDiff);
  flushResult(outPath, result);
  console.error(`hv-verify: writing incremental JSON -> ${outPath}`);
  if (!hash.ok) {
    console.error(
      `hv-verify: RESOLVER HASH MISMATCH expected=${hash.expected} actual=${hash.actual}`
    );
  }

  const workerDir = path.join(args.outDir, '_workers');
  fs.mkdirSync(workerDir, { recursive: true });

  let stoppedEarly = false;
  for (const seed of args.seeds) {
    console.error(`hv-verify: seed ${seed} …`);
    const workerOutPath = path.join(workerDir, `${args.styleId}-seed-${seed}.json`);
    const row = await runChildSeed(args, seed, workerOutPath);
    result.rows.push(row);
    result.summary = buildSummary(result.rows, args.seeds, result.resolverZeroDiff, false);
    result.overall = overallFromSummary(result.summary, result.resolverZeroDiff);
    flushResult(outPath, result);
    console.error(`hv-verify: seed ${seed} -> ${row.verdict}${row.detail ? ` (${row.detail})` : ''}`);

    if (args.failFast && (row.verdict === 'DIVERGE' || row.verdict === 'FAIL')) {
      console.error('hv-verify: --fail-fast stop');
      stoppedEarly = true;
      break;
    }
  }

  result.finishedAt = new Date().toISOString();
  result.summary = buildSummary(result.rows, args.seeds, result.resolverZeroDiff, !stoppedEarly);
  result.overall = overallFromSummary(result.summary, result.resolverZeroDiff);
  flushResult(outPath, result);

  printTable(result);
  console.error(`hv-verify: JSON ${outPath}`);
  if (result.summary) {
    console.error(`hv-verify: summary ${JSON.stringify(result.summary)}`);
  }

  if (result.overall === 'PASS') process.exit(0);
  if (result.overall === 'DIVERGE') process.exit(2);
  process.exit(1);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.worker) {
    const row = runWorkerSeed(args);
    const out = args.workerOut;
    if (!out) {
      console.error('worker requires --worker-out <path>');
      process.exit(1);
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmp = out + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(row, null, 2), 'utf8');
    fs.renameSync(tmp, out);
    process.exit(row.verdict === 'PASS' || row.verdict === 'SOFT_DIFF' ? 0 : row.verdict === 'DIVERGE' ? 2 : 1);
  }
  void runParent(args);
}

main();
