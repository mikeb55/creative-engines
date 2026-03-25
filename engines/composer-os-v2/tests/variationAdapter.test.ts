/**
 * Variation id ↔ seed mapping (Prompt 2/2).
 */

import { seedToVariationDisplayToken, variationIdToSeed } from '../core/variation/variationAdapter';

export function runVariationAdapterTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const a = variationIdToSeed('my_take_1');
  const b = variationIdToSeed('my_take_1');
  const c = variationIdToSeed('my_take_2');
  out.push({
    ok: a === b && a !== c && a > 0 && c > 0,
    name: 'variationIdToSeed is stable and distinct across labels',
  });

  out.push({
    ok: seedToVariationDisplayToken(12345).startsWith('v_'),
    name: 'seedToVariationDisplayToken formats token',
  });

  return out;
}
