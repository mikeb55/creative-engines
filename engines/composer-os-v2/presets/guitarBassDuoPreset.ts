/**
 * Composer OS V2 — Guitar/Bass Duo preset
 * Default: Clean Electric Guitar + Acoustic/Upright Bass
 */

import type { Preset } from './presetTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';

export const guitarBassDuoPreset: Preset = {
  id: 'guitar_bass_duo',
  name: 'Guitar/Bass Duo',
  instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'swing',
    intensity: 0.7,
    syncopationDensity: 'medium',
  },
};
