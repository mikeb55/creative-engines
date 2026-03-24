/**
 * Composer OS V2 — Density types
 * Shared data model for texture density.
 */

import type { BarIndex } from './primitiveTypes';

/** Density level: events per bar, texture thickness. */
export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'very_dense';

/** One segment of the density curve. */
export interface DensitySegment {
  startBar: BarIndex;
  length: number;
  level: DensityLevel;
}

/** Density curve across the composition. */
export interface DensityCurve {
  segments: DensitySegment[];
  totalBars: number;
}
