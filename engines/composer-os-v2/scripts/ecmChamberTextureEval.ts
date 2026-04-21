/**
 * ECM Chamber symbolic texture evaluation batch (deterministic seeds).
 * Run from package: `npm run eval:ecm-texture` (cwd: engines/composer-os-v2).
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { buildEcmChamberTextureEvalRun, type EcmChamberTextureEvalRun } from '../core/ecm/ecmChamberTextureMetrics';
import { buildEcmReadableSummaryLine } from './eval/readableEvalSummary';

const SEEDS = [50021, 50031, 50041, 50051, 50061];
const BAR_SETS = [24, 32] as const;

/** Optional baseline for summary delta (symbolic ECM texture target band). */
const ECM_TEXTURE_SCORE_BASELINE = 7.0;

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function main(): void {
  const runs: EcmChamberTextureEvalRun[] = [];
  for (const totalBars of BAR_SETS) {
    for (const seed of SEEDS) {
      const r = runGoldenPath(seed, {
        presetId: 'ecm_chamber',
        totalBars,
        bpm: 100,
        longFormEnabled: true,
      });
      if (!r.score) {
        console.log(JSON.stringify({ error: 'no_score', seed, totalBars }));
        continue;
      }
      const row = buildEcmChamberTextureEvalRun(seed, totalBars, r.score);
      runs.push(row);
      console.log(JSON.stringify(row));
      console.log(
        buildEcmReadableSummaryLine({
          seed,
          totalBars,
          ecmTextureScore: row.ecmTextureScore,
          gapGlobal: row.metrics.gapGlobal,
          spaceBarsRatio: row.metrics.spaceBarsRatio,
          doubleDenseRatio: row.metrics.doubleDenseRatio,
        })
      );
    }
  }

  console.log('');
  console.log('--- ECM Chamber texture eval summary ---');
  for (const totalBars of BAR_SETS) {
    const subset = runs.filter((x) => x.totalBars === totalBars);
    if (subset.length === 0) continue;
    const scores = subset.map((x) => x.ecmTextureScore);
    const gaps = subset.map((x) => x.metrics.gapGlobal).filter((g): g is number => g !== null && Number.isFinite(g));
    const ddr = subset.map((x) => x.metrics.doubleDenseRatio);
    const space = subset.map((x) => x.metrics.spaceBarsRatio);
    console.log(
      JSON.stringify({
        totalBars,
        runCount: subset.length,
        averageEcmTextureScore: Math.round(mean(scores) * 100) / 100,
        deltaFromBaselineEcmTexture: Math.round((mean(scores) - ECM_TEXTURE_SCORE_BASELINE) * 100) / 100,
        baselineEcmTextureScore: ECM_TEXTURE_SCORE_BASELINE,
        averageGapGlobal: gaps.length ? Math.round(mean(gaps) * 100) / 100 : null,
        averageDoubleDenseRatio: Math.round(mean(ddr) * 1000) / 1000,
        averageSpaceBarsRatio: Math.round(mean(space) * 1000) / 1000,
      })
    );
  }
  console.log('GCE: pipe JSON lines into future gates; baseline constant in ecmChamberTextureEval.ts.');
}

main();
