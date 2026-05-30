/**
 * New Orleans / funk MusicContext producer types (V104p6).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type NewOrleansCompingStyle =
  | 'second_line'
  | 'anticipation_bass'
  | 'brass_punch_offbeat';

export const NEW_ORLEANS_COMPING_STYLES: readonly NewOrleansCompingStyle[] = [
  'second_line',
  'anticipation_bass',
  'brass_punch_offbeat',
];

/** Preset surface for New Orleans MusicContext producer — no feature flag. */
export interface NewOrleansMusicContextPreset {
  key: PitchClass;
  tempo: number;
  compingStyle: NewOrleansCompingStyle;
}
