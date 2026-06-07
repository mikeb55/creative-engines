/**
 * Shared full-harness loop for `runAllTestsChunk*.ts` (memory isolation via separate processes).
 */

import { isFastExcludedSuiteName } from './fastExcludeSuites';

export type SuiteEntry = {
  name: string;
  run: () => { name: string; ok: boolean }[] | { success: boolean } | boolean | { passed: number; failed: number };
};

export function resolveTestMode(): 'fast' | 'full' {
  const last = process.argv[process.argv.length - 1];
  if (last === 'fast' || last === 'full') return last;
  const env = process.env.COMPOSER_OS_TEST_MODE;
  if (env === 'fast' || env === 'full') return env;
  return 'full';
}

export function filterSuitesForRun(all: SuiteEntry[], mode: 'fast' | 'full'): SuiteEntry[] {
  let out = all;
  if (process.env.COMPOSER_OS_SKIP_STAGE_EXIT_GATES === '1') {
    out = out.filter((s) => s.name !== 'Stage Exit Gates');
    console.log('[harness] COMPOSER_OS_SKIP_STAGE_EXIT_GATES=1 — skipping Stage Exit Gates');
  }
  const sub = process.env.COMPOSER_OS_TEST_EXCLUDE_SUBSTR?.trim();
  if (sub) {
    const parts = sub
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) {
      out = out.filter((s) => !parts.some((p) => s.name.includes(p)));
      console.log(`[harness] COMPOSER_OS_TEST_EXCLUDE_SUBSTR active: ${parts.join(' | ')}`);
    }
  }
  if (mode === 'fast') {
    const skipped = all.filter((s) => isFastExcludedSuiteName(s.name)).map((s) => s.name);
    out = out.filter((s) => !isFastExcludedSuiteName(s.name));
    const total = all.length;
    console.log(`[harness] mode=fast — running ${out.length}/${total} suites (${skipped.length} excluded).`);
  } else {
    console.log(`[harness] mode=full — running ${out.length} suites.`);
  }
  return out;
}

export function runHarnessMain(suites: SuiteEntry[], chunkBanner?: string): void {
  if (chunkBanner) {
    console.log(chunkBanner);
  }

  const mode = resolveTestMode();
  const toRun = filterSuitesForRun(suites, mode);
  let totalPassed = 0;
  let totalFailed = 0;
  const timings: { name: string; ms: number; passed: number; failed: number }[] = [];

  for (const suite of toRun) {
    const t0 = Date.now();
    const results = suite.run();
    const dt = Date.now() - t0;
    console.log(`\n=== ${suite.name} ===`);
    const rows = Array.isArray(results)
      ? results
      : typeof results === 'boolean'
        ? [{ name: suite.name, ok: results }]
        : 'passed' in results
          ? [{ name: suite.name, ok: results.failed === 0 }]
          : [{ name: suite.name, ok: (results as { success: boolean }).success }];
    let p = 0;
    let f = 0;
    for (const r of rows) {
      if (r.ok) {
        console.log(`  PASS: ${r.name}`);
        totalPassed++;
        p++;
      } else {
        console.log(`  FAIL: ${r.name}`);
        totalFailed++;
        f++;
      }
    }
    timings.push({ name: suite.name, ms: dt, passed: p, failed: f });
  }

  console.log(`\n=== Summary ===`);
  console.log(`Mode: ${mode}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    const debt = timings
      .filter((t) => t.failed > 0)
      .sort((a, b) => b.failed - a.failed || b.ms - a.ms);
    console.log(`\n=== Failures by suite (${debt.length} suites, most failures first) ===`);
    for (const row of debt) {
      console.log(`  ${row.failed}\t${row.name}`);
    }
    if (mode === 'full') {
      console.log(
        `\n[harness] Exit code 1: full mode includes known debt (see docs/TEST_DEBT_COMPOSER_OS_V2.md). Fast mode remains the regression gate.`
      );
    }
  }

  const slow = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 20);
  console.log(`\n=== Slowest suites (top ${slow.length}, ms) ===`);
  for (const row of slow) {
    console.log(`  ${row.ms}ms  ${row.name}  (+${row.passed} / -${row.failed})`);
  }

  if (totalFailed > 0) {
    process.exit(1);
  }
  console.log('\nCOMPOSER OS V2 TESTS: PASS');
}
