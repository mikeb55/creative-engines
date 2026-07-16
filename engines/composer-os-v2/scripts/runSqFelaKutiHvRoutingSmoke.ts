import { runSqFelaKutiHvRoutingSmokeTests } from '../tests/sqFelaKutiHvRoutingSmoke.test';

const rows = runSqFelaKutiHvRoutingSmokeTests();
for (const r of rows) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
}
process.exit(rows.every((r) => r.ok) ? 0 : 1);
