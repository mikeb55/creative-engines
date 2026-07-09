/**
 * Central GCE style identity — effective scorer routing from engaged authority, not metadata alone.
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveEffectiveStyleIdentity } from '../authority/resolveEffectiveStyleIdentity';
import { resolveGceScorerStyleFromIdentity } from '../authority/adapters/gceScorerAdapter';
import { isFrankZappaSongwriterId } from './frankZappaStructuralFingerprint';

export const HV_SCORER_MISMATCH_PREFIX = 'HV_SCORER_MISMATCH';

export interface GceScorerRouting {
  effectiveStyleId: string | undefined;
  routeFrankZappaScorer: boolean;
  harmonicVoiceScorerMismatch?: string;
}

export function resolveEffectiveGceStyleId(context: CompositionContext): string | undefined {
  const identity = resolveEffectiveStyleIdentity(context);
  return resolveGceScorerStyleFromIdentity(identity).gceEffectiveStyleId;
}

function resolveHarmonicVoiceScorerMismatchFromIdentity(
  identity: ReturnType<typeof resolveEffectiveStyleIdentity>,
  gceEffectiveStyleId: string
): string | undefined {
  const hv = identity.harmonicVoiceId;
  if (!hv || hv === identity.primaryStyleId) return undefined;

  const effectiveNorm = normalizeHarmonicVoiceId(gceEffectiveStyleId);
  if (effectiveNorm === hv) return undefined;

  return `${HV_SCORER_MISMATCH_PREFIX}:harmonicVoice=${hv}:authorityNotEngaged`;
}

export function resolveGceScorerRouting(context: CompositionContext): GceScorerRouting {
  const identity = resolveEffectiveStyleIdentity(context);
  const decision = resolveGceScorerStyleFromIdentity(identity);
  const effectiveStyleId = decision.gceEffectiveStyleId;
  const harmonicVoiceScorerMismatch = resolveHarmonicVoiceScorerMismatchFromIdentity(
    identity,
    effectiveStyleId
  );

  const routeFrankZappaScorer =
    isFrankZappaSongwriterId(effectiveStyleId) &&
    (isFrankZappaSongwriterId(identity.primaryStyleId) || decision.harmonicVoiceScorerEngaged);

  return {
    effectiveStyleId,
    routeFrankZappaScorer,
    harmonicVoiceScorerMismatch,
  };
}

export function applyGceScorerRoutingDiagnostics(
  context: CompositionContext,
  routing: GceScorerRouting
): void {
  if (!context.generationMetadata) return;
  if (routing.harmonicVoiceScorerMismatch) {
    context.generationMetadata.harmonicVoiceScorerMismatch = routing.harmonicVoiceScorerMismatch;
  } else {
    delete context.generationMetadata.harmonicVoiceScorerMismatch;
  }
}

export const GCE_EVAL_COMPOSITION_CONTEXT_KEY = 'compositionContext';
