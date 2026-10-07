/**
 * Pentatonic Engine Dev 5B — path and phrase intelligence.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev5b.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from '../core/pentatonic/colourRegistry';
import { COLOUR_VOCABULARY_ENTERS_PATH } from '../core/pentatonic/colourEvaluate';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { collectionPitchClasses, degreeOf, maxAdjacentCollectionRun, type PentatonicCollectionView } from '../core/pentatonic/motifTransform';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import {
  assessGrounding,
  experimentalColourResourceAllowed,
  interpretPentatonicPath,
  preferCoherentPath,
  slicesFromPathEvents,
  type PathSlice,
} from '../core/pentatonic/pathIntelligence';
import {
  DEV5B_DEFAULT_METHOD,
  DEV5B_REJECTED_BEHAVIOURS,
  advisePentatonicPhrase,
  antiLickFindings,
  fourNoteSubset,
  planPentatonicOperator,
  realisePentatonicPhrase,
  reseatLanding,
  selectPhraseByAdvice,
} from '../core/pentatonic/phraseOperators';
import { mod12 } from '../core/pentatonic/pitch';
import { listPentatonicArchetypes, PENTATONIC_REGISTRY_VERSION } from '../core/pentatonic/registry';
import type { BaseMotif } from '../core/motif/motifTypes';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const BLACK_AURA = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V1.1.musicxml';
const BLACK_AURA_SHA = 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb';

const C_MAJOR: PentatonicCollectionView = {
  name: 'C Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: 'HOME',
};

const AB_MAJOR: PentatonicCollectionView = {
  name: 'Ab Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'Ab',
  homeRelationshipLabel: null,
};

const D_MAJOR: PentatonicCollectionView = {
  name: 'D Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'D',
  homeRelationshipLabel: null,
};

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function motif(pitches: number[]): BaseMotif {
  return {
    id: 'cell',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: index, duration: 1 })),
  };
}

function slice(name: string, label: string, pcs: readonly number[] | null): PathSlice {
  return {
    sourceLabel: label,
    chosenId: name === 'NONE' ? 'NONE' : name,
    chosenName: name,
    pitchClasses: pcs,
  };
}

function pcs(collection: PentatonicCollectionView): number[] {
  return collectionPitchClasses(collection);
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

  const home = pcs(C_MAJOR);
  const fMajor = [0, 2, 5, 7, 9];
  const outside = [1, 3, 6, 8, 10];
  const suspended = [2, 4, 7, 9, 11];
  const ambiguous = [0, 3, 5, 7, 10];
  const grounded = assessGrounding({ bassPitchClasses: [[0], [0], [0]] });
  const bare = assessGrounding({});
  const leap = motif([60, 67, 74, 76]);

  check('cell lineage keeps the parent and a short chain', () => {
    const made = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: leap,
      grounding: grounded,
    });
    assert.equal(made.phraseResult, 'PHRASE');
    assert.equal(made.phraseEngineCalled, true);
    assert.equal(made.phraseIntent, 'guitar_lead');
    assert.equal(made.musicContext?.presetId, 'guitar_bass_duo');
    assert.ok(made.lineage);
    assert.deepEqual(made.lineage?.parentCell, [60, 67, 74, 76]);
    assert.ok(made.lineage?.chain.includes('original'));
    assert.equal(made.lineage?.identityPreserved, true);
    assert.equal(made.plan.operator, 'CELL_LINEAGE');
    assert.equal(DEV5B_DEFAULT_METHOD, 'M-DEG');
  });

  check('a four-note subset is material and does not require the fifth', () => {
    const subset = fourNoteSubset(C_MAJOR, 4);
    assert.equal(subset.length, 4);
    const classes = new Set(subset.map((pitch) => mod12(pitch)));
    assert.equal(classes.size, 4);
    assert.equal(classes.has(pcs(C_MAJOR)[4]!), false);
    const made = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: motif(subset),
      grounding: grounded,
    });
    assert.equal(made.phraseResult, 'PHRASE');
    assert.equal(made.lineage?.fourNoteSubset, true);
    assert.ok(new Set(made.pitches.map((pitch) => degreeOf(pitch, C_MAJOR))).size <= 4);
  });

  check('reseat changes the landing and keeps the collection', () => {
    const cell = [62, 64, 67, 60];
    const reseated = reseatLanding({
      pitches: cell,
      collection: C_MAJOR,
      preference: 'declared-tension',
      tensionPc: 7,
    });
    assert.equal(reseated.collectionUnchanged, true);
    assert.equal(reseated.landingPc, 7);
    assert.notEqual(mod12(reseated.pitches[reseated.pitches.length - 1]!), mod12(cell[cell.length - 1]!));
    assert.ok(reseated.pitches.every((pitch) => degreeOf(pitch, C_MAJOR) !== null));
    const made = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: motif(cell),
      explicitReseat: true,
      grounding: grounded,
      reseat: { preference: 'declared-tension', tensionPc: 7 },
    });
    assert.equal(made.plan.operator, 'RESEAT');
    assert.equal(made.plan.trajectory, 'HOME_COLOUR_HOME');
    assert.equal(made.collectionName, C_MAJOR.name);
    assert.equal(mod12(made.pitches[made.pitches.length - 1]!), 7);
    assert.ok(made.pitches.every((pitch) => degreeOf(pitch, C_MAJOR) !== null));
  });

  check('slip is one semitone, M-DEG by default, and it returns home', () => {
    const made = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      slipDirection: 1,
    });
    assert.equal(made.plan.operator, 'SLIP');
    assert.equal(made.method, 'M-DEG');
    assert.equal(made.lineage?.identityPreserved, true);
    assert.equal(made.returnKind, 'HOME');
    assert.equal(made.advisory.slipWithoutReturn, false);
    assert.equal(degreeOf(made.pitches[made.pitches.length - 1]!, C_MAJOR) !== null, true);
    const outsideNotes = made.pitches.filter((pitch) => degreeOf(pitch, C_MAJOR) === null);
    assert.ok(outsideNotes.length > 0);
    assert.ok(outsideNotes.length < made.pitches.length);
    assert.equal(made.advisory.excessiveOutside, false);
  });

  check('M-NEAR stays available and is not the slip default', () => {
    const degree = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      method: 'M-DEG',
      slipDirection: 1,
    });
    const near = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      method: 'M-NEAR',
      slipDirection: 1,
    });
    assert.equal(degree.method, 'M-DEG');
    assert.equal(near.method, 'M-NEAR');
    assert.notDeepEqual(near.pitches, degree.pitches);
  });

  check('a declared return can be a common tone, a target, a stable field, or silence', () => {
    const common = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      returnKind: 'COMMON_TONE',
      reseat: { preference: 'common-tone', bassPc: 0 },
    });
    assert.equal(mod12(common.pitches[common.pitches.length - 1]!), 0);
    const target = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      returnKind: 'TARGET_NOTE',
      targetNotePc: 4,
    });
    assert.equal(mod12(target.pitches[target.pitches.length - 1]!), 4);
    const stable = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      returnKind: 'STABILISED_FIELD',
    });
    assert.equal(mod12(stable.pitches[stable.pitches.length - 1]!), 0);
    const rest = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: C_MAJOR,
      motif: leap,
      explicitOutside: true,
      grounding: grounded,
      returnKind: 'NONE',
    });
    assert.equal(rest.returnKind, 'NONE');
    assert.equal(rest.advisory.slipWithoutReturn, false);
    assert.equal(degreeOf(rest.pitches[rest.pitches.length - 1]!, C_MAJOR), null);
  });

  check('outside budget stays conservative and repeated slips add friction', () => {
    assert.equal(planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: grounded,
      explicitOutside: true,
      budget: 'LOW',
      outsideDevicesAlreadyUsed: 0,
    }).operator, 'SLIP');
    const second = planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: grounded,
      explicitOutside: true,
      budget: 'LOW',
      outsideDevicesAlreadyUsed: 1,
    });
    assert.notEqual(second.operator, 'SLIP');
    assert.match(second.friction ?? '', /LOW|second/);
    const moderate = planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: grounded,
      explicitOutside: true,
      budget: 'MODERATE',
      outsideDevicesAlreadyUsed: 1,
    });
    assert.equal(moderate.operator, 'SLIP');
    assert.match(moderate.friction ?? '', /friction/);
    const high = planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: grounded,
      explicitOutside: true,
      budget: 'HIGH',
      outsideDevicesAlreadyUsed: 2,
    });
    assert.notEqual(high.operator, 'SLIP');
    assert.match(high.friction ?? '', /third|sequence/);
  });

  check('outside behaviour waits for grounding', () => {
    assert.equal(bare.present, false);
    assert.equal(grounded.bassPedal, true);
    assert.equal(grounded.present, true);
    const ungrounded = planPentatonicOperator({
      purpose: 'MOTIF',
      hasMotif: true,
      grounding: bare,
      explicitOutside: true,
    });
    assert.notEqual(ungrounded.operator, 'SLIP');
    assert.notEqual(ungrounded.operator, 'TRITONE_PAIR');
    const held = assessGrounding({ heldPitchClasses: [[4]] });
    assert.equal(held.sustainedTone, true);
    assert.equal(planPentatonicOperator({
      purpose: 'DEVELOPMENT',
      hasMotif: true,
      grounding: held,
      explicitOutside: true,
    }).operator, 'SLIP');
  });

  check('tritone pair is one field and is not invented from one switch', () => {
    const once = interpretPentatonicPath([
      slice('Ab Major Pentatonic', '1', pcs(AB_MAJOR)),
      slice('D Major Pentatonic', '2', pcs(D_MAJOR)),
    ]);
    assert.equal(once.regions.some((region) => region.trajectory === 'TRITONE_PAIR_FIELD'), false);
    const almost = interpretPentatonicPath([
      slice('Ab Major Pentatonic', '1', pcs(AB_MAJOR)),
      slice('D Major Pentatonic', '2', pcs(D_MAJOR)),
      slice('Ab Major Pentatonic', '3', pcs(AB_MAJOR)),
    ]);
    assert.equal(almost.regions.some((region) => region.trajectory === 'TRITONE_PAIR_FIELD'), false);
    const established = interpretPentatonicPath([
      slice('Ab Major Pentatonic', '1', pcs(AB_MAJOR)),
      slice('D Major Pentatonic', '2', pcs(D_MAJOR)),
      slice('Ab Major Pentatonic', '3', pcs(AB_MAJOR)),
      slice('D Major Pentatonic', '4', pcs(D_MAJOR)),
    ]);
    assert.equal(established.regions.length, 1);
    assert.equal(established.regions[0]?.trajectory, 'TRITONE_PAIR_FIELD');
    assert.equal(established.regions[0]?.tritonePair?.sharedPitchClassCount, 0);
    assert.equal(established.pairInternalSwitchCount, 3);
    assert.equal(established.independentSwitchCount, 0);
    const phrase = realisePentatonicPhrase({
      purpose: 'DEVELOPMENT',
      home: AB_MAJOR,
      motif: motif([68, 70, 75, 77]),
      explicitOutside: true,
      pairAvailable: true,
      grounding: grounded,
      pair: { left: AB_MAJOR, right: D_MAJOR },
    });
    assert.equal(phrase.plan.operator, 'TRITONE_PAIR');
    assert.equal(phrase.plan.trajectory, 'TRITONE_PAIR_FIELD');
    assert.equal(phrase.lineage?.identityPreserved, true);
    assert.ok(phrase.pitches.length <= 8);
  });

  check('region arcs prefer one decision to a chain of switches', () => {
    const colour = interpretPentatonicPath(
      [
        slice('C Major Pentatonic', '1', home),
        slice('F Major Pentatonic', '2', fMajor),
        slice('C Major Pentatonic', '3', home),
      ],
      home
    );
    assert.equal(colour.regions.length, 1);
    assert.equal(colour.regions[0]?.trajectory, 'HOME_COLOUR_HOME');
    const slipped = interpretPentatonicPath(
      [
        slice('C Major Pentatonic', '1', home),
        slice('F# Major Pentatonic', '2', outside),
        slice('C Major Pentatonic', '3', home),
      ],
      home
    );
    assert.equal(slipped.regions[0]?.trajectory, 'HOME_OUTSIDE_HOME');
    const suspendedArc = interpretPentatonicPath(
      [
        slice('C Major Pentatonic', '1', home),
        slice('G Major Pentatonic', '2', suspended),
        slice('C Major Pentatonic', '3', home),
      ],
      home
    );
    assert.equal(suspendedArc.regions[0]?.trajectory, 'HOME_SUSPENDED_HOME');
    const resolution = interpretPentatonicPath(
      [
        slice('C Major Pentatonic', '1', home),
        slice('Eb Major Pentatonic', '2', ambiguous),
        slice('C Major Pentatonic', '3', home),
      ],
      home
    );
    assert.equal(resolution.regions[0]?.trajectory, 'HOME_AMBIGUOUS_RESOLUTION');
    const continuity = interpretPentatonicPath([slice('F Major Pentatonic', '1', fMajor)], home);
    assert.equal(continuity.regions[0]?.trajectory, 'CONTINUITY');
    const retained = interpretPentatonicPath([slice('F# Major Pentatonic', '1', outside)], home);
    assert.equal(retained.regions[0]?.trajectory, 'RETAIN_CURRENT_FIELD');
    const busy = interpretPentatonicPath(
      [0, 1, 2, 3, 4, 5].map((index) => slice(`field-${index}`, String(index + 1), [index, index + 2, index + 4, index + 7, index + 9].map((pc) => mod12(pc)))),
      home
    );
    const quiet = interpretPentatonicPath([slice('C Major Pentatonic', '1', home)], home);
    assert.equal(quiet.regions[0]?.trajectory, 'HOME');
    assert.equal(busy.unnecessarySwitching, true);
    assert.equal(preferCoherentPath([busy, quiet])?.compositionalDecisions, 1);
    assert.ok((preferCoherentPath([busy, quiet])?.compositionalDecisions ?? 9) < busy.compositionalDecisions);
  });

  check('NONE abstains and NO_PHRASE is silence', () => {
    const abstained = interpretPentatonicPath([
      slice('NONE', '1', null),
      slice('NONE', '2', null),
    ]);
    assert.equal(abstained.regions.length, 1);
    assert.equal(abstained.regions[0]?.trajectory, 'NONE');
    const silent = realisePentatonicPhrase({ purpose: 'NO_PHRASE', home: C_MAJOR, motif: leap });
    assert.equal(silent.phraseResult, 'NO_PHRASE');
    assert.equal(silent.phraseEngineCalled, false);
    assert.equal(silent.phrase, null);
    assert.notEqual(silent.pathTrajectory, 'NONE');
    assert.notEqual(silent.phraseResult, abstained.regions[0]?.trajectory);
    const missing = realisePentatonicPhrase({ purpose: 'MOTIF', home: C_MAJOR, motif: null });
    assert.equal(missing.phraseResult, 'NO_PHRASE');
    assert.equal(missing.phraseEngineCalled, false);
  });

  check('lyrical, counterline, and comping stay small', () => {
    const lyrical = planPentatonicOperator({
      purpose: 'LYRICAL_ANSWER',
      hasMotif: false,
      grounding: bare,
      explicitOutside: true,
    });
    assert.equal(lyrical.phraseResult, 'NO_PHRASE');
    const answer = realisePentatonicPhrase({
      purpose: 'LYRICAL_ANSWER',
      home: C_MAJOR,
      motif: leap,
      grounding: grounded,
      explicitOutside: true,
    });
    assert.equal(answer.plan.operator, 'RESEAT');
    assert.notEqual(answer.plan.operator, 'SLIP');
    const counter = realisePentatonicPhrase({
      purpose: 'COUNTERLINE',
      home: C_MAJOR,
      motif: motif([62, 67, 64]),
      grounding: grounded,
      reseat: { preference: 'bass', bassPc: 0 },
    });
    assert.equal(counter.plan.operator, 'RESEAT');
    assert.equal(mod12(counter.pitches[counter.pitches.length - 1]!), 0);
    const comping = realisePentatonicPhrase({
      purpose: 'COMPING_FRAGMENT',
      home: C_MAJOR,
      motif: leap,
    });
    assert.ok(comping.pitches.length >= 2 && comping.pitches.length <= 3);
    assert.ok(new Set(comping.pitches.map((pitch) => mod12(pitch))).size < 5);
  });

  check('scale runs and permutations are refused', () => {
    const scale = [60, 62, 64, 67];
    assert.equal(antiLickFindings(scale, C_MAJOR).scaleRun, true);
    assert.equal(antiLickFindings(scale, C_MAJOR).rejected, true);
    const permutations = [60, 62, 64, 67, 62, 64, 67, 60, 64, 67, 60, 62];
    assert.equal(antiLickFindings(permutations, C_MAJOR).permutationDump, true);
    const made = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: motif(scale),
      grounding: grounded,
    });
    assert.equal(made.phraseResult, 'PHRASE');
    assert.ok(made.lineage?.chain.includes('rotation'));
    assert.ok(maxAdjacentCollectionRun(made.pitches, C_MAJOR) < 3);
    assert.equal(made.advisory.scaleRun, false);
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('scale runs'));
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('INTENSIFY'));
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('fixed-interval SEQUENCE'));
  });

  check('advice does not let the higher GCE score win', () => {
    const quiet = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: leap,
      grounding: grounded,
    });
    const chosen = selectPhraseByAdvice([
      {
        id: 'busy',
        gceScore: 9.4,
        advisory: advisePentatonicPhrase({
          lineage: null,
          pitches: [60, 62, 64, 67, 69],
          home: C_MAJOR,
          operator: 'CELL_LINEAGE',
          grounding: bare,
          returned: true,
          distinctCollections: 1,
        }),
      },
      { id: 'quiet', gceScore: 6.1, advisory: quiet.advisory },
    ]);
    assert.equal(chosen?.id, 'quiet');
    assert.ok((chosen?.gceScore ?? 0) < 9);
  });

  check('missing return and weak grounding are advice, not a new GCE', () => {
    const advice = advisePentatonicPhrase({
      lineage: null,
      pitches: [61, 63, 65],
      home: C_MAJOR,
      operator: 'SLIP',
      grounding: bare,
      returned: false,
      distinctCollections: 4,
    });
    assert.equal(advice.slipWithoutReturn, true);
    assert.equal(advice.weakGrounding, true);
    assert.equal(advice.unnecessarySwitching, true);
    assert.ok(advice.notes.length >= 3);
  });

  check('Dev 5A registries and the Dev 3.7 fingerprint stay frozen', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
    assert.deepEqual(listPentatonicArchetypes().map((item) => item.id), ['major_pentatonic', 'minor_pentatonic']);
    assert.equal(PENTATONIC_COLOUR_REGISTRY_VERSION, 'pentatonic-colour-registry-5a');
    assert.equal(listPentatonicColourResources().length, 20);
    assert.equal(COLOUR_VOCABULARY_ENTERS_PATH, false);
    assert.equal(experimentalColourResourceAllowed('iwato'), false);
    assert.equal(experimentalColourResourceAllowed('iwato', true), true);
    assert.equal(listPentatonicArchetypes().length, 2);
  });

  check('Black Aura opening is one tritone-pair field', () => {
    const before = sha(BLACK_AURA);
    assert.equal(before, BLACK_AURA_SHA);
    const xml = fs.readFileSync(BLACK_AURA, 'utf8');
    const analysis = analyzePentatonicScore(xml);
    const reading = interpretPentatonicPath(slicesFromPathEvents(analysis.path.events), analysis.identity.home?.pitchClasses ?? null);
    const pair = reading.regions.find((region) => region.trajectory === 'TRITONE_PAIR_FIELD');
    assert.ok(pair);
    assert.equal(pair?.firstSourceLabel, '1');
    assert.equal(pair?.lastSourceLabel, '18');
    assert.equal(pair?.tritonePair?.sharedPitchClassCount, 0);
    assert.equal(reading.regions.filter((region) => region.trajectory === 'TRITONE_PAIR_FIELD').length, 1);
    assert.equal(reading.rawSwitchCount, 11);
    assert.equal(reading.pairInternalSwitchCount, 7);
    assert.equal(reading.independentSwitchCount, 4);
    assert.ok(reading.compositionalDecisions < reading.rawSwitchCount);
    assert.equal(sha(BLACK_AURA), before);
  });

  return rows;
}

const results = run();
const failed = results.filter((row) => !row.ok);
for (const row of results) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${results.length - failed.length}/${results.length}`);
if (failed.length > 0) process.exit(1);
