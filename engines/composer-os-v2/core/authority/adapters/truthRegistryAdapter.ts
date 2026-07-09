import type { CompositionContext } from '../../compositionContext';
import type { EffectiveStyleIdentity } from '../types';
import { resolveEffectiveStyleIdentity } from '../resolveEffectiveStyleIdentity';

export interface TruthRegistryDecision {
  /** Phase 0: always primary — EFFECTIVE_HARMONY_TRUTH_REGISTRY unchanged. */
  truthRegistryStyleId: string;
  harmonicVoiceTruthEngaged: boolean;
}

/** Phase 1: select EFFECTIVE_HARMONY_TRUTH_REGISTRY row. */
export function resolveTruthRegistryStyle(context: CompositionContext): TruthRegistryDecision {
  const identity = resolveEffectiveStyleIdentity(context);
  return resolveTruthRegistryStyleFromIdentity(identity);
}

export function resolveTruthRegistryStyleFromIdentity(
  identity: EffectiveStyleIdentity
): TruthRegistryDecision {
  return {
    truthRegistryStyleId: identity.primaryStyleId,
    harmonicVoiceTruthEngaged: identity.engagement.truth_registry,
  };
}
