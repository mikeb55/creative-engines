import { runBigBandSlonimskyHvRoutingSmokeTests } from '../tests/bigBandSlonimskyHvRoutingSmoke.test';

const rows = runBigBandSlonimskyHvRoutingSmokeTests();
for (const row of rows) {
  console.log(row.ok ? 'PASS' : 'FAIL', row.name);
}
const pass = rows.filter((r) => r.ok).length;
console.log(`done ${pass}/${rows.length}`);
process.exit(pass === rows.length ? 0 : 1);