/**
 * Colour path search for the 20 registered pentatonic collections.
 * Reads `colourRegistry` intervals. Does not insert those ids into `PENTATONIC_ARCHETYPES`.
 * Does not call `recommendPentatonicPath` or `generatePentatonicCandidates`.
 * Transition money uses `liquidChangeParts` and `DEFAULT_PENTATONIC_PATH_CONFIG`.
 */

import { getPentatonicColourResource, listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from './colourRegistry';
import {
  DEFAULT_PENTATONIC_PATH_CONFIG,
  PENTATONIC_PATH_ENGINE_VERSION,
  PENTATONIC_PATH_NONE,
  liquidChangeParts,
  pathConfigurationId,
} from './pathConfig';
import { quantizePathCost } from './optimizePath';
import { PENTATONIC_NOTE_CHOICES, canonicalPitchSet, canonicalPitchSetId, mod12, parseNoteToken, spellFromReference } from './pitch';
import { PENTATONIC_REGISTRY_VERSION } from './registry';
import { PENTATONIC_EVALUATOR_VERSION, DEFAULT_PENTATONIC_SCORING } from './evaluate';
import { PENTATONIC_RELATIONSHIP_SCORING_VERSION } from './relationshipScoring';
import type { PentatonicEngineResult, PentatonicRecommendation, PentatonicRegionInput } from './types';
import type { PentatonicPassage, PentatonicPathCostBreakdown, PentatonicPathEventDecision, PentatonicPathResult } from './pathTypes';

export const PENTATONIC_COLOUR_PATH_VERSION = 'pentatonic-colour-path-2b.2';

const CENTRES = PENTATONIC_NOTE_CHOICES;
/** Collection steps include the start. Search will not build a longer walk. */
export const COLOUR_ROUTE_STEP_BOUND = 8;
export const COLOUR_ROUTE_BEAM_WIDTH = 48;
export const COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS = 1;
const COLOUR_ROUTE_CANDIDATE_LIMIT = 4;

/**
 * The old 0.45 figure is two copies of one clipped leg, not a family of different musical costs.
 * changeFloor = 0.5 × 0.35 = 0.175.
 * Four shared pitch classes give continuity 0.8.
 * Common-tone discount is min(0.15, 0.12) = 0.12. Displacement discount can reach 0.08.
 * Discounted change = 0.35 − 0.12 − 0.08 = 0.15, which is below the floor, so liquid.net stays 0.175.
 * The extra continuity term (1 − 0.8) × 0.25 = 0.05. Each such leg scores 0.225.
 * The fixed skeleton added the departure leg and the return leg: 0.225 + 0.225 = 0.45.
 * Every 4-pc move that the floor clips shares that leg score. Seed order splits the tie.
 * It does not rank those moves by colour id.
 */
export const COLOUR_ROUTE_PLATEAU_NOTE =
  'Four-common-tone moves clip to liquid.net 0.175 plus (1-0.8)*0.25 = 0.05, so each leg is 0.225. Two legs sum to 0.45. The floor erases further discount. Equal legs stay tied.';

export interface ColourPathInstance {
  id: string;
  resourceId: string;
  displayName: string;
  centre: string;
  centrePc: number;
  intervals: readonly number[];
  /** Interval order from the reference. Not sorted. */
  orderedPitchClasses: readonly number[];
  canonicalPitchClasses: readonly number[];
  canonicalId: string;
  spelling: readonly string[];
}

export interface ColourRouteStep {
  index: number;
  role: 'start' | 'depart' | 'retain' | 'pivot' | 'return';
  instance: ColourPathInstance;
  changeFlag: 'started' | 'retained' | 'changed';
  transitionCost: number;
  continuity: number;
  retainedPitchClasses: readonly string[];
  removedPitchClasses: readonly string[];
  introducedPitchClasses: readonly string[];
}

export interface ColourRoute {
  id: string;
  totalCost: number;
  steps: readonly ColourRouteStep[];
  distinctCollections: number;
  distinctPitchSets: number;
  switchCount: number;
}

export interface ColourRouteSearchTrace {
  algorithm: 'layered-beam';
  /** Collection steps, including the start. Not the number of sounding changes. */
  minSteps: number;
  maxSteps: number;
  ending: 'return' | 'open';
  beamWidth: number;
  maxConsecutiveRetentions: number;
  expanded: number;
  prunedRetentionPad: number;
  prunedSameSoundingSet: number;
  prunedBeam: number;
  completeConsidered: number;
  completesWithRetention: number;
  completesWithoutRetention: number;
  tiedWithWinner: number;
  layers: readonly { step: number; retained: number; discarded: number; bestMean: number | null }[];
  winnerFormula: string;
  rejected: { sequence: string; mean: number; reason: string } | null;
  plateauNote: string;
  optimality: string;
}

export interface ColourRoutePlanArgs {
  resourceId: string;
  centre: string;
  seed?: number;
  /** Collection steps, including the start. */
  minSteps?: number;
  /** Collection steps, including the start. */
  maxSteps?: number;
  /** `return` ends on the home instance. `open` may end elsewhere. */
  ending?: 'return' | 'open';
  /** Reject a walk that never leaves the home instance. */
  requireDeparture?: boolean;
}

export type ColourRouteResult =
  | {
      ok: true;
      version: typeof PENTATONIC_COLOUR_PATH_VERSION;
      seed: number;
      catalogSize: number;
      ending: 'return' | 'open';
      minSteps: number;
      maxSteps: number;
      route: ColourRoute;
      alternatives: readonly ColourRoute[];
      search: ColourRouteSearchTrace;
    }
  | { ok: false; error: string };

let catalogCache: ColourPathInstance[] | null = null;

function tieRank(seed: number, id: string): number {
  let hash = seed >>> 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function sharedCount(left: readonly number[], right: readonly number[]): number {
  const wanted = new Set(right);
  return left.filter((pc) => wanted.has(pc)).length;
}

function sameResourceCentreMove(left: ColourPathInstance, right: ColourPathInstance): boolean {
  return left.resourceId === right.resourceId;
}

/** Different colours must keep a pitch class. The same colour may move centre. */
export function colourMoveAllowed(left: ColourPathInstance, right: ColourPathInstance): boolean {
  if (left.id === right.id) return true;
  if (sameResourceCentreMove(left, right)) return true;
  return sharedCount(left.canonicalPitchClasses, right.canonicalPitchClasses) >= 1;
}

function transitionParts(left: ColourPathInstance | null, right: ColourPathInstance | null, phraseBoundary = false) {
  const changed = Boolean(left && right && left.id !== right.id);
  return liquidChangeParts({
    changed,
    previous: left?.canonicalPitchClasses ?? null,
    next: right?.canonicalPitchClasses ?? null,
    phraseBoundary,
    config: DEFAULT_PENTATONIC_PATH_CONFIG,
  });
}

function namesFor(pcs: readonly number[], spelling: readonly string[], ordered: readonly number[]): string[] {
  return pcs.map((pc) => {
    const index = ordered.indexOf(pc);
    if (index >= 0) return spelling[index] ?? CENTRES[pc]!;
    return CENTRES[pc] ?? String(pc);
  });
}

function pitchDelta(previous: ColourPathInstance | null, next: ColourPathInstance): {
  retained: string[];
  removed: string[];
  introduced: string[];
} {
  if (!previous) return { retained: [], removed: [], introduced: [...next.spelling] };
  const prev = new Set(previous.canonicalPitchClasses);
  const nextSet = new Set(next.canonicalPitchClasses);
  const retained = previous.canonicalPitchClasses.filter((pc) => nextSet.has(pc));
  const removed = previous.canonicalPitchClasses.filter((pc) => !nextSet.has(pc));
  const introduced = next.canonicalPitchClasses.filter((pc) => !prev.has(pc));
  return {
    retained: namesFor(retained, next.spelling, next.orderedPitchClasses),
    removed: namesFor(removed, previous.spelling, previous.orderedPitchClasses),
    introduced: namesFor(introduced, next.spelling, next.orderedPitchClasses),
  };
}

export function colourInstance(resourceId: string, centre: string): ColourPathInstance | { error: string } {
  const resource = getPentatonicColourResource(resourceId);
  if (!resource) {
    return { error: `Pentatonic colour "${resourceId}" is not registered. Refusing to substitute minor pentatonic.` };
  }
  const parsed = parseNoteToken(centre);
  if (!parsed) return { error: `Centre "${centre}" is not a pitch.` };
  const centreName = CENTRES[parsed.pc] ?? parsed.spelling;
  const ordered = resource.intervals.map((interval) => mod12(parsed.pc + interval));
  const canonical = canonicalPitchSet(ordered);
  return {
    id: `${resource.id}@${parsed.pc}`,
    resourceId: resource.id,
    displayName: resource.displayName,
    centre: centreName,
    centrePc: parsed.pc,
    intervals: resource.intervals,
    orderedPitchClasses: ordered,
    canonicalPitchClasses: canonical,
    canonicalId: canonicalPitchSetId(canonical),
    spelling: spellFromReference(centreName, resource.intervals, resource.letterSteps),
  };
}

export function colourPathCatalog(): readonly ColourPathInstance[] {
  if (catalogCache) return catalogCache;
  const built: ColourPathInstance[] = [];
  for (const resource of listPentatonicColourResources()) {
    for (const centre of CENTRES) {
      const instance = colourInstance(resource.id, centre);
      if ('error' in instance) throw new Error(instance.error);
      built.push(instance);
    }
  }
  catalogCache = built;
  return built;
}

interface RouteEdge {
  to: number;
  /** 0 when the same instance is retained. Otherwise liquid.net plus the continuity remainder. */
  score: number;
  net: number;
  continuity: number;
  retain: boolean;
  sameSounding: boolean;
}

interface PartialRoute {
  index: number;
  pathKey: string;
  changeSum: number;
  changes: number;
  consec: number;
  departed: boolean;
  held: boolean;
  mean: number;
  parent: PartialRoute | null;
}

let edgeCache: RouteEdge[][] | null = null;

function changeScore(net: number, continuity: number, changed: boolean): number {
  if (!changed) return 0;
  return quantizePathCost(net + (1 - continuity) * 0.25);
}

function routeEdges(): RouteEdge[][] {
  if (edgeCache) return edgeCache;
  const states = colourPathCatalog();
  edgeCache = states.map((from) => {
    const list: RouteEdge[] = [];
    for (let to = 0; to < states.length; to += 1) {
      const next = states[to]!;
      if (!colourMoveAllowed(from, next)) continue;
      if (from.id === next.id) {
        list.push({ to, score: 0, net: 0, continuity: 1, retain: true, sameSounding: true });
        continue;
      }
      const liquid = transitionParts(from, next);
      const sameSounding = from.canonicalId === next.canonicalId;
      list.push({
        to,
        score: changeScore(liquid.net, liquid.continuity, true),
        net: liquid.net,
        continuity: liquid.continuity,
        retain: false,
        sameSounding,
      });
    }
    return list;
  });
  return edgeCache;
}

function meanCost(changeSum: number, changes: number): number {
  if (changes <= 0) return 0;
  return quantizePathCost(changeSum / changes);
}

function comparePartial(seed: number, left: PartialRoute, right: PartialRoute): number {
  if (left.mean !== right.mean) return left.mean - right.mean;
  if (left.changes === 0 && right.changes === 0) return left.pathKey.localeCompare(right.pathKey);
  const tie = tieRank(seed, left.pathKey) - tieRank(seed, right.pathKey);
  if (tie !== 0) return tie;
  return left.pathKey.localeCompare(right.pathKey);
}

function pathIndices(node: PartialRoute): number[] {
  const indices: number[] = [];
  let cursor: PartialRoute | null = node;
  while (cursor) {
    indices.push(cursor.index);
    cursor = cursor.parent;
  }
  indices.reverse();
  return indices;
}

function finishRoute(steps: ColourRouteStep[]): ColourRoute {
  const collections = new Set(steps.map((step) => step.instance.resourceId));
  const sets = new Set(steps.map((step) => step.instance.canonicalId));
  let switches = 0;
  let changeSum = 0;
  for (let index = 1; index < steps.length; index += 1) {
    if (steps[index]!.changeFlag !== 'changed') continue;
    switches += 1;
    changeSum += steps[index]!.transitionCost;
  }
  return {
    id: steps.map((step) => step.instance.id).join('>'),
    totalCost: meanCost(changeSum, switches),
    steps,
    distinctCollections: collections.size,
    distinctPitchSets: sets.size,
    switchCount: switches,
  };
}

function routeFromIndices(
  indices: readonly number[],
  homeId: string,
  ending: 'return' | 'open',
  edges: readonly (readonly RouteEdge[])[]
): ColourRoute {
  const states = colourPathCatalog();
  const steps: ColourRouteStep[] = [];
  for (let index = 0; index < indices.length; index += 1) {
    const instance = states[indices[index]!]!;
    const previous = index === 0 ? null : states[indices[index - 1]!]!;
    const edge = previous ? edges[indices[index - 1]!]!.find((item) => item.to === indices[index]) ?? null : null;
    const changed = Boolean(previous && previous.id !== instance.id);
    const last = index === indices.length - 1;
    const role: ColourRouteStep['role'] = !previous
      ? 'start'
      : !changed
        ? 'retain'
        : last && ending === 'return' && instance.id === homeId
          ? 'return'
          : index === 1
            ? 'depart'
            : 'pivot';
    const delta = pitchDelta(previous, instance);
    steps.push({
      index,
      role,
      instance,
      changeFlag: !previous ? 'started' : changed ? 'changed' : 'retained',
      transitionCost: edge?.score ?? 0,
      continuity: edge?.continuity ?? 1,
      retainedPitchClasses: delta.retained,
      removedPitchClasses: delta.removed,
      introducedPitchClasses: delta.introduced,
    });
  }
  return finishRoute(steps);
}

function winnerFormula(route: ColourRoute, edges: readonly (readonly RouteEdge[])[]): string {
  const parts: string[] = [];
  for (let index = 1; index < route.steps.length; index += 1) {
    const step = route.steps[index]!;
    const previous = route.steps[index - 1]!.instance;
    if (step.changeFlag !== 'changed') {
      parts.push(`${previous.id} retain ${step.instance.id} score 0 (omitted from the mean)`);
      continue;
    }
    const edge = edges[colourPathCatalog().findIndex((item) => item.id === previous.id)]?.find((item) => colourPathCatalog()[item.to]?.id === step.instance.id);
    const net = edge?.net ?? 0;
    const continuity = step.continuity;
    parts.push(
      `${previous.id}->${step.instance.id} liquid ${net} + (1-${continuity})*0.25 = ${step.transitionCost}`
    );
  }
  const scores = route.steps.filter((step) => step.changeFlag === 'changed').map((step) => step.transitionCost);
  return `mean ${route.totalCost} = (${scores.join(' + ') || '0'}) / ${scores.length || 0}; ${parts.join('; ')}`;
}

export function colourRoutePhraseTarget(route: ColourRoute): ColourPathInstance {
  const home = route.steps[0]?.instance;
  if (!home) throw new Error('Colour route has no start.');
  return route.steps.find((step) => step.instance.id !== home.id)?.instance ?? home;
}

/**
 * Layered beam over the 240 catalogue instances.
 * Expanded: every common-tone-legal successor, including same-instance retention.
 * Pruned before the beam: a second consecutive retention, a retention before any departure,
 * and a different instance whose pitch-class set is unchanged.
 * Pruned by the beam: partial walks past the width, after mean cost, then seed, then id order.
 * No global optimum. The winner is the best complete walk that survived the beam.
 * totalCost is the mean change score, so equal legs tie across route length.
 * Retention scores 0 and is left out of that mean, so a hold does not dilute it.
 * A second hold in a row is illegal, so holds cannot pad the walk.
 */
export function planColourRoute(args: ColourRoutePlanArgs): ColourRouteResult {
  const seed = args.seed ?? 1;
  const minSteps = args.minSteps ?? 3;
  const maxSteps = args.maxSteps ?? 5;
  const ending = args.ending ?? 'return';
  const requireDeparture = args.requireDeparture !== false;
  const start = colourInstance(args.resourceId, args.centre);
  if ('error' in start) return { ok: false, error: start.error };
  if (!Number.isInteger(minSteps) || !Number.isInteger(maxSteps)) {
    return { ok: false, error: 'Route length bounds must be whole numbers of collection steps.' };
  }
  if (minSteps < 2 || maxSteps > COLOUR_ROUTE_STEP_BOUND || minSteps > maxSteps) {
    return {
      ok: false,
      error: `Route length must be ${2}–${COLOUR_ROUTE_STEP_BOUND} collection steps, and the minimum cannot exceed the maximum.`,
    };
  }
  if (ending === 'return' && requireDeparture && maxSteps < 3) {
    return {
      ok: false,
      error: 'Required return with a departure needs at least 3 collection steps: home, another instance, home.',
    };
  }
  const states = colourPathCatalog();
  const homeIndex = states.findIndex((instance) => instance.id === start.id);
  if (homeIndex < 0) return { ok: false, error: `${start.id} is not in the colour catalogue.` };
  const edges = routeEdges();
  const root: PartialRoute = {
    index: homeIndex,
    pathKey: start.id,
    changeSum: 0,
    changes: 0,
    consec: 0,
    departed: false,
    held: false,
    mean: 0,
    parent: null,
  };
  let beam: PartialRoute[] = [root];
  const completes: PartialRoute[] = [];
  const layers: ColourRouteSearchTrace['layers'][number][] = [];
  let expanded = 0;
  let prunedRetentionPad = 0;
  let prunedSameSoundingSet = 0;
  let prunedBeam = 0;
  let completesWithRetention = 0;
  let completesWithoutRetention = 0;
  let rejected: ColourRouteSearchTrace['rejected'] = null;

  for (let step = 1; step <= maxSteps - 1; step += 1) {
    const pool: PartialRoute[] = [];
    for (const node of beam) {
      for (const edge of edges[node.index] ?? []) {
        expanded += 1;
        if (edge.retain) {
          if (!node.departed || node.consec >= COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS) {
            prunedRetentionPad += 1;
            continue;
          }
        } else if (edge.sameSounding) {
          prunedSameSoundingSet += 1;
          continue;
        }
        const next = states[edge.to]!;
        const changeSum = quantizePathCost(node.changeSum + edge.score);
        const changes = node.changes + (edge.retain ? 0 : 1);
        pool.push({
          index: edge.to,
          pathKey: `${node.pathKey}>${next.id}`,
          changeSum,
          changes,
          consec: edge.retain ? node.consec + 1 : 0,
          departed: true,
          held: node.held || edge.retain,
          mean: meanCost(changeSum, changes),
          parent: node,
        });
      }
    }
    const length = step + 1;
    if (length >= minSteps) {
      for (const node of pool) {
        if (requireDeparture && !node.departed) continue;
        if (ending === 'return' && states[node.index]!.id !== start.id) continue;
        if (node.held) completesWithRetention += 1;
        else completesWithoutRetention += 1;
        completes.push(node);
      }
    }
    pool.sort((left, right) => comparePartial(seed, left, right));
    const kept = pool.slice(0, COLOUR_ROUTE_BEAM_WIDTH);
    const discarded = pool.length - kept.length;
    prunedBeam += Math.max(0, discarded);
    if (!rejected && discarded > 0) {
      const lost = pool[COLOUR_ROUTE_BEAM_WIDTH]!;
      rejected = {
        sequence: lost.pathKey,
        mean: lost.mean,
        reason: `Beam kept ${COLOUR_ROUTE_BEAM_WIDTH} partial walks at ${length} collection steps. This walk was next.`,
      };
    }
    layers.push({
      step: length,
      retained: kept.length,
      discarded: Math.max(0, discarded),
      bestMean: kept[0]?.mean ?? null,
    });
    beam = kept;
    if (beam.length === 0) break;
  }

  const ordered = [...completes].sort((left, right) => comparePartial(seed, left, right));
  const unique: PartialRoute[] = [];
  const seen = new Set<string>();
  for (const node of ordered) {
    if (seen.has(node.pathKey)) continue;
    seen.add(node.pathKey);
    unique.push(node);
  }
  const winner = unique[0];
  if (!winner) {
    return {
      ok: false,
      error: `No legal ${ending} colour route from ${start.displayName} ${start.centre} in ${minSteps}–${maxSteps} collection steps.`,
    };
  }
  const chosen: ColourRoute[] = [];
  const seenPitchOrder = new Set<string>();
  for (const node of unique) {
    const indices = pathIndices(node);
    const pitchOrder = indices.map((index) => states[index]!.canonicalId).join('>');
    if (seenPitchOrder.has(pitchOrder)) continue;
    seenPitchOrder.add(pitchOrder);
    chosen.push(routeFromIndices(indices, start.id, ending, edges));
    if (chosen.length === COLOUR_ROUTE_CANDIDATE_LIMIT) break;
  }
  const route = chosen[0]!;
  const alternatives = chosen.slice(1);
  const tiedWithWinner = unique.filter((node) => node.mean === winner.mean).length;
  if (unique[1] && unique[1].mean !== winner.mean) {
    rejected = {
      sequence: unique[1].pathKey,
      mean: unique[1].mean,
      reason: `Complete walk mean ${unique[1].mean} is above the winning mean ${winner.mean}.`,
    };
  }
  return {
    ok: true,
    version: PENTATONIC_COLOUR_PATH_VERSION,
    seed,
    catalogSize: states.length,
    ending,
    minSteps,
    maxSteps,
    route,
    alternatives,
    search: {
      algorithm: 'layered-beam',
      minSteps,
      maxSteps,
      ending,
      beamWidth: COLOUR_ROUTE_BEAM_WIDTH,
      maxConsecutiveRetentions: COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS,
      expanded,
      prunedRetentionPad,
      prunedSameSoundingSet,
      prunedBeam,
      completeConsidered: completes.length,
      completesWithRetention,
      completesWithoutRetention,
      tiedWithWinner,
      layers,
      winnerFormula: winnerFormula(route, edges),
      rejected,
      plateauNote: COLOUR_ROUTE_PLATEAU_NOTE,
      optimality:
        'Layered beam of width 48. Order is mean change score, then the seed hash of the instance sequence, then the sequence text. Walks outside the beam are dropped. This is not a shortest-path guarantee on the full graph. The result is the best complete walk that stayed in the beam.',
    },
  };
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

function notePcs(values: readonly string[] | undefined): number[] {
  const found: number[] = [];
  for (const token of values ?? []) {
    const parsed = parseNoteToken(token);
    if (parsed) found.push(parsed.pc);
  }
  return found;
}

interface PassageHyp {
  cost: number;
  switches: number;
  distinct: number;
  seen: Set<string>;
  last: number;
  path: number[];
  run: 1 | 2;
  breakdown: PentatonicPathCostBreakdown;
}

function recommendFromInstances(args: {
  home: ColourPathInstance;
  melody: readonly number[];
  bass: readonly number[];
}): PentatonicEngineResult {
  const evidence = [...args.melody, ...args.bass];
  const pool = colourPathCatalog().filter((instance) => instance.centrePc === args.home.centrePc || instance.resourceId === args.home.resourceId);
  const ranked = [...pool].sort((left, right) => {
    const score = fitScore(right, evidence, args.home) - fitScore(left, evidence, args.home);
    if (score !== 0) return score;
    return left.id.localeCompare(right.id);
  });
  const toCard = (instance: ColourPathInstance, headingScore: number): PentatonicRecommendation => ({
    canonicalPitchSet: instance.canonicalPitchClasses,
    canonicalId: instance.id,
    transposedName: `${instance.centre} ${instance.displayName}`,
    displaySpelling: instance.spelling,
    archetypeId: instance.resourceId,
    archetypeDisplayName: instance.displayName,
    musicalFunction: instance.resourceId === args.home.resourceId && instance.centrePc === args.home.centrePc ? 'HOME' : 'COLOUR',
    homeRelationshipId: instance.id === args.home.id ? 'home' : null,
    homeRelationshipLabel: instance.id === args.home.id ? 'HOME' : null,
    alternativeInterpretations: [],
    totalScore: headingScore,
    componentScores: [],
    commonTones: namesFor(
      instance.canonicalPitchClasses.filter((pc) => args.home.canonicalPitchClasses.includes(pc)),
      instance.spelling,
      instance.orderedPitchClasses
    ),
    cautions: [],
    constraintStatus: { protectedNotes: 'not_applicable', strictMelody: 'not_applicable' },
    explanation: `${instance.centre} ${instance.displayName}. Ordered pitch classes ${instance.orderedPitchClasses.join(' ')}.`,
    isCurrent: false,
    isPinned: false,
    collectionKind: 'registry',
  });
  const cards = ranked.slice(0, 4).map((instance) => toCard(instance, fitScore(instance, evidence, args.home)));
  const [first, ...rest] = cards;
  return {
    kind: 'analysis',
    validationErrors: [],
    disposition: first ? 'RECOMMEND' : 'NO_FEASIBLE_CANDIDATE',
    explanation: first ? `${first.transposedName} leads this colour ranking. Major/minor path search is unchanged.` : 'No colour candidate.',
    recommendations: first ? [first] : [],
    alternatives: rest.filter((item) => item.canonicalPitchSet.join(',') !== first?.canonicalPitchSet.join(',')),
    retained: null,
    retention: null,
    limitations: [
      'Colour ranking uses the registered interval rows at this centre and the same colour across centres.',
      'It does not retune Dev 1 weights and does not enter PENTATONIC_ARCHETYPES.',
    ],
    constraintFailures: [],
    diagnostics: null,
    registryVersion: PENTATONIC_COLOUR_REGISTRY_VERSION,
    evaluatorVersion: PENTATONIC_COLOUR_PATH_VERSION,
    relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
    configurationId: pathConfigurationId(DEFAULT_PENTATONIC_PATH_CONFIG),
  };
}

function fitScore(instance: ColourPathInstance, evidence: readonly number[], home: ColourPathInstance): number {
  const homeShare = sharedCount(instance.canonicalPitchClasses, home.canonicalPitchClasses) / 5;
  if (evidence.length === 0) return quantizePathCost(instance.id === home.id ? 1 : homeShare);
  const set = new Set(instance.canonicalPitchClasses);
  const inside = evidence.filter((pc) => set.has(pc)).length / evidence.length;
  return quantizePathCost(inside * 0.75 + homeShare * 0.25);
}

export function recommendRegisteredColour(region: PentatonicRegionInput): PentatonicEngineResult {
  const homeId = region.home?.archetypeId;
  const homeCentre = region.home?.referenceNote;
  if (!homeId || !homeCentre) {
    return {
      kind: 'validation',
      validationErrors: ['Colour recommend needs a registered collection and a centre.'],
      disposition: null,
      explanation: '',
      recommendations: [],
      alternatives: [],
      retained: null,
      retention: null,
      limitations: [],
      constraintFailures: [],
      diagnostics: null,
      registryVersion: PENTATONIC_COLOUR_REGISTRY_VERSION,
      evaluatorVersion: PENTATONIC_COLOUR_PATH_VERSION,
      relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
      configurationId: pathConfigurationId(DEFAULT_PENTATONIC_PATH_CONFIG),
    };
  }
  const home = colourInstance(homeId, homeCentre);
  if ('error' in home) {
    return {
      kind: 'validation',
      validationErrors: [home.error],
      disposition: null,
      explanation: '',
      recommendations: [],
      alternatives: [],
      retained: null,
      retention: null,
      limitations: [],
      constraintFailures: [],
      diagnostics: null,
      registryVersion: PENTATONIC_COLOUR_REGISTRY_VERSION,
      evaluatorVersion: PENTATONIC_COLOUR_PATH_VERSION,
      relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
      configurationId: pathConfigurationId(DEFAULT_PENTATONIC_PATH_CONFIG),
    };
  }
  return recommendFromInstances({
    home,
    melody: notePcs(region.melodyNotes),
    bass: notePcs(region.bassNotes),
  });
}

function passageValidation(passage: PentatonicPassage): string | null {
  if (!passage.events?.length) return 'Passage needs at least one event.';
  const homeId = passage.home?.archetypeId;
  if (homeId && !getPentatonicColourResource(homeId)) {
    return `Pentatonic colour "${homeId}" is not registered. Refusing to substitute minor pentatonic.`;
  }
  return null;
}

export function recommendRegisteredColourPassage(passage: PentatonicPassage, seed = 1): PentatonicPathResult {
  const configVersion = pathConfigurationId(DEFAULT_PENTATONIC_PATH_CONFIG);
  const failure = (errors: string[]): PentatonicPathResult => ({
    kind: 'validation',
    validationErrors: errors,
    disposition: null,
    pathEngineVersion: PENTATONIC_PATH_ENGINE_VERSION,
    configVersion,
    evaluatorVersion: PENTATONIC_EVALUATOR_VERSION,
    registryVersion: PENTATONIC_REGISTRY_VERSION,
    relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
    sourceEventCount: passage.events?.length ?? 0,
    events: [],
    segments: [],
    switchCount: 0,
    distinctResources: 0,
    noneEventCount: 0,
    noneSegmentCount: 0,
    totalPathCost: null,
    costBreakdown: null,
    bestStaticPathCost: null,
    bestStaticStateId: null,
    bestStaticStateName: null,
    alternatives: [],
    diagnostics: [],
    limitations: [],
    explanation: '',
    noneEligibility: {
      iterations: 0,
      floor: DEFAULT_PENTATONIC_SCORING.minimumSuitability,
      rejected: [],
      surviving: [],
      heldExclusions: [],
      survivingBelowFloor: [],
    },
  });
  const problem = passageValidation(passage);
  if (problem) return failure([problem]);
  const states = colourPathCatalog();
  const home = passage.home?.archetypeId && passage.home.referenceNote ? colourInstance(passage.home.archetypeId, passage.home.referenceNote) : null;
  const homeInstance = home && !('error' in home) ? home : null;
  const evidence = passage.events.map((event) => {
    const silence = event.melodyRest === true && event.bassRest === true;
    const pcs = silence ? [] : [...notePcs(event.melodyNotes), ...notePcs(event.bassNotes), ...notePcs(event.heldNotes)];
    return { silence, pcs: [...new Set(pcs)] };
  });

  const fit = (index: number, pcs: readonly number[]): number => {
    if (pcs.length === 0) return 0.5;
    const set = new Set(states[index]!.canonicalPitchClasses);
    return pcs.filter((pc) => set.has(pc)).length / pcs.length;
  };

  let frontier: PassageHyp[] = [
    {
      cost: 0,
      switches: 0,
      distinct: 0,
      seen: new Set<string>(),
      last: -2,
      path: [],
      run: 2,
      breakdown: emptyBreakdown(),
    },
  ];

  for (let eventIndex = 0; eventIndex < passage.events.length; eventIndex += 1) {
    const event = evidence[eventIndex]!;
    const phraseBoundary = eventIndex > 0 && passage.events[eventIndex - 1]!.phraseBoundaryAfter === true;
    const next: PassageHyp[] = [];
    for (const hyp of frontier) {
      const choices: number[] = [];
      if (event.silence && hyp.last >= 0) choices.push(hyp.last);
      else {
        for (let index = 0; index < states.length; index += 1) {
          if (event.pcs.length > 0 && fit(index, event.pcs) <= 0) continue;
          if (hyp.last >= 0 && !colourMoveAllowed(states[hyp.last]!, states[index]!)) continue;
          choices.push(index);
        }
      }
      for (const stateIndex of choices) {
        const state = states[stateIndex]!;
        const previous = hyp.last >= 0 ? states[hyp.last]! : null;
        const local = event.silence ? 1 : fit(stateIndex, event.pcs);
        const localMisfit = event.silence ? 0 : quantizePathCost(1 - local);
        const changed = Boolean(previous && previous.id !== state.id && !event.silence);
        const liquid = transitionParts(previous, state, phraseBoundary);
        const seen = new Set(hyp.seen);
        let distinctPenalty = 0;
        let distinct = hyp.distinct;
        if (!seen.has(state.resourceId)) {
          if (distinct >= 1) distinctPenalty = DEFAULT_PENTATONIC_PATH_CONFIG.distinctResourcePenalty;
          seen.add(state.resourceId);
          distinct += 1;
        }
        const homeBonus =
          eventIndex === passage.events.length - 1 && homeInstance && state.id === homeInstance.id && (passage.purpose === 'lyrical_answer' || passage.purpose === 'restraint' || passage.colourTension === 'home')
            ? DEFAULT_PENTATONIC_PATH_CONFIG.finalHomeBonus
            : 0;
        const shortPenalty = changed && hyp.path.length > 0 && hyp.run === 1 ? DEFAULT_PENTATONIC_PATH_CONFIG.shortSegmentPenalty : 0;
        const step = localMisfit + liquid.net + distinctPenalty + shortPenalty - homeBonus;
        const cost = quantizePathCost(hyp.cost + step);
        next.push({
          cost,
          switches: hyp.switches + (changed ? 1 : 0),
          distinct,
          seen,
          last: stateIndex,
          path: [...hyp.path, stateIndex],
          run: changed || hyp.path.length === 0 ? 1 : 2,
          breakdown: {
            localMisfit: quantizePathCost(hyp.breakdown.localMisfit + localMisfit),
            changeCost: quantizePathCost(hyp.breakdown.changeCost + liquid.gross),
            commonToneDiscount: quantizePathCost(hyp.breakdown.commonToneDiscount + liquid.commonToneDiscount),
            displacementDiscount: quantizePathCost(hyp.breakdown.displacementDiscount + liquid.displacementDiscount),
            phraseBoundaryDiscount: quantizePathCost(hyp.breakdown.phraseBoundaryDiscount + liquid.phraseBoundaryDiscount),
            distinctResourcePenalty: quantizePathCost(hyp.breakdown.distinctResourcePenalty + distinctPenalty),
            shortSegmentPenalty: quantizePathCost(hyp.breakdown.shortSegmentPenalty + shortPenalty),
            finalHomeBonus: quantizePathCost(hyp.breakdown.finalHomeBonus + homeBonus),
            total: cost,
          },
        });
      }
    }
    next.sort((left, right) => {
      if (left.cost !== right.cost) return left.cost - right.cost;
      if (left.switches !== right.switches) return left.switches - right.switches;
      if (left.distinct !== right.distinct) return left.distinct - right.distinct;
      const tie = tieRank(seed, left.path.join('.')) - tieRank(seed, right.path.join('.'));
      if (tie !== 0) return tie;
      return left.path.join('.').localeCompare(right.path.join('.'));
    });
    const kept: PassageHyp[] = [];
    const seenPath = new Set<string>();
    for (const hyp of next) {
      const key = hyp.path.map((index) => states[index]!.id).join('>');
      if (seenPath.has(key)) continue;
      seenPath.add(key);
      kept.push(hyp);
      if (kept.length === 24) break;
    }
    frontier = kept;
    if (frontier.length === 0) break;
  }

  if (frontier.length === 0 || !frontier[0]) {
    return {
      ...failure([]),
      kind: 'analysis',
      disposition: 'NO_FEASIBLE_PATH',
      explanation: 'No colour path could be built.',
    };
  }

  const best = frontier[0];
  const window = quantizePathCost(best.cost + DEFAULT_PENTATONIC_PATH_CONFIG.alternativePathWindow);
  const alternatives = frontier.slice(1).filter((hyp) => {
    if (hyp.cost > window) return false;
    return hyp.path.join('.') !== best.path.join('.');
  }).slice(0, 2);

  const decisions: PentatonicPathEventDecision[] = best.path.map((stateIndex, index) => {
    const state = states[stateIndex]!;
    const previous = index === 0 ? null : states[best.path[index - 1]!]!;
    const silence = evidence[index]!.silence;
    const changed = Boolean(previous && previous.id !== state.id && !silence);
    const liquid = transitionParts(previous ?? null, state, index > 0 && passage.events[index - 1]!.phraseBoundaryAfter === true);
    const delta = pitchDelta(previous ?? null, state);
    const localScore = silence ? null : fit(stateIndex, evidence[index]!.pcs);
    const homeHit = homeInstance?.id === state.id;
    return {
      eventId: passage.events[index]!.id,
      sourceLabel: passage.events[index]!.sourceLabel,
      chosenId: state.id,
      chosenName: `${state.centre} ${state.displayName}`,
      archetypeId: state.resourceId,
      referenceNote: state.centre,
      canonicalPitchSet: state.canonicalPitchClasses,
      canonicalId: state.canonicalId,
      displaySpelling: state.spelling,
      homeRelationshipId: homeHit ? 'home' : null,
      homeRelationshipLabel: homeHit ? 'HOME' : null,
      localScore,
      localMisfit: silence ? 0 : quantizePathCost(1 - (localScore ?? 0)),
      transitionCost: silence ? 0 : liquid.net,
      sharedPitchClasses: delta.retained,
      sharedToneContinuity: liquid.continuity,
      changeFlag: silence ? 'retained' : !previous ? 'started' : changed ? 'changed' : 'retained',
      explanation: silence
        ? `Silence. ${state.centre} ${state.displayName} continues.`
        : changed
          ? `Changed to ${state.centre} ${state.displayName}. Retained ${delta.retained.join(' ') || 'none'}.`
          : `${!previous ? 'Started' : 'Retained'} ${state.centre} ${state.displayName}.`,
      localBestId: state.id,
      localBestName: `${state.centre} ${state.displayName}`,
      localBestScore: localScore,
      pitchClassTransition: previous
        ? {
            retainedPitchClasses: delta.retained,
            removedPitchClasses: delta.removed,
            introducedPitchClasses: delta.introduced,
            nearestPitchClassDisplacement: [],
          }
        : null,
    };
  });

  let staticBest: { cost: number; index: number } | null = null;
  for (let index = 0; index < states.length; index += 1) {
    let cost = 0;
    let legal = true;
    for (let eventIndex = 0; eventIndex < evidence.length; eventIndex += 1) {
      const row = evidence[eventIndex]!;
      if (row.silence) continue;
      if (row.pcs.length > 0 && fit(index, row.pcs) <= 0) {
        legal = false;
        break;
      }
      cost += 1 - fit(index, row.pcs);
    }
    if (!legal) continue;
    cost = quantizePathCost(cost);
    if (!staticBest || cost < staticBest.cost) staticBest = { cost, index };
  }

  const segments = summarizeSegments(decisions);
  const bestBreakdown = { ...best.breakdown, total: best.cost };
  return {
    kind: 'analysis',
    validationErrors: [],
    disposition: 'PATH',
    pathEngineVersion: PENTATONIC_COLOUR_PATH_VERSION,
    configVersion,
    evaluatorVersion: PENTATONIC_EVALUATOR_VERSION,
    registryVersion: `${PENTATONIC_REGISTRY_VERSION}+${PENTATONIC_COLOUR_REGISTRY_VERSION}`,
    relationshipScoringVersion: PENTATONIC_RELATIONSHIP_SCORING_VERSION,
    sourceEventCount: passage.events.length,
    events: decisions,
    segments,
    switchCount: best.switches,
    distinctResources: best.distinct,
    noneEventCount: decisions.filter((event) => event.chosenId === PENTATONIC_PATH_NONE).length,
    noneSegmentCount: 0,
    totalPathCost: best.cost,
    costBreakdown: bestBreakdown,
    bestStaticPathCost: staticBest?.cost ?? null,
    bestStaticStateId: staticBest ? states[staticBest.index]!.id : null,
    bestStaticStateName: staticBest ? `${states[staticBest.index]!.centre} ${states[staticBest.index]!.displayName}` : null,
    alternatives: alternatives.map((hyp) => ({
      eventIds: passage.events.map((event) => event.id),
      chosenIds: hyp.path.map((index) => states[index]!.id),
      segments: [],
      switchCount: hyp.switches,
      distinctResources: hyp.distinct,
      noneEventCount: 0,
      noneSegmentCount: 0,
      totalCost: hyp.cost,
      costBreakdown: { ...hyp.breakdown, total: hyp.cost },
      homeContinuity: 0,
    })),
    diagnostics: [`Colour catalog ${states.length}. Seed ${seed}. Common-tone rule on collection changes.`],
    limitations: [
      'Colour path reads the 20 registered collections. It does not add them to PENTATONIC_ARCHETYPES.',
      'Major and minor passage search stays on recommendPentatonicPath when the home collection is one of those two archetypes.',
      'A change to a different collection keeps at least one pitch class. The same collection may move to another centre.',
      'Transition costs use the default path config. They are heuristics, not artistic scores.',
    ],
    explanation: segments
      .map((segment) => {
        const span = segment.firstSourceLabel === segment.lastSourceLabel ? segment.firstSourceLabel : `${segment.firstSourceLabel}–${segment.lastSourceLabel}`;
        return `${span}  ${segment.chosenName}`;
      })
      .join('\n'),
    noneEligibility: {
      iterations: 1,
      floor: DEFAULT_PENTATONIC_SCORING.minimumSuitability,
      rejected: [],
      surviving: [],
      heldExclusions: [],
      survivingBelowFloor: [],
    },
  };
}

function summarizeSegments(decisions: readonly PentatonicPathEventDecision[]): PentatonicPathResult['segments'] {
  const segments: PentatonicPathResult['segments'][number][] = [];
  let start = 0;
  while (start < decisions.length) {
    let end = start;
    while (end + 1 < decisions.length && decisions[end + 1]!.chosenId === decisions[start]!.chosenId) end += 1;
    const chosen = decisions[start]!;
    const previous = start > 0 ? decisions[start - 1]! : null;
    segments.push({
      firstSourceLabel: chosen.sourceLabel,
      lastSourceLabel: decisions[end]!.sourceLabel,
      eventIds: decisions.slice(start, end + 1).map((event) => event.eventId),
      chosenId: chosen.chosenId,
      chosenName: chosen.chosenName,
      archetypeId: chosen.archetypeId,
      referenceNote: chosen.referenceNote,
      canonicalPitchSet: chosen.canonicalPitchSet,
      displaySpelling: chosen.displaySpelling,
      homeRelationshipId: chosen.homeRelationshipId,
      homeRelationshipLabel: chosen.homeRelationshipLabel,
      meanLocalFit: chosen.localScore,
      sharedPitchClassesWithPrevious: previous ? chosen.sharedPitchClasses : [],
      reason: chosen.explanation,
    });
    start = end + 1;
  }
  return segments;
}
