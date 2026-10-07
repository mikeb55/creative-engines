/**
 * Dev 5B path intelligence.
 * Reads an existing path. Does not retune path costs and does not add colour
 * resources to the path registry.
 * A region is one compositional decision. A repeated zero-common-tone pair
 * is one field, not a fresh decision on every switch.
 */

import { getPentatonicColourResource } from './colourRegistry';
import { getPentatonicArchetype } from './registry';
import { mod12 } from './pitch';

export const PENTATONIC_PATH_INTELLIGENCE_VERSION = 'pentatonic-path-intelligence-5b';

/** Off. An explicit true may read a colour resource. It does not enter the path registry. */
export const EXPERIMENTAL_COLOUR_PATH_GATE = false;

export type OutsideBudget = 'LOW' | 'MODERATE' | 'HIGH';

/** WWH default. HIGH still refuses a third outside device. */
export const DEFAULT_OUTSIDE_BUDGET: OutsideBudget = 'LOW';

export type PathTrajectory =
  | 'HOME'
  | 'HOME_COLOUR_HOME'
  | 'HOME_OUTSIDE_HOME'
  | 'HOME_SUSPENDED_HOME'
  | 'HOME_AMBIGUOUS_RESOLUTION'
  | 'CONTINUITY'
  | 'RETAIN_CURRENT_FIELD'
  | 'TRITONE_PAIR_FIELD'
  | 'NONE';

export interface PathSlice {
  sourceLabel: string;
  chosenId: string;
  chosenName: string;
  pitchClasses: readonly number[] | null;
}

export interface TritonePairField {
  leftName: string;
  rightName: string;
  leftPitchClasses: readonly number[];
  rightPitchClasses: readonly number[];
  sharedPitchClassCount: 0;
  alternations: number;
  firstSourceLabel: string;
  lastSourceLabel: string;
}

export interface PathIntelligenceRegion {
  trajectory: PathTrajectory;
  firstSourceLabel: string;
  lastSourceLabel: string;
  sourceLabels: readonly string[];
  collectionNames: readonly string[];
  tritonePair: TritonePairField | null;
  explanation: string;
}

export interface PathIntelligenceResult {
  version: typeof PENTATONIC_PATH_INTELLIGENCE_VERSION;
  regions: readonly PathIntelligenceRegion[];
  /** Collection changes on the supplied slices. The DP cost is not rewritten. */
  rawSwitchCount: number;
  /** Switches inside one established tritone-pair field. */
  pairInternalSwitchCount: number;
  /** Raw switches that are still separate compositional changes. */
  independentSwitchCount: number;
  /** One per region. A pair field counts once. */
  compositionalDecisions: number;
  outsideRegionCount: number;
  outsideBudget: OutsideBudget;
  /** Repeated outside regions under a conservative budget. */
  outsideFriction: boolean;
  unnecessarySwitching: boolean;
}

type FieldRole = 'NONE' | 'HOME' | 'COLOUR' | 'SUSPENDED' | 'AMBIGUOUS' | 'OUTSIDE' | 'RETAIN';

interface Group {
  key: string;
  name: string;
  pcs: number[] | null;
  sourceLabels: string[];
}

function sorted(pcs: readonly number[]): number[] {
  return [...pcs].sort((left, right) => left - right);
}

function sameSet(left: readonly number[] | null, right: readonly number[] | null): boolean {
  if (!left || !right || left.length !== right.length) return false;
  const wanted = new Set(right);
  return left.every((pc) => wanted.has(pc));
}

function sharedCount(left: readonly number[] | null, right: readonly number[] | null): number {
  if (!left || !right) return 0;
  const wanted = new Set(right);
  return left.filter((pc) => wanted.has(pc)).length;
}

function transposeSet(pcs: readonly number[], semitones: number): number[] {
  return sorted(pcs.map((pc) => mod12(pc + semitones)));
}

function stateKey(slice: PathSlice): string {
  if (slice.chosenId === 'NONE' || slice.chosenName === 'NONE' || !slice.pitchClasses || slice.pitchClasses.length === 0) {
    return 'NONE';
  }
  return sorted(slice.pitchClasses).join(',');
}

function groupSlices(slices: readonly PathSlice[]): Group[] {
  const groups: Group[] = [];
  for (const slice of slices) {
    const key = stateKey(slice);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.sourceLabels.push(slice.sourceLabel);
      continue;
    }
    groups.push({
      key,
      name: slice.chosenName,
      pcs: slice.pitchClasses ? sorted(slice.pitchClasses) : null,
      sourceLabels: [slice.sourceLabel],
    });
  }
  return groups;
}

function roleOf(pcs: readonly number[] | null, home: readonly number[] | null): FieldRole {
  if (!pcs || pcs.length === 0) return 'NONE';
  if (!home || home.length === 0) return 'RETAIN';
  const field = sorted(pcs);
  const homeSet = sorted(home);
  if (sameSet(field, homeSet)) return 'HOME';
  if (sameSet(field, transposeSet(homeSet, 7)) || sameSet(field, transposeSet(homeSet, 2))) return 'SUSPENDED';
  const shared = sharedCount(field, homeSet);
  if (shared === 0) return 'OUTSIDE';
  if (shared <= 2) return 'AMBIGUOUS';
  return 'COLOUR';
}

