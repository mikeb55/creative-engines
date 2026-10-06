/**
 * Deterministic path optimizer.
 * Dynamic programming over collection states and NONE.
 * Local suitability is an input. This file does not rescore Dev 1 weights.
 *
 * Tie-break, in order:
 * 1. lower total path cost
 * 2. fewer switches
 * 3. fewer distinct pentatonic resources
 * 4. greater HOME continuity, only when HOME was explicitly supplied
 * 5. canonical HOME relationship order, event by event
 * 6. archetype id
 * 7. canonical pitch-set id (`NONE` sorts after pitch-set ids)
 */

import { HOME_RELATIONSHIPS } from './homeRelationships';
import {
  PENTATONIC_PATH_NONE,
  liquidChangeParts,
  type PentatonicPathConfig,
} from './pathConfig';
import type { PentatonicPathCostBreakdown, PentatonicPathSegment, PentatonicPathSummary } from './pathTypes';

export interface OptimizerState {
  id: string;
  pitchSet: readonly number[] | null;
  archetypeId: string | null;
  referenceNote: string | null;
  homeRelationshipId: string | null;
  homeRelationshipLabel: string | null;
  name: string;
  displaySpelling: readonly string[];
}

export interface OptimizerEvent {
  feasibleStateIds: readonly string[];
  localScoreById: Readonly<Record<string, number>>;
  phraseBoundaryAfter: boolean;
  /** Melody and bass both rest. Continue the previous state. Not a penalty. */
  silence?: boolean;
  /**
   * Sounding melody, bass, and held pitch classes.
   * Used only when `continueWithoutDistinctPcs` is set. Dev 2 leaves this empty.
   */
  soundingPitchClasses?: readonly number[];
}

export interface OptimizePathInput {
  states: readonly OptimizerState[];
  events: readonly OptimizerEvent[];
  config: PentatonicPathConfig;
  allowNone: boolean;
  previousStateId: string | null;
  previousPitchSet: readonly number[] | null;
  homeExplicit: boolean;
  finalHomeBonusEnabled: boolean;
  /**
   * Dev 3 adapter rule. Default off, so Dev 2 paths are unchanged.
   * A bar that sounds none of the pitch classes distinguishing the current
   * collection from the alternative continues the current collection.
   */
  continueWithoutDistinctPcs?: boolean;
  sourceLabels: readonly string[];
  eventIds: readonly string[];
}

export interface PathHypothesis {
  cost: number;
  switches: number;
  distinct: number;
  homeHits: number;
  mask: number;
  run: 1 | 2;
  stateIndex: number;
  path: readonly number[];
  breakdown: PentatonicPathCostBreakdown;
}

const RELATION_RANK = new Map(HOME_RELATIONSHIPS.map((item, index) => [item.id, index]));

export function quantizePathCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function emptyBreakdown(): PentatonicPathCostBreakdown {
  return {
    localMisfit: 0,
    changeCost: 0,
    commonToneDiscount: 0,
    displacementDiscount: 0,
    phraseBoundaryDiscount: 0,
    distinctResourcePenalty: 0,
    shortSegmentPenalty: 0,
    finalHomeBonus: 0,
    total: 0,
  };
}

function distinguishingPcsSound(previous: readonly number[], next: readonly number[], sounding: readonly number[]): boolean {
  const nextSet = new Set(next);
  const previousSet = new Set(previous);
  const heard = new Set(sounding);
  for (const pc of previous) if (!nextSet.has(pc) && heard.has(pc)) return true;
  for (const pc of next) if (!previousSet.has(pc) && heard.has(pc)) return true;
  return false;
}

function noneIndex(stateCount: number): number {
  return stateCount;
}

function stateAt(states: readonly OptimizerState[], index: number | undefined): OptimizerState | null {
  if (index === undefined || index < 0 || index >= states.length) return null;
  return states[index]!;
}

