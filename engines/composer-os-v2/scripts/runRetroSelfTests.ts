/**
 * Composer OS V2 — Run retro self-test suite only
 * Use: npx ts-node --project ../../tsconfig.json scripts/runRetroSelfTests.ts
 */

import { retroSuites } from '../tests/retro/index';

function main(): void {
  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n=== Composer OS V2 — Retro Self-Tests ===\n');

  for (const suite of retroSuites) {
    const results = suite.run();
    console.log(`\n=== ${suite.name} ===`);
    for (const r of results) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        totalPassed++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        totalFailed++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    process.exit(1);
  }
  console.log('\nRETRO SELF-TESTS: PASS');
}

main();
