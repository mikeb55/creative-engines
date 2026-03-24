/**
 * Composer OS V2 — Release Readiness Gate scorer
 */

import type { ReleaseReadinessResult, RrgCategory, RrgCategoryScore } from './readinessTypes';
import { RRG_THRESHOLD } from './readinessTypes';

const CATEGORIES: RrgCategory[] = [
  'architecture_discipline',
  'runtime_reliability',
  'musical_readiness',
  'validation_coverage',
  'export_interoperability',
  'user_friction',
];

/** Stub: score release readiness. Returns typed result. */
export function computeReleaseReadiness(input: {
  validationPassed: boolean;
  exportValid: boolean;
  mxValid?: boolean;
}): ReleaseReadinessResult {
  const baseScore = input.validationPassed && input.exportValid ? 0.9 : 0.5;
  const scores: RrgCategoryScore[] = CATEGORIES.map((cat) => {
    let score = baseScore;
    if (cat === 'validation_coverage') score = input.validationPassed ? 0.9 : 0.5;
    if (cat === 'export_interoperability') score = input.exportValid ? 0.9 : 0.5;
    if (cat === 'architecture_discipline') score = 0.9;
    return { category: cat, score, passed: score >= RRG_THRESHOLD };
  });

  const overall = scores.reduce((a, c) => a + c.score, 0) / scores.length;
  const passed = scores.every((c) => c.passed) && overall >= RRG_THRESHOLD;

  return { passed, overall, categories: scores };
}
