/**
 * P7 runner — sonic_youth per-section VRB golden (off smoke).
 */
import { runSonicYouthPerSectionVrbTests } from '../tests/sonicYouthPerSectionVrb.test';

const rows = runSonicYouthPerSectionVrbTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
