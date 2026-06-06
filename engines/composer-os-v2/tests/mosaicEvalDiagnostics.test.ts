/**
 * Mosaic Mode — formatEvalFailureReport unit tests.
 */

import {
  formatEvalFailureReport,
  type MosaicEvalResult,
} from '../core/mosaic-mode/mosaicEvalDiagnostics';

function baseEval(overrides: Partial<MosaicEvalResult> = {}): MosaicEvalResult {
  return {
    score: 0.55,
    threshold: 0.62,
    pass: false,
    signatures: {
      blues_rate: { value: 0.4, threshold: 0.6, pass: false },
      interval_coherence: { value: 0.7, threshold: 0.6, pass: true },
    },
    ...overrides,
  };
}

export function runMosaicEvalDiagnosticsTests(): { ok: boolean; name: string; detail?: string }[] {
  const out: { ok: boolean; name: string; detail?: string }[] = [];

  const singleFail = formatEvalFailureReport('verse', 'fripp', baseEval(), true);
  out.push({
    ok:
      singleFail.includes('SECTION EVAL FAILURE — verse (fripp)') &&
      singleFail.includes('Overall score: 0.55 / threshold 0.62  [RETRY EXHAUSTED]') &&
      singleFail.includes('blues_rate: 0.4 (need ≥ 0.6)') &&
      singleFail.includes('interval_coherence: 0.7 ✓') &&
      singleFail.includes(
        'Recommendation: Reduce blues-pattern density in VRB harmonic generator for this composer'
      ),
    name: 'formatEvalFailureReport: single failing signature, retry exhausted',
  });

  const multiFail = formatEvalFailureReport(
    'chorus',
    'jack_white',
    baseEval({
      signatures: {
        blues_rate: { value: 0.5, threshold: 0.6, pass: false },
        interval_coherence: { value: 0.45, threshold: 0.6, pass: false },
        rhythmic_fingerprint: { value: 0.7, threshold: 0.6, pass: true },
      },
    }),
    false
  );
  out.push({
    ok:
      multiFail.includes('[RETRY AVAILABLE]') &&
      multiFail.includes('blues_rate: 0.5 (need ≥ 0.6)') &&
      multiFail.includes('interval_coherence: 0.45 (need ≥ 0.6)') &&
      multiFail.includes('rhythmic_fingerprint: 0.7 ✓'),
    name: 'formatEvalFailureReport: multiple failing signatures, retry available',
  });

  const allPass = formatEvalFailureReport(
    'bridge',
    'verlaine',
    baseEval({
      score: 0.72,
      threshold: 0.62,
      pass: true,
      signatures: {
        blues_rate: { value: 0.8, threshold: 0.6, pass: true },
        interval_coherence: { value: 0.75, threshold: 0.6, pass: true },
      },
    }),
    true
  );
  out.push({
    ok:
      allPass.includes('Failing signatures:') &&
      allPass.includes('  (none)') &&
      allPass.includes('blues_rate: 0.8 ✓') &&
      allPass.includes('interval_coherence: 0.75 ✓'),
    name: 'formatEvalFailureReport: all signatures passing — formats without error',
  });

  const bluesWorst = formatEvalFailureReport(
    'A',
    'fripp',
    baseEval({
      signatures: {
        blues_rate: { value: 0.2, threshold: 0.6, pass: false },
        interval_coherence: { value: 0.55, threshold: 0.6, pass: false },
        rhythmic_fingerprint: { value: 0.7, threshold: 0.6, pass: true },
      },
    }),
    true
  );
  out.push({
    ok: bluesWorst.includes(
      'Recommendation: Reduce blues-pattern density in VRB harmonic generator for this composer'
    ),
    name: 'formatEvalFailureReport: blues_rate worst → blues recommendation',
  });

  const rhythmWorst = formatEvalFailureReport(
    'B',
    'fripp',
    baseEval({
      signatures: {
        blues_rate: { value: 0.55, threshold: 0.6, pass: false },
        interval_coherence: { value: 0.58, threshold: 0.6, pass: false },
        rhythmic_fingerprint: { value: 0.1, threshold: 0.6, pass: false },
      },
    }),
    true
  );
  out.push({
    ok: rhythmWorst.includes(
      'Recommendation: Strengthen rhythmic signature: check VRB rhythmic rule weights'
    ),
    name: 'formatEvalFailureReport: rhythmic_fingerprint worst → rhythmic recommendation',
  });

  const unknownSig = formatEvalFailureReport(
    'C',
    'marr',
    baseEval({
      signatures: {
        custom_metric_xyz: { value: 0.1, threshold: 0.6, pass: false },
      },
    }),
    true
  );
  out.push({
    ok: unknownSig.includes(
      'Recommendation: Review composer VRB profile for signature: custom_metric_xyz'
    ),
    name: 'formatEvalFailureReport: unknown signature → default recommendation',
  });

  return out;
}

if (require.main === module) {
  const rows = runMosaicEvalDiagnosticsTests();
  let failed = 0;
  for (const row of rows) {
    const mark = row.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
    if (!row.ok) failed++;
  }
  process.exit(failed > 0 ? 1 : 0);
}
