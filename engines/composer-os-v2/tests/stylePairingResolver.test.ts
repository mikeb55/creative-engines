/**
 * Dual style pairing resolver + validation (Prompt 1/2 intelligence layer).
 */

import { resolveStylePairing } from '../core/style-pairing/stylePairingResolver';
import { validateStylePairingResult } from '../core/style-pairing/stylePairingValidation';

export function runStylePairingResolverTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const a = resolveStylePairing({
    songwriterStyle: 'beatles',
    arrangerStyle: 'ellington',
    era: 'post_bop',
    seed: 1,
  });
  out.push({
    ok:
      a.confidenceScore >= 0 &&
      a.confidenceScore <= 1 &&
      a.songwriterDomain.melody > 0 &&
      a.arrangerDomain.orchestration > 0 &&
      !a.experimentalFlag,
    name: 'resolveStylePairing returns bounded confidence and domain weights',
  });

  const b = resolveStylePairing({
    songwriterStyle: 'bob_dylan',
    arrangerStyle: 'schneider',
    seed: 2,
  });
  out.push({
    ok: b.experimentalFlag === true && validateStylePairingResult(b).ok === true,
    name: 'cross-domain pair can be flagged experimental without blocking',
  });

  const c = validateStylePairingResult(null);
  out.push({
    ok: c.ok && c.warnings.length === 0,
    name: 'validateStylePairingResult allows absent pairing',
  });

  return out;
}
