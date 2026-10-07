/**
 * Pentatonic Engine Dev 3.5 — NONE boundary half-change.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev35.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { optimizePentatonicPath, type OptimizerEvent, type OptimizerState } from '../core/pentatonic/optimizePath';
import {
  DEFAULT_PENTATONIC_PATH_CONFIG,
  PENTATONIC_PATH_CONFIG_VERSION,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_4,
  PENTATONIC_PATH_CONFIG_VERSION_DEV_3_5,
  liquidChangeParts,
} from '../core/pentatonic/pathConfig';
import { parseNoteToken } from '../core/pentatonic/pitch';
import { getPentatonicArchetype } from '../core/pentatonic/registry';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const SOURCES = [
  ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ['04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
] as const;

const LIVE_FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';

function collection(root: string): number[] {
  const note = parseNoteToken(root);
  const archetype = getPentatonicArchetype('major_pentatonic');
  if (!note || !archetype) throw new Error(`missing ${root}`);
  return archetype.intervals.map((interval) => (note.pc + interval) % 12);
}

function state(id: string, pcs: number[] | null, name: string): OptimizerState {
  return {
    id,
    pitchSet: pcs,
    archetypeId: pcs ? 'major_pentatonic' : null,
    referenceNote: pcs ? name : null,
    homeRelationshipId: null,
    homeRelationshipLabel: null,
    name,
    displaySpelling: [],
  };
}

function solve(states: OptimizerState[], events: OptimizerEvent[]) {
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

function bar(ids: string[], scores: Record<string, number>): OptimizerEvent {
  return { feasibleStateIds: ids, localScoreById: scores, phraseBoundaryAfter: false };
}

export function runPentatonicDev35Tests(): { ok: boolean; name: string }[] {
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

  const aPcs = collection('A');
  const dPcs = collection('D');
  const aOnly = [state('A', aPcs, 'A')];
  const both = [state('A', aPcs, 'A'), state('D', dPcs, 'D')];
  const flank = 0.95;
  const noneBoundary = 0.5 * DEFAULT_PENTATONIC_PATH_CONFIG.changeCost;
  const noneBaseline = DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost;

  check('config version moved and Dev 3.4 fingerprint stays historical', () => {
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_4, 'pentatonic-path-config-1.1');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION_DEV_3_5, 'pentatonic-path-config-1.2');
    assert.equal(PENTATONIC_PATH_CONFIG_VERSION, 'pentatonic-path-config-1.4');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, '27bf91d1cb5995f4246d06609dbe1d54dc1f5b27cc99676f5512cf5b423c398c');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, 'acd91358d754dbabf6132ebdb6b0f1b28cead13c28daeb35f9ff0e1bc231dc8f');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_6, 'ef43cf14487dfdc85c93075ae4eda977e4bd984396a8052646a4d1593b849b97');
    assert.equal(pentatonicFrozenConfigFingerprint(), LIVE_FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.shortSegmentPenalty, 0.12);
    assert.equal(noneBoundary, 0.175);
  });

  check('one-bar interior, same collection, NONE wins only below 0.25', () => {
    const probe = (suitability: number) =>
      names(
        aOnly,
        solve(aOnly, [
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
          bar(['A'], { A: suitability }),
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
        ]).best?.path ?? []
      );
    const pitchedExtra = (suitability: number) => 1 - suitability;
    const noneExtra = noneBaseline + noneBoundary + noneBoundary;
    console.log(`A arithmetic pitched misfit 1-S vs NONE ${noneBaseline}+${noneBoundary}+${noneBoundary}=${noneExtra}`);
    console.log(`A crossover S < ${1 - noneExtra} ; tie at 0.25 goes to fewer switches`);
    assert.equal(noneExtra, 0.75);
    for (const suitability of [0.55, 0.3, 0.25]) {
      assert.deepEqual(probe(suitability), ['A', 'A', 'A', 'A', 'A']);
    }
    for (const suitability of [0.2, 0]) {
      assert.deepEqual(probe(suitability), ['A', 'A', 'NONE', 'A', 'A']);
    }
    assert.equal(pitchedExtra(0.25), noneExtra);
  });

  check('one-bar between two collections reports the change-cost crossover', () => {
    const change = liquidChangeParts({
      changed: true,
      previous: aPcs,
      next: dPcs,
      phraseBoundary: false,
      config: DEFAULT_PENTATONIC_PATH_CONFIG,
    });
    const noneRoute = noneBaseline + noneBoundary + noneBoundary;
    const crossover = 1 - (noneRoute - change.net);
    console.log(
      [
        `B A→D gross ${change.gross}`,
        `discounts common ${change.commonToneDiscount} displacement ${change.displacementDiscount} phrase ${change.phraseBoundaryDiscount}`,
        `discounted ${change.discounted}`,
        `floor ${change.changeFloor} applied ${change.floorApplied}`,
        `collection change net ${change.net}`,
        `NONE route ${noneBaseline}+${noneBoundary}+${noneBoundary}=${noneRoute}`,
        `pitched route (1-S)+${change.net}`,
        `NONE wins when 1-S > ${noneRoute - change.net}`,
        `crossover S < ${crossover}`,
      ].join(' | ')
    );
    assert.equal(change.net, 0.175);
    assert.ok(Math.abs(crossover - 0.425) < 1e-12);
    const probe = (suitability: number) =>
      names(
        both,
        solve(both, [
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
          bar(['A', 'D'], { A: suitability, D: suitability }),
          bar(['D'], { D: flank }),
          bar(['D'], { D: flank }),
        ]).best?.path ?? []
      );
    assert.equal(probe(0.425)[2], 'A');
    assert.notEqual(probe(0.425)[2], 'NONE');
    assert.equal(probe(0.42)[2], 'NONE');
    assert.equal(probe(0.55)[2] === 'NONE', false);
  });

  check('two-bar interior crossover is 0.425', () => {
    const noneRoute = noneBoundary + noneBaseline * 2 + noneBoundary;
    const crossover = 1 - noneRoute / 2;
    console.log(`C two-bar NONE ${noneRoute} vs 2*(1-S); crossover S < ${crossover}`);
    assert.ok(Math.abs(noneRoute - 1.15) < 1e-12);
    assert.ok(Math.abs(crossover - 0.425) < 1e-12);
    const probe = (suitability: number) =>
      names(
        aOnly,
        solve(aOnly, [
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
          bar(['A'], { A: suitability }),
          bar(['A'], { A: suitability }),
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
        ]).best?.path ?? []
      );
    assert.deepEqual(probe(0.425), ['A', 'A', 'A', 'A', 'A', 'A']);
    assert.deepEqual(probe(0.42), ['A', 'A', 'NONE', 'NONE', 'A', 'A']);
  });

  check('four-bar interior crossover is 0.5125', () => {
    const noneRoute = noneBoundary + noneBaseline * 4 + noneBoundary;
    const crossover = 1 - noneRoute / 4;
    console.log(`D four-bar NONE ${noneRoute} vs 4*(1-S); crossover S < ${crossover}`);
    assert.ok(Math.abs(noneRoute - 1.95) < 1e-12);
    assert.ok(Math.abs(crossover - 0.5125) < 1e-12);
    const probe = (suitability: number) =>
      names(
        aOnly,
        solve(aOnly, [
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
          ...Array.from({ length: 4 }, () => bar(['A'], { A: suitability })),
          bar(['A'], { A: flank }),
          bar(['A'], { A: flank }),
        ]).best?.path ?? []
      );
    assert.deepEqual(probe(0.5125), ['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A']);
    assert.deepEqual(probe(0.51), ['A', 'A', 'NONE', 'NONE', 'NONE', 'NONE', 'A', 'A']);
  });

  check('isolated passage tie at 0.60 still follows the existing tie-break', () => {
    const best = solve(aOnly, [bar(['A'], { A: 0.6 })]).best;
    assert.ok(best);
    assert.equal(best.cost, 0.4);
    assert.equal(names(aOnly, best.path)[0], 'NONE');
    assert.equal(best.distinct, 0);
    const pitched = solve(aOnly, [bar(['A'], { A: 0.61 })]).best;
    assert.equal(names(aOnly, pitched?.path ?? [])[0], 'A');
  });

  check('moderate one-bar friction 0.55 stays pitched', () => {
    const path = names(
      aOnly,
      solve(aOnly, [
        bar(['A'], { A: flank }),
        bar(['A'], { A: flank }),
        bar(['A'], { A: 0.55 }),
        bar(['A'], { A: flank }),
        bar(['A'], { A: flank }),
      ]).best?.path ?? []
    );
    assert.deepEqual(path, ['A', 'A', 'A', 'A', 'A']);
  });

  check('collection-only path matches the Dev 3.4 cost', () => {
    const best = solve(both, [
      bar(['A'], { A: 0.9 }),
      bar(['A', 'D'], { A: 0.8, D: 0.7 }),
      bar(['D'], { D: 0.9 }),
      bar(['D'], { D: 0.9 }),
    ]).best;
    assert.ok(best);
    assert.deepEqual(names(both, best.path), ['A', 'A', 'D', 'D']);
    assert.equal(best.cost, 0.775);
    assert.equal(best.breakdown.shortSegmentPenalty, 0);
    assert.equal(best.breakdown.changeCost, 0.35);
    assert.equal(best.breakdown.localMisfit, 0.5);
    assert.equal(best.breakdown.distinctResourcePenalty, 0.1);
  });

  check('a one-event collection still takes the short-segment penalty', () => {
    const best = solve(both, [
      bar(['A'], { A: 0.99 }),
      bar(['A'], { A: 0.99 }),
      bar(['D'], { D: 0.99 }),
      bar(['A'], { A: 0.99 }),
      bar(['A'], { A: 0.99 }),
    ]).best;
    assert.ok(best);
    assert.deepEqual(names(both, best.path), ['A', 'A', 'D', 'A', 'A']);
    assert.equal(best.breakdown.shortSegmentPenalty, DEFAULT_PENTATONIC_PATH_CONFIG.shortSegmentPenalty);
  });

  check('leaving a one-event NONE does not take the short-segment penalty', () => {
    const best = solve(aOnly, [
      bar(['A'], { A: flank }),
      bar(['A'], { A: flank }),
      bar(['A'], { A: 0 }),
      bar(['A'], { A: flank }),
      bar(['A'], { A: flank }),
    ]).best;
    assert.ok(best);
    assert.deepEqual(names(aOnly, best.path), ['A', 'A', 'NONE', 'A', 'A']);
    assert.equal(best.breakdown.shortSegmentPenalty, 0);
  });

  check('nine source hashes stay put', () => {
    for (const [file, sha] of SOURCES) {
      const full = `${ALBUM}/${file}`;
      assert.equal(createHash('sha256').update(fs.readFileSync(full)).digest('hex'), sha);
    }
  });

  return rows;
}

const rows = runPentatonicDev35Tests();
if (rows.some((row) => !row.ok)) process.exit(1);