export function comparePathHypotheses(a: PathHypothesis, b: PathHypothesis, states: readonly OptimizerState[], homeExplicit: boolean): number {
  if (a.cost !== b.cost) return a.cost - b.cost;
  if (a.switches !== b.switches) return a.switches - b.switches;
  if (a.distinct !== b.distinct) return a.distinct - b.distinct;
  if (homeExplicit && a.homeHits !== b.homeHits) return b.homeHits - a.homeHits;
  const limit = Math.max(a.path.length, b.path.length);
  for (let index = 0; index < limit; index++) {
    const aState = stateAt(states, a.path[index]);
    const bState = stateAt(states, b.path[index]);
    const aRel = aState?.homeRelationshipId ? RELATION_RANK.get(aState.homeRelationshipId) ?? 50 : 99;
    const bRel = bState?.homeRelationshipId ? RELATION_RANK.get(bState.homeRelationshipId) ?? 50 : 99;
    if (aRel !== bRel) return aRel - bRel;
    const archetype = (aState?.archetypeId ?? '').localeCompare(bState?.archetypeId ?? '');
    if (archetype !== 0) return archetype;
    const pitch = (aState?.id ?? PENTATONIC_PATH_NONE).localeCompare(bState?.id ?? PENTATONIC_PATH_NONE);
    if (pitch !== 0) return pitch;
  }
  return 0;
}

function compressedKey(path: readonly number[]): string {
  const parts: string[] = [];
  for (const state of path) {
    const token = String(state);
    if (parts[parts.length - 1] !== token) parts.push(token);
  }
  return parts.join('>');
}

interface PathCell {
  stateIndex: number;
  prev: PathCell | null;
}

interface LiveHypothesis {
  cost: number;
  switches: number;
  distinct: number;
  homeHits: number;
  mask: number;
  run: 1 | 2;
  stateIndex: number;
  pathLength: number;
  cell: PathCell | null;
  breakdown: PentatonicPathCostBreakdown;
}

function pathFromCell(cell: PathCell | null): number[] {
  const out: number[] = [];
  let cursor = cell;
  while (cursor) {
    out.push(cursor.stateIndex);
    cursor = cursor.prev;
  }
  out.reverse();
  return out;
}

function hypothesisFromLive(hyp: LiveHypothesis): PathHypothesis {
  return {
    cost: hyp.cost,
    switches: hyp.switches,
    distinct: hyp.distinct,
    homeHits: hyp.homeHits,
    mask: hyp.mask,
    run: hyp.run,
    stateIndex: hyp.stateIndex,
    path: pathFromCell(hyp.cell),
    breakdown: hyp.breakdown,
  };
}

