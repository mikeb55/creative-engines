import type { CompositionContext } from '../../compositionContext';
import type { EffectiveStyleIdentity } from '../types';
import { resolveEffectiveStyleIdentity } from '../resolveEffectiveStyleIdentity';

export type ValidatorRelaxKind =
  | 'structural'
  | 'melody_leap'
  | 'zappa_structural'
  | 'verlaine_melody';

export interface ValidatorRelaxDecision {
  active: boolean;
  targetStyleId: string;
  relaxKind: ValidatorRelaxKind;
}

/** Phase 1: replace scattered songwriterStyleId === 'x' relax tests. */
export function validatorRelaxActive(
  context: CompositionContext,
  relaxKind: ValidatorRelaxKind
): ValidatorRelaxDecision {
  const identity = resolveEffectiveStyleIdentity(context);
  return validatorRelaxActiveFromIdentity(identity, relaxKind);
}

export function validatorRelaxActiveFromIdentity(
  identity: EffectiveStyleIdentity,
  relaxKind: ValidatorRelaxKind
): ValidatorRelaxDecision {
  const targetStyleId = identity.harmonyAuthorityStyleId;
  return {
    active: identity.engagement.validator_relax,
    targetStyleId,
    relaxKind,
  };
}
