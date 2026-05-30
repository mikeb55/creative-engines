/**
 * Big Band MusicContext producer types (V104p6).
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type BigBandCompingStyle =
  | 'brass_punch'
  | 'sax_soli'
  | 'shell_voicing'
  | 'freddie_green';

export const BIG_BAND_COMPING_STYLES: readonly BigBandCompingStyle[] = [
  'brass_punch',
  'sax_soli',
  'shell_voicing',
  'freddie_green',
];

/** Preset surface for Big Band MusicContext producer — no feature flag. */
export interface BigBandMusicContextPreset {
  key: PitchClass;
  tempo: number;
  compingStyle: BigBandCompingStyle;
}
