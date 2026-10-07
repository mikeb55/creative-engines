/**
 * Dev 3.6 NONE eligibility and Dev 3.7 held-collection floor consistency.
 * The DP and its costs stay Dev 3.5.
 * NONE may govern a contiguous region only when no single registry collection
 * has mean local suitability >= the existing suitability floor on that exact region.
 * A below-floor stretch is a maximal run of at least two sounding events on one
 * registry collection where that collection scores under the floor on every event.
 * That collection is ineligible on the stretch when one other registry collection
 * reaches the floor across the same stretch. One-event dips stay with the DP.
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

export interface HeldRunExclusion {
  start: number;
  end: number;
  eventIndices: readonly number[];
  heldCollectionId: string;
  heldCollectionName: string;
  heldMean: number;
  alternativeId: string;
  alternativeName: string;
  alternativeMean: number;
  iteration: number;
  finalStateId: string;
  finalStateName: string;
}

export interface SurvivingBelowFloorRun {
  start: number;
  end: number;
  eventIndices: readonly number[];
  heldCollectionId: string;
  heldCollectionName: string;
  heldMean: number;
  bestAlternativeId: string | null;
  bestAlternativeName: string | null;
  bestAlternativeMean: number | null;
}

export interface NoneEligibilityReport {
  iterations: number;
  floor: number;
  rejected: NoneEligibilityRejection[];
  surviving: NoneEligibilitySurvival[];
  heldExclusions: HeldRunExclusion[];
  survivingBelowFloor: SurvivingBelowFloorRun[];
}

export interface HeldCollectionFloorOptions {
  /** Default true. False keeps Dev 3.6 NONE eligibility only. */
  heldCollectionFloor?: boolean;
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

interface BelowFloorStretch {
  stateIndex: number;
  start: number;
  end: number;
  eventIndices: number[];
}

/**
 * Maximal contiguous below-floor stretch.
 * An event at or above the floor breaks the stretch.
 * Silence is omitted and does not break a run that keeps the same collection.
 * The span is not chosen by looking for an alternative.
 */
export function belowFloorStretches(
  path: readonly number[],
  events: readonly OptimizerEvent[],
  states: readonly OptimizerState[],
  floor: number
): BelowFloorStretch[] {
  const stretches: BelowFloorStretch[] = [];
  let index = 0;
  while (index < path.length) {
    const event = events[index];
    const stateIndex = path[index] ?? -1;
    if (!event || event.silence || stateIndex < 0 || stateIndex >= states.length) {
      index += 1;
      continue;
    }
    const state = states[stateIndex]!;
    const score = event.localScoreById[state.id];
    if (score === undefined || score >= floor) {
      index += 1;
      continue;
    }
    const eventIndices = [index];
    let cursor = index + 1;
    while (cursor < path.length) {
      const next = events[cursor];
      if (!next || path[cursor] !== stateIndex) break;
      if (next.silence) {
        cursor += 1;
        continue;
      }
      const nextScore = next.localScoreById[state.id];
      if (nextScore === undefined || nextScore >= floor) break;
      eventIndices.push(cursor);
      cursor += 1;
    }
    if (eventIndices.length >= 2) {
      stretches.push({
        stateIndex,
        start: eventIndices[0]!,
        end: eventIndices[eventIndices.length - 1]!,
        eventIndices,
      });
    }
    index = cursor;
  }
  return stretches;
}

