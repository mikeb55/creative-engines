/**
 * P6/P7 runner — per-section meter golden (off smoke until P7).
 */
import { runPerSectionMeterTests } from '../tests/perSectionMeter.test';

const rows = runPerSectionMeterTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
