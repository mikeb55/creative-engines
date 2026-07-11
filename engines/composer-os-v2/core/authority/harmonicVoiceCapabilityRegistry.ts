import type { GenerationMetadata } from '../compositionContext';
import type { AuthorityLayer, HvCapabilityEntry, HvCapabilityLevel } from './types';

/**
 * Declarative HV capability table — Phase 0 seed rows only.
 * No live seam reads this registry until Phase 1 wiring.
 *
 * Missing style/layer -> `none` -> same practical outcome as today's primary-only live behaviour.
 */
export const HARMONIC_VOICE_CAPABILITY_REGISTRY: readonly HvCapabilityEntry[] = [
  {
    styleId: 'verlaine',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      validator_relax: 'hv_full',
      truth_registry: 'primary_only',
      gce_scorer: 'hv_partial',
    },
    effectiveHarmonyBarsKey: 'verlaineEffectiveHarmonyBars',
    notes: 'truth_registry row still primary-only in live EFFECTIVE_HARMONY_TRUTH_REGISTRY today',
  },
  {
    styleId: 'frank_zappa',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      validator_relax: 'hv_full',
      truth_registry: 'primary_only',
      gce_scorer: 'hv_full',
    },
    effectiveHarmonyBarsKey: 'frankZappaEffectiveHarmonyBars',
    notes: 'harmonyContext path when engaged',
  },
  {
    styleId: 'pat_metheny',
    layers: {
      harmony: 'hv_partial',
      precompute: 'hv_partial',
      truth_registry: 'primary_only',
    },
    styleProfiles: ['STYLE_PAT_METHENY'],
    effectiveHarmonyBarsKey: 'patMethenyEffectiveHarmonyBars',
  },
  {
    styleId: 'joni_mitchell',
    layers: {
      harmony: 'hv_partial',
      precompute: 'hv_partial',
      truth_registry: 'primary_only',
    },
    styleProfiles: ['STYLE_JONI_MITCHELL'],
    effectiveHarmonyBarsKey: 'joniMitchellEffectiveHarmonyBars',
  },
  {
    styleId: 'sonic_youth',
    layers: {
      harmony: 'hv_partial',
      precompute: 'hv_partial',
      truth_registry: 'primary_only',
    },
    styleProfiles: ['STYLE_SONIC_YOUTH'],
    effectiveHarmonyBarsKey: 'sonicYouthEffectiveHarmonyBars',
  },
  {
    styleId: 'allan_holdsworth',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      validator_relax: 'primary_only',
      truth_registry: 'primary_only',
      riff_vrb_lane: 'hv_partial',
    },
    effectiveHarmonyBarsKey: 'holdsworthEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via holdsworthEffectiveHarmonyBars + mosaic merge; validator_relax primary-only until behaviourGates adapter',
  },
  {
    styleId: 'fripp',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      validator_relax: 'primary_only',
      truth_registry: 'primary_only',
      riff_vrb_lane: 'hv_partial',
    },
    effectiveHarmonyBarsKey: 'frippEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via frippEffectiveHarmonyBars + mosaic merge; validator_relax primary-only; riff lane partial',
  },
  {
    styleId: 'bill_evans',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'billEvansEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via billEvansEffectiveHarmonyBars + mosaic merge; truth_registry primary-only',
  },
];

const REGISTRY_BY_STYLE = new Map<string, HvCapabilityEntry>(
  HARMONIC_VOICE_CAPABILITY_REGISTRY.map((e) => [e.styleId, e])
);

/** Default when no registry row: `none` — preserves primary-only live behaviour. */
export function getCapabilityLevel(styleId: string, layer: AuthorityLayer): HvCapabilityLevel {
  const entry = REGISTRY_BY_STYLE.get(styleId);
  return entry?.layers[layer] ?? 'none';
}

export function getCapabilityEntry(styleId: string): HvCapabilityEntry | undefined {
  return REGISTRY_BY_STYLE.get(styleId);
}

export function registryPermitsHarmonicVoiceLayer(
  styleId: string,
  layer: AuthorityLayer
): boolean {
  const level = getCapabilityLevel(styleId, layer);
  return level === 'hv_partial' || level === 'hv_full';
}

export function styleProfileActivatesEntry(
  entry: HvCapabilityEntry,
  md: GenerationMetadata | undefined
): boolean {
  if (!entry.styleProfiles?.length || !md?.styleProfile) return false;
  return entry.styleProfiles.includes(md.styleProfile);
}
