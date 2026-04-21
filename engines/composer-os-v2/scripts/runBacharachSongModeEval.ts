/**
 * Batch-eval Bacharach Song Mode vs neutral primary (same seeds, STYLE_ECM, fixed form).
 *
 * From repo root:
 *   npm run eval:bacharach -- [--out DIR] [--count N] [--seed-start S] [--neutral-primary carole_king]
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildBacharachEvalPipeline,
  buildBacharachSongModeEvalRequest,
  DEFAULT_BACH_PRIMARY,
  DEFAULT_NEUTRAL_PRIMARY,
  emptyBacharachEvalRow,
  parseBacharachBatchArgs,
  REPO_ROOT,
  runSingleBacharachGeneration,
  type BacharachEvalCsvRow,
} from './bacharachSongModeWorkflowCore';
import { buildSongModeReadableSummaryLine } from './eval/readableEvalSummary';

function main(): void {
  const args = parseBacharachBatchArgs(process.argv, {
    outDir: path.join(REPO_ROOT, 'output', 'bacharach-eval'),
    seedStart: 97000,
    count: 5,
  });
  const runsDir = path.join(args.outDir, 'runs');
  fs.mkdirSync(runsDir, { recursive: true });

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
      console.warn(`[eval] Bacharach seed ${seed}: ${msg}`);
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
      console.warn(`[eval] neutral seed ${seed}: ${msg}`);
      internal.push(emptyBacharachEvalRow('neutral', seed, args.neutralPrimary));
    }
  }

  const pipeline = buildBacharachEvalPipeline(args.seeds, args.neutralPrimary, internal, args.outDir);

  fs.writeFileSync(path.join(args.outDir, 'bacharach-songmode-eval.csv'), pipeline.csv, 'utf-8');
  fs.writeFileSync(path.join(args.outDir, 'bacharach-songmode-eval-report.md'), pipeline.reportMd, 'utf-8');

  console.log(
    `Wrote:\n  ${path.join(args.outDir, 'bacharach-songmode-eval.csv')}\n  ${path.join(args.outDir, 'bacharach-songmode-eval-report.md')}`
  );
  console.log(`Runs directory: ${runsDir}`);
  const scores = [...pipeline.scoreMap.values()];
  if (scores.length) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(`Bacharach GCE score mean (diagnostic): ${mean.toFixed(2)}`);
  }
  console.log('Readable Song Mode summary lines:');
  for (const row of internal.filter((r) => r.manifestRaw).slice(0, Math.min(6, internal.length))) {
    try {
      const manifest = JSON.parse(row.manifestRaw as string) as Record<string, unknown>;
      console.log(buildSongModeReadableSummaryLine(manifest, `songmode arm=${row.arm} seed=${row.seed}`));
    } catch {
      console.log(`songmode arm=${row.arm} seed=${row.seed} | manifest-parse=failed`);
    }
  }
}

main();
