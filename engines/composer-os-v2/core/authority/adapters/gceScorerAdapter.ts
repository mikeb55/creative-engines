import type { CompositionContext } from '../../compositionContext';
import type { EffectiveStyleIdentity } from '../types';
import { resolveEffectiveStyleIdentity } from '../resolveEffectiveStyleIdentity';

export interface GceScorerDecision {
  /** Diagnostic effective scorer style — Phase 1 may wire into resolveGceScorerRouting. */
  gceEffectiveStyleId: string;
  harmonicVoiceScorerEngaged: boolean;
  harmonicVoiceAuthorityGap: boolean;
}

/** Phase 1: feed resolveGceScorerRouting / gceGate scorer dispatch. */
export function resolveGceScorerStyle(context: CompositionContext): GceScorerDecision {
  const identity = resolveEffectiveStyleIdentity(context);
  return resolveGceScorerStyleFromIdentity(identity);
}

export function resolveGceScorerStyleFromIdentity(
  identity: EffectiveStyleIdentity
): GceScorerDecision {
  const gceEffectiveStyleId =
    identity.engagement.gce_scorer && identity.harmonicVoiceId
      ? identity.harmonicVoiceId
      : identity.primaryStyleId;
  return {
    gceEffectiveStyleId,
    harmonicVoiceScorerEngaged: identity.engagement.gce_scorer,
    harmonicVoiceAuthorityGap: identity.harmonicVoiceAuthorityGap,
  };
}