export function optimizePentatonicPath(input: OptimizePathInput): {
  best: PathHypothesis | null;
  alternatives: PathHypothesis[];
  staticBest: { cost: number; stateIndex: number } | null;
} {
  const stateCount = input.states.length;
  const none = noneIndex(stateCount);
  const indexById = new Map(input.states.map((state, index) => [state.id, index]));
  const previousIndex = input.previousStateId != null ? indexById.get(input.previousStateId) ?? -1 : -1;
  const start: LiveHypothesis = {
    cost: 0,
    switches: 0,
    distinct: 0,
    homeHits: 0,
    mask: 0,
    run: 2,
    stateIndex: previousIndex,
    pathLength: 0,
    cell: null,
    breakdown: emptyBreakdown(),
  };
  const liquidCache = new Map<string, ReturnType<typeof liquidChangeParts>>();
  const liquidBetween = (changed: boolean, previous: readonly number[] | null, next: readonly number[] | null, phraseBoundary: boolean) => {
    if (!changed) {
      return liquidChangeParts({ changed: false, previous, next, phraseBoundary, config: input.config });
    }
    const key = `${previous?.join(',') ?? 'x'}>${next?.join(',') ?? 'x'}>${phraseBoundary ? 1 : 0}`;
    const cached = liquidCache.get(key);
    if (cached) return cached;
    const built = liquidChangeParts({ changed: true, previous, next, phraseBoundary, config: input.config });
    liquidCache.set(key, built);
    return built;
  };

  const compareLive = (left: LiveHypothesis, right: LiveHypothesis): number => {
    if (left.cost !== right.cost) return left.cost - right.cost;
    if (left.switches !== right.switches) return left.switches - right.switches;
    if (left.distinct !== right.distinct) return left.distinct - right.distinct;
    if (input.homeExplicit && left.homeHits !== right.homeHits) return right.homeHits - left.homeHits;
    return comparePathHypotheses(hypothesisFromLive(left), hypothesisFromLive(right), input.states, input.homeExplicit);
  };

  let frontier: LiveHypothesis[] = [start];

  for (let eventIndex = 0; eventIndex < input.events.length; eventIndex++) {
    const event = input.events[eventIndex]!;
    const next = new Map<string, LiveHypothesis[]>();
    const baseLegal: number[] = [];
    if (!event.silence) {
      for (const id of event.feasibleStateIds) {
        const index = indexById.get(id);
        if (index !== undefined) baseLegal.push(index);
      }
      if (input.allowNone) baseLegal.push(none);
    }
    const phraseBoundary = eventIndex > 0 && input.events[eventIndex - 1]!.phraseBoundaryAfter;

    for (const hyp of frontier) {
      const previousState = stateAt(input.states, hyp.stateIndex);
      const legal = event.silence ? [hyp.stateIndex >= 0 ? hyp.stateIndex : none] : baseLegal;
      for (const stateIndex of legal) {
        const state = stateAt(input.states, stateIndex);
        const localScore = state ? event.localScoreById[state.id] ?? 0 : null;
        const localMisfit = event.silence ? 0 : state ? 1 - (localScore ?? 0) : input.config.noneBaselineCost;
        const hasPrevious = hyp.pathLength > 0 || (hyp.pathLength === 0 && input.previousStateId != null && hyp.stateIndex >= 0);
        const changed = !event.silence && hasPrevious && hyp.stateIndex !== stateIndex;
        const previousPcs = previousState?.pitchSet ?? (hyp.pathLength === 0 ? input.previousPitchSet : null);
        if (
          input.continueWithoutDistinctPcs &&
          changed &&
          previousPcs &&
          previousPcs.length > 0 &&
          state?.pitchSet &&
          state.pitchSet.length > 0 &&
          !distinguishingPcsSound(previousPcs, state.pitchSet, event.soundingPitchClasses ?? [])
        ) {
          continue;
        }
        const liquid = liquidBetween(changed, previousPcs, state?.pitchSet ?? null, phraseBoundary);
        const leavingNone = hyp.stateIndex === none;
        const shortSegmentPenalty =
          changed && hyp.pathLength > 0 && hyp.run === 1 && !leavingNone ? input.config.shortSegmentPenalty : 0;
        let mask = hyp.mask;
        let distinct = hyp.distinct;
        let distinctPenalty = 0;
        if (state) {
          const bit = 1 << stateIndex;
          if ((mask & bit) === 0) {
            if (distinct >= 1) distinctPenalty = input.config.distinctResourcePenalty;
            mask |= bit;
            distinct += 1;
          }
        }
        const homeBonus =
          input.finalHomeBonusEnabled && eventIndex === input.events.length - 1 && state?.homeRelationshipId === 'home'
            ? input.config.finalHomeBonus
            : 0;
        const step = localMisfit + liquid.net + shortSegmentPenalty + distinctPenalty - homeBonus;
        const cost = quantizePathCost(hyp.cost + step);
        let run: 1 | 2 = changed || hyp.pathLength === 0 ? 1 : 2;
        if (!changed && hyp.pathLength > 0) run = 2;
        if (!changed && hyp.pathLength === 0 && hasPrevious) run = 2;
        const candidate: LiveHypothesis = {
          cost,
          switches: hyp.switches + (changed ? 1 : 0),
          distinct,
          homeHits: hyp.homeHits + (state?.homeRelationshipId === 'home' ? 1 : 0),
          mask,
          run,
          stateIndex,
          pathLength: hyp.pathLength + 1,
          cell: { stateIndex, prev: hyp.cell },
          breakdown: {
            localMisfit: quantizePathCost(hyp.breakdown.localMisfit + localMisfit),
            changeCost: quantizePathCost(hyp.breakdown.changeCost + liquid.gross),
            commonToneDiscount: quantizePathCost(hyp.breakdown.commonToneDiscount + liquid.commonToneDiscount),
            displacementDiscount: quantizePathCost(hyp.breakdown.displacementDiscount + liquid.displacementDiscount),
            phraseBoundaryDiscount: quantizePathCost(hyp.breakdown.phraseBoundaryDiscount + liquid.phraseBoundaryDiscount),
            distinctResourcePenalty: quantizePathCost(hyp.breakdown.distinctResourcePenalty + distinctPenalty),
            shortSegmentPenalty: quantizePathCost(hyp.breakdown.shortSegmentPenalty + shortSegmentPenalty),
            finalHomeBonus: quantizePathCost(hyp.breakdown.finalHomeBonus + homeBonus),
            total: cost,
          },
        };
        const key = `${stateIndex}|${mask}|${run}`;
        const bucket = next.get(key) ?? [];
        bucket.push(candidate);
        bucket.sort(compareLive);
        next.set(key, bucket.slice(0, 1));
      }
    }
    frontier = [...next.values()].flat();
  }

  if (frontier.length === 0) return { best: null, alternatives: [], staticBest: null };
  const ranked = [...frontier].sort(compareLive).map(hypothesisFromLive);
  const best = ranked[0]!;
  const seen = new Set<string>([compressedKey(best.path)]);
  const alternatives: PathHypothesis[] = [];
  for (const hyp of ranked.slice(1)) {
    if (hyp.cost > quantizePathCost(best.cost + input.config.alternativePathWindow)) continue;
    const key = compressedKey(hyp.path);
    if (seen.has(key)) continue;
    seen.add(key);
    alternatives.push(hyp);
    if (alternatives.length === 2) break;
  }

  let staticBest: { cost: number; stateIndex: number } | null = null;
  const staticCandidates = [...input.states.map((_, index) => index), ...(input.allowNone ? [none] : [])];
  for (const stateIndex of staticCandidates) {
    let cost = 0;
    let legal = true;
    for (const event of input.events) {
      if (event.silence) continue;
      if (stateIndex === none) {
        cost += input.config.noneBaselineCost;
        continue;
      }
      const state = input.states[stateIndex]!;
      if (!event.feasibleStateIds.includes(state.id)) {
        legal = false;
        break;
      }
      cost += 1 - (event.localScoreById[state.id] ?? 0);
    }
    if (!legal) continue;
    const last = stateAt(input.states, stateIndex);
    if (input.finalHomeBonusEnabled && last?.homeRelationshipId === 'home') cost -= input.config.finalHomeBonus;
    cost = quantizePathCost(cost);
    if (!staticBest || cost < staticBest.cost) staticBest = { cost, stateIndex };
  }

  return { best, alternatives, staticBest };
}

