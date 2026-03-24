/**
 * Composer OS V2 — Harmony types
 * Shared data model for chord progressions and harmony.
 */

import type { BarIndex } from './primitiveTypes';

/** Standard chord symbol (e.g. Cm7, G7alt, Fmaj7). */
export type ChordSymbol = string;

/** One chord segment over bars. */
export interface ChordSegment {
  chord: ChordSymbol;
  bars: number;
}

/** Harmony plan for the composition. */
export interface HarmonyPlan {
  segments: ChordSegment[];
  totalBars: number;
  key?: string;
}