function otherRegistryRegionMean(
  states: readonly OptimizerState[],
  events: readonly OptimizerEvent[],
  start: number,
  end: number,
  heldId: string,
  floor: number | null
): NoneRegionMean | null {
  let best: NoneRegionMean | null = null;
  for (const state of states) {
    if (state.id === heldId) continue;
    const mean = registryCollectionRegionMean(events, state, start, end);
    if (mean === null) continue;
    if (floor !== null && mean < floor) continue;
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

function finalStateLabel(
  path: readonly number[],
  states: readonly OptimizerState[],
  eventIndices: readonly number[]
): { id: string; name: string } {
  const names: string[] = [];
  const ids: string[] = [];
  for (const index of eventIndices) {
    const stateIndex = path[index] ?? -1;
    const state = stateIndex >= 0 && stateIndex < states.length ? states[stateIndex] : null;
    const id = state?.id ?? 'NONE';
    const name = state?.name ?? 'NONE';
    if (ids[ids.length - 1] !== id) {
      ids.push(id);
      names.push(name);
    }
  }
  return { id: ids.join(' → '), name: names.join(' → ') };
}

function emptyReport(iterations: number, floor: number, rejected: NoneEligibilityRejection[]): NoneEligibilityReport {
  return { iterations, floor, rejected, surviving: [], heldExclusions: [], survivingBelowFloor: [] };
}

export function optimizePentatonicPathWithNoneEligibility(
  input: OptimizePathInput,
  floor: number = DEFAULT_PENTATONIC_SCORING.minimumSuitability,
  options?: HeldCollectionFloorOptions
): {
  best: PathHypothesis | null;
  alternatives: PathHypothesis[];
  staticBest: { cost: number; stateIndex: number } | null;
  eligibility: NoneEligibilityReport;
} {
  const heldFloorOn = options?.heldCollectionFloor !== false;
  if (!input.allowNone && !heldFloorOn) {
    const optimized = optimizePentatonicPath(input);
    return { ...optimized, eligibility: emptyReport(1, floor, []) };
  }

  const eligibleEvents = input.events.filter((event) => !event.silence).length;
  const stateSlots = input.states.length + (input.allowNone ? 1 : 0);
  const iterationLimit = heldFloorOn ? eligibleEvents * Math.max(stateSlots, 1) + 1 : eligibleEvents + 1;
  const excluded = new Set<number>(input.noneExcludedEventIndices ?? []);
  const excludedStates = new Set<string>(input.excludedStateEvents ?? []);
  const exclusionKeys = new Set<string>();
  for (const index of excluded) exclusionKeys.add(`none:${index}`);
  for (const key of excludedStates) exclusionKeys.add(`state:${key}`);
  const rejected: NoneEligibilityRejection[] = [];
  const heldExclusions: HeldRunExclusion[] = [];
  let iterations = 0;

  while (true) {
    iterations += 1;
    if (iterations > iterationLimit) {
      throw new NoneEligibilityError(
        `Path eligibility exceeded ${iterationLimit} iterations (${eligibleEvents} sounding events × ${stateSlots} states + 1).`
      );
    }
    const optimized = optimizePentatonicPath({
      ...input,
      noneExcludedEventIndices: excluded,
      excludedStateEvents: excludedStates,
    });
    if (!optimized.best) {
      return { ...optimized, eligibility: { ...emptyReport(iterations, floor, rejected), heldExclusions } };
    }
    const none = noneIndex(input.states.length);
    const spans = input.allowNone ? noneSpans(optimized.best.path, none) : [];
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
    const stretches = heldFloorOn
      ? belowFloorStretches(optimized.best.path, input.events, input.states, floor)
      : [];
    const failingStretches: { stretch: BelowFloorStretch; heldMean: number; alternative: NoneRegionMean }[] = [];
    for (const stretch of stretches) {
      const held = input.states[stretch.stateIndex];
      if (!held) continue;
      const heldMean = registryCollectionRegionMean(input.events, held, stretch.start, stretch.end);
      if (heldMean === null) continue;
      const alternative = otherRegistryRegionMean(input.states, input.events, stretch.start, stretch.end, held.id, floor);
      if (!alternative) continue;
      failingStretches.push({ stretch, heldMean, alternative });
    }
    if (failing.length === 0 && failingStretches.length === 0) {
      const survivingBelowFloor: SurvivingBelowFloorRun[] = [];
      for (const stretch of stretches) {
        const held = input.states[stretch.stateIndex];
        if (!held) continue;
        const heldMean = registryCollectionRegionMean(input.events, held, stretch.start, stretch.end);
        if (heldMean === null) continue;
        const best = otherRegistryRegionMean(input.states, input.events, stretch.start, stretch.end, held.id, null);
        survivingBelowFloor.push({
          start: stretch.start,
          end: stretch.end,
          eventIndices: stretch.eventIndices,
          heldCollectionId: held.id,
          heldCollectionName: held.name,
          heldMean,
          bestAlternativeId: best?.collectionId ?? null,
          bestAlternativeName: best?.collectionName ?? null,
          bestAlternativeMean: best?.meanSuitability ?? null,
        });
      }
      const settled = heldExclusions.map((row) => {
        const finalState = finalStateLabel(optimized.best!.path, input.states, row.eventIndices);
        return { ...row, finalStateId: finalState.id, finalStateName: finalState.name };
      });
      return {
        ...optimized,
        eligibility: { iterations, floor, rejected, surviving, heldExclusions: settled, survivingBelowFloor },
      };
    }
    let fresh = 0;
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
        const key = `none:${index}`;
        if (exclusionKeys.has(key)) continue;
        exclusionKeys.add(key);
        excluded.add(index);
        fresh += 1;
      }
    }
    for (const row of failingStretches) {
      heldExclusions.push({
        start: row.stretch.start,
        end: row.stretch.end,
        eventIndices: row.stretch.eventIndices,
        heldCollectionId: input.states[row.stretch.stateIndex]!.id,
        heldCollectionName: input.states[row.stretch.stateIndex]!.name,
        heldMean: row.heldMean,
        alternativeId: row.alternative.collectionId,
        alternativeName: row.alternative.collectionName,
        alternativeMean: row.alternative.meanSuitability,
        iteration: iterations,
        finalStateId: '',
        finalStateName: '',
      });
      for (const index of row.stretch.eventIndices) {
        const key = `state:${row.stretch.stateIndex}:${index}`;
        const stored = `${row.stretch.stateIndex}:${index}`;
        if (exclusionKeys.has(key)) continue;
        exclusionKeys.add(key);
        excludedStates.add(stored);
        fresh += 1;
      }
    }
    if (fresh === 0) {
      throw new NoneEligibilityError(
        `Path eligibility iteration ${iterations} requested no new exclusions. Forbidden set size ${exclusionKeys.size}.`
      );
    }
  }
}
