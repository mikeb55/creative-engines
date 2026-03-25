/**
 * Creative control resolver — stable vs mutation (Prompt 2/2).
 */

import { variationIdToSeed } from '../core/variation/variationAdapter';
import { resolveEffectiveGenerationSeed, resolveEffectiveSeed } from '../core/creative-controls/creativeControlResolver';

export function runCreativeControlResolverTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const stable = resolveEffectiveSeed({ seed: 42, creativeControlLevel: 'stable' });
  out.push({
    ok: stable.effectiveSeed === 42 && !stable.mutationApplied,
    name: 'stable tier leaves seed unchanged',
  });

  const bal = resolveEffectiveSeed({ seed: 42, creativeControlLevel: 'balanced' });
  out.push({
    ok: bal.effectiveSeed !== 42 && bal.mutationApplied,
    name: 'balanced tier applies deterministic mutation',
  });

  const withVar = resolveEffectiveGenerationSeed({ seed: 99, variationId: 'album_cut_a' });
  const withVar2 = resolveEffectiveGenerationSeed({ seed: 99, variationId: 'album_cut_a' });
  const expected = variationIdToSeed('album_cut_a');
  out.push({
    ok: withVar === withVar2 && withVar === expected,
    name: 'variationId maps to deterministic seed (ignores raw seed)',
  });

  return out;
}
