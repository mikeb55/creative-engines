/**
 * Composer OS V2 — ECM Chamber preset
 * Minimal chamber jazz configuration.
 */

import type { Preset } from './presetTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';

export const ecmChamberPreset: Preset = {
  id: 'ecm_chamber',
  name: 'ECM Chamber',
  instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'straight',
    intensity: 0.6,
    syncopationDensity: 'medium',
  },
};
