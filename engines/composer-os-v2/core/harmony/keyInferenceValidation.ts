/**
 * V3.4 — Validate optional tonal-centre override strings.
 */

import { parseTonalCenterString } from './keyInference';

export interface KeyOverrideValidation {
  valid: boolean;
  error?: string;
}

/** Non-throwing check for API / manifests. */
export function validateTonalCenterOverride(raw: string | undefined): KeyOverrideValidation {
  if (raw === undefined || raw.trim() === '') {
    return { valid: false, error: 'Empty tonal centre override' };
  }
  const p = parseTonalCenterString(raw.trim());
  if (!p) {
    return { valid: false, error: `Unrecognised tonal centre: "${raw.trim()}"` };
  }
  return { valid: true };
}
