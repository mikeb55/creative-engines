/**
 * Riff-only smoke (cross-platform entry; mirrors scripts/riff-smoke.sh).
 */

import { runRiffGeneratorTests } from './riffGenerator.test';
import { runRiffGoldenFixtureTests } from './riffGoldenFixture.test';
import { runRiffPropertyTests } from './riffPropertyTests.test';
import { runRiffReceiptCompilerTests } from './riffReceiptCompiler.test';
import { runRiffMusicalityGateTests } from './riffMusicalityGate.test';
import { runRiffCarryForwardTests } from './riffCarryForward.test';
import { runRiffVariationApplyTests } from './riffVariationApply.test';
import { runRiffZappaSoloTests } from './riffZappaSolo.test';
import { runRiffMotifFidelityPhase19Tests } from './riffMotifFidelityPhase19.test';
import { runRiffSaxMotifSeedPocTests } from './riffSaxMotifSeedPoc.test';

type Row = { ok: boolean; name: string };

const suites: { label: string; run: () => Row[] }[] = [
  { label: 'Riff Generator', run: runRiffGeneratorTests },
  { label: 'Riff golden fixtures', run: runRiffGoldenFixtureTests },
  { label: 'Riff property tests', run: runRiffPropertyTests },
  { label: 'Riff receipt compiler', run: runRiffReceiptCompilerTests },
  { label: 'Riff musicality gate', run: runRiffMusicalityGateTests },
  { label: 'Riff carry-forward', run: runRiffCarryForwardTests },
  { label: 'Riff variation apply', run: runRiffVariationApplyTests },
  { label: 'Riff Zappa solo', run: runRiffZappaSoloTests },
  { label: 'Riff sax motif seed PoC', run: runRiffSaxMotifSeedPocTests },
  { label: 'Riff Phase 1.9 motif fidelity', run: runRiffMotifFidelityPhase19Tests },
];

function main(): void {
  const t0 = Date.now();
  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    const s0 = Date.now();
    console.log(`=== ${suite.label} ===`);
    const rows = suite.run();
    let p = 0;
    let f = 0;
    for (const r of rows) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        p++;
        passed++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        f++;
        failed++;
      }
    }
    console.log(`  (${suite.label}: ${p} pass, ${f} fail, ${Date.now() - s0}ms)`);
  }

  const elapsed = Date.now() - t0;
  console.log('');
  if (failed > 0) {
    console.log(`RIFF SMOKE: FAIL — ${passed} pass, ${failed} fail (${elapsed}ms)`);
    process.exit(1);
  }
  console.log(`RIFF SMOKE: PASS — ${passed} pass, ${failed} fail (${elapsed}ms)`);
}

main();
