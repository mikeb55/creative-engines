/**
 * P4 runner — section architecture domain golden (off smoke until P8).
 */
import { runSectionArchitectureDomainTests } from '../tests/sectionArchitectureDomain.test';

const rows = runSectionArchitectureDomainTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
