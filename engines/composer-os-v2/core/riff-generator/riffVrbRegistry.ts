/**
 * Riff Generator — canonical VRB ids, family tags, profile completeness (Commit 10 wiring).
 */

import { getVoiceRuleBundle } from '../composer/voiceRuleBundles';
import type { RiffProfile } from '../composer/riffProfileTypes';
import type { RiffMusicalityFamily } from './riffMusicalityGate';

export type RiffFamilyTag = 'funk' | 'rock' | 'fusion' | 'art_rock';

/** All riff-generator VRBs with non-empty `riffProfile` on the registry. */
export const RIFF_GENERATOR_VRB_IDS = [
  'james_brown',
  'nile_rodgers',
  'sly_stone',
  'iommi',
  'hendrix',
  'led_zeppelin',
  'weather_report',
  'mahavishnu',
  'verlaine',
  'morello',
  'fripp',
] as const;

export type RiffGeneratorVrbId = (typeof RIFF_GENERATOR_VRB_IDS)[number];

export const RIFF_VRB_EXPECTED_FAMILY: Record<RiffGeneratorVrbId, RiffFamilyTag> = {
  james_brown: 'funk',
  nile_rodgers: 'funk',
  sly_stone: 'funk',
  iommi: 'rock',
  hendrix: 'rock',
  led_zeppelin: 'rock',
  weather_report: 'fusion',
  mahavishnu: 'fusion',
  verlaine: 'art_rock',
  morello: 'art_rock',
  fripp: 'art_rock',
};

/**
 * Locked σ ceilings on riff stub bundles (`riffVrbStubs.ts` + registry).
 * `james_brown` songwriter bundle has no `sigma` field — unchanged by riff wiring.
 */
export const RIFF_VRB_SIGMA_CEILINGS: Partial<Record<RiffGeneratorVrbId, number>> = {
  nile_rodgers: 22,
  sly_stone: 24,
  iommi: 26,
  hendrix: 28,
  led_zeppelin: 27,
  weather_report: 30,
  mahavishnu: 32,
  verlaine: 25,
  morello: 25,
  fripp: 27,
};

export function isRiffGeneratorVrbId(id: string): id is RiffGeneratorVrbId {
  return (RIFF_GENERATOR_VRB_IDS as readonly string[]).includes(id);
}

export function resolveRiffFamilyTag(vrbId: string): RiffFamilyTag | null {
  const bundle = getVoiceRuleBundle(vrbId);
  const f = bundle.family;
  if (f === 'funk' || f === 'rock' || f === 'fusion' || f === 'art_rock') return f;
  return null;
}

export function riffFamilyAllowsOddMeterOverlay(family: RiffFamilyTag | null | undefined): boolean {
  return family === 'fusion' || family === 'art_rock';
}

export function riffProfileIsComplete(profile: RiffProfile | undefined): boolean {
  if (!profile) return false;
  if (!profile.meterPolicy) return false;
  if (profile.subdivisionGrid !== 8 && profile.subdivisionGrid !== 16) return false;
  if (!profile.silencePolicy?.styleClass?.trim()) return false;
  if (!profile.accentTopology?.length) return false;
  if (!profile.repetitionPolicy) return false;
  return true;
}

/** True when profile came from {@link defaultRiffProfileForGenerator} (neutral path). */
export function isNeutralRiffGeneratorFallback(profile: RiffProfile): boolean {
  return profile.silencePolicy.styleClass.startsWith('riff_generator:');
}

export function riffMusicalityFamilyFromRiffTag(family: RiffFamilyTag): RiffMusicalityFamily {
  return family;
}
