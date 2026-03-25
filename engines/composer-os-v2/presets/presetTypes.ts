/**
 * Composer OS V2 — Preset types
 */

import type { InstrumentProfile } from '../core/instrument-profiles/instrumentProfileTypes';
import type { FeelConfig } from '../core/rhythm-engine/rhythmTypes';

/** Big Band — planning metadata (Prompt 5/7); not used by golden path. */
export interface BigBandPresetMetadata {
  ensembleFamily: 'big_band';
  leadSheetChordAware: true;
  rehearsalMarkReady: true;
  sectionPlanReady: true;
}

/** Preset definition. */
export interface Preset {
  id: string;
  name: string;
  instrumentProfiles: InstrumentProfile[];
  chordSymbolsEnabled: boolean;
  rehearsalMarksEnabled: boolean;
  defaultFeel: FeelConfig;
  /** Present on `big_band` — declarative planning flags. */
  bigBandMetadata?: BigBandPresetMetadata;
}
