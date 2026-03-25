/**
 * Resolves effective engine seed from optional variation id + creative tier.
 * Stable tier + no variation → identical to raw `seed` (no breaking changes).
 */

import { variationIdToSeed } from '../variation/variationAdapter';
import type { VariationId } from '../variation/variationTypes';
import type { CreativeControlLevel } from './creativeControlTypes';
import { applyCreativeSeedMutation } from './mutationEngine';

export interface ResolveEffectiveSeedInput {
  /** Legacy / internal seed (required for backwards compatibility). */
  seed: number;
  /** When set, replaces base seed derivation (UI may omit raw seed reliance). */
  variationId?: VariationId;
  /** Default stable — no mutation. */
  creativeControlLevel?: CreativeControlLevel;
}

export interface EffectiveSeedResolution {
  effectiveSeed: number;
  baseSeed: number;
  variationId?: VariationId;
  creativeControlLevel: CreativeControlLevel;
  mutationApplied: boolean;
}

export function resolveBaseSeed(input: ResolveEffectiveSeedInput): number {
  if (input.variationId != null && String(input.variationId).trim().length > 0) {
    return variationIdToSeed(String(input.variationId).trim());
  }
  return input.seed;
}

/**
 * Full pipeline: variation → base seed → optional creative mutation.
 */
export function resolveEffectiveSeed(input: ResolveEffectiveSeedInput): EffectiveSeedResolution {
  const level: CreativeControlLevel = input.creativeControlLevel ?? 'stable';
  const baseSeed = resolveBaseSeed(input);
  const mutated =
    level === 'stable' ? baseSeed : applyCreativeSeedMutation(baseSeed, level);
  const effectiveSeed = mutated;
  return {
    effectiveSeed,
    baseSeed,
    variationId: input.variationId,
    creativeControlLevel: level,
    mutationApplied: level !== 'stable' && effectiveSeed !== baseSeed,
  };
}

/** Convenience for `generateComposition` — single number for `runGoldenPath`. */
export function resolveEffectiveGenerationSeed(input: ResolveEffectiveSeedInput): number {
  return resolveEffectiveSeed(input).effectiveSeed;
}
