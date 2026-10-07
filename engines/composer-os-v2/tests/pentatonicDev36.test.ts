/**
 * Pentatonic Engine Dev 3.6 — NONE eligibility.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev36.test.ts
 */
import assert from 'node:assert/strict';
import { DEFAULT_PENTATONIC_SCORING } from '../core/pentatonic/evaluate';
import { PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { bestRegistryRegionMean, optimizePentatonicPathWithNoneEligibility } from '../core/pentatonic/noneEligibility';
import { optimizePentatonicPath, type OptimizerEvent, type OptimizerState } from '../core/pentatonic/optimizePath';
import {
  DEFAULT_PENTATONIC_PATH_CONFIG,
  PENTATONIC_PATH_CONFIG_FINGERPRINT,
  PENTATONIC_PATH_CONFIG_VERSION,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_4,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_5,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_6,
} from '../core/pentatonic/pathConfig';
import { parseNoteToken } from '../core/pentatonic/pitch';
import { getPentatonicArchetype } from '../core/pentatonic/registry';

const FLOOR = DEFAULT_PENTATONIC_SCORING.minimumSuitability;

function collection(root: string): number[] {
  const note = parseNoteToken(root);
  const archetype = getPentatonicArchetype('major_pentatonic');
  if (!note || !archetype) throw new Error(`missing ${root}`);
  return archetype.intervals.map((interval) => (note.pc + interval) % 12);
}

function state(id: string, root: string | null, name: string): OptimizerState {
  return {
    id,
    pitchSet: root ? collection(root) : null,
    archetypeId: root ? 'major_pentatonic' : null,
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

function solve(states: OptimizerState[], events: OptimizerEvent[]) {
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
    FLOOR
  );
}

function names(states: OptimizerState[], path: readonly number[]): string[] {
  return path.map((index) => states[index]?.name ?? 'NONE');
}

export function runPentatonicDev36Tests(): { ok: boolean; name: string }[] {
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

  const flank = state('F', 'C', 'C Major');
  const field = state('B', 'C#', 'C# Major');
  const other = state('D', 'F#', 'F# Major');
  const third = state('G', 'A', 'A Major');
  const states = [flank, field, other, third];
  const high = 0.95;

  check('config 1.3 keeps Dev 3.5 fingerprint historical', () => {
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_4, 'pentatonic-path-config-1.1');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_5, 'pentatonic-path-config-1.2');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_6, 'pentatonic-path-config-1.3');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION, 'pentatonic-path-config-1.4');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, '27bf91d1cb5995f4246d06609dbe1d54dc1f5b27cc99676f5512cf5b423c398c');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, 'acd91358d754dbabf6132ebdb6b0f1b28cead13c28daeb35f9ff0e1bc231dc8f');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, 'ef43cf14487dfdc85c93075ae4eda977e4bd984396a8052646a4d1593b849b97');
    const live = pentatonicFrozenConfigFingerprint();
    assert.equal(PENTATONIC_PATH_CONFIG_FINGERPRINT, live);
    assert.notEqual(live, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5);
    assert.equal(FLOOR, 0.62);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    console.log(`LIVE FINGERPRINT ${live}`);
  });

  check('accepted two-bar field stays pitched', () => {
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['B'], { B: 0.69 }),
      bar(['B'], { B: 0.69 }),
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
    ];
    const raw = names(states, solveRaw(states, events).best?.path ?? []);
    const wrapped = solve(states, events);
    const path = names(states, wrapped.best?.path ?? []);
    console.log(`accepted two-bar Dev 3.5 ${raw.join(' ')}`);
    console.log(`accepted two-bar Dev 3.6 ${path.join(' ')} iterations ${wrapped.eligibility.iterations}`);
    assert.deepEqual(raw, ['C Major', 'C Major', 'NONE', 'NONE', 'C Major', 'C Major']);
    assert.deepEqual(path, ['C Major', 'C Major', 'C# Major', 'C# Major', 'C Major', 'C Major']);
    assert.equal(wrapped.eligibility.rejected.length, 1);
    assert.equal(wrapped.eligibility.rejected[0]?.collectionName, 'C# Major');
    assert.ok((wrapped.eligibility.rejected[0]?.meanSuitability ?? 0) >= 0.62);
    assert.equal(wrapped.eligibility.surviving.length, 0);
  });

  check('poor two-bar field can still choose NONE', () => {
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['B', 'D', 'G'], { B: 0.5, D: 0.4, G: 0.3 }),
      bar(['B', 'D', 'G'], { B: 0.5, D: 0.4, G: 0.3 }),
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
    ];
    const wrapped = solve(states, events);
    const path = names(states, wrapped.best?.path ?? []);
    console.log(`poor two-bar ${path.join(' ')}`);
    assert.deepEqual(path, ['C Major', 'C Major', 'NONE', 'NONE', 'C Major', 'C Major']);
    assert.equal(wrapped.eligibility.rejected.length, 0);
    const mean = bestRegistryRegionMean(states, events, 2, 3);
    assert.ok(mean);
    assert.ok(mean.meanSuitability <= 0.5);
    assert.ok(mean.meanSuitability < 0.62);
  });

  check('one-bar severe collapse can still choose NONE', () => {
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['F', 'B'], { F: 0.2, B: 0.1 }),
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
    ];
    const wrapped = solve(states, events);
    const path = names(states, wrapped.best?.path ?? []);
    console.log(`one-bar collapse ${path.join(' ')}`);
    assert.deepEqual(path, ['C Major', 'C Major', 'NONE', 'C Major', 'C Major']);
    assert.equal(wrapped.eligibility.rejected.length, 0);
    assert.ok((wrapped.eligibility.surviving[0]?.meanSuitability ?? 1) < 0.62);
  });

  check('one-bar accepted field makes NONE ineligible', () => {
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['B'], { B: 0.62 }),
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
    ];
    const raw = names(states, solveRaw(states, events).best?.path ?? []);
    const wrapped = solve(states, events);
    const path = names(states, wrapped.best?.path ?? []);
    console.log(`one-bar accepted Dev 3.5 ${raw.join(' ')} Dev 3.6 ${path.join(' ')}`);
    assert.equal(raw[2], 'NONE');
    assert.equal(path[2], 'C# Major');
    assert.notEqual(path[2], 'NONE');
    assert.ok((wrapped.eligibility.rejected[0]?.meanSuitability ?? 0) >= 0.62);
  });

  check('four-bar moderate field leaves NONE eligible', () => {
    const right = state('R', 'Eb', 'Eb Major');
    const local = [flank, field, right];
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['B', 'R'], { B: 0.55, R: 0.4 }),
      bar(['B', 'R'], { B: 0.55, R: 0.4 }),
      bar(['B', 'R'], { B: 0.55, R: 0.4 }),
      bar(['B', 'R'], { B: 0.55, R: 0.4 }),
      bar(['R'], { R: high }),
      bar(['R'], { R: high }),
    ];
    const raw = solveRaw(local, events);
    const wrapped = solve(local, events);
    const rawNames = names(local, raw.best?.path ?? []);
    const path = names(local, wrapped.best?.path ?? []);
    console.log(`four-bar moderate Dev 3.5 ${rawNames.join(' ')}`);
    console.log(`four-bar moderate Dev 3.6 ${path.join(' ')} cost ${wrapped.best?.cost}`);
    assert.equal(wrapped.eligibility.rejected.length, 0);
    assert.deepEqual(path, rawNames);
    assert.equal(wrapped.best?.cost, raw.best?.cost);
    const noneStart = path.indexOf('NONE');
    if (noneStart >= 0) {
      const mean = bestRegistryRegionMean(local, events, noneStart, path.lastIndexOf('NONE'));
      assert.ok(mean);
      assert.ok(mean.meanSuitability < 0.62);
      console.log(`four-bar NONE best ${mean.collectionName} mean ${mean.meanSuitability}`);
    }
  });

  check('mixed per-bar winners do not block NONE', () => {
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['B', 'D'], { B: 0.9, D: 0.2 }),
      bar(['B', 'D'], { B: 0.2, D: 0.9 }),
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
    ];
    const meanB = bestRegistryRegionMean([field], events, 2, 3);
    const meanD = bestRegistryRegionMean([other], events, 2, 3);
    assert.equal(meanB?.meanSuitability, 0.55);
    assert.equal(meanD?.meanSuitability, 0.55);
    const raw = names(states, solveRaw(states, events).best?.path ?? []);
    const wrapped = solve(states, events);
    const path = names(states, wrapped.best?.path ?? []);
    console.log(`mixed Dev 3.5 ${raw.join(' ')} Dev 3.6 ${path.join(' ')}`);
    assert.ok((meanB?.meanSuitability ?? 1) < 0.62);
    assert.ok((meanD?.meanSuitability ?? 1) < 0.62);
    assert.equal(wrapped.eligibility.rejected.length, 0);
    assert.deepEqual(path, raw);
    assert.equal(path[2], 'NONE');
    assert.equal(path[3], 'NONE');
  });

  check('coherent collection blocks NONE even when it is not best on every bar', () => {
    const events = [
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
      bar(['B', 'D'], { B: 0.5, D: 0.9 }),
      bar(['B', 'D'], { B: 0.8, D: 0.4 }),
      bar(['F'], { F: high }),
      bar(['F'], { F: high }),
    ];
    const meanB = bestRegistryRegionMean([field], events, 2, 3);
    const meanD = bestRegistryRegionMean([other], events, 2, 3);
    console.log(`coherent means B ${meanB?.meanSuitability} D ${meanD?.meanSuitability}`);
    assert.equal(meanB?.meanSuitability, 0.65);
    assert.equal(meanD?.meanSuitability, 0.65);
    const raw = names(states, solveRaw(states, events).best?.path ?? []);
    const wrapped = solve(states, events);
    const path = names(states, wrapped.best?.path ?? []);
    console.log(`coherent Dev 3.5 ${raw.join(' ')} Dev 3.6 ${path.join(' ')}`);
    assert.equal(raw[2], 'NONE');
    assert.equal(raw[3], 'NONE');
    assert.notEqual(path[2], 'NONE');
    assert.notEqual(path[3], 'NONE');
    assert.ok(wrapped.eligibility.rejected.some((region) => region.meanSuitability >= 0.62));
  });

  check('collection-only path matches Dev 3.5', () => {
    const events = [
      bar(['F'], { F: 0.9 }),
      bar(['F', 'D'], { F: 0.8, D: 0.7 }),
      bar(['D'], { D: 0.9 }),
      bar(['D'], { D: 0.9 }),
    ];
    const raw = solveRaw(states, events);
    const wrapped = solve(states, events);
    assert.deepEqual(wrapped.best?.path, raw.best?.path);
    assert.equal(wrapped.best?.cost, raw.best?.cost);
    assert.equal(wrapped.eligibility.iterations, 1);
    assert.equal(wrapped.eligibility.rejected.length, 0);
    assert.equal(names(states, wrapped.best?.path ?? []).includes('NONE'), false);
  });

  check('a later NONE region is caught on the next iteration', () => {
    const opening = state('C', 'D', 'D Major');
    const island = state('B', 'C#', 'C# Major');
    const close = state('A', 'C', 'C Major');
    const local = [opening, island, close];
    const events = [
      bar(['C', 'B'], { C: 0.8, B: 0.65 }),
      bar(['C', 'B'], { C: 0.8, B: 0.65 }),
      bar(['B'], { B: 0.69 }),
      bar(['B'], { B: 0.69 }),
      bar(['C'], { C: 0.7 }),
      bar(['C'], { C: 0.7 }),
      bar(['A'], { A: 0.99 }),
      bar(['A'], { A: 0.99 }),
    ];
    const raw = names(local, solveRaw(local, events).best?.path ?? []);
    const wrapped = solve(local, events);
    const again = solve(local, events);
    const path = names(local, wrapped.best?.path ?? []);
    console.log(`iteration Dev 3.5 ${raw.join(' ')}`);
    console.log(`iteration Dev 3.6 ${path.join(' ')} iterations ${wrapped.eligibility.iterations}`);
    console.log(JSON.stringify(wrapped.eligibility.rejected));
    assert.deepEqual(raw, ['D Major', 'D Major', 'NONE', 'NONE', 'D Major', 'D Major', 'C Major', 'C Major']);
    assert.equal(wrapped.eligibility.iterations, 3);
    assert.equal(wrapped.eligibility.rejected.length, 2);
    assert.equal(wrapped.eligibility.rejected[0]?.iteration, 1);
    assert.equal(wrapped.eligibility.rejected[0]?.start, 2);
    assert.equal(wrapped.eligibility.rejected[0]?.collectionName, 'C# Major');
    assert.equal(wrapped.eligibility.rejected[1]?.iteration, 2);
    assert.equal(wrapped.eligibility.rejected[1]?.start, 4);
    assert.equal(wrapped.eligibility.rejected[1]?.collectionName, 'D Major');
    assert.ok((wrapped.eligibility.rejected[1]?.meanSuitability ?? 0) >= 0.62);
    assert.equal(path.includes('NONE'), false);
    assert.deepEqual(again.best?.path, wrapped.best?.path);
    assert.equal(again.eligibility.iterations, wrapped.eligibility.iterations);
  });

  return rows;
}

const rows = runPentatonicDev36Tests();
if (rows.some((row) => !row.ok)) process.exit(1);
