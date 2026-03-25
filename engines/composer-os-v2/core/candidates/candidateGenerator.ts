/**
 * Generate multiple composition candidates (Duo / ECM) with seed offsets.
 */

import type { GenerateRequest } from '../../app-api/appApiTypes';
import type { GenerateResult } from '../../app-api/generateComposition';
import type { CandidateEntry, CandidateRankResult, CandidateGenerateFn } from './candidateTypes';
import { pickBestTwo } from './candidateCompare';
import { scoreGenerateResult } from './candidateRanker';

const DEFAULT_COUNT = 3;
const DEFAULT_STEP = 7919;

export function generateCompositionCandidates(
  baseRequest: GenerateRequest,
  outputDir: string,
  generateFn: CandidateGenerateFn,
  opts?: { count?: number; seedStep?: number }
): CandidateRankResult {
  const count = opts?.count ?? DEFAULT_COUNT;
  const step = opts?.seedStep ?? DEFAULT_STEP;
  const entries: CandidateEntry[] = [];
  for (let i = 0; i < count; i++) {
    const seed = baseRequest.seed + i * step;
    const req: GenerateRequest = { ...baseRequest, seed };
    const result = generateFn(req, outputDir);
    entries.push({
      index: i,
      seed,
      score: scoreGenerateResult(result),
      success: result.success,
      result,
    });
  }
  return pickBestTwo(entries);
}

export function summarizeCandidateResults(result: CandidateRankResult): {
  bestSeed: number | null;
  secondSeed: number | null;
} {
  return {
    bestSeed: result.best?.success ? result.best.seed : null,
    secondSeed: result.secondBest?.success ? result.secondBest.seed : null,
  };
}

export function filterSuccessfulCandidates(entries: CandidateEntry[]): CandidateEntry[] {
  return entries.filter((e) => e.success && e.score >= 0);
}
