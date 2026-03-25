/**
 * Forgiving chord text input → structured plans for multiple modes.
 */

import type { ChordSymbolPlan } from '../compositionContext';

/** One section block from line-oriented input (e.g. [VERSE] or SECTION: A). */
export interface ChordInputSectionBlock {
  label: string;
  /** Raw chord tokens in bar order (one primary chord per bar when flattened). */
  bars: string[];
}

export interface ParsedChordInputPlan {
  sections: ChordInputSectionBlock[];
  /** Flattened bars in order (for duo-style 8-bar windows). */
  allBars: string[];
  totalBars: number;
}

/** Engine-ready scaffold aligned with `ChordSymbolPlan` segments. */
export interface HarmonyScaffoldFromChordInput {
  chordSymbolPlan: ChordSymbolPlan;
  sectionRanges: Array<{ label: string; startBar: number; endBar: number }>;
}
