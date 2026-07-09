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

/** Phase 1 seam 2: HV-aware relax/bypass — same authority/evidence rules as harmony seam. */
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
  const { primaryStyleId, harmonicVoiceId, harmonyAuthorityStyleId, engagement } = identity;
  let active = engagement.validator_relax;
  let targetStyleId = harmonyAuthorityStyleId;

  switch (relaxKind) {
    case 'zappa_structural':
      // Frank Zappa structural relax stays primary-only until harmony authority engages (documented gap).
      active = active && primaryStyleId === 'frank_zappa';
      targetStyleId = 'frank_zappa';
      break;
    case 'structural':
      // Verlaine bass/structural bundle relax when HV harmony authority is verlaine.
      active = active && harmonyAuthorityStyleId === 'verlaine';
      targetStyleId = 'verlaine';
      break;
    case 'verlaine_melody':
      active =
        active &&
        (primaryStyleId === 'verlaine' || harmonicVoiceId === 'verlaine');
      targetStyleId = 'verlaine';
      break;
    case 'melody_leap':
      break;
    default:
      break;
  }

  return {
    active,
    targetStyleId,
    relaxKind,
  };
}