export function summarizeOptimizedPath(
  hyp: PathHypothesis,
  states: readonly OptimizerState[],
  sourceLabels: readonly string[],
  eventIds: readonly string[],
  localScores: readonly (number | null)[]
): PentatonicPathSummary {
  const chosenIds = hyp.path.map((index) => stateAt(states, index)?.id ?? PENTATONIC_PATH_NONE);
  const segments: PentatonicPathSegment[] = [];
  let start = 0;
  while (start < chosenIds.length) {
    let end = start;
    while (end + 1 < chosenIds.length && chosenIds[end + 1] === chosenIds[start]) end += 1;
    const state = stateAt(states, hyp.path[start]);
    const previous = start === 0 ? null : stateAt(states, hyp.path[start - 1]);
    const scores = localScores.slice(start, end + 1).filter((score): score is number => score !== null);
    const shared =
      state?.pitchSet && previous?.pitchSet ? state.pitchSet.filter((pc) => previous.pitchSet!.includes(pc)) : [];
    segments.push({
      firstSourceLabel: sourceLabels[start] ?? '',
      lastSourceLabel: sourceLabels[end] ?? '',
      eventIds: eventIds.slice(start, end + 1),
      chosenId: state?.id ?? PENTATONIC_PATH_NONE,
      chosenName: state?.name ?? 'NONE',
      archetypeId: state?.archetypeId ?? null,
      referenceNote: state?.referenceNote ?? null,
      canonicalPitchSet: state?.pitchSet ?? null,
      displaySpelling: state?.displaySpelling ?? [],
      homeRelationshipId: state?.homeRelationshipId ?? null,
      homeRelationshipLabel: state?.homeRelationshipLabel ?? null,
      meanLocalFit: scores.length === 0 ? null : quantizePathCost(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      sharedPitchClassesWithPrevious: shared.map((pc) => String(pc)),
      reason:
        start === 0
          ? 'Opening region.'
          : 'Region changed because the added local fit paid the continuity cost.',
    });
    start = end + 1;
  }
  const noneEventCount = chosenIds.filter((id) => id === PENTATONIC_PATH_NONE).length;
  return {
    eventIds,
    chosenIds,
    segments,
    switchCount: hyp.switches,
    distinctResources: hyp.distinct,
    noneEventCount,
    noneSegmentCount: segments.filter((segment) => segment.chosenId === PENTATONIC_PATH_NONE).length,
    totalCost: hyp.cost,
    costBreakdown: hyp.breakdown,
    homeContinuity: hyp.homeHits,
  };
}
