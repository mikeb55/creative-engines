import { runSqThreadgillHvRoutingSmokeTests } from '../tests/sqThreadgillHvRoutingSmoke.test';

const rows = runSqThreadgillHvRoutingSmokeTests();
for (const r of rows) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
}
process.exit(rows.every((r) => r.ok) ? 0 : 1);
