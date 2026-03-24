/**
 * Composer OS V2 — Density curve types
 */

export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'very_dense';

export interface DensitySegment {
  startBar: number;
  length: number;
  level: DensityLevel;
}

export interface DensityCurvePlan {
  segments: DensitySegment[];
  totalBars: number;
}
