/**
 * Song Mode composer-profile blend routing.
 * Phrase blocks keep each slice's own progression intact.
 * Bar-by-bar coin flips are not used.
 */

import { normalizeSongwriterStyleKey, type SongwriterStyleProfile } from './songwriterStyleProfiles';
import { defaultStyleProfileForPrimarySongwriter } from './songModeStyleProfileDefaults';
import type { StyleProfile } from './songModeStyleProfile';

export const DEFAULT_SONGWRITER_BLEND_WEIGHT = 0.35;

/** Songwriter ids whose harmony slice can be precomputed and installed as blend authority. */
export const BLENDABLE_HARMONY_SLICE_IDS: ReadonlySet<string> = new Set([
  'wayne_shorter',
  'bacharach',
  'debussy',
  'gil_evans',
  'pat_metheny',
  'joni_mitchell',
]);

export type ComposerProfileBlendStatus =
  | 'primary_only'
  | 'phrase_block'
  | 'secondary_authoritative'
  | 'unsupported_secondary';

export interface ComposerProfileBlendReceipt {
  requestedPrimaryId: string;
  requestedSecondaryId: string;
  weight: number;
  status: ComposerProfileBlendStatus;
  reason?: string;
  phraseBars: number;
  /** 1-based bars whose symbol came from the secondary slice. */
  secondaryBars?: number[];
}

export function resolveSongwriterBlendWeight(raw: number | undefined, hasSecondary: boolean): number {
  if (!hasSecondary) return 0;
  if (raw == null || !Number.isFinite(raw)) return DEFAULT_SONGWRITER_BLEND_WEIGHT;
  return Math.max(0, Math.min(1, raw));
}

export function harmonySliceBlendSupported(styleId: string | null | undefined): boolean {
  if (!styleId) return false;
  return BLENDABLE_HARMONY_SLICE_IDS.has(styleId);
}

export function unsupportedSecondaryReason(styleId: string): string {
  if (styleId === 'ravel') {
    return (
      'UNSUPPORTED: Ravel has no harmony slice (no precomputeRavelEffectiveHarmonyBars). ' +
      'Primary harmony is unchanged. A Ravel harmony slice is required before Debussy + Ravel can blend.'
    );
  }
  return (
    `UNSUPPORTED: ${styleId} has no harmony-slice blend adapter. Primary harmony is unchanged. ` +
    'Wire that slice precompute into composerProfileHarmonyBlend.ts before this pair can blend.'
  );
}

const PROFILE_SCALAR_KEYS = [
  'lineVsCellEmphasis',
  'harmonyColourBias',
  'formRegularity',
  'prosodyInfluence',
  'hookRepetitionBias',
  'phraseRegularity',
  'hookReturnVariation',
  'harmonicSpeed',
  'sectionContrast',
  'syncopationBias',
  'densityBias',
] as const;

const PROFILE_NUMERIC_EXTRAS = [
  'motifCellSize',
  'fagenMuChordBias',
  'fagenLydianMajorBias',
  'fagenAlteredDominantBias',
  'fagenRootAvoidanceMelody',
  'fagenSlashChordDensity',
  'bacharachDeceptiveCadenceRate',
  'bacharachChromaticVoiceLeading',
  'bacharachModalMixtureLevel',
  'bacharachCadentialAmbiguity',
  'bacharachPedalUsage',
  'productionGloss',
] as const;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Keep primary-only fields. Interpolate shared numeric extras.
 * A missing primary rate stays the primary value. It is not replaced with 0.
 */
export function blendSongwriterProfiles(
  primary: SongwriterStyleProfile,
  secondary: SongwriterStyleProfile,
  weightB: number,
): SongwriterStyleProfile {
  const w = clamp01(weightB);
  if (w <= 0) return { ...primary };
  if (w >= 1) return { ...secondary, id: primary.id };
  const out: SongwriterStyleProfile = { ...primary };
  for (const key of PROFILE_SCALAR_KEYS) {
    out[key] = primary[key] * (1 - w) + secondary[key] * w;
  }
  for (const key of PROFILE_NUMERIC_EXTRAS) {
    const a = primary[key];
    const b = secondary[key];
    if (typeof a === 'number' && typeof b === 'number') {
      (out as unknown as Record<string, number>)[key] = a * (1 - w) + b * w;
    }
  }
  return out;
}

