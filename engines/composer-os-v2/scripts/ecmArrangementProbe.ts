/**
 * Local probe: ECM Chamber duo texture / density metrics (not GCE).
 * Preset-scoped; no API changes.
 * Emits one JSON object per run (stdout) for piping into tooling / GCE.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { buildEcmChamberTextureEvalRun } from '../core/ecm/ecmChamberTextureMetrics';

const SEEDS = [50021, 50031, 50041];
const BAR_SETS = [24, 32] as const;

function main(): void {
  for (const bars of BAR_SETS) {
    for (const seed of SEEDS) {
      const r = runGoldenPath(seed, {
        presetId: 'ecm_chamber',
        totalBars: bars,
        bpm: 100,
        longFormEnabled: true,
      });
      if (!r.score) {
        console.log(JSON.stringify({ error: 'no_score', seed, totalBars: bars }));
        continue;
      }
      const row = buildEcmChamberTextureEvalRun(seed, bars, r.score);
      console.log(JSON.stringify(row));
    }
  }
}

main();
