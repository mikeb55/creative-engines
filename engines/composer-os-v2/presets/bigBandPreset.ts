/**
 * Composer OS V2 — Big Band preset
 * Placeholder for future big band instrument set.
 */

import type { Preset } from './presetTypes';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';

export const bigBandPreset: Preset = {
  id: 'big_band',
  name: 'Big Band',
  instrumentProfiles: [ACOUSTIC_UPRIGHT_BASS], // Minimal: bass only for now
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'swing',
    intensity: 0.8,
    syncopationDensity: 'high',
  },
};
