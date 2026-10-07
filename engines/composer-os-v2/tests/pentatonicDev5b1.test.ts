/**
 * Pentatonic Engine Dev 5B.1 — slip landing and static-field direction.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev5b1.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from '../core/pentatonic/colourRegistry';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { degreeOf, type PentatonicCollectionView } from '../core/pentatonic/motifTransform';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import { assessGrounding } from '../core/pentatonic/pathIntelligence';
import {
  DEV5B_DEFAULT_METHOD,
  chooseSlipDirection,
  evaluateSlipLanding,
  planPentatonicOperator,
  realisePentatonicPhrase,
  selectPhraseByAdvice,
} from '../core/pentatonic/phraseOperators';
import { mod12 } from '../core/pentatonic/pitch';
import { listPentatonicArchetypes, PENTATONIC_REGISTRY_VERSION } from '../core/pentatonic/registry';
import type { BaseMotif } from '../core/motif/motifTypes';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const WWH_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ['04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
];

const C_MAJOR: PentatonicCollectionView = {
  name: 'C Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: 'HOME',
};

function motif(pitches: number[]): BaseMotif {
  return {
    id: 'cell',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: index, duration: 1 })),
  };
}

const cell = motif([60, 64, 67]);
const leap = motif([60, 67, 74, 76]);
const grounded = assessGrounding({ bassPitchClasses: [[0], [0], [0]] });

function slip(extra: Parameters<typeof realisePentatonicPhrase>[0] = { purpose: 'DEVELOPMENT', home: C_MAJOR }) {
  return realisePentatonicPhrase({
    purpose: 'DEVELOPMENT',
    home: C_MAJOR,
    motif: cell,
    explicitOutside: true,
    grounding: grounded,
    ...extra,
  });
}

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('semitone approach is a strong landing', () => {
    assert.equal(evaluateSlipLanding(66, 67).classification, 'STRONG');
    assert.equal(evaluateSlipLanding(66, 67).approachInterval, 1);
    const made = slip();
    assert.equal(made.phraseResult, 'PHRASE');
    assert.equal(made.slipLanding?.approachInterval, 1);
    assert.equal(made.slipLanding?.classification, 'STRONG');
    assert.equal(made.slipLanding?.finalOutsideNote, 66);
    assert.equal(made.slipLanding?.returnTarget, 67);
  });

  check('whole-tone landing is allowed and weaker', () => {
    assert.equal(evaluateSlipLanding(66, 64).classification, 'ACCEPTABLE');
    const made = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, returnKind: 'TARGET_NOTE', targetNotePc: 4 });
    assert.equal(made.phraseResult, 'PHRASE');
    assert.equal(made.slipLanding?.classification, 'ACCEPTABLE');
    assert.equal(made.slipLanding?.approachInterval, 2);
    assert.equal(made.advisory.slipWithoutReturn, false);
    assert.equal(selectPhraseByAdvice([{ id: 'whole', gceScore: 7, advisory: made.advisory }])?.id, 'whole');
  });

  check('a larger landing is not rejected', () => {
    assert.equal(evaluateSlipLanding(66, 61).classification, 'WEAK');
    assert.equal(evaluateSlipLanding(66, 61).approachInterval, 5);
    const made = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, returnKind: 'TARGET_NOTE', targetNotePc: 1 });
    assert.equal(made.phraseResult, 'PHRASE');
    assert.equal(made.slipLanding?.classification, 'WEAK');
    assert.notEqual(made.plan.operator, 'NONE');
    assert.equal(selectPhraseByAdvice([{ id: 'wide', gceScore: 9.2, advisory: made.advisory }])?.id, 'wide');
  });

  check('an explicit target note is the return', () => {
    const made = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, returnKind: 'TARGET_NOTE', targetNotePc: 4 });
    assert.equal(made.returnKind, 'TARGET_NOTE');
    assert.equal(mod12(made.slipLanding?.returnTarget ?? -1), 4);
    assert.equal(mod12(made.pitches[made.pitches.length - 1]!), 4);
  });

  check('a HOME-field member can be the return target', () => {
    const made = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, returnKind: 'HOME' });
    const target = made.slipLanding?.returnTarget ?? -1;
    assert.equal(degreeOf(target, C_MAJOR) !== null, true);
    assert.equal(mod12(target), 7);
  });

  check('a common tone can be the return target', () => {
    const made = slip({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      returnKind: 'COMMON_TONE',
      reseat: { preference: 'common-tone', bassPc: 0 },
    });
    assert.equal(mod12(made.slipLanding?.returnTarget ?? -1), 0);
    assert.equal(made.phraseResult, 'PHRASE');
    assert.equal(made.slipLanding?.classification, 'WEAK');
  });

  check('a static field defaults to a downward slip', () => {
    const made = slip();
    assert.equal(made.slipDirection?.staticField, true);
    assert.equal(made.slipDirection?.label, 'DOWN');
    assert.equal(made.slipDirection?.basis, 'DEFAULT');
    assert.equal(made.slipDirection?.semitones, -1);
    assert.ok(made.pitches.includes(59));
  });

  check('context can override the downward default', () => {
    const favour = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, favourSlipDirection: 1 });
    assert.equal(favour.slipDirection?.label, 'UP');
    assert.equal(favour.slipDirection?.basis, 'CONTEXT OVERRIDE');
    const held = slip({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      reseat: { preference: 'held', heldPc: 8 },
    });
    assert.equal(held.slipDirection?.label, 'UP');
    assert.equal(held.slipDirection?.basis, 'CONTEXT OVERRIDE');
    const moving = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, harmonyBars: ['Cmaj7', 'Dm7'] });
    assert.equal(moving.slipDirection?.staticField, false);
    assert.equal(moving.slipDirection?.label, 'UP');
    assert.equal(moving.slipDirection?.basis, 'DEFAULT');
    const low = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: motif([40, 48, 55]),
      explicitOutside: true,
      grounding: grounded,
    });
    assert.equal(low.slipDirection?.label, 'UP');
    assert.equal(low.slipDirection?.basis, 'CONTEXT OVERRIDE');
    const resolved = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, returnKind: 'TARGET_NOTE', targetNotePc: 9 });
    assert.equal(resolved.slipDirection?.label, 'UP');
    assert.equal(resolved.slipDirection?.basis, 'CONTEXT OVERRIDE');
    assert.equal(resolved.slipLanding?.classification, 'STRONG');
  });

  check('an explicit upward request is kept', () => {
    const made = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, slipDirection: 1 });
    assert.equal(made.slipDirection?.label, 'UP');
    assert.equal(made.slipDirection?.basis, 'CONTEXT OVERRIDE');
    assert.equal(made.slipDirection?.semitones, 1);
    assert.ok(made.pitches.includes(68));
  });

  check('M-DEG stays the default map and M-NEAR stays available', () => {
    assert.equal(DEV5B_DEFAULT_METHOD, 'M-DEG');
    const degree = slip();
    const near = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, motif: leap, method: 'M-NEAR', slipDirection: 1 });
    const degreeUp = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, motif: leap, method: 'M-DEG', slipDirection: 1 });
    assert.equal(degree.method, 'M-DEG');
    assert.equal(degree.plan.method, 'M-DEG');
    assert.ok(degree.lineage?.chain.includes('M-DEG'));
    assert.equal(near.method, 'M-NEAR');
    assert.notDeepEqual(near.pitches, degreeUp.pitches);
    const lineage = chooseSlipDirection({
      staticField: true,
      upResolvesBetter: false,
      registerFavoursUp: false,
      degreeLineageFavoursUp: true,
    });
    assert.equal(lineage.label, 'UP');
    assert.equal(lineage.basis, 'CONTEXT OVERRIDE');
  });

  check('slip still needs grounding and stays inside the outside budget', () => {
    const bare = assessGrounding({});
    assert.notEqual(planPentatonicOperator({
      purpose: 'MOTIF',
      hasMotif: true,
      grounding: bare,
      explicitOutside: true,
    }).operator, 'SLIP');
    assert.equal(planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: grounded,
      explicitOutside: true,
      budget: 'LOW',
      outsideDevicesAlreadyUsed: 0,
    }).operator, 'SLIP');
    assert.notEqual(planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: grounded,
      explicitOutside: true,
      budget: 'LOW',
      outsideDevicesAlreadyUsed: 1,
    }).operator, 'SLIP');
    const open = slip({ purpose: 'DEVELOPMENT', home: C_MAJOR, returnKind: 'NONE' });
    assert.equal(open.returnKind, 'NONE');
    assert.equal(open.advisory.slipWithoutReturn, false);
    assert.equal(open.slipLanding?.returnTarget, null);
    assert.equal(open.slipLanding?.classification, null);
  });

  check('path costs and both registries stay frozen', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
    assert.deepEqual(listPentatonicArchetypes().map((item) => item.id), ['major_pentatonic', 'minor_pentatonic']);
    assert.equal(PENTATONIC_COLOUR_REGISTRY_VERSION, 'pentatonic-colour-registry-5a');
    assert.equal(listPentatonicColourResources().length, 20);
  });

  check('WWH leadsheet sources are unchanged', () => {
    for (const [file, sha] of WWH_SOURCES) {
      const digest = createHash('sha256').update(fs.readFileSync(`${ALBUM}/${file}`)).digest('hex');
      assert.equal(digest, sha, file);
    }
  });

  return rows;
}

const results = run();
const failed = results.filter((row) => !row.ok);
for (const row of results) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${results.length - failed.length}/${results.length}`);
if (failed.length > 0) process.exit(1);
