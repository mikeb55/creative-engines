/**
 * Pentatonic Engine Dev 6A — form and duo intelligence.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev6a.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import {
  DEV6A_REJECTED_BEHAVIOURS,
  GUITAR_ADJACENT_STRING_INTERVALS,
  assessCommonTone,
  assessPentatonicFormDuo,
  assessQuartalStringSet,
  classifyRegister,
  placeOperatorInForm,
  preferSlipFretShift,
  quartalMasksMelody,
  registerCapFaults,
  reportPentatonicFormDuo,
  type FormDuoEvent,
} from '../core/pentatonic/formDuoIntelligence';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import { planPentatonicOperator, realisePentatonicPhrase } from '../core/pentatonic/phraseOperators';
import { listPentatonicArchetypes } from '../core/pentatonic/registry';
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

const HOME = [0, 2, 4, 7, 9];

function bar(sourceLabel: string, extra: Partial<FormDuoEvent> = {}): FormDuoEvent {
  return { sourceLabel, chosenId: 'major:C', chosenPitchClasses: HOME, ...extra };
}

function guitar(midis: number[], notes = ['C', 'E', 'G']): Partial<FormDuoEvent> {
  return { melodyNotes: notes, melodyMidis: midis };
}

function bass(midis: number[], notes = ['C', 'G', 'A']): Partial<FormDuoEvent> {
  return { bassNotes: notes, bassMidis: midis };
}

function motif(pitches: number[]): BaseMotif {
  return { id: 'cell', barCount: 1, notes: pitches.map((pitch, index) => ({ pitch, startBeat: index, duration: 1 })) };
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

  check('phrase retention blocks a mid-phrase field change', () => {
    const events = [0, 1, 2, 3, 4, 5].map((index) =>
      bar(String(index + 1), {
        ...guitar([64, 67, 71]),
        ...(index >= 3 ? { chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] } : {}),
      })
    );
    const form = assessPentatonicFormDuo({ events, homePitchClasses: HOME });
    assert.equal(form.pathRewritten, false);
    assert.equal(form.phrases.length, 1);
    assert.equal(form.decisions[3]?.localSwitchSuppressed, true);
    assert.equal(form.decisions[3]?.continuity, 'PHRASE_RETENTION');
    assert.equal(form.suppressedLocalSwitches.length, 1);
  });

  check('section retention keeps one field across a marked section', () => {
    const events = Array.from({ length: 8 }, (_, index) =>
      bar(String(index + 1), {
        ...guitar([64, 67]),
        ...(index === 0 || index === 4 ? { sourceBoundary: true, sectionMarks: [index === 0 ? 'A' : 'B'] } : {}),
      })
    );
    const form = assessPentatonicFormDuo({ events, homePitchClasses: HOME });
    assert.equal(form.sections.length, 2);
    assert.equal(form.sections[0]?.confidence, 'high');
    assert.ok(form.decisions.some((decision) => decision.continuity === 'SECTION_RETENTION' || decision.continuity === 'PHRASE_RETENTION'));
    assert.equal(form.decisions.filter((decision) => decision.homeReturn).length, 0);
  });

  check('a colour change waits for a phrase boundary', () => {
    const events = [
      bar('1', guitar([64, 67, 71])),
      bar('2', guitar([64, 67])),
      bar('3', { melodyRest: true, bassRest: true }),
      bar('4', { ...guitar([69, 72, 76], ['A', 'C', 'E']), chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] }),
    ];
    const form = assessPentatonicFormDuo({ events, homePitchClasses: HOME });
    assert.equal(form.phrases.length, 2);
    assert.equal(form.decisions[3]?.continuity, 'PHRASE_BOUNDARY_CHANGE');
    assert.equal(form.decisions[3]?.localSwitchSuppressed, false);
  });

  check('unknown form stays unknown', () => {
    const events = [bar('1', guitar([64])), bar('2', guitar([67])), bar('3', guitar([71]))];
    const form = assessPentatonicFormDuo({ events });
    assert.equal(form.phrases.length, 1);
    assert.equal(form.phrases[0]?.function, 'unknown');
    assert.equal(form.phrases[0]?.confidence, 'unknown');
    assert.equal(form.sections[0]?.function, 'unknown');
    assert.equal(form.sections[0]?.confidence, 'unknown');
  });

  check('HOME is not forced at every boundary', () => {
    const events = [
      bar('1', { ...guitar([64, 67, 71]), sourceBoundary: true, sectionMarks: ['A'], chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] }),
      bar('2', { melodyRest: true, bassRest: true, chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] }),
      bar('3', { ...guitar([69, 72]), chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] }),
      bar('4', { melodyRest: true, bassRest: true, chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] }),
      bar('5', { ...guitar([69, 74]), sourceBoundary: true, sectionMarks: ['B'], chosenId: 'minor:A', chosenPitchClasses: [9, 0, 2, 4, 7] }),
    ];
    const form = assessPentatonicFormDuo({ events, homePitchClasses: HOME });
    assert.ok(form.phrases.length >= 2);
    assert.equal(form.decisions.filter((decision) => decision.homeReturn).length, 0);
    const placed = placeOperatorInForm({
      operator: 'CELL_LINEAGE',
      formFunction: 'continuation',
      atPhraseBoundary: true,
      atPhraseEnding: false,
      atSectionBoundary: true,
      role: 'GUITAR_LEADS',
      pairIsRegion: false,
      holdCredible: true,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: true,
      fieldIsHome: false,
    });
    assert.equal(placed.homeReturn, false);
    assert.equal(placed.operator, 'CELL_LINEAGE');
  });

  check('duo roles name guitar lead, bass lead, response, counterpoint, support, and space', () => {
    const guitarLead = assessPentatonicFormDuo({
      events: [bar('1', guitar([64, 67, 71])), bar('2', guitar([72, 74, 76])), bar('3', guitar([76, 74, 72]))],
    });
    assert.equal(guitarLead.roles[0]?.role, 'GUITAR_LEADS');
    const bassLead = assessPentatonicFormDuo({
      events: [
        bar('1', bass([40, 43, 45, 47], ['E', 'G', 'A', 'B'])),
        bar('2', bass([47, 45, 43, 40], ['B', 'A', 'G', 'E'])),
      ],
    });
    assert.equal(bassLead.roles[0]?.role, 'BASS_LEADS');
    assert.equal(bassLead.roles[0]?.bassAgency, true);
    const response = assessPentatonicFormDuo({
      events: [
        bar('1', guitar([64, 67, 71, 74])),
        bar('2', guitar([74, 71, 67, 64])),
        bar('3', bass([48, 50], ['C', 'D'])),
      ],
    });
    assert.equal(response.roles[0]?.role, 'BASS_RESPONDS');
    const counter = assessPentatonicFormDuo({
      events: [
        bar('1', guitar([76, 79, 81])),
        bar('2', bass([48, 45, 43], ['C', 'A', 'G'])),
        bar('3', guitar([81, 84, 86])),
        bar('4', bass([43, 41, 40], ['G', 'F', 'E'])),
        bar('5', guitar([86, 84, 81])),
        bar('6', bass([40, 36, 35], ['E', 'C', 'B'])),
      ],
    });
    assert.equal(counter.roles[0]?.role, 'COUNTERPOINT');
    assert.equal(counter.counterpoint[0]?.suitability, 'suitable');
    assert.equal(counter.counterpoint[0]?.contrary, true);
    assert.equal(counter.counterpoint[0]?.pitchClassOverlapIsVoiceLeading, false);
    const support = assessPentatonicFormDuo({
      events: [
        bar('1', { ...guitar([64, 67, 71]), ...bass([45], ['A']) }),
        bar('2', { ...guitar([71, 72, 74]), ...bass([45], ['A']) }),
      ],
    });
    assert.equal(support.roles[0]?.role, 'BASS_SUPPORTS');
    const space = assessPentatonicFormDuo({
      events: [bar('1', { melodyRest: true, bassRest: true, melodyMidis: [], bassMidis: [] })],
    });
    assert.equal(space.roles[0]?.role, 'SPACE');
  });

  check('a response may retain, transform, or stay silent', () => {
    const retained = assessPentatonicFormDuo({
      events: [
        bar('1', guitar([64, 67, 71], ['E', 'G', 'B'])),
        bar('2', bass([43, 47], ['G', 'B'])),
      ],
    });
    assert.equal(retained.initiations[0]?.initiatingVoice, 'guitar');
    assert.equal(retained.initiations[0]?.responseVoice, 'bass');
    assert.equal(retained.initiations[0]?.relation, 'retained');
    assert.equal(retained.initiations[0]?.imitationForced, false);
    const transformed = assessPentatonicFormDuo({
      events: [
        bar('1', guitar([64, 67, 71], ['E', 'G', 'B'])),
        bar('2', bass([40, 46], ['E', 'Bb'])),
      ],
    });
    assert.equal(transformed.initiations[0]?.relation, 'transformed');
    assert.equal(transformed.initiations[0]?.imitated, false);
    const silent = assessPentatonicFormDuo({
      events: [bar('1', guitar([64, 67, 71])), bar('2', guitar([72, 74]))],
    });
    assert.equal(silent.initiations[0]?.initiatingVoice, 'guitar');
    assert.equal(silent.initiations[0]?.relation, 'silent');
  });

  check('register separates clear, close, and colliding', () => {
    assert.equal(classifyRegister([76, 79, 81], [40, 43, 45]), 'CLEAR');
    assert.equal(classifyRegister([60, 62, 64], [52, 53, 55]), 'CLOSE');
    assert.equal(classifyRegister([52, 53, 55], [50, 52, 53]), 'COLLIDING');
    assert.equal(classifyRegister([64], []), 'UNKNOWN');
    const masked = quartalMasksMelody([64, 69], [65, 67]);
    assert.equal(masked, true);
    const clearLine = assessPentatonicFormDuo({
      events: [bar('1', { ...guitar([76, 79]), ...bass([40, 43], ['E', 'G']) })],
    });
    assert.equal(clearLine.register[0]?.classification, 'CLEAR');
  });

  check('common tones need a continuity job', () => {
    assert.equal(assessCommonTone(0, []).rewarded, false);
    assert.equal(assessCommonTone(0, ['phrase-boundary']).rewarded, true);
    assert.equal(assessCommonTone(7, ['hold-field']).rewarded, true);
    assert.equal(assessCommonTone(4, ['outside-ground']).rewarded, true);
    const events = [
      bar('1', { ...guitar([60, 64], ['C', 'E']), ...bass([48], ['C']), chordSymbol: 'Cmaj7' }),
      bar('2', { ...guitar([60, 64], ['C', 'E']), ...bass([48], ['C']), chordSymbol: 'Am7' }),
    ];
    const form = assessPentatonicFormDuo({ events, homePitchClasses: HOME });
    assert.ok(form.commonTones.some((tone) => tone.rewarded && tone.jobs.includes('hold-field')));
    assert.ok(form.commonTones.some((tone) => tone.rewarded === false));
  });

  check('structural silence stays distinct from NO_PHRASE and PATH NONE', () => {
    const structural = placeOperatorInForm({
      operator: 'CELL_LINEAGE',
      formFunction: 'continuation',
      atPhraseBoundary: true,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'BASS_RESPONDS',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: true,
      homeKnown: true,
      fieldIsHome: true,
    });
    const none = placeOperatorInForm({
      operator: 'NONE',
      formFunction: 'unknown',
      atPhraseBoundary: false,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'UNKNOWN',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: true,
      purposeNoPhrase: false,
      structuralSilencePreferred: true,
      homeKnown: false,
      fieldIsHome: false,
    });
    const noPhrase = placeOperatorInForm({
      operator: 'CELL_LINEAGE',
      formFunction: 'unknown',
      atPhraseBoundary: false,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'UNKNOWN',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: false,
      purposeNoPhrase: true,
      structuralSilencePreferred: true,
      homeKnown: false,
      fieldIsHome: false,
    });
    assert.equal(structural.texture, 'STRUCTURAL_SILENCE');
    assert.equal(none.texture, 'PATH_NONE');
    assert.equal(noPhrase.texture, 'NO_PHRASE');
    assert.notEqual(structural.texture, none.texture);
    assert.notEqual(structural.texture, noPhrase.texture);
    const dense = assessPentatonicFormDuo({
      events: [bar('1', guitar([64, 67, 71, 74, 76, 79])), bar('2', { melodyRest: true, bassRest: true })],
    });
    assert.ok(dense.structuralSilence.some((row) => row.texture === 'STRUCTURAL_SILENCE' && row.pathNone === false && row.noPhrase === false));
    const phrase = realisePentatonicPhrase({
      purpose: 'COUNTERLINE',
      home: { name: 'C Major Pentatonic', archetypeId: 'major_pentatonic', referenceNote: 'C', homeRelationshipLabel: 'HOME' },
      motif: motif([60, 64, 67]),
      structuralSilence: true,
    });
    assert.equal(phrase.textureChoice, 'STRUCTURAL_SILENCE');
    assert.equal(phrase.pathTrajectory, 'RETAIN_CURRENT_FIELD');
    assert.deepEqual(phrase.pitches, []);
    assert.equal(phrase.phraseEngineCalled, false);
    const ordinary = planPentatonicOperator({
      purpose: 'NO_PHRASE',
      hasMotif: false,
      grounding: { present: false, bassPedal: false, bassOstinato: false, sustainedTone: false, motifIdentityRetained: false, explicitAnchor: false },
    });
    assert.equal(ordinary.phraseResult, 'NO_PHRASE');
    assert.equal(ordinary.operator, 'NONE');
    const untouched = realisePentatonicPhrase({
      purpose: 'NO_PHRASE',
      home: null,
    });
    assert.equal(untouched.textureChoice, undefined);
    assert.notEqual(untouched.pathTrajectory, 'NONE');
  });

  check('operators keep phrase identity and refuse busy local switches', () => {
    const reseat = placeOperatorInForm({
      operator: 'CELL_LINEAGE',
      formFunction: 'continuation',
      atPhraseBoundary: true,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'BASS_RESPONDS',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: true,
      fieldIsHome: false,
    });
    assert.equal(reseat.operator, 'RESEAT');
    const slip = placeOperatorInForm({
      operator: 'SLIP',
      formFunction: 'ending',
      atPhraseBoundary: true,
      atPhraseEnding: true,
      atSectionBoundary: true,
      role: 'GUITAR_LEADS',
      slipLanding: 'WEAK',
      pairIsRegion: false,
      holdCredible: true,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: true,
      fieldIsHome: false,
    });
    assert.notEqual(slip.operator, 'SLIP');
    assert.ok(slip.rejected.some((line) => line.includes('SLIP')));
    const pair = placeOperatorInForm({
      operator: 'TRITONE_PAIR',
      formFunction: 'development',
      atPhraseBoundary: true,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'GUITAR_LEADS',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: false,
      fieldIsHome: false,
    });
    assert.equal(pair.operator, 'RETAIN');
    const held = placeOperatorInForm({
      operator: 'HOLD_FIELD',
      formFunction: 'continuation',
      atPhraseBoundary: false,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'SHARED_FIELD',
      pairIsRegion: true,
      holdCredible: true,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: true,
      fieldIsHome: true,
    });
    assert.equal(held.operator, 'HOLD_FIELD');
    const quartal = placeOperatorInForm({
      operator: 'QUARTAL_COMP',
      formFunction: 'continuation',
      atPhraseBoundary: true,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'GUITAR_LEADS',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: false,
      fieldIsHome: false,
    });
    assert.notEqual(quartal.operator, 'QUARTAL_COMP');
    const line = placeOperatorInForm({
      operator: 'QUARTAL_LINE',
      formFunction: 'development',
      atPhraseBoundary: true,
      atPhraseEnding: false,
      atSectionBoundary: false,
      role: 'COUNTERPOINT',
      pairIsRegion: false,
      holdCredible: false,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: false,
      homeKnown: false,
      fieldIsHome: false,
    });
    assert.equal(line.operator, 'QUARTAL_LINE');
  });

  check('guitar awareness prefers one-fret shape, hears the G-B exception, and writes no tablature', () => {
    const slip = preferSlipFretShift([60, 64, 67], 1);
    assert.equal(slip.shapePreserved, true);
    assert.equal(slip.frets, 1);
    assert.deepEqual(slip.shifted, [61, 65, 68]);
    assert.equal(slip.practical, true);
    const down = preferSlipFretShift([60, 64, 67], -1);
    assert.deepEqual(down.shifted, [59, 63, 66]);
    assert.equal(down.shapePreserved, true);
    const extreme = preferSlipFretShift([40, 86], -1);
    assert.equal(extreme.practical, false);
    assert.ok(registerCapFaults([40, 86]).includes('register jump'));
    assert.deepEqual(GUITAR_ADJACENT_STRING_INTERVALS, [5, 5, 5, 4, 5]);
    const fourth = assessQuartalStringSet(5);
    assert.equal(fourth.adjacentFourth, true);
    assert.equal(fourth.gbAcknowledged, true);
    assert.ok(fourth.pairs.includes('D-G'));
    assert.equal(fourth.pairs.includes('G-B'), false);
    const gb = assessQuartalStringSet(4);
    assert.equal(gb.adjacentFourth, false);
    assert.equal(gb.gbException, true);
    assert.match(gb.note, /major third/);
    const blob = JSON.stringify({ slip, fourth, gb, extreme });
    assert.equal(blob.includes('"tab"'), false);
    assert.equal(blob.toLowerCase().includes('tablature'), false);
    assert.ok(DEV6A_REJECTED_BEHAVIOURS.includes('TAB'));
    assert.ok(DEV6A_REJECTED_BEHAVIOURS.includes('AUTO COLOR'));
    assert.ok(DEV6A_REJECTED_BEHAVIOURS.includes('full guitar fingering'));
  });

  check('frozen fingerprint, change cost, and both registries stay put', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.deepEqual(listPentatonicArchetypes().map((row) => row.id), ['major_pentatonic', 'minor_pentatonic']);
    assert.equal(listPentatonicColourResources().length, 20);
  });

  check('nine WWH sources stay byte-identical and form stays advisory', () => {
    const lines: string[] = [];
    for (const [title, file, expected] of WWH_SOURCES) {
      const full = `${ALBUM}/${file}`;
      const digest = sha(full);
      assert.equal(digest, expected, title);
      const xml = fs.readFileSync(full, 'utf8');
      const before = sha(full);
      const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: digest });
      assert.equal(sha(full), before, title);
      const report = reportPentatonicFormDuo(title, digest, analysis);
      assert.equal(report.homeForcedAtEveryBoundary, false);
      assert.ok(report.phrases.length >= 1);
      assert.ok(report.sections.length >= 1);
      assert.ok(report.sectionBoundaryReturns <= report.phrases.length);
      assert.equal(report.sourceSha256, expected);
      lines.push(
        [
          title,
          `phrases ${report.phrases.length}`,
          `unknown ${report.unknownPhraseCount}`,
          `sections ${report.sections.length}`,
          `roles ${report.roles.map((role) => role.role).join(',')}`,
          `roleChanges ${report.roleChanges}`,
          `initiations ${report.initiations.length}`,
          `counterpoint ${report.counterpoint.map((row) => row.suitability).join(',')}`,
          `collisions ${report.registerCollisions}`,
          `close ${report.closeRegisters}`,
          `clear ${report.clearRegisters}`,
          `anchors ${report.commonToneAnchors.length}`,
          `unrewarded ${report.unrewardedCommonTones}`,
          `silence ${report.structuralSilence.length}`,
          `hold ${report.holdFieldSpans.length}`,
          `reseat ${report.reseatResponses}`,
          `slipAvoided ${report.slipAvoidedAtEndings}`,
          `pairs ${report.tritonePairSpans.join(' | ') || 'none'}`,
          `suppressed ${report.suppressedLocalSwitches}`,
          `nothing ${report.deliberateNothing.length}`,
          `homeReturns ${report.sectionBoundaryReturns}`,
          `boundaries ${report.phraseBoundaries}`,
        ].join(' :: ')
      );
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
