import type { CompositionContext } from '../../compositionContext';
import type { EffectiveStyleIdentity } from '../types';
import { resolveEffectiveStyleIdentity } from '../resolveEffectiveStyleIdentity';

export interface TruthRegistryDecision {
  /** Style id used to select EFFECTIVE_HARMONY_TRUTH_REGISTRY row. */
  truthRegistryStyleId: string;
  /** True when HV truth routing engaged (harmony evidence + HV differs from primary). */
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
  const harmonicVoiceTruthEngaged = Boolean(
    identity.engagement.harmony &&
      identity.harmonicVoiceId &&
      identity.harmonicVoiceId !== identity.primaryStyleId
  );
  const truthRegistryStyleId = harmonicVoiceTruthEngaged
    ? identity.harmonicVoiceId!
    : identity.primaryStyleId;
  return {
    truthRegistryStyleId,
    harmonicVoiceTruthEngaged,
  };
}
