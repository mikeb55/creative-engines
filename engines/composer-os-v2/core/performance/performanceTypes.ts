/**
 * Composer OS V2 — Performance pass types
 */

export type ArticulationHint = 'staccato' | 'tenuto' | 'accent';

export interface PerformancePassOptions {
  /** Max absolute change to startBeat (beats). */
  rhythmTolerance?: number;
  /** Max relative change to duration. */
  durationTolerance?: number;
  /** Apply light articulation based on density. */
  applyArticulation?: boolean;
}

export const DEFAULT_PERFORMANCE_OPTIONS: Required<PerformancePassOptions> = {
  rhythmTolerance: 0.125,
  durationTolerance: 0.1,
  applyArticulation: true,
};
