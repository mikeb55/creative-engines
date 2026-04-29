/**
 * ECM chamber: bounded variant seed sweep prevents heap OOM on long-form generation.
 */

import { ecmChamberVariantSweepLimit } from '../core/goldenPath/runGoldenPath';

export function runEcmChamberVariantSweepTests(): { name: string; ok: boolean }[] {
  const cases: Array<{ tb: number | undefined; exp: number }> = [
    { tb: 32, exp: 1 },
    { tb: 64, exp: 1 },
    { tb: 16, exp: 2 },
    { tb: 24, exp: 2 },
    { tb: 8, exp: 3 },
    { tb: undefined, exp: 1 },
  ];
  return cases.map((c, i) => ({
    name: `ecmChamberVariantSweepLimit tb=${String(c.tb)} → ${c.exp} (case ${i + 1})`,
    ok: ecmChamberVariantSweepLimit(c.tb) === c.exp,
  }));
}
