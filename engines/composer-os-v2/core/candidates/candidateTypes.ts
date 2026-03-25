/**
 * Lightweight candidate generation (A/B) — same mode, seed offsets.
 */

import type { GenerateRequest } from '../../app-api/appApiTypes';
import type { GenerateResult } from '../../app-api/generateComposition';

export interface CandidateEntry {
  index: number;
  seed: number;
  score: number;
  success: boolean;
  result: GenerateResult;
}

export interface CandidateRankResult {
  ranked: CandidateEntry[];
  best: CandidateEntry | null;
  secondBest: CandidateEntry | null;
}

export interface GenerateCompositionCandidatesOptions {
  /** How many runs (default 3). */
  count?: number;
  /** Added to seed for each candidate after the first. */
  seedStep?: number;
}

export type CandidateGenerateFn = (req: GenerateRequest, outputDir: string) => GenerateResult;
