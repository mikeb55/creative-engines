/**
 * Developer workflow: A/B generation → receipt check → GCE eval → summary → optional desktop rebuild.
 *
 * From repo root:
 *   npm run workflow:bacharach -- [--out DIR] [--count N] [--seed-start S] [--neutral-songwriter carole_king]
 *
 * Flags:
 *   --skip-build     Do not run `npm run build` in apps/composer-os-desktop
 *   --skip-launch    Do not spawn `npm start` for Composer OS desktop after build
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildBacharachEvalPipeline,
  buildBacharachSongModeEvalRequest,
  buildWorkflowReadySummary,
  DEFAULT_BACH_PRIMARY,
  DEFAULT_NEUTRAL_PRIMARY,
  emptyBacharachEvalRow,
  parseBacharachBatchArgs,
  REPO_ROOT,
  runSingleBacharachGeneration,
  verifyBacharachSongModeReceipts,
  type BacharachEvalCsvRow,
} from './bacharachSongModeWorkflowCore';

const WORKFLOW_FLAGS = new Set(['--skip-build', '--skip-launch']);

function workflowArgvTail(argv: string[]): string[] {
  const idx = argv.findIndex((a) => a.startsWith('--') && (WORKFLOW_FLAGS.has(a) || a === '--out' || a === '--count' || a === '--seed-start' || a === '--seeds' || a === '--neutral-primary' || a === '--neutral-songwriter'));
  return idx >= 0 ? argv.slice(idx) : [];
}

function parseWorkflowExtras(argv: string[]): { skipBuild: boolean; skipLaunch: boolean } {
  const tail = workflowArgvTail(argv);
  return {
    skipBuild: tail.includes('--skip-build'),
    skipLaunch: tail.includes('--skip-launch'),
  };
}

function desktopDir(): string {
  return path.join(REPO_ROOT, 'apps', 'composer-os-desktop');
}

function runDesktopBuild(): void {
  execSync('npm run build', { cwd: desktopDir(), stdio: 'inherit', env: process.env });
}

function launchComposerOsDesktop(): void {
  const cwd = desktopDir();
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npm.cmd' : 'npm';
  spawn(cmd, ['start'], {
    cwd,
    detached: true,
    stdio: 'ignore',
    shell: false,
  }).unref();
}

function main(): void {
  const extras = parseWorkflowExtras(process.argv);
  const args = parseBacharachBatchArgs(process.argv, {
    outDir: path.join(REPO_ROOT, 'output', 'bacharach-workflow'),
    seedStart: 97000,
    count: 5,
  });

  const runsDir = path.join(args.outDir, 'runs');
  const evalDir = path.join(args.outDir, 'eval');
  fs.mkdirSync(runsDir, { recursive: true });
  fs.mkdirSync(evalDir, { recursive: true });

  console.log(`[workflow] Output root: ${args.outDir}`);
  console.log(`[workflow] Seeds: ${args.seeds.join(', ')} | neutral: ${args.neutralPrimary}`);

  /** Step 1 — same-seed Bacharach vs neutral generations */
  const internal: Array<BacharachEvalCsvRow & { manifestRaw: string | null }> = [];
  for (const seed of args.seeds) {
    try {
      internal.push(
        runSingleBacharachGeneration(
          buildBacharachSongModeEvalRequest(seed, DEFAULT_BACH_PRIMARY),
          runsDir,
          'bacharach',
          DEFAULT_BACH_PRIMARY
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[workflow] Bacharach seed ${seed}: ${msg}`);
      internal.push(emptyBacharachEvalRow('bacharach', seed, DEFAULT_BACH_PRIMARY));
    }
    try {
      internal.push(
        runSingleBacharachGeneration(
          buildBacharachSongModeEvalRequest(seed, args.neutralPrimary),
          runsDir,
          'neutral',
          args.neutralPrimary
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[workflow] neutral seed ${seed}: ${msg}`);
      internal.push(emptyBacharachEvalRow('neutral', seed, args.neutralPrimary));
    }
  }

  /** Step 2 — receipt / _meta checks (record only) */
  let receiptVerificationHits = 0;
  const receiptRows: string[] = [];
  for (const seed of args.seeds) {
    const row = internal.find((r) => r.seed === seed && r.arm === 'bacharach');
    const v = verifyBacharachSongModeReceipts(row?.manifestRaw);
    const ok = v.bacharachSliceLineCount >= 3 || v.allImplementedChecksHit;
    if (ok) receiptVerificationHits++;
    receiptRows.push(
      `  seed ${seed}: slice lines=${v.bacharachSliceLineCount} parsed=${v.manifestParsed} keywordMatch=${v.allImplementedChecksHit}`
    );
  }
  console.log('[workflow] Receipt check (Bacharach arms):');
  console.log(receiptRows.join('\n'));

  /** Step 3 — GCE eval CSV + report under eval/ */
  const pipeline = buildBacharachEvalPipeline(args.seeds, args.neutralPrimary, internal, evalDir);
  fs.writeFileSync(path.join(evalDir, 'bacharach-songmode-eval.csv'), pipeline.csv, 'utf-8');
  fs.writeFileSync(path.join(evalDir, 'bacharach-songmode-eval-report.md'), pipeline.reportMd, 'utf-8');
  console.log(`[workflow] Wrote eval:\n  ${path.join(evalDir, 'bacharach-songmode-eval.csv')}\n  ${path.join(evalDir, 'bacharach-songmode-eval-report.md')}`);

  let smoothWinCount = 0;
  for (const seed of args.seeds) {
    const b = pipeline.breakdownBySeed.get(seed);
    if (b?.smoothVersusNeutral) smoothWinCount++;
  }

  const summary = buildWorkflowReadySummary({
    seeds: args.seeds,
    scoreMap: pipeline.scoreMap,
    breakdownBySeed: pipeline.breakdownBySeed,
    bachRunsWithArtifacts: pipeline.agg.bachRunsWithArtifacts,
    bachRunsAttempted: args.seeds.length,
    receiptVerificationHits,
    neutralHigherSmooth: pipeline.neutralHigherSmooth,
    smoothWinCount,
  });

  /** Step 4 — console summary */
  console.log(summary.lines.join('\n'));

  fs.writeFileSync(
    path.join(args.outDir, 'bacharach-workflow-summary.txt'),
    [...summary.lines, `Receipt detail:\n${receiptRows.join('\n')}`].join('\n'),
    'utf-8'
  );
  console.log(`[workflow] Summary file: ${path.join(args.outDir, 'bacharach-workflow-summary.txt')}`);

  /** Step 5 — rebuild + relaunch desktop */
  if (!extras.skipBuild) {
    console.log('[workflow] Building Composer OS desktop (apps/composer-os-desktop)…');
    try {
      runDesktopBuild();
      console.log('[workflow] Desktop build finished.');
    } catch (e) {
      console.warn(`[workflow] Desktop build failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    console.log('[workflow] Skipped desktop build (--skip-build).');
  }

  if (!extras.skipLaunch) {
    console.log('[workflow] Launching Composer OS desktop (npm start, detached)…');
    try {
      launchComposerOsDesktop();
    } catch (e) {
      console.warn(`[workflow] Launch failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    console.log('[workflow] Skipped launch (--skip-launch).');
  }
}

main();
