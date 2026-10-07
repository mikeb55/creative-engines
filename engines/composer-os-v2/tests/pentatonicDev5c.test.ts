/**
 * Pentatonic Engine Dev 5C — HOLD-FIELD, quartal field, WWH benchmark.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev5c.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from '../core/pentatonic/colourRegistry';
import { COLOUR_VOCABULARY_ENTERS_PATH, evaluatePentatonicColour } from '../core/pentatonic/colourEvaluate';
import { DEV5C_DISABLED_OPERATORS, DEV5C_PATH_PROMOTIONS, DEV5C_RETAINED_COLOUR } from '../core/pentatonic/dev5cReview';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { assessHoldField, harmonyEventsFromSymbols } from '../core/pentatonic/holdField';
import { degreeOf, type PentatonicCollectionView } from '../core/pentatonic/motifTransform';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import { assessGrounding, experimentalColourResourceAllowed, interpretPentatonicPath, slicesFromPathEvents } from '../core/pentatonic/pathIntelligence';
import {
  DEV5B_DEFAULT_METHOD,
  DEV5B_REJECTED_BEHAVIOURS,
  planPentatonicOperator,
  realisePentatonicPhrase,
  selectPhraseByAdvice,
} from '../core/pentatonic/phraseOperators';
import { mod12 } from '../core/pentatonic/pitch';
import { quartalLineFaults, quartalSubsets, realiseQuartalComp, realiseQuartalLine } from '../core/pentatonic/quartalField';
import { listPentatonicArchetypes, PENTATONIC_REGISTRY_VERSION } from '../core/pentatonic/registry';
import type { BaseMotif } from '../core/motif/motifTypes';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const WWH_SOURCES: ReadonlyArray<readonly [string, string, string]> = [
  ['01 Black Aura', '01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02 Palace Gates', '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03 The Mirror', '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ["04 Meet Me at Hobo's", '04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05 Orbit', '05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06 Wrong Turning', '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07 Impossible Metaphysics', '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08 Small Testimony', '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09 After Everything', '09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
];

const C_MAJOR: PentatonicCollectionView = {
  name: 'C Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: 'HOME',
};

const A_MINOR: PentatonicCollectionView = {
  name: 'A Minor Pentatonic',
  archetypeId: 'minor_pentatonic',
  referenceNote: 'A',
  homeRelationshipLabel: 'HOME',
};

function motif(pitches: number[]): BaseMotif {
  return {
    id: 'cell',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: index, duration: 1 })),
  };
}

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

  check('HOLD-FIELD keeps one resource across changing harmony', () => {
    const events = harmonyEventsFromSymbols([
      { sourceLabel: '1', chordSymbol: 'Am7' },
      { sourceLabel: '2', chordSymbol: 'Dm7' },
      { sourceLabel: '3', chordSymbol: 'Am7' },
    ]);
    const held = assessHoldField({
      resourceName: A_MINOR.name,
      resourcePitchClasses: [9, 0, 2, 4, 7],
      events,
      homePitchClasses: [9, 0, 2, 4, 7],
    });
    assert.equal(held.held, true);
    assert.equal(held.released, false);
    assert.equal(held.disposition, 'HOME');
    assert.equal(held.span.first, '1');
    assert.equal(held.span.last, '3');
    assert.ok(held.commonTones.includes(9));
    assert.ok(held.commonTones.includes(0));
    assert.match(held.reason, /HOLD-FIELD beat a switch/);
    assert.equal(held.changeCostReference, 0.35);
    const phrase = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: A_MINOR,
      motif: motif([69, 72, 76]),
      harmonyBars: ['Am7', 'Dm7', 'Am7'],
      grounding: assessGrounding({ motifIdentityRetained: true }),
    });
    assert.equal(phrase.plan.operator, 'HOLD_FIELD');
    assert.equal(phrase.phraseResult, 'PHRASE');
    assert.equal(phrase.holdField?.held, true);
    assert.equal(new Set(phrase.pitches.map((pitch) => degreeOf(pitch, A_MINOR) !== null)).size, 1);
  });

  check('HOLD-FIELD does not switch chord by chord when common tones persist', () => {
    const phrase = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: motif([60, 64, 67]),
      harmonyBars: ['Cmaj7', 'Am7', 'Dm7'],
      grounding: assessGrounding({ bassPitchClasses: [[0], [9], [2]] }),
    });
    assert.equal(phrase.plan.operator, 'HOLD_FIELD');
    assert.notEqual(phrase.plan.operator, 'SLIP');
    assert.equal(phrase.holdField?.perChangeCommonTones.every((change) => change.tones.length > 0), true);
  });

  check('HOLD-FIELD releases when the field stops being credible', () => {
    const released = assessHoldField({
      resourceName: C_MAJOR.name,
      resourcePitchClasses: [0, 2, 4, 7, 9],
      events: harmonyEventsFromSymbols([
        { sourceLabel: '4', chordSymbol: 'Cmaj7' },
        { sourceLabel: '5', chordSymbol: 'F#maj7' },
      ]),
      homePitchClasses: [0, 2, 4, 7, 9],
    });
    assert.equal(released.held, false);
    assert.equal(released.released, true);
    assert.match(released.reason, /Released/);
    const phrase = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: motif([60, 64, 67]),
      harmonyBars: ['Cmaj7', 'F#maj7'],
      grounding: assessGrounding({ motifIdentityRetained: true }),
    });
    assert.notEqual(phrase.plan.operator, 'HOLD_FIELD');
  });

  check('a single chord is not a HOLD-FIELD claim', () => {
    const single = assessHoldField({
      resourceName: C_MAJOR.name,
      resourcePitchClasses: [0, 2, 4, 7, 9],
      events: harmonyEventsFromSymbols([{ sourceLabel: '1', chordSymbol: 'Cmaj7' }]),
      homePitchClasses: [0, 2, 4, 7, 9],
    });
    assert.equal(single.held, false);
    assert.equal(single.released, false);
  });

  check('quartal comp is a short field subset with a fourth', () => {
    const comp = realiseQuartalComp([0, 2, 4, 7, 9]);
    assert.ok(comp);
    assert.ok(comp!.pitches.length >= 2 && comp!.pitches.length <= 3);
    assert.equal(comp!.incomplete, true);
    assert.ok(comp!.perfectFourths >= 1);
    assert.equal(comp!.fillsEveryBeat, false);
    assert.ok(comp!.density < 1);
    for (const pitch of comp!.pitches) assert.ok([0, 2, 4, 7, 9].includes(mod12(pitch)));
    const subsets = quartalSubsets([0, 2, 4, 7, 9]);
    assert.ok(subsets.some((subset) => subset.pitchClasses.length === 2));
    assert.ok(subsets.some((subset) => subset.pitchClasses.length === 3));
    assert.ok(subsets.every((subset) => subset.pitchClasses.length < 5));
    const phrase = realisePentatonicPhrase({ purpose: 'COMPING_FRAGMENT', home: C_MAJOR, motif: motif([60, 67, 74, 76]) });
    assert.equal(phrase.plan.operator, 'QUARTAL_COMP');
    assert.equal(phrase.phraseResult, 'PHRASE');
    assert.ok(phrase.pitches.length >= 2 && phrase.pitches.length <= 3);
    assert.equal(phrase.quartal?.kind, 'COMP');
  });

  check('quartal line keeps lineage and refuses a fourth sequence', () => {
    const line = realiseQuartalLine({ fieldPitchClasses: [0, 2, 4, 7, 9], parentPitches: [60, 64, 67] });
    assert.equal(line.declined, false);
    assert.equal(line.pitches.length, 3);
    assert.equal(line.perfectFourths, 1);
    assert.equal(line.mechanical, false);
    assert.equal(line.scaleRun, false);
    assert.equal(line.registerJump, false);
    assert.equal(line.lineagePreserved, true);
    for (const pitch of line.pitches) assert.ok([0, 2, 4, 7, 9].includes(mod12(pitch)));
    const stacked = quartalLineFaults([62, 67, 72], [0, 2, 4, 7, 9]);
    assert.equal(stacked.mechanical, true);
    const scale = quartalLineFaults([60, 62, 64, 67], [0, 2, 4, 7, 9]);
    assert.equal(scale.scaleRun, true);
    const jump = quartalLineFaults([60, 72], [0, 2, 4, 7, 9]);
    assert.equal(jump.registerJump, true);
    const phrase = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home: C_MAJOR,
      motif: motif([60, 64, 67]),
      quartalLine: true,
      grounding: assessGrounding({ motifIdentityRetained: true }),
    });
    assert.equal(phrase.plan.operator, 'QUARTAL_LINE');
    assert.equal(phrase.lineage?.identityPreserved, true);
    assert.equal(phrase.advisory.scaleRun, false);
    assert.equal(phrase.advisory.mechanicalInterval, false);
    const mechanical = selectPhraseByAdvice([
      {
        id: 'stacked',
        gceScore: 9,
        advisory: {
          lineageIdentity: 'weak',
          recognisableTransformation: false,
          excessiveOutside: false,
          unnecessarySwitching: false,
          slipWithoutReturn: false,
          weakGrounding: false,
          excessivePermutation: false,
          scaleRun: false,
          mechanicalInterval: true,
          overDensity: false,
          registerJump: false,
          notes: ['The same interval repeats in one direction.'],
        },
      },
      {
        id: 'cell',
        gceScore: 6,
        advisory: phrase.advisory,
      },
    ]);
    assert.equal(mechanical?.id, 'cell');
  });

  check('rejected operators stay off and path costs stay frozen', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.equal(DEV5B_DEFAULT_METHOD, 'M-DEG');
    assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
    assert.deepEqual(listPentatonicArchetypes().map((item) => item.id), ['major_pentatonic', 'minor_pentatonic']);
    assert.equal(PENTATONIC_COLOUR_REGISTRY_VERSION, 'pentatonic-colour-registry-5a');
    assert.equal(COLOUR_VOCABULARY_ENTERS_PATH, false);
    assert.equal(experimentalColourResourceAllowed('suspended_pentatonic'), false);
    assert.deepEqual(DEV5C_PATH_PROMOTIONS, []);
    assert.equal(listPentatonicColourResources().length, DEV5C_RETAINED_COLOUR.length);
    for (const item of DEV5C_DISABLED_OPERATORS) {
      assert.equal(planPentatonicOperator({
        purpose: 'DEVELOPMENT',
        hasMotif: true,
        grounding: assessGrounding({}),
      }).reason.includes(item), false);
    }
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('INTENSIFY'));
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('fixed-interval SEQUENCE'));
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('THROUGH one-cell-per-chord'));
    assert.ok(DEV5B_REJECTED_BEHAVIOURS.includes('guitar fret-shift realisation'));
  });

  check('nine WWH sources stay byte-identical and the path stays bounded', () => {
    const colourHits = new Map<string, number>();
    for (const [title, file, expected] of WWH_SOURCES) {
      const full = `${ALBUM}/${file}`;
      const before = sha(full);
      assert.equal(before, expected, file);
      const xml = fs.readFileSync(full, 'utf8');
      const analysis = analyzePentatonicScore(xml, { sourceFile: file, sourceSha256: before });
      assert.equal(sha(full), before, file);
      assert.equal(analysis.path.events.length, analysis.score.events.length);
      assert.ok(analysis.summary.distinctCollections <= 6, `${title} distinct ${analysis.summary.distinctCollections}`);
      assert.ok(
        analysis.summary.eventCount < 8 || analysis.summary.collectionChanges < analysis.summary.eventCount,
        `${title} switched on every event`
      );
      const reading = interpretPentatonicPath(slicesFromPathEvents(analysis.path.events), analysis.identity.home?.pitchClasses ?? null);
      assert.ok(reading.compositionalDecisions <= reading.rawSwitchCount + 1);
      const noneEvents = analysis.path.events.filter((event) => event.chosenName === 'NONE');
      assert.equal(noneEvents.length, analysis.summary.noneEventCount);
      for (const event of noneEvents) assert.equal(event.chosenId === 'NONE' || event.chosenName === 'NONE', true);
      if (title.startsWith('01')) {
        const pair = reading.regions.find((region) => region.trajectory === 'TRITONE_PAIR_FIELD');
        assert.equal(pair?.firstSourceLabel, '1');
        assert.equal(pair?.lastSourceLabel, '18');
        assert.equal(pair?.tritonePair?.sharedPitchClassCount, 0);
      }
      const chords = new Map(analysis.score.events.map((event) => [event.sourceLabel, event.chordSymbol ?? '']));
      let holds = 0;
      let releases = 0;
      for (const region of reading.regions) {
        if (region.trajectory === 'NONE' || region.trajectory === 'TRITONE_PAIR_FIELD') continue;
        if (region.collectionNames.length !== 1) continue;
        const events = harmonyEventsFromSymbols(
          region.sourceLabels.map((label) => ({ sourceLabel: label, chordSymbol: chords.get(label) ?? '' }))
        );
        const pcs = analysis.path.events.find((event) => event.sourceLabel === region.firstSourceLabel)?.canonicalPitchSet;
        if (!pcs) continue;
        const decision = assessHoldField({
          resourceName: region.collectionNames[0] ?? 'field',
          resourcePitchClasses: pcs,
          events,
          homePitchClasses: analysis.identity.home?.pitchClasses ?? null,
        });
        if (decision.held) holds += 1;
        if (decision.released) releases += 1;
      }
      const centre = analysis.identity.centre?.spelling ?? 'none';
      const home = analysis.homeReading;
      const quartal = analysis.identity.home?.pitchClasses ? quartalSubsets(analysis.identity.home.pitchClasses).length : 0;
      const colour = evaluatePentatonicColour({
        centreNote: analysis.identity.centre?.spelling ?? null,
        melodyNotes: analysis.score.events.flatMap((event) => event.melodyNotes ?? []).slice(0, 12),
        bassNotes: analysis.score.events.flatMap((event) => event.bassNotes ?? []).slice(0, 8),
        home: analysis.identity.home
          ? { resourceId: analysis.identity.home.archetypeId, referenceNote: analysis.identity.home.referenceNote }
          : null,
      });
      if (colour.selected) colourHits.set(colour.selected.resourceId, (colourHits.get(colour.selected.resourceId) ?? 0) + 1);
      for (const item of colour.shortlist) colourHits.set(item.resourceId, (colourHits.get(item.resourceId) ?? 0) + 1);
      console.log(
        [
          title,
          `CENTRE ${centre}`,
          `HOME ${home}`,
          `regions ${reading.regions.length}`,
          `raw switches ${reading.rawSwitchCount}`,
          `decisions ${reading.compositionalDecisions}`,
          `NONE events ${analysis.summary.noneEventCount}`,
          `HOLD ${holds}`,
          `RELEASE ${releases}`,
          `quartal subsets ${quartal}`,
          `outside friction ${reading.outsideFriction}`,
          `unnecessary switching ${reading.unnecessarySwitching}`,
          `colour ${colour.selected?.displayName ?? colour.disposition}`,
        ].join(' | ')
      );
    }
    const unseen = listPentatonicColourResources().filter((resource) => !colourHits.has(resource.id)).map((resource) => resource.id);
    console.log(`colour shortlist misses: ${unseen.join(', ') || 'none'}`);
    assert.equal(DEV5C_PATH_PROMOTIONS.length, 0);
  });

  return rows;
}

const results = run();
const failed = results.filter((row) => !row.ok);
for (const row of results) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${results.length - failed.length}/${results.length}`);
if (failed.length > 0) process.exit(1);
