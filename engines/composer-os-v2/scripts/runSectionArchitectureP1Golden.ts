/**
 * V65 P1 runner — section architecture generation goldens (off smoke until closeout).
 */
import { runSectionArchitectureP1GoldenTests } from '../tests/sectionArchitectureP1Golden.test';

const rows = runSectionArchitectureP1GoldenTests();
let failed = 0;
for (const r of rows) {
  if (!r.ok) failed++;
  console.log(r.ok ? 'PASS' : 'FAIL', r.name);
}
if (failed > 0) process.exit(1);
