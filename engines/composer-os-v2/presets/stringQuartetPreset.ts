/**
 * Composer OS V2 — String Quartet preset (Prompt 6/7 planning mode).
 * Planning via `runStringQuartetMode`; full quartet MusicXML is not implemented yet.
 */

import type { Preset } from './presetTypes';
import {
  STRING_QUARTET_CELLO,
  STRING_QUARTET_VIOLA,
  STRING_QUARTET_VIOLIN_I,
  STRING_QUARTET_VIOLIN_II,
} from '../core/instrument-profiles/stringQuartetInstrumentProfiles';

export const stringQuartetPreset: Preset = {
  id: 'string_quartet',
  name: 'String Quartet',
  /** Violin / viola / cello profiles — GM 40–42; ranges align with {@link QUARTET_MIDI_BOUNDS}. */
  instrumentProfiles: [
    STRING_QUARTET_VIOLIN_I,
    STRING_QUARTET_VIOLIN_II,
    STRING_QUARTET_VIOLA,
    STRING_QUARTET_CELLO,
  ],
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
