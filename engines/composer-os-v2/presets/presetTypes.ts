/**
 * Composer OS V2 — Preset types
 */

import type { InstrumentProfile } from '../core/instrument-profiles/instrumentProfileTypes';
import type { BigBandComposerId, BigBandEraId } from '../core/big-band/bigBandResearchTypes';
import type { FeelConfig } from '../core/rhythm-engine/rhythmTypes';

/** Big Band — planning metadata (Prompt 5/7); not used by golden path. */
export interface BigBandPresetMetadata {
  ensembleFamily: 'big_band';
  leadSheetChordAware: true;
  rehearsalMarkReady: true;
  sectionPlanReady: true;
  /** Default era for planning (Prompt 5.6/7). */
  defaultEra: BigBandEraId;
  supportedEras: readonly BigBandEraId[];
  supportedComposerStyles: readonly BigBandComposerId[];
}

/** String quartet — planning metadata (Prompt 6/7); not used by golden path. */
export interface StringQuartetPresetMetadata {
  ensembleFamily: 'string_quartet';
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
  /** Present on `string_quartet` — declarative planning flags. */
  stringQuartetMetadata?: StringQuartetPresetMetadata;
}
