import { runGrooveScaffoldGoldenTests } from '../tests/grooveScaffold.test';

const rows = runGrooveScaffoldGoldenTests();
for (const row of rows) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
}

const failed = rows.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`groove scaffold goldens failed: ${failed.length}/${rows.length}`);
  process.exit(1);
}

console.log(`groove scaffold goldens passed: ${rows.length}/${rows.length}`);
