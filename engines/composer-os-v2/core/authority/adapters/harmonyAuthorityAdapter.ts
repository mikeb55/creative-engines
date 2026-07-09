import type { CompositionContext } from '../../compositionContext';
import {
  PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY,
  resolveEffectiveStyleIdentity,
} from '../resolveEffectiveStyleIdentity';

export interface HarmonyAuthorityDecision {
  harmonyAuthorityStyleId: string;
  harmonicVoiceAuthorityGap: boolean;
  harmonicVoiceRequested: boolean;
  /** Phase 0: live seams still use primary-only routing. */
  phase0PrimaryOnly: typeof PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY;
}

/** Phase 1: feeds getChordForBar / harmonySpineProvider row selection. */
export function resolveHarmonyAuthority(context: CompositionContext): HarmonyAuthorityDecision {
  const identity = resolveEffectiveStyleIdentity(context);
  return {
    harmonyAuthorityStyleId: identity.harmonyAuthorityStyleId,
    harmonicVoiceAuthorityGap: identity.harmonicVoiceAuthorityGap,
    harmonicVoiceRequested: identity.harmonicVoiceRequested,
    phase0PrimaryOnly: PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY,
  };
}
