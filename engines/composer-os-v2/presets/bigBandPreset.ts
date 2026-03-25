/**
 * Composer OS V2 — Big Band preset (Prompt 5/7 planning mode).
 * Planning via `runBigBandMode`; full big-band MusicXML generation is not implemented yet.
 */

import type { Preset } from './presetTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';

export const bigBandPreset: Preset = {
  id: 'big_band',
  name: 'Big Band',
  /** Representative rhythm-section + bass identities for manifests and future voicing work. */
  instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'swing',
    intensity: 0.8,
    syncopationDensity: 'high',
  },
  bigBandMetadata: {
    ensembleFamily: 'big_band',
    leadSheetChordAware: true,
    rehearsalMarkReady: true,
    sectionPlanReady: true,
  },
};
