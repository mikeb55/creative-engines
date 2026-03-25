/**
 * Deterministic variation ↔ seed mapping (FNV-1a 32-bit, positive integer).
 */

import type { VariationId } from './variationTypes';
import { VARIATION_NAMESPACE_DEFAULT } from './variationTypes';

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Map a variation label to a stable non-negative seed (same id → same seed).
 * Collisions across different ids are possible but rare for UX use.
 */
export function variationIdToSeed(
  variationId: VariationId,
  namespace: string = VARIATION_NAMESPACE_DEFAULT
): number {
  const key = `${namespace}::${variationId.trim()}`;
  const h = fnv1a32(key);
  // Avoid 0 (some callers treat as unset); keep 31-bit positive range
  return h === 0 ? 0x5eed : h & 0x7fffffff;
}

/**
 * Compact display token for a seed (not guaranteed unique — for diagnostics only).
 */
export function seedToVariationDisplayToken(seed: number): string {
  const u = seed >>> 0;
  return `v_${u.toString(16).padStart(8, '0')}`;
}