function pairRuns(groups: readonly Group[]): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  let index = 0;
  while (index < groups.length) {
    const left = groups[index];
    const right = groups[index + 1];
    if (!left || !right || left.key === 'NONE' || right.key === 'NONE' || left.key === right.key || sharedCount(left.pcs, right.pcs) !== 0) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end + 1 < groups.length) {
      const next = groups[end + 1]!;
      const previous = groups[end]!;
      if (next.key === 'NONE' || next.key === previous.key) break;
      if (next.key !== left.key && next.key !== right.key) break;
      end += 1;
    }
    const alternations = end - index;
    if (alternations >= 3) {
      runs.push({ start: index, end });
      index = end + 1;
    } else {
      index += 1;
    }
  }
  return runs;
}

function arcTrajectory(roles: readonly FieldRole[]): PathTrajectory | null {
  if (roles.length === 3 && roles[0] === 'HOME' && roles[2] === 'HOME') {
    if (roles[1] === 'COLOUR') return 'HOME_COLOUR_HOME';
    if (roles[1] === 'OUTSIDE') return 'HOME_OUTSIDE_HOME';
    if (roles[1] === 'SUSPENDED') return 'HOME_SUSPENDED_HOME';
    if (roles[1] === 'AMBIGUOUS') return 'HOME_AMBIGUOUS_RESOLUTION';
  }
  if (roles.length === 2 && roles[0] === 'AMBIGUOUS' && roles[1] === 'HOME') return 'HOME_AMBIGUOUS_RESOLUTION';
  return null;
}

function singleTrajectory(role: FieldRole): PathTrajectory {
  if (role === 'NONE') return 'NONE';
  if (role === 'HOME') return 'HOME';
  if (role === 'COLOUR') return 'CONTINUITY';
  return 'RETAIN_CURRENT_FIELD';
}

function regionFromGroups(groups: readonly Group[], trajectory: PathTrajectory, pair: TritonePairField | null, explanation: string): PathIntelligenceRegion {
  const labels = groups.flatMap((group) => group.sourceLabels);
  return {
    trajectory,
    firstSourceLabel: labels[0] ?? '',
    lastSourceLabel: labels[labels.length - 1] ?? '',
    sourceLabels: labels,
    collectionNames: groups.map((group) => group.name),
    tritonePair: pair,
    explanation,
  };
}

function pairField(groups: readonly Group[]): TritonePairField {
  const left = groups[0]!;
  const right = groups.find((group) => group.key !== left.key)!;
  return {
    leftName: left.name,
    rightName: right.name,
    leftPitchClasses: left.pcs ?? [],
    rightPitchClasses: right.pcs ?? [],
    sharedPitchClassCount: 0,
    alternations: groups.length - 1,
    firstSourceLabel: groups[0]!.sourceLabels[0] ?? '',
    lastSourceLabel: groups[groups.length - 1]!.sourceLabels.at(-1) ?? '',
  };
}

export function slicesFromPathEvents(
  events: readonly {
    sourceLabel: string;
    chosenId: string;
    chosenName: string;
    canonicalPitchSet: readonly number[] | null;
  }[]
): PathSlice[] {
  return events.map((event) => ({
    sourceLabel: event.sourceLabel,
    chosenId: event.chosenName === 'NONE' ? 'NONE' : event.chosenId,
    chosenName: event.chosenName,
    pitchClasses: event.chosenName === 'NONE' ? null : event.canonicalPitchSet,
  }));
}

