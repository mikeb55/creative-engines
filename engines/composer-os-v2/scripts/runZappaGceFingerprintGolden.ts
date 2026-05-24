/**
 * P2 runner — Zappa GCE structural fingerprint golden (off smoke until P7).
 */
import { runZappaGceFingerprintTests } from '../tests/zappaGceFingerprint.test';

const rows = runZappaGceFingerprintTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
