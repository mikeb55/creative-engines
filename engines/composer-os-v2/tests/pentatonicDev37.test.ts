/**
 * Pentatonic Engine Dev 3.7 — floor consistency for held collections.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev37.test.ts
 */
import assert from 'node:assert/strict';
import { DEFAULT_PENTATONIC_SCORING } from '../core/pentatonic/evaluate';
import {
  PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6,
  pentatonicFrozenConfigFingerprint,
} from '../core/pentatonic/frozenConfigFingerprint';
import {
  optimizePentatonicPathWithNoneEligibility,
  registryCollectionRegionMean,
  type HeldCollectionFloorOptions,
} from '../core/pentatonic/noneEligibility';
import { optimizePentatonicPath, type OptimizerEvent, type OptimizerState } from '../core/pentatonic/optimizePath';
import {
  DEFAULT_PENTATONIC_PATH_CONFIG,
  PENTATONIC_PATH_CONFIG_FINGERPRINT,
  PENTATONIC_PATH_CONFIG_VERSION,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_6,
} from '../core/pentatonic/pathConfig';
import { parseNoteToken } from '../core/pentatonic/pitch';
import { getPentatonicArchetype } from '../core/pentatonic/registry';

const FLOOR = DEFAULT_PENTATONIC_SCORING.minimumSuitability;

function collection(root: string): number[] {
  const note = parseNoteToken(root);
  const archetype = getPentatonicArchetype('minor_pentatonic');
  if (!note || !archetype) throw new Error(`missing ${root}`);
  return archetype.intervals.map((interval) => (note.pc + interval) % 12);
}

function state(id: string, root: string, name: string): OptimizerState {
  return {
    id,
    pitchSet: collection(root),
    archetypeId: 'minor_pentatonic',
    referenceNote: root,
    homeRelationshipId: null,
    homeRelationshipLabel: null,
    name,
    displaySpelling: [],
  };
}

function bar(ids: string[], scores: Record<string, number>): OptimizerEvent {
  return { feasibleStateIds: ids, localScoreById: scores, phraseBoundaryAfter: false };
}

function solve(states: OptimizerState[], events: OptimizerEvent[], options?: HeldCollectionFloorOptions) {
  return optimizePentatonicPathWithNoneEligibility(
    {
      states,
      events,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
      allowNone: true,
      previousStateId: null,
      previousPitchSet: null,
      homeExplicit: false,
      finalHomeBonusEnabled: false,
      sourceLabels: events.map((_, index) => String(index + 1)),
      eventIds: events.map((_, index) => `e${index + 1}`),
    },
    FLOOR,
    options
  );
}

function solveRaw(states: OptimizerState[], events: OptimizerEvent[]) {
  return optimizePentatonicPath({
    states,
    events,
    config: DEFAULT_PENTATONIC_PATH_CONFIG,
    allowNone: true,
    previousStateId: null,
    previousPitchSet: null,
    homeExplicit: false,
    finalHomeBonusEnabled: false,
    sourceLabels: events.map((_, index) => String(index + 1)),
    eventIds: events.map((_, index) => `e${index + 1}`),
  });
}

function names(states: OptimizerState[], path: readonly number[]): string[] {
  return path.map((index) => states[index]?.name ?? 'NONE');
}

function repeat(count: number, event: OptimizerEvent): OptimizerEvent[] {
  return Array.from({ length: count }, () => event);
}

