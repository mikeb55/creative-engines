import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { classifyAuthoritativeLayerForBar } from '../harmony/harmonySpineProvider';
import { resolveDuoRiffVrbLaneId } from '../song-mode/songwriterStyleProfiles';
import {
  getCapabilityEntry,
  getCapabilityLevel,
  registryPermitsHarmonicVoiceLayer,
  styleProfileActivatesEntry,
} from './harmonicVoiceCapabilityRegistry';
import type { AuthorityEngagement, AuthorityLayer, EffectiveStyleIdentity } from './types';

export const PHASE0_HARMONY_AUTHORITY_PRIMARY_ONLY = true as const;

function normStyle(raw: string | undefined | null): string {
  return normalizeHarmonicVoiceId(String(raw ?? ''));
}

function fullLengthEffBars(
  meta: GenerationMetadata | undefined,
  key: keyof GenerationMetadata | undefined,
  totalBars: number
): boolean {
  if (!key || !meta || totalBars <= 0) return false;
  const arr = meta[key] as string[] | undefined;
  return Array.isArray(arr) && arr.length === totalBars;
}

function harmonyEvidenceForStyle(
  context: CompositionContext,
  styleId: string,
  entryKey: keyof GenerationMetadata | undefined
): boolean {
  const meta = context.generationMetadata;
  const tb = context.form?.totalBars ?? 0;
  if (context.harmonyContext?.styleId === styleId) return true;
  if (fullLengthEffBars(meta, entryKey, tb)) return true;
  if (tb > 0) {
    const spine = classifyAuthoritativeLayerForBar(Math.min(2, tb), context);
    if (spine.sliceId === styleId) return true;
  }
  return false;
}

function styleInPlay(
  md: GenerationMetadata | undefined,
  styleId: string,
  entry: ReturnType<typeof getCapabilityEntry>
): { asPrimary: boolean; asHarmonicVoice: boolean; asProfile: boolean } {
  const primary = normStyle(md?.songwriterStyleId);
  const hv = normStyle(md?.harmonicVoice ?? '');
  return {
    asPrimary: primary === styleId,
    asHarmonicVoice: hv === styleId,
    asProfile: entry ? styleProfileActivatesEntry(entry, md) : false,
  };
}

function layerEngaged(
  context: CompositionContext,
  styleId: string,
  layer: AuthorityLayer
): boolean {
  const md = context.generationMetadata;
  const entry = getCapabilityEntry(styleId);
  const level = getCapabilityLevel(styleId, layer);
  const play = styleInPlay(md, styleId, entry);

  if (level === 'none') return false;

  if (layer === 'harmony' || layer === 'precompute') {
    const key = entry?.effectiveHarmonyBarsKey;
    const evidence = harmonyEvidenceForStyle(context, styleId, key);
    if (play.asPrimary || play.asProfile) return evidence;
    if (play.asHarmonicVoice && registryPermitsHarmonicVoiceLayer(styleId, layer)) return evidence;
    return false;
  }

  if (layer === 'validator_relax') {
    if (play.asPrimary) return level === 'primary_only' || level === 'hv_full' || level === 'hv_partial';
    if (play.asHarmonicVoice) return level === 'hv_full';
    return false;
  }

  if (layer === 'truth_registry') {
    // `level === 'none'` already returned above — primary/profile always engage when declared.
    if (play.asPrimary || play.asProfile) return true;
    if (play.asHarmonicVoice) return registryPermitsHarmonicVoiceLayer(styleId, layer);
    return false;
  }

  if (layer === 'gce_scorer') {
    const key = entry?.effectiveHarmonyBarsKey;
    const evidence = harmonyEvidenceForStyle(context, styleId, key);
    if (!evidence) return false;
    if (play.asPrimary) return level === 'hv_full' || level === 'hv_partial';
    if (play.asHarmonicVoice) return level === 'hv_full' || level === 'hv_partial';
    return false;
  }

  if (layer === 'riff_vrb_lane') {
    const lane = resolveDuoRiffVrbLaneId(md);
    if (lane !== styleId) return false;
    if (play.asPrimary) return level === 'hv_partial' || level === 'primary_only';
    if (play.asHarmonicVoice) return level === 'hv_partial';
    return false;
  }

  return false;
}

function targetStyleForEngagement(primary: string, hv: string | undefined): string {
  if (hv && hv !== primary) return hv;
  return primary;
}

export function resolveEffectiveStyleIdentity(context: CompositionContext): EffectiveStyleIdentity {
  const md = context.generationMetadata;
  const primaryStyleId = normStyle(md?.songwriterStyleId) || 'barry_harris';
  const hvRaw = md?.harmonicVoice?.trim();
  const harmonicVoiceId = hvRaw ? normStyle(hvRaw) : undefined;
  const harmonicVoiceRequested = Boolean(harmonicVoiceId);
  const target = targetStyleForEngagement(primaryStyleId, harmonicVoiceId);

  const engagement: AuthorityEngagement = {
    harmony: layerEngaged(context, target, 'harmony'),
    precompute: layerEngaged(context, target, 'precompute'),
    validator_relax: layerEngaged(context, target, 'validator_relax'),
    truth_registry: layerEngaged(context, target, 'truth_registry'),
    gce_scorer: layerEngaged(context, target, 'gce_scorer'),
    riff_vrb_lane: layerEngaged(context, target, 'riff_vrb_lane'),
  };

  const harmonyAuthorityStyleId =
    engagement.harmony && harmonicVoiceId && harmonicVoiceId !== primaryStyleId
      ? harmonicVoiceId
      : primaryStyleId;

  const receipts: string[] = [
    `phase1:primary=${primaryStyleId}`,
    harmonicVoiceId ? `phase1:harmonicVoice=${harmonicVoiceId}` : 'phase1:harmonicVoice=unset',
    `phase1:harmonyAuthority=${harmonyAuthorityStyleId}`,
    `phase1:engagementHarmony=${engagement.harmony}`,
    `phase1:engagementPrecompute=${engagement.precompute}`,
  ];

  const harmonicVoiceAuthorityGap =
    harmonicVoiceId != null &&
    harmonicVoiceId !== primaryStyleId &&
    !layerEngaged(context, harmonicVoiceId, 'harmony');

  if (harmonicVoiceAuthorityGap) {
    receipts.push(`phase1:harmonicVoiceAuthorityGap:${harmonicVoiceId}`);
  }

  return {
    primaryStyleId,
    harmonicVoiceId,
    harmonyAuthorityStyleId,
    harmonicVoiceRequested,
    engagement,
    receipts,
    harmonicVoiceAuthorityGap,
  };
}
