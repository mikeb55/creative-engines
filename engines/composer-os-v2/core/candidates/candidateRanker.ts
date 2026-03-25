/**
 * Rank candidates using readiness + gate booleans (lightweight).
 */

import type { GenerateResult } from '../../app-api/generateComposition';
import type { CandidateEntry } from './candidateTypes';

export function scoreGenerateResult(r: GenerateResult): number {
  if (!r.success) return -1;
  const v = r.validation;
  let s = v.readiness.release + v.readiness.mx;
  if (v.integrityPassed) s += 0.15;
  if (v.behaviourGatesPassed) s += 0.1;
  if (v.mxValidationPassed) s += 0.05;
  if (v.strictBarMathPassed) s += 0.05;
  return s;
}

export function rankCandidates(entries: CandidateEntry[]): CandidateEntry[] {
  return [...entries].sort((a, b) => b.score - a.score);
}
