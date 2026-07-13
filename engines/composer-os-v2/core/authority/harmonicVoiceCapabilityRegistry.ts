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
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
      gce_scorer: 'hv_partial',
    },
    styleProfiles: ['STYLE_PAT_METHENY'],
    effectiveHarmonyBarsKey: 'patMethenyEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via patMethenyEffectiveHarmonyBars + mosaic merge; gce_scorer hv_partial; truth_registry primary-only',
  },
  {
    styleId: 'joni_mitchell',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
      gce_scorer: 'hv_partial',
    },
    styleProfiles: ['STYLE_JONI_MITCHELL'],
    effectiveHarmonyBarsKey: 'joniMitchellEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via joniMitchellEffectiveHarmonyBars + mosaic merge; gce_scorer hv_partial; truth_registry primary-only; joniPhase + joniStyleHarmonyPolicy stay primary|styleProfile',
  },
  {
    styleId: 'sonic_youth',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
      gce_scorer: 'hv_partial',
    },
    styleProfiles: ['STYLE_SONIC_YOUTH'],
    effectiveHarmonyBarsKey: 'sonicYouthEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via sonicYouthEffectiveHarmonyBars + mosaic merge; gce_scorer hv_partial; truth_registry primary-only; texture annotation stays primary|styleProfile',
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
  {
    styleId: 'herbie_hancock',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'herbieHancockEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via herbieHancockEffectiveHarmonyBars + mosaic merge; truth_registry primary-only',
  },
  {
    styleId: 'debussy',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'debussyEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via debussyEffectiveHarmonyBars + mosaic merge; truth_registry primary-only',
  },
  {
    styleId: 'duke_ellington',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'dukeEllingtonEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via dukeEllingtonEffectiveHarmonyBars + mosaic merge; truth_registry primary-only',
  },
  {
    styleId: 'thelonious_monk',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'theloniousMonkEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via theloniousMonkEffectiveHarmonyBars + mosaic merge; truth_registry primary-only',
  },
  {
    styleId: 'wayne_shorter',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'wayneShorterEffectiveHarmonyBars',
    notes: 'harmony/precompute hv_full via wayneShorterEffectiveHarmonyBars + mosaic merge; truth_registry primary-only',
  },
  {
    styleId: 'antonio_carlos_jobim',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'jobimEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via jobimEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id jobim',
  },
  {
    styleId: 'jobim',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'jobimEffectiveHarmonyBars',
    notes:
      'alias of antonio_carlos_jobim for VRB voiceId harmonicVoice=jobim (normalizeHarmonicVoiceId does not unify)',
  },
  {
    styleId: 'arvo_part',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'arvoPartEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via arvoPartEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id part; arvoPartContext + tintinnabuli apply + bass-massage skip + style surface stay primary-only',
  },
  {
    styleId: 'part',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'arvoPartEffectiveHarmonyBars',
    notes:
      'alias of arvo_part for VRB voiceId harmonicVoice=part (normalizeHarmonicVoiceId does not unify)',
  },
  {
    styleId: 'gershwin',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'gershwinEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via gershwinEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; gershwinContext + applyGershwinStyleSurface + API intake stay primary-only',
  },
  {
    styleId: 'radiohead',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'radioheadEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via radioheadEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; radioheadMelodicContext + finalize grammar stay primary-only',
  },
  {
    styleId: 'andrew_hill',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'andrewHillEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via andrewHillEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; no dual-surface holdbacks',
  },
  {
    styleId: 'kate_bush',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'kateBushEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via kateBushEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; no dual-surface holdbacks',
  },
  {
    styleId: 'satie',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'satieEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via satieEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; satieContext + applySatieStyleSurface stay primary-only',
  },
  {
    styleId: 'cole_porter',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'colePorterEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via colePorterEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; applyColePorterStyleSurface + beguine stamps primary-only',
  },
  {
    styleId: 'bacharach',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'bacharachEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via bacharachEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; guitar bar passes + style-profile biases stay primary-only',
  },
  {
    styleId: 'donald_fagen',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'donaldFagenEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via donaldFagenEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; Fagen guitar/keys colour biases stay primary-only',
  },
  {
    styleId: 'john_coltrane',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnColtraneEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via johnColtraneEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; Wave-C three-tonic changes cadence guardrail',
  },
  {
    styleId: 'ecm_chamber',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'ecmChamberEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via ecmChamberEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; preset ecm_chamber orchestration + STYLE_ECM* surfaces + presetId validator skips stay primary/preset-only',
  },
  {
    styleId: 'bernard_herrmann',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'bernardHerrmannEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via bernardHerrmannEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id herrmann; bernardHerrmannContext API + style surface stay primary-only; FBT idiomatic-bias lives inside precompute (not an HV routing concern)',
  },
  {
    styleId: 'herrmann',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'bernardHerrmannEffectiveHarmonyBars',
    notes:
      'alias of bernard_herrmann for VRB voiceId harmonicVoice=herrmann (normalizeHarmonicVoiceId does not unify)',
  },
  {
    styleId: 'claus_ogerman',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'clausOgermanEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via clausOgermanEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id ogerman',
  },
  {
    styleId: 'ogerman',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'clausOgermanEffectiveHarmonyBars',
    notes:
      'alias of claus_ogerman for VRB voiceId harmonicVoice=ogerman (normalizeHarmonicVoiceId does not unify)',
  },
  {
    styleId: 'don_sebesky',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'donSebeskyEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via donSebeskyEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; Metheny gate bypass stays primary-id',
  },
  {
    styleId: 'jack_white',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'jackWhiteEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via jackWhiteEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id jack_white_drone_riff; jackWhiteStructuralRelax stays primary-id',
  },
  {
    styleId: 'jack_white_drone_riff',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'jackWhiteEffectiveHarmonyBars',
    notes:
      'alias of jack_white for VRB voiceId harmonicVoice=jack_white_drone_riff (normalizeHarmonicVoiceId does not unify)',
  },
  {
    styleId: 'jerry_goldsmith',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'jerryGoldsmithEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via jerryGoldsmithEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id goldsmith; context+surface primary-only; FBT idiomatic-bias inside precompute',
  },
  {
    styleId: 'goldsmith',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'jerryGoldsmithEffectiveHarmonyBars',
    notes:
      'alias of jerry_goldsmith for VRB voiceId harmonicVoice=goldsmith (normalizeHarmonicVoiceId does not unify)',
  },
  {
    styleId: 'john_barry',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnBarryEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via johnBarryEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id barry_thematic_monolith; soft barry/jbr excluded (barry_harris collision); barryStructuralRelax primary-id',
  },
  {
    styleId: 'barry_thematic_monolith',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnBarryEffectiveHarmonyBars',
    notes:
      'alias of john_barry for VRB voiceId harmonicVoice=barry_thematic_monolith',
  },
  {
    styleId: 'john_williams',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnWilliamsEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via johnWilliamsEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id williams; context+surface primary-only',
  },
  {
    styleId: 'williams',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnWilliamsEffectiveHarmonyBars',
    notes:
      'alias of john_williams for VRB voiceId harmonicVoice=williams',
  },
  {
    styleId: 'johnny_mandel',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnnyMandelEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via johnnyMandelEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id mandel_lyric_warmth; mandelStructuralRelax primary-id',
  },
  {
    styleId: 'mandel_lyric_warmth',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'johnnyMandelEffectiveHarmonyBars',
    notes:
      'alias of johnny_mandel for VRB voiceId harmonicVoice=mandel_lyric_warmth',
  },
  {
    styleId: 'marr',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'marrEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via marrEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts johnny_marr|marr_melodic_rhythm; Art Rock Metheny-bypass primary-id',
  },
  {
    styleId: 'johnny_marr',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'marrEffectiveHarmonyBars',
    notes: 'alias of marr for harmonicVoice=johnny_marr',
  },
  {
    styleId: 'marr_melodic_rhythm',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'marrEffectiveHarmonyBars',
    notes: 'alias of marr for VRB voiceId harmonicVoice=marr_melodic_rhythm',
  },
  {
    styleId: 'nino_rota',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'ninoRotaEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via ninoRotaEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts VRB id rota; context+surface primary-only',
  },
  {
    styleId: 'rota',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'ninoRotaEffectiveHarmonyBars',
    notes: 'alias of nino_rota for VRB voiceId harmonicVoice=rota',
  },
  {
    styleId: 'ralph_towner',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'ralphTownerEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via ralphTownerEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts towner|towner_guitar_polyphony; townerStructuralRelax primary-only',
  },
  {
    styleId: 'towner',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'ralphTownerEffectiveHarmonyBars',
    notes: 'alias of ralph_towner for harmonicVoice=towner',
  },
  {
    styleId: 'towner_guitar_polyphony',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'ralphTownerEffectiveHarmonyBars',
    notes: 'alias of ralph_towner for VRB voiceId harmonicVoice=towner_guitar_polyphony',
  },
  {
    styleId: 'philip_glass',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'philipGlassEffectiveHarmonyBars',
    notes:
      'harmony/precompute hv_full via philipGlassEffectiveHarmonyBars + mosaic merge; truth_registry primary-only; path helper also accepts philip_glass_screen|philip_glass_film|glass; never reich_glass; context+surface primary-only; FBT idiomatic-bias inside precompute',
  },
  {
    styleId: 'philip_glass_screen',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'philipGlassEffectiveHarmonyBars',
    notes: 'alias of philip_glass for film-stub VRB voiceId harmonicVoice=philip_glass_screen',
  },
  {
    styleId: 'philip_glass_film',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'philipGlassEffectiveHarmonyBars',
    notes: 'alias of philip_glass for film-stub VRB voiceId harmonicVoice=philip_glass_film',
  },
  {
    styleId: 'glass',
    layers: {
      harmony: 'hv_full',
      precompute: 'hv_full',
      truth_registry: 'primary_only',
    },
    effectiveHarmonyBarsKey: 'philipGlassEffectiveHarmonyBars',
    notes:
      'alias of philip_glass for SQ→BB profile id / film-stub BY_ID key glass (not reich_glass)',
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
