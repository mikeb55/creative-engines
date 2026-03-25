/**
 * Named preset library — thin aliases over existing base presets (no duplicate engine presets).
 */

import type { AppStyleStack, EcmChamberMode } from '../../app-api/appApiTypes';
import type { BigBandComposerId, BigBandEraId } from '../big-band/bigBandResearchTypes';

export type NamedPresetId =
  | 'orbit_ecm'
  | 'ecm_song'
  | 'guitar_bass_recording'
  | 'big_band_swing'
  | 'big_band_bebop'
  | 'quartet_lyrical'
  | 'bacharach_song'
  | 'songwriter_classic';

export type BaseAppPresetId =
  | 'guitar_bass_duo'
  | 'ecm_chamber'
  | 'song_mode'
  | 'big_band'
  | 'string_quartet';

/** Default seed behaviour hint for UI (not enforced by engine). */
export type SeedBehaviourHint = 'any' | 'prefer_prime' | 'offset_for_variation';

export interface NamedPresetDefinition {
  id: NamedPresetId;
  displayName: string;
  description: string;
  basePresetId: BaseAppPresetId;
  defaultStyleStack: AppStyleStack;
  ecmMode?: EcmChamberMode;
  bigBandEra?: BigBandEraId;
  bigBandComposer?: BigBandComposerId | null;
  /** Song Mode primary songwriter style key when base is song_mode. */
  primarySongwriterStyle?: string;
  seedBehaviourHint: SeedBehaviourHint;
  /** Suggested seed offset when generating variants (informational). */
  suggestedSeedStep: number;
  /** Matches `PRESET_OUTPUT_SUBFOLDER` for the base preset. */
  outputFolderHint: string;
}
