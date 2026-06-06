/**
 * Mosaic Mode — human-readable section eval failure reports.
 */

export interface MosaicEvalResult {
  score: number;
  threshold: number;
  signatures: Record<string, { value: number; threshold: number; pass: boolean }>;
  pass: boolean;
}

const SIGNATURE_RECOMMENDATIONS: Readonly<Record<string, string>> = {
  blues_rate: 'Reduce blues-pattern density in VRB harmonic generator for this composer',
  interval_coherence:
    'Tighten interval selection: avoid tritone leaps outside of motif transforms',
  rhythmic_fingerprint: 'Strengthen rhythmic signature: check VRB rhythmic rule weights',
};

function worstFailingSignatureName(
  signatures: MosaicEvalResult['signatures']
): string | undefined {
  let worstName: string | undefined;
  let worstGap = -Infinity;
  for (const [name, sig] of Object.entries(signatures)) {
    if (sig.pass) continue;
    const gap = sig.threshold - sig.value;
    if (gap > worstGap) {
      worstGap = gap;
      worstName = name;
    }
  }
  return worstName;
}

function recommendationFor(signatureName: string | undefined): string {
  if (!signatureName) {
    return 'Review composer VRB profile for all signatures';
  }
  const mapped = SIGNATURE_RECOMMENDATIONS[signatureName];
  if (mapped) return mapped;
  return `Review composer VRB profile for signature: ${signatureName}`;
}

export function formatEvalFailureReport(
  sectionLabel: string,
  composerId: string,
  evalResult: MosaicEvalResult,
  retryExhausted: boolean
): string {
  const retryTag = retryExhausted ? 'RETRY EXHAUSTED' : 'RETRY AVAILABLE';
  const lines: string[] = [
    `SECTION EVAL FAILURE — ${sectionLabel} (${composerId})`,
    `Overall score: ${evalResult.score} / threshold ${evalResult.threshold}  [${retryTag}]`,
    '',
    'Failing signatures:',
  ];

  const failing = Object.entries(evalResult.signatures).filter(([, sig]) => !sig.pass);
  const passing = Object.entries(evalResult.signatures).filter(([, sig]) => sig.pass);

  if (failing.length === 0) {
    lines.push('  (none)');
  } else {
    for (const [name, sig] of failing) {
      lines.push(`  ${name}: ${sig.value} (need ≥ ${sig.threshold})`);
    }
  }

  lines.push('');
  lines.push('Passing signatures:');

  if (passing.length === 0) {
    lines.push('  (none)');
  } else {
    for (const [name, sig] of passing) {
      lines.push(`  ${name}: ${sig.value} ✓`);
    }
  }

  const worst = worstFailingSignatureName(evalResult.signatures);
  lines.push('');
  lines.push(`Recommendation: ${recommendationFor(worst)}`);

  return lines.join('\n');
}
