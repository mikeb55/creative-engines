/**
 * Pentatonic Engine Dev 6B — purpose and AUTO COLOR.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev6b.test.ts
 */
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import {
  DEV6B_REJECTED_BEHAVIOURS,
  MUSICAL_INTENTIONS,
  benchmarkAutoColor,
  parseMusicalIntentions,
  planAutoColor,
  type AutoColorContext,
} from '../core/pentatonic/autoColor';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import type { GroundingAssessment } from '../core/pentatonic/pathIntelligence';
import { listPentatonicArchetypes } from '../core/pentatonic/registry';

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

const GROUND: GroundingAssessment = {
  present: true,
  bassPedal: true,
  bassOstinato: false,
  sustainedTone: true,
  motifIdentity: true,
  explicitAnchor: false,
};

function scene(partial: AutoColorContext = {}): AutoColorContext {
  return {
    formFunction: 'continuation',
    duoRole: 'GUITAR_LEADS',
    currentResourceId: 'major_pentatonic',
    homeResourceId: 'major_pentatonic',
    homeKnown: true,
    fieldIsHome: true,
    hasMotif: true,
    lineageIdentity: 'clear',
    density: 'sparse',
    holdCredible: true,
    atPhraseBoundary: true,
    ...partial,
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

  check('intention phrases map into the controlled vocabulary', () => {
    assert.deepEqual(parseMusicalIntentions('darker').intentions, ['DARKER']);
    assert.deepEqual(parseMusicalIntentions('darken').intentions, ['DARKER']);
    assert.deepEqual(parseMusicalIntentions('brighter').intentions, ['BRIGHTER']);
    assert.deepEqual(parseMusicalIntentions('more outside').intentions, ['MORE_OUTSIDE']);
    assert.deepEqual(parseMusicalIntentions('keep the cell').intentions, ['RETAIN_MOTIF']);
    assert.deepEqual(parseMusicalIntentions('tension then resolve').intentions, ['TENSION_THEN_RESOLVE']);
    assert.deepEqual(parseMusicalIntentions('more space').intentions, ['MORE_SPACE']);
    assert.deepEqual(parseMusicalIntentions('suspended').intentions, ['MORE_SUSPENDED']);
    assert.deepEqual(parseMusicalIntentions('stay current').intentions, ['STAY_CURRENT']);
    const mixed = parseMusicalIntentions('darker + retain motif');
    assert.deepEqual(mixed.intentions, ['DARKER', 'RETAIN_MOTIF']);
    assert.equal(mixed.unknown.length, 0);
    const junk = parseMusicalIntentions('play like a weather report');
    assert.equal(junk.intentions.length, 0);
    assert.equal(junk.unknown.length, 1);
    assert.equal(MUSICAL_INTENTIONS.length, 20);
  });

  check('contradictory intentions keep the current field', () => {
    const plan = planAutoColor(scene({ text: 'darker + brighter' }));
    assert.equal(plan.outcome, 'KEEP_CURRENT');
    assert.equal(plan.fieldChanged, false);
    assert.ok(plan.conflicts.some((row) => row.includes('DARKER')));
    assert.equal(plan.generationNeeded, false);
  });

  check('darker and brighter take the smallest colour step', () => {
    const darker = planAutoColor(scene({ intentions: ['DARKER'] }));
    assert.equal(darker.targetResourceId, 'dorian_pentatonic');
    assert.equal(darker.fieldChanged, true);
    assert.equal(darker.method, 'M-DEG');
    assert.match(darker.rationale, /dark/i);
    assert.equal(/lower pitch|lower register/i.test(darker.rationale), false);
    assert.equal(darker.rejected.includes('remote altered'), true);
    const alreadyDark = planAutoColor(scene({ intentions: ['DARKER'], currentResourceId: 'minor_pentatonic', fieldIsHome: false }));
    assert.equal(alreadyDark.fieldChanged, false);
    assert.notEqual(alreadyDark.operator, 'SLIP');
    const brighter = planAutoColor(scene({ intentions: ['BRIGHTER'], currentResourceId: 'minor_pentatonic', fieldIsHome: false }));
    assert.equal(brighter.targetResourceId, 'dorian_pentatonic');
    assert.equal(brighter.fieldChanged, true);
    const alreadyBright = planAutoColor(scene({ intentions: ['BRIGHTER'] }));
    assert.equal(alreadyBright.fieldChanged, false);
    assert.match(alreadyBright.rationale, /bright/i);
  });

  check('stay current refuses a darker collection', () => {
    const plan = planAutoColor(scene({ intentions: ['DARKER', 'STAY_CURRENT'] }));
    assert.equal(plan.fieldChanged, false);
    assert.match(plan.rationale, /STAY_CURRENT/);
    assert.notEqual(plan.targetResourceId, 'dorian_pentatonic');
  });

  check('suspended plus stay current does not open a new field', () => {
    const plan = planAutoColor(scene({ intentions: ['MORE_SUSPENDED', 'STAY_CURRENT'] }));
    assert.equal(plan.fieldChanged, false);
    assert.equal(plan.targetColour, 'SUSPENDED');
    assert.equal(plan.operator === 'HOLD_FIELD' || plan.operator === 'RETAIN', true);
  });

  check('outside needs grounding, form permission, and a return', () => {
    const ungrounded = planAutoColor(scene({ intentions: ['MORE_OUTSIDE'], formFunction: 'development' }));
    assert.notEqual(ungrounded.operator, 'SLIP');
    assert.ok(ungrounded.conflicts.length > 0);
    const opening = planAutoColor(scene({ intentions: ['MORE_OUTSIDE'], formFunction: 'opening', grounding: GROUND }));
    assert.notEqual(opening.operator, 'SLIP');
    assert.ok(opening.conflicts.some((row) => /opening/i.test(row)));
    const earned = planAutoColor(scene({ intentions: ['MORE_OUTSIDE'], formFunction: 'development', grounding: GROUND }));
    assert.equal(earned.operator, 'SLIP');
    assert.equal(earned.homeReturn, true);
    assert.equal(earned.fieldChanged, false);
    assert.equal(earned.trajectory, 'HOME_OUTSIDE_HOME');
    assert.equal(earned.rejected.includes('maximise colour distance'), true);
    assert.notEqual(earned.targetResourceId, 'remote_altered');
    assert.notEqual(earned.targetResourceId, 'iwato');
  });

  check('less outside prefers the current field', () => {
    const plan = planAutoColor(scene({ intentions: ['LESS_OUTSIDE'], formFunction: 'development', grounding: GROUND }));
    assert.notEqual(plan.operator, 'SLIP');
    assert.equal(plan.fieldChanged, false);
    assert.equal(plan.operator === 'HOLD_FIELD' || plan.operator === 'RETAIN' || plan.operator === 'RESEAT', true);
  });

  check('tension then resolve is a return, not a cadence', () => {
    const plain = planAutoColor(scene({ intentions: ['TENSION_THEN_RESOLVE'], formFunction: 'continuation' }));
    assert.equal(plain.operator, 'RESEAT');
    assert.equal(plain.trajectory, 'HOME_COLOUR_HOME');
    assert.equal(plain.fieldChanged, false);
    assert.match(plain.returnBehaviour, /not a cadence/i);
    assert.equal(JSON.stringify(plain).includes('ii'), false);
    const earned = planAutoColor(scene({ intentions: ['TENSION_THEN_RESOLVE'], formFunction: 'development', grounding: GROUND }));
    assert.equal(earned.operator, 'SLIP');
    assert.equal(earned.homeReturn, true);
    assert.equal(earned.lineagePreserved, true);
  });

  check('retain motif keeps the parent cell and M-DEG', () => {
    const plan = planAutoColor(scene({ intentions: ['RETAIN_MOTIF', 'DEVELOP'], formFunction: 'development' }));
    assert.equal(plan.lineagePreserved, true);
    assert.equal(plan.method, 'M-DEG');
    assert.equal(plan.operator === 'CELL_LINEAGE' || plan.operator === 'QUARTAL_LINE' || plan.operator === 'RESEAT', true);
    assert.equal(plan.generationNeeded, true);
    assert.equal(plan.rejected.includes('generic pentatonic lick'), true);
    const near = planAutoColor(scene({ intentions: ['RETAIN_MOTIF'], methodRequest: 'M-NEAR' }));
    assert.equal(near.method, 'M-NEAR');
    assert.equal(near.lineagePreserved, true);
    const missing = planAutoColor(scene({ intentions: ['RETAIN_MOTIF'], hasMotif: false, lineageIdentity: 'absent' }));
    assert.equal(missing.outcome, 'NO_PHRASE');
    assert.equal(missing.generationNeeded, false);
  });

  check('opening, development, ending, and unknown follow the form', () => {
    const opening = planAutoColor(scene({ intentions: ['DEVELOP'], formFunction: 'opening' }));
    assert.equal(opening.operator, 'CELL_LINEAGE');
    assert.equal(opening.fieldChanged, false);
    assert.equal(opening.generationNeeded, false);
    const development = planAutoColor(scene({ intentions: ['DEVELOP'], formFunction: 'development' }));
    assert.equal(development.operator, 'CELL_LINEAGE');
    assert.equal(development.generationNeeded, true);
    const ending = planAutoColor(scene({ intentions: ['MORE_OUTSIDE'], formFunction: 'ending', grounding: GROUND, atPhraseEnding: true }));
    assert.notEqual(ending.operator, 'SLIP');
    assert.ok(ending.conflicts.some((row) => /ending/i.test(row)) || ending.rejected.some((row) => /slip/i.test(row)));
    const unknown = planAutoColor(scene({ intentions: ['MORE_OUTSIDE'], formFunction: 'unknown', grounding: GROUND }));
    assert.notEqual(unknown.operator, 'SLIP');
    assert.equal(unknown.fieldChanged, false);
  });

  check('duo roles can support, answer, or stay silent', () => {
    const supportBass = planAutoColor(scene({ intentions: ['SUPPORT_BASS'], quartalAvailable: true, duoRole: 'BASS_LEADS' }));
    assert.equal(supportBass.operator, 'QUARTAL_COMP');
    assert.equal(supportBass.fieldChanged, false);
    assert.equal(supportBass.strategy, 'QUARTAL_SUPPORT');
    const answerBass = planAutoColor(scene({ intentions: ['ANSWER_BASS'], duoRole: 'BASS_LEADS' }));
    assert.equal(answerBass.operator, 'RESEAT');
    assert.equal(answerBass.fieldChanged, false);
    assert.equal(answerBass.lineagePreserved, true);
    const clutter = planAutoColor(scene({ intentions: ['ANSWER_BASS'], density: 'dense', duoRole: 'BASS_LEADS' }));
    assert.equal(clutter.outcome, 'NO_PHRASE');
    const supportGuitar = planAutoColor(scene({ intentions: ['SUPPORT_GUITAR'], duoRole: 'GUITAR_LEADS', register: 'CLEAR' }));
    assert.equal(supportGuitar.operator, 'HOLD_FIELD');
    assert.equal(supportGuitar.fieldChanged, false);
    const colliding = planAutoColor(scene({ intentions: ['SUPPORT_GUITAR'], register: 'COLLIDING', duoRole: 'GUITAR_LEADS' }));
    assert.equal(colliding.outcome, 'STRUCTURAL_SILENCE');
    const answerGuitar = planAutoColor(scene({ intentions: ['ANSWER_GUITAR'], duoRole: 'GUITAR_LEADS' }));
    assert.equal(answerGuitar.operator, 'RESEAT');
    assert.equal(answerGuitar.fieldChanged, false);
  });

  check('space is silence, and the three nothings stay distinct', () => {
    const bassLeads = planAutoColor(scene({ intentions: ['MORE_SPACE'], duoRole: 'BASS_LEADS' }));
    assert.equal(bassLeads.outcome, 'STRUCTURAL_SILENCE');
    assert.equal(bassLeads.silencePreference, 'STRUCTURAL_SILENCE');
    assert.match(bassLeads.rationale, /bass/i);
    assert.equal(bassLeads.rejected.includes('velocity drop as space'), true);
    const guitarLeads = planAutoColor(scene({ intentions: ['LESS_DENSE'], duoRole: 'GUITAR_LEADS' }));
    assert.equal(guitarLeads.outcome, 'STRUCTURAL_SILENCE');
    assert.match(guitarLeads.rationale, /bass exposure/i);
    const noPhrase = planAutoColor(scene({ intentions: ['ANSWER_BASS'], hasMotif: false, lineageIdentity: 'absent' }));
    assert.equal(noPhrase.outcome, 'NO_PHRASE');
    assert.equal(noPhrase.silencePreference, 'NO_PHRASE');
    const none = planAutoColor(scene({ intentions: ['DARKER'], pathIsNone: true, currentResourceId: null }));
    assert.equal(none.outcome, 'NONE');
    assert.equal(none.silencePreference, 'PATH_NONE');
    assert.notEqual(none.outcome, noPhrase.outcome);
    assert.notEqual(none.outcome, bassLeads.outcome);
    assert.equal(none.targetResourceId, null);
  });

  check('hold-field beats chord-by-chord switching, and retain beats a new field', () => {
    const held = planAutoColor(scene({ intentions: ['MORE_CONTINUITY'], formFunction: 'continuation', holdCredible: true }));
    assert.equal(held.operator, 'HOLD_FIELD');
    assert.equal(held.fieldChanged, false);
    assert.equal(held.rejected.includes('chord-by-chord collection switching'), true);
    const retain = planAutoColor(scene({ intentions: ['STAY_CURRENT'] }));
    assert.equal(retain.fieldChanged, false);
    assert.equal(retain.outcome === 'KEEP_CURRENT' || retain.outcome === 'PLAN', true);
    assert.notEqual(retain.operator, 'SLIP');
  });

  check('insufficient context invents nothing', () => {
    const empty = planAutoColor({});
    assert.equal(empty.outcome, 'INSUFFICIENT_CONTEXT');
    assert.equal(empty.targetResourceId, null);
    assert.equal(empty.generationNeeded, false);
    const bare = planAutoColor({ intentions: ['DARKER'] });
    assert.equal(bare.outcome, 'INSUFFICIENT_CONTEXT');
    assert.equal(bare.fieldChanged, false);
    assert.equal(bare.selectedResource, 'NONE');
    const words = planAutoColor({ text: 'make it spicy' });
    assert.equal(words.outcome, 'INSUFFICIENT_CONTEXT');
    assert.equal(words.unknownPhrases.length, 1);
  });

  check('plans do not name artists or write tablature', () => {
    const plan = planAutoColor(scene({ intentions: ['MORE_OUTSIDE', 'DEVELOP'], formFunction: 'development', grounding: GROUND, quartalAvailable: true }));
    const blob = JSON.stringify(plan).toLowerCase();
    for (const name of ['coltrane', 'brecker', 'scofield', 'garrett', 'tyner', 'woody', 'tablature', 'woody shaw']) {
      assert.equal(blob.includes(name), false, name);
    }
    assert.ok(DEV6B_REJECTED_BEHAVIOURS.includes('TAB'));
    assert.ok(DEV6B_REJECTED_BEHAVIOURS.includes('Woody Shaw semitone pair'));
    assert.equal(plan.strategy === 'BOUNDED_SLIP_RETURN' || plan.strategy === 'DOWNWARD_STATIC_SLIP', true);
  });

  check('frozen fingerprint, change cost, registries, and the Dev 5 tag stay put', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.deepEqual(listPentatonicArchetypes().map((row) => row.id), ['major_pentatonic', 'minor_pentatonic']);
    assert.equal(listPentatonicColourResources().length, 20);
    const tag = execSync('git rev-parse pentatonic-dev5-baseline', { encoding: 'utf8' }).trim();
    assert.equal(tag, '025dbe61aa500a92a957383b8159112f1158cd1b');
  });

  check('nine WWH sources stay byte-identical under AUTO COLOR', () => {
    const lines: string[] = [];
    for (const [title, file, expected] of WWH_SOURCES) {
      const full = `${ALBUM}/${file}`;
      assert.equal(sha(full), expected, title);
      const xml = fs.readFileSync(full, 'utf8');
      const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: expected });
      assert.equal(sha(full), expected, title);
      const rowsForTrack = benchmarkAutoColor(title, analysis);
      assert.equal(rowsForTrack.length, 5);
      const intentions = rowsForTrack.map((row) => row.intention);
      assert.ok(intentions.includes('RETAIN_MOTIF'));
      assert.ok(intentions.includes('MORE_SPACE'));
      assert.ok(intentions.includes('TENSION_THEN_RESOLVE'));
      assert.ok(intentions.includes('MORE_OUTSIDE'));
      assert.equal(intentions.includes('DARKER') || intentions.includes('BRIGHTER'), true);
      for (const row of rowsForTrack) {
        assert.equal(row.resource === 'Remote Altered', false);
        if (row.intention === 'MORE_SPACE') assert.equal(row.silenceWon, true);
        if (row.intention === 'MORE_OUTSIDE' && row.operator === 'SLIP') assert.equal(row.homeReturn, true);
        lines.push(
          [
            title,
            row.formFunction,
            row.duoRole,
            row.intention,
            row.outcome,
            row.operator,
            row.resource,
            `field ${row.fieldChanged ? 'changed' : 'kept'}`,
            `home ${row.homeReturn ? 'yes' : 'no'}`,
            `silence ${row.silenceWon ? 'yes' : 'no'}`,
            `abstain ${row.abstained ? 'yes' : 'no'}`,
            `lineage ${row.lineagePreserved ? 'yes' : 'no'}`,
            `rejected ${row.rejected[0] ?? 'none'}`,
          ].join(' :: ')
        );
      }
    }
    console.log(lines.join('\n'));
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
