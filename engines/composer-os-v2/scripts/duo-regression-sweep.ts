/**
 * Guitar–Bass Duo regression sweep: fixed seeds, Voice 2 polyphony + validation gates.
 * Pass criteria: V2 active bars, coverage, rest gap, and structural/export validation only.
 * Behaviour gates are shown (B:) for visibility but do not affect pass/fail for guitar_bass_duo.
 * Run: npm run test:duo (from engines/composer-os-v2)
 */

import { runGoldenPathOnce, type GoldenPathResult } from '../core/goldenPath/runGoldenPath';
import { computeGuitarVoice2PolyphonyDiagnostics } from '../core/goldenPath/guitarVoice2PolyphonyDiagnostics';

const SEEDS = [50021, 12345, 99999, 11111, 77777, 33333, 55555, 88888, 22222, 44444] as const;
const TOTAL_BARS = 32;

function validationGatesOk(r: GoldenPathResult): boolean {
  return (
    r.integrityPassed &&
    r.mxValidationPassed &&
    r.strictBarMathPassed &&
    r.exportRoundTripPassed &&
    r.exportIntegrityPassed &&
    r.instrumentMetadataPassed
  );
}

function rowPass(v2Bars: number, coverage: number, restGap: number, valOk: boolean): boolean {
  return (
    v2Bars === TOTAL_BARS &&
    Math.abs(coverage - 1) < 1e-9 &&
    restGap === 0 &&
    valOk
  );
}

function main(): void {
  console.log(
    'Composer OS — Guitar Bass Duo regression sweep (32 bars, builtin harmony)\n' +
      'Guarantee: V2 32 active bars, coverage 1.00, rest gap 0, validation gates (V); B: informational only.\n'
  );
  console.log(
    'Seed'.padEnd(8) +
      '| V2 Bars'.padEnd(10) +
      '| Coverage'.padEnd(12) +
      '| Rest Gap'.padEnd(12) +
      '| Gates'.padEnd(12) +
      '| Result'
  );
  console.log('-'.repeat(66));

  let anyFail = false;

  for (const seed of SEEDS) {
    const r = runGoldenPathOnce(seed, {
      presetId: 'guitar_bass_duo',
      totalBars: TOTAL_BARS,
      longFormEnabled: true,
      creativeControlLevel: 'balanced',
    });

    const guitar = r.score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
    const tb = r.context.form.totalBars;
    const diag = guitar
      ? computeGuitarVoice2PolyphonyDiagnostics(guitar, tb)
      : {
          v2ActiveBars: 0,
          v2BarCoverage: 0,
          v2LongestRestGap: 0,
        };

    const valOk = validationGatesOk(r);
    const behOk = r.behaviourGatesPassed;
    const gatesLabel = `V:${valOk ? 'Y' : 'n'} B:${behOk ? 'Y' : 'n'}`;
    const pass = rowPass(diag.v2ActiveBars, diag.v2BarCoverage, diag.v2LongestRestGap, valOk);
    if (!pass) anyFail = true;

    const result = pass ? 'PASS' : 'FAIL';
    console.log(
      String(seed).padEnd(8) +
        `| ${String(diag.v2ActiveBars).padEnd(8)}` +
        `| ${diag.v2BarCoverage.toFixed(2).padEnd(10)}` +
        `| ${String(diag.v2LongestRestGap).padEnd(10)}` +
        `| ${gatesLabel.padEnd(10)}` +
        `| ${result}`
    );
  }

  console.log('-'.repeat(66));
  console.log(
    anyFail
      ? '\nDUO REGRESSION SWEEP: FAIL (exit 1) — V2 metrics and/or validation (V) did not meet guarantee.'
      : '\nDUO REGRESSION SWEEP: PASS (exit 0) — V2 full activity + validation gates; behaviour (B) not required.'
  );
  process.exit(anyFail ? 1 : 0);
}

main();
