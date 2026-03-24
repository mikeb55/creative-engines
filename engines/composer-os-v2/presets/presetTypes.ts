/**
 * Composer OS V2 — Preset types
 */

import type { InstrumentProfile } from '../core/instrument-profiles/instrumentProfileTypes';
import type { FeelConfig } from '../core/rhythm-engine/rhythmTypes';

/** Preset definition. */
export interface Preset {
  id: string;
  name: string;
  instrumentProfiles: InstrumentProfile[];
  chordSymbolsEnabled: boolean;
  rehearsalMarksEnabled: boolean;
  defaultFeel: FeelConfig;
}
