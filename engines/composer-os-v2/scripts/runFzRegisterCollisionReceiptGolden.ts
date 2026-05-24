/**
 * P3 runner — FZ_REGISTER_COLLISION golden (off smoke until P8).
 */
import { runFzRegisterCollisionReceiptTests } from '../tests/fzRegisterCollisionReceipt.test';

const rows = runFzRegisterCollisionReceiptTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
