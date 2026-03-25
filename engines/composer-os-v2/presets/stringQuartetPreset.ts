/**
 * Composer OS V2 — String Quartet preset (Prompt 6/7 planning mode).
 * Planning via `runStringQuartetMode`; full quartet MusicXML is not implemented yet.
 */

import type { Preset } from './presetTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../core/instrument-profiles/uprightBassProfile';

export const stringQuartetPreset: Preset = {
  id: 'string_quartet',
  name: 'String Quartet',
  /** Representative profiles for manifests until dedicated string profiles land. */
  instrumentProfiles: [CLEAN_ELECTRIC_GUITAR, ACOUSTIC_UPRIGHT_BASS],
  chordSymbolsEnabled: true,
  rehearsalMarksEnabled: true,
  defaultFeel: {
    mode: 'straight',
    intensity: 0.55,
    syncopationDensity: 'medium',
  },
  stringQuartetMetadata: {
    ensembleFamily: 'string_quartet',
    leadSheetChordAware: true,
    rehearsalMarkReady: true,
    sectionPlanReady: true,
  },
};
