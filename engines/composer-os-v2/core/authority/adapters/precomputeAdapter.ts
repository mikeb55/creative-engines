import type { CompositionContext } from '../../compositionContext';
import type { EffectiveStyleIdentity } from '../types';
import { resolveEffectiveStyleIdentity } from '../resolveEffectiveStyleIdentity';

/** Phase 1: gate precompute*EffectiveHarmonyBars in duo score build. */
export function shouldPrecomputeStyle(context: CompositionContext, styleId: string): boolean {
  const identity = resolveEffectiveStyleIdentity(context);
  return shouldPrecomputeStyleFromIdentity(identity, styleId);
}

export function shouldPrecomputeStyleFromIdentity(
  identity: EffectiveStyleIdentity,
  styleId: string
): boolean {
  if (styleId === identity.primaryStyleId) return true;
  if (styleId === identity.harmonicVoiceId && identity.engagement.precompute) return true;
  return false;
}
