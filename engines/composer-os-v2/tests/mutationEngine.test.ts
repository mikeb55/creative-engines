/**
 * Mutation engine — bounded deterministic nudges (Prompt 2/2).
 */

import { applyCreativeSeedMutation } from '../core/creative-controls/mutationEngine';

export function runMutationEngineTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const s = applyCreativeSeedMutation(1000, 'stable');
  out.push({
    ok: s === 1000,
    name: 'stable: identity',
  });

  const b1 = applyCreativeSeedMutation(1000, 'balanced');
  const b2 = applyCreativeSeedMutation(1000, 'balanced');
  out.push({
    ok: b1 === b2 && b1 !== 1000,
    name: 'balanced: reproducible non-identity',
  });

  const x = applyCreativeSeedMutation(1000, 'surprise');
  out.push({
    ok: x !== 1000 && (x >>> 0) <= 0x7fffffff,
    name: 'surprise: bounded positive mutation',
  });

  return out;
}
