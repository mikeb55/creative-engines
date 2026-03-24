/**
 * Composer OS V2 — Release Readiness Gate types
 */

/** RRG category. */
export type RrgCategory =
  | 'architecture_discipline'
  | 'runtime_reliability'
  | 'musical_readiness'
  | 'validation_coverage'
  | 'export_interoperability'
  | 'user_friction';

/** Single category score. */
export interface RrgCategoryScore {
  category: RrgCategory;
  score: number; // 0–1
  passed: boolean;
}

/** Release Readiness Gate result. */
export interface ReleaseReadinessResult {
  passed: boolean;
  overall: number; // 0–1
  categories: RrgCategoryScore[];
}

/** Default threshold for release. */
export const RRG_THRESHOLD = 0.85;
