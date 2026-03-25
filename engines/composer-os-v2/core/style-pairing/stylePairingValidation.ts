/**
 * Non-blocking validation for style pairing metadata (warnings only).
 */

import type { StylePairingResult } from './stylePairingTypes';

export interface StylePairingValidationResult {
  ok: boolean;
  warnings: string[];
}

/**
 * Pairing never fails validation — low confidence surfaces as warnings for manifests/diagnostics.
 */
export function validateStylePairingResult(pairing: StylePairingResult | null | undefined): StylePairingValidationResult {
  if (pairing == null) {
    return { ok: true, warnings: [] };
  }
  const warnings: string[] = [];
  if (pairing.confidenceScore < 0.35) {
    warnings.push('style pairing: confidence very low — review domain weights');
  } else if (pairing.confidenceScore < 0.5) {
    warnings.push('style pairing: moderate confidence');
  }
  if (pairing.experimentalFlag) {
    warnings.push('style pairing: experimental combination flagged');
  }
  if (
    pairing.songwriterDomain.melody < 0 ||
    pairing.arrangerDomain.orchestration < 0 ||
    Number.isNaN(pairing.confidenceScore)
  ) {
    warnings.push('style pairing: malformed domain weights');
  }
  return { ok: true, warnings };
}
