import type { CompositionContext } from '../../compositionContext';
import {
  PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY,
  resolveEffectiveStyleIdentity,
} from '../resolveEffectiveStyleIdentity';

export interface HarmonyAuthorityDecision {
  harmonyAuthorityStyleId: string;
  harmonicVoiceAuthorityGap: boolean;
  harmonicVoiceRequested: boolean;
  engagementHarmony: boolean;
}

/** Phase 1 seam 1: feeds getChordForBar slice / harmonyContext authority selection. */
export function resolveHarmonyAuthority(context: CompositionContext): HarmonyAuthorityDecision {
  const identity = resolveEffectiveStyleIdentity(context);
  return {
    harmonyAuthorityStyleId: identity.harmonyAuthorityStyleId,
    harmonicVoiceAuthorityGap: identity.harmonicVoiceAuthorityGap,
    harmonicVoiceRequested: identity.harmonicVoiceRequested,
    engagementHarmony: identity.engagement.harmony,
  };
}

/** @deprecated Phase 0 sentinel — harmony seam now reads engagement via resolveHarmonyAuthority. */
export { PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY };
