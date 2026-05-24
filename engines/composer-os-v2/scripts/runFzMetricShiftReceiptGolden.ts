/**
 * P3 runner — FZ_METRIC_SHIFT golden (off smoke until P8).
 */
import { runFzMetricShiftReceiptTests } from '../tests/fzMetricShiftReceipt.test';

const rows = runFzMetricShiftReceiptTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
