"use strict";
/**
 * Composer OS V2 — Run retro self-test suite only
 * Use: npx ts-node --project ../../tsconfig.json scripts/runRetroSelfTests.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../tests/retro/index");
function main() {
    let totalPassed = 0;
    let totalFailed = 0;
    console.log('\n=== Composer OS V2 — Retro Self-Tests ===\n');
    for (const suite of index_1.retroSuites) {
        const results = suite.run();
        console.log(`\n=== ${suite.name} ===`);
        for (const r of results) {
            if (r.ok) {
                console.log(`  PASS: ${r.name}`);
                totalPassed++;
            }
            else {
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
