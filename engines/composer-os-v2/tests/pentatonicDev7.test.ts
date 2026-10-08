/**
 * Pentatonic Engine Dev 7 — distance, pivot, extraction, layered field.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev7.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { planAutoColor } from '../core/pentatonic/autoColor';
import { auditEdgeMetadata, auditMinorSixth } from '../core/pentatonic/colourAudit';
import { reportColourDegrees } from '../core/pentatonic/colourDegrees';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { DEV7_DEFERRED, planLayeredField } from '../core/pentatonic/layeredField';
import { planColourNavigation } from '../core/pentatonic/dev7Integration';
import { assessFieldWalkStrategy, planGradedOut } from '../core/pentatonic/gradedOut';
import {
  fieldFromPitchClasses,
  fieldFromResource,
  measureFieldDistance,
  rotationNormalForm,
} from '../core/pentatonic/fieldDistance';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import { extractParentField } from '../core/pentatonic/parentExtraction';
import { planPivotLink } from '../core/pentatonic/pivotLink';
import { canonicalPitchSet } from '../core/pentatonic/pitch';

const FINGERPRINT = 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6';
const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const WWH: ReadonlyArray<readonly [string, string, string]> = [
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

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function mustField(id: string, root: string) {
  const field = fieldFromResource(id, root);
  if (!field) throw new Error(`${id} ${root}`);
  return field;
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

  const cMinor = mustField('minor_pentatonic', 'C');
  const fMinor = mustField('minor_pentatonic', 'F');
  const bMinor = mustField('minor_pentatonic', 'B');

  check('identical field and rotation equivalent', () => {
    const again = mustField('minor_pentatonic', 'C');
    const distance = measureFieldDistance(cMinor, again);
    assert.equal(distance.distanceClass, 'IDENTICAL');
    assert.equal(distance.sharedCount, 5);
    assert.equal(distance.rotationEquivalent, false);
    const major = mustField('major_pentatonic', 'Eb');
    const rotated = measureFieldDistance(cMinor, major);
    assert.equal(rotated.distanceClass, 'IDENTICAL');
    assert.equal(rotated.rotationEquivalent, true);
    assert.notEqual(cMinor.displayName, major.displayName);
    assert.equal(cMinor.canonicalIntervalClass, major.canonicalIntervalClass);
  });

  check('shared counts 4, 3, 2, 1, and 0', () => {
    const four = fieldFromPitchClasses([0, 3, 5, 7, 11], 'C');
    const three = mustField('mixolydian_pentatonic', 'C');
    const two = mustField('major_pentatonic', 'C');
    const one = fieldFromPitchClasses([0, 1, 2, 6, 8], 'C');
    assert.ok(four && one);
    assert.equal(measureFieldDistance(cMinor, four).sharedCount, 4);
    assert.equal(measureFieldDistance(cMinor, three).sharedCount, 3);
    assert.equal(measureFieldDistance(cMinor, two).sharedCount, 2);
    assert.equal(measureFieldDistance(cMinor, one).sharedCount, 1);
    assert.equal(measureFieldDistance(fMinor, bMinor).sharedCount, 0);
    assert.equal(measureFieldDistance(cMinor, four).distanceClass, 'NEAR');
    assert.equal(measureFieldDistance(cMinor, three).distanceClass, 'RELATED');
    assert.equal(measureFieldDistance(cMinor, two).distanceClass, 'OUTSIDE');
    assert.equal(measureFieldDistance(fMinor, bMinor).distanceClass, 'REMOTE');
  });

  check('graded out stays inside its distance and remote can return', () => {
    const subtle = planGradedOut({ source: cMinor, outness: 'SUBTLE', home: cMinor });
    const moderate = planGradedOut({ source: cMinor, outness: 'MODERATE', home: cMinor });
    const strong = planGradedOut({ source: cMinor, outness: 'STRONG', home: cMinor });
    const remote = planGradedOut({ source: fMinor, outness: 'REMOTE', home: fMinor });
    if (subtle.disposition === 'DISTANCE') assert.equal(subtle.distance.distanceClass, 'NEAR');
    if (moderate.disposition === 'DISTANCE') assert.equal(moderate.distance.distanceClass, 'RELATED');
    if (strong.disposition === 'DISTANCE') assert.equal(strong.distance.distanceClass, 'OUTSIDE');
    assert.equal(remote.disposition, 'DISTANCE');
    assert.equal(remote.initiatesMove, false);
    assert.equal(subtle.initiatesMove, false);
    assert.equal(remote.distance.distanceClass, 'REMOTE');
    assert.equal(remote.distance.sharedCount <= 1, true);
    assert.equal(remote.returnPath.credible, true);
    assert.notEqual(remote.destination.displayName, fMinor.displayName);
    assert.equal(subtle.distance.distanceClass === 'REMOTE', false);
  });

  check('Black Aura F minor and B minor stay a zero-share pair', () => {
    const distance = measureFieldDistance(fMinor, bMinor);
    assert.equal(distance.sharedCount, 0);
    assert.equal(distance.distanceClass, 'REMOTE');
    assert.deepEqual(distance.sharedPitchClasses, []);
  });

  check('pivot keeps common tones, nearest motion, motif, and register', () => {
    const mixolydian = mustField('mixolydian_pentatonic', 'C');
    const leading = mustField('leading_minor', 'C');
    const common = planPivotLink({ source: cMinor, destination: mixolydian });
    assert.ok(common.commonTones.length >= 1);
    assert.equal(common.scalarBridge, false);
    assert.equal(common.voiceLeading, 'PITCH_CLASS_PROXIMITY');
    const near = planPivotLink({ source: cMinor, destination: leading });
    assert.equal(near.compact, true);
    assert.ok(near.movingTones.every((pair) => pair.semitones <= 2));
    assert.equal(near.scalarBridge, false);
    const motif = planPivotLink({
      source: cMinor,
      destination: leading,
      motifPitchClasses: [0, 3, 5],
      motifMidis: [60, 63, 65],
    });
    assert.equal(motif.voiceLeading, 'REGISTER');
    assert.ok(motif.motifPreservation === 'YES' || motif.motifPreservation === 'PARTIAL');
    assert.equal(motif.scalarBridge, false);
    assert.ok(motif.movingTones.length <= 5);
  });

  check('hold wins when the fields already share the set', () => {
    const held = planPivotLink({ source: cMinor, destination: cMinor });
    assert.equal(held.linkPhraseNeeded, false);
    assert.equal(held.mechanism, 'NONE');
  });

  check('parent extraction caps three, names a registry match, and can abstain', () => {
    const diatonic = extractParentField({
      parentPitchClasses: [0, 2, 4, 5, 7, 9, 11],
      melodyPitchClasses: [0, 2, 4, 7, 9],
      chordPitchClasses: [0, 4, 7],
      centreSpelling: 'C',
      current: cMinor,
    });
    assert.equal(diatonic.disposition, 'FIELDS');
    assert.ok(diatonic.candidates.length <= 3);
    assert.equal(diatonic.candidates[0]?.registryMatch, true);
    const unnamed = fieldFromPitchClasses([0, 1, 2, 4, 8], 'C');
    assert.ok(unnamed);
    assert.equal(unnamed.kind, 'EXTRACTED');
    assert.equal(unnamed.displayName, 'Extracted field');
    const extracted = extractParentField({
      parentPitchClasses: [0, 1, 2, 4, 6, 8],
      melodyPitchClasses: [0, 1, 2, 4, 8],
      centreSpelling: 'C',
    });
    if (extracted.disposition === 'FIELDS') {
      assert.ok(extracted.candidates.some((row) => row.field.kind === 'EXTRACTED' || row.registryMatch));
      assert.ok(extracted.candidates.length <= 3);
    }
    assert.equal(extractParentField({ parentPitchClasses: [0, 1, 2, 3] }).disposition, 'INSUFFICIENT_CONTEXT');
    assert.equal(extractParentField({ parentPitchClasses: [0, 1, 2, 3, 4, 5] }).disposition, 'NONE');
    assert.equal(extractParentField({ parentPitchClasses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }).disposition, 'INSUFFICIENT_CONTEXT');
  });

  check('minor sixth audit keeps the shipped resource', () => {
    const audit = auditMinorSixth();
    const resource = listPentatonicColourResources().find((item) => item.id === 'minor_sixth_pentatonic');
    assert.deepEqual(resource?.intervals, [0, 3, 5, 8, 10]);
    assert.equal(audit.intervalsMatchConcept, false);
    assert.equal(audit.nameMisleading, true);
    assert.equal(audit.registryChanged, false);
    assert.notEqual(audit.conceptRotationOf, null);
    assert.equal(listPentatonicColourResources().length, 20);
    assert.equal(listPentatonicColourResources().some((item) => item.intervals.join(',') === '0,3,5,7,9'), false);
  });

  check('rotation transparency keeps spelling', () => {
    const major = mustField('major_pentatonic', 'C');
    const minor = mustField('minor_pentatonic', 'A');
    assert.equal(major.canonicalIntervalClass, minor.canonicalIntervalClass);
    assert.equal(rotationNormalForm(major.pitchClasses).join(','), rotationNormalForm(minor.pitchClasses).join(','));
    assert.notEqual(major.referenceSpelling, minor.referenceSpelling);
    assert.ok(major.rotationOfResourceIds.includes('minor_pentatonic') || minor.rotationOfResourceIds.includes('major_pentatonic'));
  });

  check('edge metadata matches interval content', () => {
    const audit = auditEdgeMetadata();
    assert.deepEqual(audit.corrected, []);
    assert.deepEqual(audit.issues.map((issue) => issue.resourceId), ['dorian_pentatonic', 'aeolian_pentatonic']);
    assert.equal(listPentatonicColourResources().find((item) => item.id === 'dorian_pentatonic')?.metadata.chromaticEdge, 'low');
    assert.equal(listPentatonicColourResources().find((item) => item.id === 'aeolian_pentatonic')?.metadata.chromaticEdge, 'low');
  });

  check('colour degrees stay descriptive', () => {
    const report = reportColourDegrees(cMinor, { rootPc: 0, chordPitchClasses: [0, 3, 7] });
    assert.equal(report.mustPlay, false);
    assert.equal(report.descriptive, true);
    assert.ok(report.chordTones.length >= 2);
  });

  check('layered field shares one governing collection', () => {
    const slowBass = planLayeredField({ field: cMinor, role: 'GUITAR_ACTIVE_BASS_SLOW', tempo: 72 });
    const bassLead = planLayeredField({ field: cMinor, role: 'GUITAR_SLOW_BASS_ACTIVE', tempo: 144 });
    assert.equal(slowBass.sameGoverningField, true);
    assert.deepEqual(slowBass.guitarSubset, planLayeredField({ field: cMinor, role: 'GUITAR_ACTIVE_BASS_SLOW', tempo: 200 }).guitarSubset);
    assert.notDeepEqual(slowBass.guitarSubset, slowBass.bassSubset);
    for (const pc of [...slowBass.guitarSubset, ...slowBass.bassSubset, ...bassLead.guitarSubset, ...bassLead.bassSubset]) {
      assert.equal(cMinor.pitchClasses.includes(pc), true);
    }
    assert.equal(bassLead.roleRelation, 'GUITAR_SLOW_BASS_ACTIVE');
    assert.ok(bassLead.bassSubset.length >= bassLead.guitarSubset.length);
    assert.equal(planLayeredField({ field: cMinor, role: 'SHARED_SPACE' }).guitarSubset.length, 0);
  });

  check('field walk is not an operator and bimodal grouping stay deferred', () => {
    const walk = assessFieldWalkStrategy(cMinor);
    assert.equal(walk.operatorAdded, false);
    assert.equal(walk.status, 'STRATEGY');
    assert.ok(DEV7_DEFERRED.some((item) => item.id === 'BIMODAL_DUO'));
    assert.ok(DEV7_DEFERRED.some((item) => item.id === 'RHYTHMIC_GROUPING'));
    assert.ok(DEV7_DEFERRED.some((item) => item.id === 'FIELD_WALK'));
  });

  check('Dev 6 plan is unchanged when Dev 7 advice is attached', () => {
    const ctx = {
      intentions: ['MORE_CONTINUITY'] as const,
      formFunction: 'continuation' as const,
      currentResourceId: 'minor_pentatonic',
      homeResourceId: 'minor_pentatonic',
      homeKnown: true,
      fieldIsHome: true,
      centreNote: 'C',
      hasMotif: true,
    };
    const direct = planAutoColor(ctx);
    const wrapped = planColourNavigation(ctx);
    assert.deepEqual(wrapped.dev6, direct);
    assert.equal(wrapped.advice.consulted, 'PIVOT_LINK');
    assert.equal(wrapped.advice.pivot?.linkPhraseNeeded, false);
    const space = planColourNavigation({ ...ctx, intentions: ['MORE_SPACE'] });
    assert.equal(space.advice.consulted, 'SILENCE');
    assert.equal(space.dev6.operator, planAutoColor({ ...ctx, intentions: ['MORE_SPACE'] }).operator);
  });

  check('fingerprint and change cost stay', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FINGERPRINT);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
  });

  check('nine WWH sources stay byte-identical and Dev 7 reads them', () => {
    const notes: string[] = [];
    for (const [title, file, expected] of WWH) {
      const full = path.join(ALBUM, file);
      const before = sha(full);
      assert.equal(before, expected, title);
      const xml = fs.readFileSync(full, 'utf8');
      const analysis = analyzePentatonicScore(xml);
      notes.push(tuneProbe(title, analysis));
      assert.equal(sha(full), expected, title);
    }
    assert.equal(notes.length, 9);
  });

  return rows;
}

function tuneProbe(title: string, analysis: ReturnType<typeof analyzePentatonicScore>): string {
  const homeId = analysis.identity.home?.archetypeId ?? 'minor_pentatonic';
  const centre = analysis.identity.centre?.spelling ?? 'C';
  const current = fieldFromResource(homeId, centre) ?? mustField('minor_pentatonic', 'F');
  if (title.startsWith('01')) {
    const distance = measureFieldDistance(mustField('minor_pentatonic', 'F'), mustField('minor_pentatonic', 'B'));
    assert.equal(distance.sharedCount, 0);
    assert.equal(distance.distanceClass, 'REMOTE');
  }
  if (title.startsWith('02')) {
    const pivot = planPivotLink({ source: current, destination: current });
    assert.equal(pivot.linkPhraseNeeded, false);
  }
  if (title.startsWith('03')) {
    const motif = analysis.score.motifs[0];
    const pcs = motif ? canonicalPitchSet([]) : current.pitchClasses.slice(0, 3);
    const pivot = planPivotLink({ source: current, destination: current, motifPitchClasses: pcs });
    assert.equal(pivot.scalarBridge, false);
    assert.ok(!pivot.explanation.toLowerCase().includes('scale'));
  }
  if (title.startsWith('04')) {
    const layered = planLayeredField({ field: current, role: 'GUITAR_SLOW_BASS_ACTIVE' });
    assert.ok(layered.bassSubset.length >= layered.guitarSubset.length);
    assert.equal(layered.sameGoverningField, true);
  }
  if (title.startsWith('05')) {
    const remote = planGradedOut({ source: current, outness: 'REMOTE', home: current });
    assert.equal(remote.returnPath.credible || remote.disposition === 'STAY', true);
    const back = planGradedOut({ source: remote.destination, outness: 'SUBTLE', home: current });
    assert.ok(back.returnPath.home);
  }
  if (title.startsWith('06')) {
    const none = analysis.path.events.some((event) => event.chosenId === 'NONE');
    const advice = planColourNavigation({
      intentions: ['MORE_CONTINUITY'],
      pathIsNone: none || analysis.path.events.every((event) => event.chosenId === 'NONE'),
      currentResourceId: homeId,
      centreNote: centre,
      formFunction: 'continuation',
    });
    if (analysis.path.events.some((event) => event.chosenId === 'NONE')) {
      assert.equal(advice.advice.applied, false);
    }
    assert.equal(advice.advice.explanation.toLowerCase().includes('scale'), false);
  }
  if (title.startsWith('07')) {
    const slow = measureFieldDistance(current, current);
    const fast = planLayeredField({ field: current, tempo: 220 });
    const slower = planLayeredField({ field: current, tempo: 60 });
    assert.equal(slow.distanceClass, 'IDENTICAL');
    assert.deepEqual(fast.bassSubset, slower.bassSubset);
    assert.deepEqual(fast.guitarSubset, slower.guitarSubset);
  }
  if (title.startsWith('08')) {
    const melody = canonicalPitchSet(
      analysis.score.events.flatMap((event) => event.melodyNotes ?? []).flatMap((note) => {
        const parsed = note.match(/^([A-Ga-g])([#b])?/);
        if (!parsed) return [];
        const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const pc = [0, 2, 4, 5, 7, 9, 11][names.indexOf(parsed[1]!.toUpperCase())] ?? 0;
        const accidental = parsed[2] === '#' ? 1 : parsed[2] === 'b' ? -1 : 0;
        return [(pc + accidental + 12) % 12];
      })
    );
    const extracted = extractParentField({ parentPitchClasses: melody });
    assert.ok(extracted.disposition === 'NONE' || extracted.disposition === 'INSUFFICIENT_CONTEXT');
  }
  if (title.startsWith('09')) {
    const leading = fieldFromResource('leading_minor', centre) ?? current;
    const pivot = planPivotLink({ source: current, destination: leading });
    if (pivot.commonTones.length >= 1) {
      assert.ok(pivot.movingTones.length < 5);
      assert.equal(pivot.scalarBridge, false);
    }
  }
  return title;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
