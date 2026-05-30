/**
 * ECM chamber MusicContext preset types (V101).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type EcmChamberTexture = 'sparse' | 'resonant' | 'suspended';

export type EcmChamberVoicing = 'close' | 'open' | 'mixed';

/** Preset surface for ECM chamber MusicContext producer — no DuoLock required. */
export interface EcmChamberPreset {
  key: PitchClass;
  tempo: number;
  texture: EcmChamberTexture;
  voicing: EcmChamberVoicing;
}