export function runPentatonicDev37Tests(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
      console.log(`PASS ${name}`);
    } catch (error) {
      rows.push({ ok: false, name });
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  };

  const dMinor = state('D', 'D', 'D Minor');
  const cSharp = state('Cs', 'C#', 'C# Major');
  const altA = state('A', 'A', 'A Minor');
  const altB = state('B', 'B', 'B Minor');
  const states = [dMinor, cSharp, altA, altB];
  const high = 0.95;

  check('config 1.4 keeps the Dev 3.6 fingerprint historical', () => {
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_6, 'pentatonic-path-config-1.3');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION, 'pentatonic-path-config-1.4');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, 'ef43cf14487dfdc85c93075ae4eda977e4bd984396a8052646a4d1593b849b97');
    const live = pentatonicFrozenConfigFingerprint();
    assert.equal(PENTATONIC_PATH_CONFIG_FINGERPRINT, live);
    assert.notEqual(live, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6);
    assert.equal(FLOOR, 0.62);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    console.log(`DEV 3.6 FINGERPRINT ${PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6}`);
    console.log(`DEV 3.7 FINGERPRINT ${live}`);
  });

  check('two-event held failure with an acceptable alternative', () => {
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.4, Cs: 0.69 }),
      bar(['D', 'Cs'], { D: 0.4, Cs: 0.69 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    assert.equal(registryCollectionRegionMean(events, dMinor, 2, 3), 0.4);
    assert.equal(registryCollectionRegionMean(events, cSharp, 2, 3), 0.69);
    const dev36 = solve(states, events, { heldCollectionFloor: false });
    const dev37 = solve(states, events);
    const before = names(states, dev36.best?.path ?? []);
    const after = names(states, dev37.best?.path ?? []);
    console.log(`two-event Dev 3.6 ${before.join(' ')}`);
    console.log(`two-event Dev 3.7 ${after.join(' ')} iterations ${dev37.eligibility.iterations}`);
    assert.deepEqual(before.slice(2, 4), ['D Minor', 'D Minor']);
    assert.ok(dev37.eligibility.heldExclusions.some((row) => row.heldCollectionName === 'D Minor' && row.start === 2 && row.end === 3));
    assert.deepEqual(after.slice(2, 4), ['C# Major', 'C# Major']);
    assert.equal(dev37.eligibility.heldExclusions.find((row) => row.start === 2)?.finalStateName, 'C# Major');
  });

  check('no acceptable alternative leaves the held collection eligible', () => {
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.4, Cs: 0.6 }),
      bar(['D', 'Cs'], { D: 0.4, Cs: 0.6 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    const dev36 = solve(states, events, { heldCollectionFloor: false });
    const dev37 = solve(states, events);
    console.log(`no-alt Dev 3.6 ${names(states, dev36.best?.path ?? []).join(' ')}`);
    console.log(`no-alt Dev 3.7 ${names(states, dev37.best?.path ?? []).join(' ')}`);
    assert.equal(dev37.eligibility.heldExclusions.length, 0);
    assert.deepEqual(dev37.best?.path, dev36.best?.path);
    assert.equal(dev37.best?.cost, dev36.best?.cost);
    assert.ok(!names(states, dev37.best?.path ?? []).slice(2, 4).every((name) => name === 'C# Major'));
  });

  check('one-event dip does not fire the held-run rule', () => {
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.3, Cs: 0.9 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    const dev36 = solve(states, events, { heldCollectionFloor: false });
    const dev37 = solve(states, events);
    const raw = solveRaw(states, events);
    console.log(`one-event raw ${names(states, raw.best?.path ?? []).join(' ')}`);
    console.log(`one-event Dev 3.6 ${names(states, dev36.best?.path ?? []).join(' ')}`);
    console.log(`one-event Dev 3.7 ${names(states, dev37.best?.path ?? []).join(' ')}`);
    assert.equal(dev37.eligibility.heldExclusions.length, 0);
    assert.deepEqual(dev37.best?.path, dev36.best?.path);
    assert.equal(dev37.best?.cost, dev36.best?.cost);
    assert.equal(dev37.eligibility.iterations, dev36.eligibility.iterations);
  });

  check('NONE and the held collection can both be ineligible', () => {
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.4, Cs: 0.7 }),
      bar(['D', 'Cs'], { D: 0.4, Cs: 0.7 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    const dev37 = solve(states, events);
    const path = names(states, dev37.best?.path ?? []);
    console.log(`both-ineligible ${path.join(' ')} iterations ${dev37.eligibility.iterations}`);
    assert.deepEqual(path.slice(2, 4), ['C# Major', 'C# Major']);
    assert.ok((registryCollectionRegionMean(events, cSharp, 2, 3) ?? 0) >= 0.62);
    assert.equal(path.slice(2, 4).includes('NONE'), false);
    assert.equal(path.slice(2, 4).includes('D Minor'), false);
  });

  check('mixed per-bar winners do not stitch an alternative', () => {
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'A', 'B'], { D: 0.5, A: 0.9, B: 0.2 }),
      bar(['D', 'A', 'B'], { D: 0.5, A: 0.2, B: 0.9 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    assert.equal(registryCollectionRegionMean(events, dMinor, 2, 3), 0.5);
    assert.equal(registryCollectionRegionMean(events, altA, 2, 3), 0.55);
    assert.equal(registryCollectionRegionMean(events, altB, 2, 3), 0.55);
    const dev36 = solve(states, events, { heldCollectionFloor: false });
    const dev37 = solve(states, events);
    console.log(`mixed Dev 3.6 ${names(states, dev36.best?.path ?? []).join(' ')}`);
    console.log(`mixed Dev 3.7 ${names(states, dev37.best?.path ?? []).join(' ')}`);
    assert.equal(dev37.eligibility.heldExclusions.length, 0);
    assert.deepEqual(dev37.best?.path, dev36.best?.path);
  });

  check('below-floor field stays legal when no alternative clears the floor', () => {
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.5, Cs: 0.58 }),
      bar(['D', 'Cs'], { D: 0.5, Cs: 0.58 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    const dev37 = solve(states, events);
    const path = names(states, dev37.best?.path ?? []);
    console.log(`below-floor world ${path.join(' ')}`);
    assert.equal(registryCollectionRegionMean(events, dMinor, 2, 3), 0.5);
    assert.equal(registryCollectionRegionMean(events, cSharp, 2, 3), 0.58);
    assert.equal(dev37.eligibility.heldExclusions.length, 0);
    const survivor = dev37.eligibility.survivingBelowFloor.find((row) => row.heldCollectionName === 'D Minor');
    if (path[2] === 'D Minor' && path[3] === 'D Minor') {
      assert.ok(survivor);
      assert.ok((survivor?.bestAlternativeMean ?? 1) < 0.62);
    }
    assert.deepEqual(path.slice(2, 4), ['D Minor', 'D Minor']);
  });

  check('maximal below-floor stretch is not split, and a high region still yields its dip', () => {
    const four = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.58, Cs: 0.7 }),
      bar(['D', 'Cs'], { D: 0.58, Cs: 0.7 }),
      bar(['D', 'Cs'], { D: 0.58, Cs: 0.4 }),
      bar(['D', 'Cs'], { D: 0.58, Cs: 0.4 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    assert.ok((registryCollectionRegionMean(four, cSharp, 2, 3) ?? 0) >= 0.62);
    assert.ok((registryCollectionRegionMean(four, cSharp, 2, 5) ?? 1) < 0.62);
    const fourPath = solve(states, four);
    console.log(`four-stretch ${names(states, fourPath.best?.path ?? []).join(' ')}`);
    assert.equal(fourPath.eligibility.heldExclusions.length, 0);
    assert.deepEqual(names(states, fourPath.best?.path ?? []).slice(2, 6), ['D Minor', 'D Minor', 'D Minor', 'D Minor']);

    const sixteen = [
      ...repeat(7, bar(['D'], { D: high })),
      bar(['D', 'Cs'], { D: 0.5, Cs: 0.62 }),
      bar(['D', 'Cs'], { D: 0.5, Cs: 0.62 }),
      ...repeat(7, bar(['D'], { D: high })),
    ];
    const regionMean = registryCollectionRegionMean(sixteen, dMinor, 0, 15);
    assert.ok((regionMean ?? 0) >= 0.62);
    const dip = solve(states, sixteen);
    const dipNames = names(states, dip.best?.path ?? []);
    console.log(`sixteen-dip ${dipNames.join(' ')} iterations ${dip.eligibility.iterations}`);
    assert.equal(dip.eligibility.heldExclusions.length, 1);
    assert.equal(dip.eligibility.heldExclusions[0]?.start, 7);
    assert.equal(dip.eligibility.heldExclusions[0]?.end, 8);
    assert.deepEqual(dipNames.slice(7, 9), ['C# Major', 'C# Major']);
    assert.ok(dipNames.slice(0, 7).every((name) => name === 'D Minor'));
    assert.ok(dipNames.slice(9).every((name) => name === 'D Minor'));
  });

  check('collection-only path matches Dev 3.6', () => {
    const events = [
      bar(['D'], { D: 0.9 }),
      bar(['D', 'Cs'], { D: 0.8, Cs: 0.7 }),
      bar(['Cs'], { Cs: 0.9 }),
      bar(['Cs'], { Cs: 0.9 }),
    ];
    const dev36 = solve(states, events, { heldCollectionFloor: false });
    const dev37 = solve(states, events);
    assert.deepEqual(dev37.best?.path, dev36.best?.path);
    assert.equal(dev37.best?.cost, dev36.best?.cost);
    assert.equal(dev37.eligibility.heldExclusions.length, 0);
    assert.equal(dev37.eligibility.iterations, dev36.eligibility.iterations);
    assert.equal(names(states, dev37.best?.path ?? []).includes('NONE'), false);
  });

  check('correcting one stretch exposes the next, and exclusions stay monotonic', () => {
    const x = state('X', 'E', 'E Minor');
    const y = state('Y', 'F', 'F Minor');
    const local = [dMinor, x, y];
    const events = [
      ...repeat(2, bar(['D'], { D: high })),
      bar(['D', 'X'], { D: 0.4, X: 0.75 }),
      bar(['D', 'X'], { D: 0.4, X: 0.75 }),
      bar(['D', 'X', 'Y'], { D: 0.2, X: 0.5, Y: 0.63 }),
      bar(['D', 'X', 'Y'], { D: 0.2, X: 0.5, Y: 0.63 }),
      ...repeat(2, bar(['D'], { D: high })),
    ];
    const once = solve(local, events);
    const twice = solve(local, events);
    const path = names(local, once.best?.path ?? []);
    const bound = events.filter((event) => !event.silence).length * (local.length + 1) + 1;
    console.log(`cascade ${path.join(' ')} iterations ${once.eligibility.iterations}`);
    console.log(JSON.stringify(once.eligibility.rejected));
    console.log(JSON.stringify(once.eligibility.heldExclusions));
    assert.ok(once.eligibility.iterations >= 2);
    assert.ok(once.eligibility.iterations <= bound);
    assert.ok(once.eligibility.rejected.some((row) => row.iteration === 1) || once.eligibility.heldExclusions.some((row) => row.iteration === 1));
    assert.ok(once.eligibility.heldExclusions.some((row) => row.iteration >= 2));
    const iterations = once.eligibility.heldExclusions.map((row) => row.iteration);
    for (let index = 1; index < iterations.length; index += 1) {
      assert.ok(iterations[index]! >= iterations[index - 1]!);
    }
    assert.deepEqual(twice.best?.path, once.best?.path);
    assert.equal(twice.eligibility.iterations, once.eligibility.iterations);
    assert.deepEqual(twice.eligibility.heldExclusions, once.eligibility.heldExclusions);
    assert.equal(path[4] === 'NONE' && path[5] === 'NONE', false);
  });

  return rows;
}

const rows = runPentatonicDev37Tests();
if (rows.some((row) => !row.ok)) process.exit(1);