export function phraseCoherentHarmonyBlend(
  primaryBars: readonly string[],
  secondaryBars: readonly string[],
  weight: number,
  phraseBars = 8,
): { symbols: string[]; secondaryBars: number[] } {
  const n = Math.min(primaryBars.length, secondaryBars.length);
  const symbols = primaryBars.slice(0, n);
  if (weight <= 0 || n === 0) return { symbols, secondaryBars: [] };
  if (weight >= 1) {
    return {
      symbols: secondaryBars.slice(0, n),
      secondaryBars: Array.from({ length: n }, (_, i) => i + 1),
    };
  }
  const phraseCount = Math.ceil(n / phraseBars);
  let count = Math.round(weight * phraseCount);
  if (phraseCount >= 2) count = Math.min(phraseCount - 1, Math.max(1, count));
  else count = 0;
  if (count <= 0) return { symbols, secondaryBars: [] };
  const startPhrase = Math.floor((phraseCount - count) / 2);
  const secondaryBarNumbers: number[] = [];
  for (let p = startPhrase; p < startPhrase + count; p++) {
    const from = p * phraseBars;
    const to = Math.min(n, (p + 1) * phraseBars);
    for (let i = from; i < to; i++) {
      symbols[i] = secondaryBars[i]!;
      secondaryBarNumbers.push(i + 1);
    }
  }
  return { symbols, secondaryBars: secondaryBarNumbers };
}

export interface BlendRouteOptions {
  songModeHookFirstIdentity?: boolean;
  primarySongwriterStyle?: string;
  secondarySongwriterStyle?: string;
  songwriterBlendWeight?: number;
  styleProfile?: StyleProfile;
  composerProfileBlend?: ComposerProfileBlendReceipt;
}

/** Weight 0 and unsupported secondaries leave the primary pipeline. Weight 1 runs as the secondary composer. */
export function routeSongwriterBlendOptions<T extends BlendRouteOptions>(options: T | undefined): T | undefined {
  if (!options?.songModeHookFirstIdentity) return options;
  const secondaryRaw = options.secondarySongwriterStyle?.trim() ?? '';
  if (!secondaryRaw) return options;
  const secondaryId = normalizeSongwriterStyleKey(secondaryRaw);
  const primaryId = normalizeSongwriterStyleKey(options.primarySongwriterStyle ?? '') ?? options.primarySongwriterStyle ?? '';
  if (!secondaryId || secondaryId === primaryId) return options;
  const weight = resolveSongwriterBlendWeight(options.songwriterBlendWeight, true);
  const supported = harmonySliceBlendSupported(secondaryId);
  if (!supported) {
    const { secondarySongwriterStyle: _drop, ...rest } = options;
    return {
      ...(rest as T),
      secondarySongwriterStyle: undefined,
      songwriterBlendWeight: 0,
      composerProfileBlend: {
        requestedPrimaryId: primaryId,
        requestedSecondaryId: secondaryId,
        weight,
        status: 'unsupported_secondary',
        reason: unsupportedSecondaryReason(secondaryId),
        phraseBars: 8,
      },
    };
  }
  if (weight <= 0) {
    const { secondarySongwriterStyle: _drop, ...rest } = options;
    return {
      ...(rest as T),
      secondarySongwriterStyle: undefined,
      songwriterBlendWeight: 0,
      composerProfileBlend: {
        requestedPrimaryId: primaryId,
        requestedSecondaryId: secondaryId,
        weight: 0,
        status: 'primary_only',
        phraseBars: 8,
      },
    };
  }
  if (weight >= 1) {
    const primaryDefault = defaultStyleProfileForPrimarySongwriter(primaryId);
    const nextProfile =
      options.styleProfile == null || options.styleProfile === primaryDefault
        ? (defaultStyleProfileForPrimarySongwriter(secondaryId) ?? options.styleProfile)
        : options.styleProfile;
    const { secondarySongwriterStyle: _drop, ...rest } = options;
    return {
      ...(rest as T),
      primarySongwriterStyle: secondaryId,
      secondarySongwriterStyle: undefined,
      styleProfile: nextProfile,
      songwriterBlendWeight: 1,
      composerProfileBlend: {
        requestedPrimaryId: primaryId,
        requestedSecondaryId: secondaryId,
        weight: 1,
        status: 'secondary_authoritative',
        phraseBars: 8,
        secondaryBars: undefined,
      },
    };
  }
  return {
    ...options,
    songwriterBlendWeight: weight,
    composerProfileBlend: {
      requestedPrimaryId: primaryId,
      requestedSecondaryId: secondaryId,
      weight,
      status: 'phrase_block',
      phraseBars: 8,
    },
  };
}
