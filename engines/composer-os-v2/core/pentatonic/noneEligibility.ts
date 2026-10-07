/**
 * Dev 3.6 NONE eligibility.
 * The DP and its costs stay Dev 3.5.
 * NONE may govern a contiguous region only when no single registry collection
 * has mean local suitability >= the existing suitability floor on that exact region.
 */

import { DEFAULT_PENTATONIC_SCORING } from './evaluate';
import { optimizePentatonicPath, quantizePathCost, type OptimizePathInput, type OptimizerEvent, type OptimizerState, type PathHypothesis } from './optimizePath';

export interface NoneRegionMean {
  collectionId: string;
  collectionName: string;
  meanSuitability: number;
}

export interface NoneEligibilityRejection {
  start: number;
  end: number;
  collectionId: string;
  collectionName: string;
  meanSuitability: number;
  iteration: number;
}

export interface NoneEligibilitySurvival {
  start: number;
  end: number;
  bestCollectionId: string | null;
  bestCollectionName: string | null;
  meanSuitability: number | null;
}

export interface NoneEligibilityReport {
  iterations: number;
  floor: number;
  rejected: NoneEligibilityRejection[];
  surviving: NoneEligibilitySurvival[];
}

export class NoneEligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoneEligibilityError';
  }
}

function noneIndex(stateCount: number): number {
  return stateCount;
}

function noneSpans(path: readonly number[], none: number): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  let start = 0;
  while (start < path.length) {
    if (path[start] !== none) {
      start += 1;
      continue;
    }
    let end = start;
    while (end + 1 < path.length && path[end + 1] === none) end += 1;
    spans.push({ start, end });
    start = end + 1;
  }
  return spans;
}

/**
 * Arithmetic mean of one collection's existing per-event local suitability
 * across every non-silence event in the span.
 * A collection that is not feasible on any of those events does not cover the span.
 * Silence has no suitability sample. A span with no sounding events has no mean.
 */
export function registryCollectionRegionMean(
  events: readonly OptimizerEvent[],
  state: OptimizerState,
  start: number,
  end: number
): number | null {
  let sum = 0;
  let count = 0;
  for (let index = start; index <= end; index++) {
    const event = events[index];
    if (!event || event.silence) continue;
    if (!event.feasibleStateIds.includes(state.id)) return null;
    const score = event.localScoreById[state.id];
    if (score === undefined) return null;
    sum += score;
    count += 1;
  }
  if (count === 0) return null;
  return quantizePathCost(sum / count);
}

export function bestRegistryRegionMean(
  states: readonly OptimizerState[],
  events: readonly OptimizerEvent[],
  start: number,
  end: number
): NoneRegionMean | null {
  let best: NoneRegionMean | null = null;
  for (const state of states) {
    const mean = registryCollectionRegionMean(events, state, start, end);
    if (mean === null) continue;
    const candidate: NoneRegionMean = { collectionId: state.id, collectionName: state.name, meanSuitability: mean };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.meanSuitability > best.meanSuitability) {
      best = candidate;
      continue;
    }
    if (candidate.meanSuitability === best.meanSuitability && candidate.collectionId.localeCompare(best.collectionId) < 0) {
      best = candidate;
    }
  }
  return best;
}

export function optimizePentatonicPathWithNoneEligibility(
  input: OptimizePathInput,
  floor: number = DEFAULT_PENTATONIC_SCORING.minimumSuitability
): {
  best: PathHypothesis | null;
  alternatives: PathHypothesis[];
  staticBest: { cost: number; stateIndex: number } | null;
  eligibility: NoneEligibilityReport;
} {
  if (!input.allowNone) {
    const optimized = optimizePentatonicPath(input);
    return {
      ...optimized,
      eligibility: { iterations: 1, floor, rejected: [], surviving: [] },
    };
  }

  const eligibleEvents = input.events.filter((event) => !event.silence).length;
  const iterationLimit = eligibleEvents + 1;
  const excluded = new Set<number>(input.noneExcludedEventIndices ?? []);
  const rejected: NoneEligibilityRejection[] = [];
  let iterations = 0;

  while (true) {
    iterations += 1;
    if (iterations > iterationLimit) {
      throw new NoneEligibilityError(
        `NONE eligibility exceeded ${iterationLimit} iterations (${eligibleEvents} eligible events + 1).`
      );
    }
    const optimized = optimizePentatonicPath({ ...input, noneExcludedEventIndices: excluded });
    if (!optimized.best) {
      return { ...optimized, eligibility: { iterations, floor, rejected, surviving: [] } };
    }
    const none = noneIndex(input.states.length);
    const spans = noneSpans(optimized.best.path, none);
    const failing: { start: number; end: number; best: NoneRegionMean }[] = [];
    const surviving: NoneEligibilitySurvival[] = [];
    for (const span of spans) {
      const best = bestRegistryRegionMean(input.states, input.events, span.start, span.end);
      if (best && best.meanSuitability >= floor) {
        failing.push({ ...span, best });
      } else {
        surviving.push({
          start: span.start,
          end: span.end,
          bestCollectionId: best?.collectionId ?? null,
          bestCollectionName: best?.collectionName ?? null,
          meanSuitability: best?.meanSuitability ?? null,
        });
      }
    }
    if (failing.length === 0) {
      return { ...optimized, eligibility: { iterations, floor, rejected, surviving } };
    }
    const fresh: number[] = [];
    for (const span of failing) {
      rejected.push({
        start: span.start,
        end: span.end,
        collectionId: span.best.collectionId,
        collectionName: span.best.collectionName,
        meanSuitability: span.best.meanSuitability,
        iteration: iterations,
      });
      for (let index = span.start; index <= span.end; index++) {
        if (input.events[index]?.silence) continue;
        if (!excluded.has(index)) fresh.push(index);
      }
    }
    if (fresh.length === 0) {
      throw new NoneEligibilityError(
        `NONE eligibility iteration ${iterations} requested no new exclusions. Forbidden set size ${excluded.size}.`
      );
    }
    for (const index of fresh) excluded.add(index);
  }
}
