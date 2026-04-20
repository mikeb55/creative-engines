/**
 * Suites excluded from `COMPOSER_OS_TEST_MODE=fast` / `npm run test:fast`.
 *
 * Source: 2026-04-21 full `npm test` (runAllTests) triage — any suite that contained
 * at least one `FAIL:` line in that run. Refresh this list when fixing debt so fast
 * coverage grows again. See docs/TEST_HARNESS_PLAN.md and docs/TEST_DEBT_COMPOSER_OS_V2.md.
 *
 * Intentionally **not** excluded: many Song Mode unit suites, parsers, planners, etc.
 */

export const FAST_EXCLUDED_SUITE_NAMES: readonly string[] = [
  'App API',
  'App API boundary',
  'Bass identity',
  'Big Band realisation',
  'Chord progression',
  'Correctness gates',
  'Duo LOCK quality',
  'Duo identity V3.2',
  'Duo interaction V3.1',
  'Duo orchestration pass',
  'Duo pitch variation (variationEnabled)',
  'Duo polish V3.3',
  'ECM identity',
  'ECM identity cell',
  'ECM shaping pass',
  'Ensemble export',
  'Export',
  'First Intelligence Retro',
  'GCE evaluation',
  'Golden Path',
  'Guitar–Bass Duo (Single-Line)',
  'Guitar–Bass Duo Wyble voice 2 (polyphony)',
  'Interaction',
  'Jazz duo behaviour',
  'Key inference (V3.4)',
  'Long-form Duo (32)',
  'Mode exposure (V1)',
  'Phrase authority',
  'Pipeline truth (input/score/XML)',
  'Regression Fixtures',
  'Riff Generator',
  'Stage 2 Musical Core',
  'Stage Exit Gates',
  'String Quartet realisation',
  'Style Module',
  'Style System Retro',
];

const EXCLUDED = new Set(FAST_EXCLUDED_SUITE_NAMES);

export function isFastExcludedSuiteName(name: string): boolean {
  return EXCLUDED.has(name);
}
