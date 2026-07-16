import { runSqVrbHvRoutingSmokeTests } from '../tests/sqVrbHvRoutingSmoke.test';

const rows = runSqVrbHvRoutingSmokeTests();
for (const row of rows) {
  console.log(`${row.ok ? 'PASS' : 'FAIL'}  ${row.name}`);
}
const failed = rows.filter((r) => !r.ok).length;
process.exit(failed === 0 ? 0 : 1);