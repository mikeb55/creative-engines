import { runSectionArchitectureP2GoldenTests } from '../tests/sectionArchitectureP2Golden.test';

const rows = runSectionArchitectureP2GoldenTests();
let failed = 0;

for (const row of rows) {
  if (row.ok) {
    console.log(`PASS ${row.name}`);
  } else {
    failed++;
    console.error(`FAIL ${row.name}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
}
