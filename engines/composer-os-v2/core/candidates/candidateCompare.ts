/**
 * Pick best and second-best from ranked candidates.
 */

import type { CandidateEntry, CandidateRankResult } from './candidateTypes';
import { rankCandidates } from './candidateRanker';

export function pickBestTwo(entries: CandidateEntry[]): CandidateRankResult {
  const ranked = rankCandidates(entries);
  return {
    ranked,
    best: ranked[0] ?? null,
    secondBest: ranked[1] ?? null,
  };
}

export function describeCandidateCompare(result: CandidateRankResult): string {
  if (!result.best) return 'No successful candidates';
  const b = result.best;
  const s = result.secondBest;
  if (!s) return `Best: seed ${b.seed} (score ${b.score.toFixed(3)})`;
  return `Best: seed ${b.seed} (${b.score.toFixed(3)}) · Runner-up: seed ${s.seed} (${s.score.toFixed(3)})`;
}
