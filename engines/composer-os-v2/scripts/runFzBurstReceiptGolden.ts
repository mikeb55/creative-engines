/**
 * P3 runner — FZ_BURST golden (off smoke until P8).
 */
import { runFzBurstReceiptTests } from '../tests/fzBurstReceipt.test';

const rows = runFzBurstReceiptTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