export function interpretPentatonicPath(
  slices: readonly PathSlice[],
  homePitchClasses: readonly number[] | null,
  budget: OutsideBudget = DEFAULT_OUTSIDE_BUDGET
): PathIntelligenceResult {
  const groups = groupSlices(slices);
  const covered = new Set<number>();
  const regions: PathIntelligenceRegion[] = [];
  for (const run of pairRuns(groups)) {
    for (let index = run.start; index <= run.end; index += 1) covered.add(index);
    const members = groups.slice(run.start, run.end + 1);
    const pair = pairField(members);
    regions.push(
      regionFromGroups(
        members,
        'TRITONE_PAIR_FIELD',
        pair,
        `${pair.leftName} and ${pair.rightName} alternate with no shared pitch class. ${pair.alternations} changes stay one field.`
      )
    );
  }

  let index = 0;
  while (index < groups.length) {
    if (covered.has(index)) {
      index += 1;
      continue;
    }
    const ahead: number[] = [];
    for (let cursor = index; cursor < groups.length && !covered.has(cursor) && ahead.length < 3; cursor += 1) {
      ahead.push(cursor);
    }
    const roles = ahead.map((cursor) => roleOf(groups[cursor]!.pcs, homePitchClasses));
    const arc = arcTrajectory(roles);
    if (arc && ahead.length >= 2) {
      const used = arc === 'HOME_AMBIGUOUS_RESOLUTION' && roles.length === 2 ? ahead.slice(0, 2) : ahead.slice(0, 3);
      const chosen = used.map((cursor) => groups[cursor]!);
      regions.push(regionFromGroups(chosen, arc, null, `One region: ${arc.split('_').join(' ')}.`));
      index = used[used.length - 1]! + 1;
      continue;
    }
    const group = groups[index]!;
    const trajectory = singleTrajectory(roleOf(group.pcs, homePitchClasses));
    regions.push(regionFromGroups([group], trajectory, null, trajectory === 'NONE' ? 'Path abstains.' : 'The field stays.'));
    index += 1;
  }

  regions.sort((left, right) => left.sourceLabels[0]!.localeCompare(right.sourceLabels[0]!, undefined, { numeric: true }));

  const pairLabels = new Set(regions.filter((region) => region.tritonePair).flatMap((region) => region.sourceLabels));
  let rawSwitchCount = 0;
  let pairInternalSwitchCount = 0;
  for (let cursor = 1; cursor < slices.length; cursor += 1) {
    if (stateKey(slices[cursor]!) === stateKey(slices[cursor - 1]!)) continue;
    rawSwitchCount += 1;
    if (pairLabels.has(slices[cursor]!.sourceLabel) && pairLabels.has(slices[cursor - 1]!.sourceLabel)) {
      pairInternalSwitchCount += 1;
    }
  }

  const outsideRegionCount = regions.filter(
    (region) => region.trajectory === 'HOME_OUTSIDE_HOME' || region.trajectory === 'TRITONE_PAIR_FIELD'
  ).length;
  const independentSwitchCount = rawSwitchCount - pairInternalSwitchCount;
  return {
    version: PENTATONIC_PATH_INTELLIGENCE_VERSION,
    regions,
    rawSwitchCount,
    pairInternalSwitchCount,
    independentSwitchCount,
    compositionalDecisions: regions.length,
    outsideRegionCount,
    outsideBudget: budget,
    outsideFriction: budget === 'LOW' && outsideRegionCount > 1,
    unnecessarySwitching: independentSwitchCount >= 4 && !regions.some((region) => region.trajectory === 'TRITONE_PAIR_FIELD'),
  };
}

/** Fewer region decisions win. A higher outside count does not. */
export function preferCoherentPath(options: readonly PathIntelligenceResult[]): PathIntelligenceResult | null {
  if (options.length === 0) return null;
  return [...options].sort((left, right) => {
    if (left.compositionalDecisions !== right.compositionalDecisions) return left.compositionalDecisions - right.compositionalDecisions;
    if (left.outsideRegionCount !== right.outsideRegionCount) return left.outsideRegionCount - right.outsideRegionCount;
    return left.independentSwitchCount - right.independentSwitchCount;
  })[0]!;
}

export interface GroundingAssessment {
  present: boolean;
  bassPedal: boolean;
  bassOstinato: boolean;
  sustainedTone: boolean;
  motifIdentity: boolean;
  explicitAnchor: boolean;
}

export function assessGrounding(args: {
  bassPitchClasses?: readonly (readonly number[])[];
  heldPitchClasses?: readonly (readonly number[])[];
  motifIdentityRetained?: boolean;
  explicitAnchor?: boolean;
}): GroundingAssessment {
  const bassEvents = (args.bassPitchClasses ?? []).filter((event) => event.length > 0);
  const bassFlat = bassEvents.flat();
  const bassCounts = new Map<number, number>();
  for (const pc of bassFlat) bassCounts.set(pc, (bassCounts.get(pc) ?? 0) + 1);
  const strongest = [...bassCounts.values()].sort((left, right) => right - left)[0] ?? 0;
  const bassPedal = bassEvents.length >= 2 && bassCounts.size === 1;
  const repeated = bassEvents.length >= 4 && bassEvents.slice(0, 2).every((event, index) => {
    const later = bassEvents[index + 2];
    return later && event[0] === later[0];
  });
  const bassOstinato = !bassPedal && repeated && strongest >= 2;
  const sustainedTone = (args.heldPitchClasses ?? []).some((event) => event.length > 0);
  const motifIdentity = args.motifIdentityRetained === true;
  const explicitAnchor = args.explicitAnchor === true;
  return {
    bassPedal,
    bassOstinato,
    sustainedTone,
    motifIdentity,
    explicitAnchor,
    present: bassPedal || bassOstinato || sustainedTone || motifIdentity || explicitAnchor,
  };
}

/**
 * Colour-registry ids stay out of the path unless the gate is passed in.
 * The frozen archetype list is never rewritten.
 */
export function experimentalColourResourceAllowed(resourceId: string, gate: boolean = EXPERIMENTAL_COLOUR_PATH_GATE): boolean {
  if (!gate) return false;
  if (getPentatonicArchetype(resourceId)) return false;
  return Boolean(getPentatonicColourResource(resourceId));
}
