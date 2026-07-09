/**
 * Central GCE style identity - effective scorer routing from engaged authority, not metadata alone.
 */

import type { CompositionContext } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { classifyAuthoritativeLayerForBar } from '../harmony/harmonySpineProvider';
import { isFrankZappaSongwriterId } from './frankZappaStructuralFingerprint';

export const HV_SCORER_MISMATCH_PREFIX = 'HV_SCORER_MISMATCH';

export interface GceScorerRouting {
  effectiveStyleId: string | undefined;
  routeFrankZappaScorer: boolean;
  harmonicVoiceScorerMismatch?: string;
}

export function isFrankZappaHarmonicAuthorityActive(context: CompositionContext): boolean {
  const meta = context.generationMetadata;
  const tb = context.form?.totalBars ?? 0;

  if (context.harmonyContext?.styleId === 'frank_zappa') return true;

  const eff = meta?.frankZappaEffectiveHarmonyBars;
  if (Array.isArray(eff) && eff.length > 0 && (tb <= 0 || eff.length === tb)) return true;

  if (tb > 0) {
    const spine = classifyAuthoritativeLayerForBar(Math.min(2, tb), context);
    if (spine.sliceId === 'frank_zappa') return true;
  }

  return false;
}

export function isVerlaineHarmonicAuthorityActive(context: CompositionContext): boolean {
  const meta = context.generationMetadata;
  const tb = context.form?.totalBars ?? 0;

  if (context.harmonyContext?.styleId === 'verlaine') return true;

  const eff = meta?.verlaineEffectiveHarmonyBars;
  if (Array.isArray(eff) && eff.length > 0 && (tb <= 0 || eff.length === tb)) return true;

  if (tb > 0) {
    const spine = classifyAuthoritativeLayerForBar(Math.min(2, tb), context);
    if (spine.sliceId === 'verlaine') return true;
  }

  return false;
}

export function resolveEffectiveGceStyleId(context: CompositionContext): string | undefined {
  const meta = context.generationMetadata;
  const primary = meta?.songwriterStyleId?.trim() || undefined;

  if (isFrankZappaSongwriterId(primary)) {
    return primary;
  }

  const hv = normalizeHarmonicVoiceId(meta?.harmonicVoice ?? '');

  if (isFrankZappaSongwriterId(hv) && isFrankZappaHarmonicAuthorityActive(context)) {
    return 'frank_zappa';
  }

  if (hv === 'verlaine' && isVerlaineHarmonicAuthorityActive(context)) {
    return 'verlaine';
  }

  if (primary === 'verlaine') {
    return primary;
  }

  return primary;
}

function resolveHarmonicVoiceScorerMismatch(context: CompositionContext): string | undefined {
  const meta = context.generationMetadata;
  const hvRaw = meta?.harmonicVoice?.trim();
  if (!hvRaw) return undefined;

  const hv = normalizeHarmonicVoiceId(hvRaw);
  const primaryNorm = normalizeHarmonicVoiceId(meta?.songwriterStyleId ?? '');
  if (!hv || hv === primaryNorm) return undefined;

  const effective = resolveEffectiveGceStyleId(context);
  const effectiveNorm = normalizeHarmonicVoiceId(effective ?? primaryNorm);
  if (effectiveNorm === hv) return undefined;

  return `${HV_SCORER_MISMATCH_PREFIX}:harmonicVoice=${hv}:authorityNotEngaged`;
}

export function resolveGceScorerRouting(context: CompositionContext): GceScorerRouting {
  const meta = context.generationMetadata;
  const primary = meta?.songwriterStyleId?.trim() || undefined;
  const effectiveStyleId = resolveEffectiveGceStyleId(context);
  const harmonicVoiceScorerMismatch = resolveHarmonicVoiceScorerMismatch(context);

  const routeFrankZappaScorer =
    isFrankZappaSongwriterId(effectiveStyleId) &&
    (isFrankZappaSongwriterId(primary) || isFrankZappaHarmonicAuthorityActive(context));

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