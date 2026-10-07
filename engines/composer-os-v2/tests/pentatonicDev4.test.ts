/**
 * Pentatonic Engine Dev 4 — motif transform pilot.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev4.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import {
  buildAuditionScore,
  DEV4_AUDITION_DIR,
  staffText,
  writeDev4Auditions,
  type Dev4Audition,
} from '../core/pentatonic/dev4Audition';
import type { AnnotatedMotif } from '../core/pentatonic/motifAnnotationExtract';
import {
  degreeOf,
  GUITAR_SOUNDING_RANGE,
  landingIndexes,
  mapMotifPitches,
  maxAdjacentCollectionRun,
  ornamentFunction,
  shiftMotif,
  strongBeatOnsets,
  transposeCollection,
  type PentatonicCollectionView,
} from '../core/pentatonic/motifTransform';
import type { BaseMotif } from '../core/motif/motifTypes';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const SOURCES = [
  ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb', 1790871859739.699],
  ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56', 1790877773852.1294],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940', 1790873392699.1226],
  ['04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1', 1790913784022.8452],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db', 1791284952634.1567],
  ['06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777', 1790922078195.8997],
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4', 1790923538742.4778],
  ['08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d', 1790925211327.7007],
  ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0', 1790927160470.819],
] as const;

const C_MAJOR: PentatonicCollectionView = {
  name: 'C Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: null,
};
const E_MINOR: PentatonicCollectionView = {
  name: 'E Minor Pentatonic',
  archetypeId: 'minor_pentatonic',
  referenceNote: 'E',
  homeRelationshipLabel: 'HOME',
};

function motif(pitches: number[], starts: number[], durations: number[]): BaseMotif {
  return {
    id: 'synthetic',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: starts[index]!, duration: durations[index]! })),
  };
}

function rhythmFrom(notes: BaseMotif['notes']) {
  return notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration }));
}

export function runPentatonicDev4Tests(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('fingerprint and nine source hashes and mtimes stay put', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6');
    for (const [file, sha, mtime] of SOURCES) {
      const full = `${ALBUM}/${file}`;
      const buf = fs.readFileSync(full);
      assert.equal(createHash('sha256').update(buf).digest('hex'), sha, file);
      assert.ok(Math.abs(fs.statSync(full).mtimeMs - mtime) < 1, file);
    }
  });

  check('strong beats follow the metre, not a blanket weak-beat rule', () => {
    assert.deepEqual(strongBeatOnsets(6, 8), [0, 1.5]);
    assert.deepEqual(strongBeatOnsets(12, 8), [0, 3]);
    assert.deepEqual(strongBeatOnsets(4, 4), [0, 2]);
    const palace = landingIndexes(
      [
        { startBeat: 0, duration: 0.5 },
        { startBeat: 0.5, duration: 0.5 },
        { startBeat: 1, duration: 1 },
      ],
      6,
      8
    );
    assert.deepEqual(palace, [2]);
    const hobo = landingIndexes(
      [
        { startBeat: 0.5, duration: 0.5 },
        { startBeat: 1, duration: 0.5 },
        { startBeat: 1.5, duration: 1.5 },
        { startBeat: 3, duration: 1 },
        { startBeat: 4, duration: 1 },
        { startBeat: 5, duration: 1 },
      ],
      12,
      8
    );
    assert.deepEqual(hobo, [5]);
  });

  check('chromatic function is local, and a weak-beat outsider is still mapped', () => {
    assert.equal(ornamentFunction(60, 61, 62, C_MAJOR), 'chromatic-passing');
    assert.equal(ornamentFunction(60, 61, 60, C_MAJOR), 'neighbour');
    assert.equal(ornamentFunction(60, 68, 67, C_MAJOR), 'semitone-approach');
    assert.equal(ornamentFunction(60, 65, 69, C_MAJOR), null);
    const outsider = motif([60, 65, 69], [0, 1, 2], [0.5, 0.5, 1]);
    const before = JSON.stringify(outsider);
    const mapped = mapMotifPitches({
      motif: outsider,
      rhythm: rhythmFrom(outsider.notes),
      source: C_MAJOR,
      target: C_MAJOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    assert.equal(before, JSON.stringify(outsider));
    assert.equal(mapped.preservedOrnaments.length, 0);
    assert.equal(mapped.notes[1]!.preservedChromaticOrnament, false);
    assert.notEqual(degreeOf(mapped.notes[1]!.pitch, C_MAJOR), null);
  });

  check('preserved chromatic ornament keeps its local function and may sit outside the target', () => {
    const passing = motif([60, 61, 62], [0, 0.5, 1], [0.5, 0.5, 0.5]);
    const mapped = mapMotifPitches({
      motif: passing,
      rhythm: rhythmFrom(passing.notes),
      source: C_MAJOR,
      target: C_MAJOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(mapped.preservedOrnaments, [1]);
    assert.equal(mapped.notes[1]!.pitch, 61);
    assert.equal(degreeOf(61, C_MAJOR), null);
    assert.equal(mapped.notes[0]!.pitch, 60);
    assert.equal(mapped.notes[2]!.pitch, 62);
    const approach = motif([60, 68, 67], [0.5, 1.5, 2.5], [0.5, 0.5, 0.5]);
    const approached = mapMotifPitches({
      motif: approach,
      rhythm: rhythmFrom(approach.notes),
      source: C_MAJOR,
      target: E_MINOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    const landed = approached.notes[2]!;
    if (!landed.retainedCommonTone) assert.equal(landed.targetDegree, landed.sourceDegree);
    if (approached.notes[1]!.preservedChromaticOrnament) {
      assert.equal(Math.abs(approached.notes[1]!.pitch - landed.pitch), 1);
    }
  });

  check('M-NEAR tie order prefers contour over a unison, then lower pitch', () => {
    const line = motif([60, 61], [0, 1], [1, 1]);
    const mapped = mapMotifPitches({
      motif: line,
      rhythm: rhythmFrom(line.notes),
      source: C_MAJOR,
      target: C_MAJOR,
      method: 'M-NEAR',
      meter: { beats: 4, beatType: 4 },
    });
    assert.equal(mapped.notes[0]!.pitch, 60);
    assert.equal(mapped.notes[1]!.pitch, 62);
    assert.equal(mapped.contourCollisions.length, 0);
  });

  check('M-DEG degree identity and collection-note round trip when nothing is retained', () => {
    const line = motif([60, 64, 67], [0.5, 1.5, 2.5], [0.5, 0.5, 0.5]);
    const colour = mapMotifPitches({
      motif: line,
      rhythm: rhythmFrom(line.notes),
      source: C_MAJOR,
      target: E_MINOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(colour.commonToneRetentions, []);
    colour.notes.forEach((note) => assert.equal(note.targetDegree, note.sourceDegree));
    const back = mapMotifPitches({
      motif: { ...line, notes: colour.notes.map((note) => ({ pitch: note.pitch, startBeat: note.startBeat, duration: note.duration })) },
      rhythm: colour.rhythm,
      source: E_MINOR,
      target: C_MAJOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(back.commonToneRetentions, []);
    assert.deepEqual(back.notes.map((note) => note.pitch), [60, 64, 67]);
    const shifted = shiftMotif(line, 2);
    const shiftedColour = mapMotifPitches({
      motif: shifted,
      rhythm: rhythmFrom(shifted.notes),
      source: transposeCollection(C_MAJOR, 2),
      target: transposeCollection(E_MINOR, 2),
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(
      shiftedColour.notes.map((note) => note.pitch),
      colour.notes.map((note) => note.pitch + 2)
    );
    assert.deepEqual(shiftedColour.rangeAdjustments, []);
  });

  check('common-tone landing is retained when the contour still holds', () => {
    const line = motif([64], [0], [4]);
    const colour = mapMotifPitches({
      motif: line,
      rhythm: rhythmFrom(line.notes),
      source: E_MINOR,
      target: C_MAJOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(colour.commonToneRetentions, [0]);
    assert.equal(colour.notes[0]!.pitch, 64);
    assert.match(colour.degreeAlignment, /retain/);
  });

  check('anti-scale-run marks a longer run invalid and leaves the notes', () => {
    const cMinor: PentatonicCollectionView = {
      name: 'C Minor Pentatonic',
      archetypeId: 'minor_pentatonic',
      referenceNote: 'C',
      homeRelationshipLabel: null,
    };
    const line = motif([60, 64, 69], [0.5, 1.5, 2.5], [0.5, 0.5, 0.5]);
    assert.equal(maxAdjacentCollectionRun([60, 64, 69], C_MAJOR), 0);
    const mapped = mapMotifPitches({
      motif: line,
      rhythm: rhythmFrom(line.notes),
      source: C_MAJOR,
      target: cMinor,
      method: 'M-NEAR',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(mapped.notes.map((note) => note.pitch), [60, 63, 70]);
    assert.equal(mapped.scaleRun.valid, false);
    assert.ok(mapped.scaleRun.targetMax > mapped.scaleRun.sourceMax);
  });

  check('guitar range clamps an out-of-range octave and reports it', () => {
    const bMinor: PentatonicCollectionView = {
      name: 'B Minor Pentatonic',
      archetypeId: 'minor_pentatonic',
      referenceNote: 'B',
      homeRelationshipLabel: null,
    };
    const line = motif([40, 64], [0.5, 2], [0.5, 0.5]);
    const mapped = mapMotifPitches({
      motif: line,
      rhythm: rhythmFrom(line.notes),
      source: E_MINOR,
      target: bMinor,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    const [low, high] = GUITAR_SOUNDING_RANGE;
    assert.ok(mapped.notes.every((note) => note.pitch >= low && note.pitch <= high));
    assert.equal(mapped.notes[0]!.pitch, 47);
    assert.ok(mapped.rangeAdjustments.some((row) => row.includes('note 1')));
  });

  check('determinism and exact rhythm identity', () => {
    const line = motif([60, 62, 64], [0, 1.5, 3], [1, 1, 1]);
    const once = mapMotifPitches({
      motif: line,
      rhythm: [{ kind: 'rest', startBeat: 0, duration: 0 }, ...rhythmFrom(line.notes)],
      source: C_MAJOR,
      target: E_MINOR,
      method: 'M-NEAR',
      meter: { beats: 4, beatType: 4 },
    });
    const twice = mapMotifPitches({
      motif: line,
      rhythm: [{ kind: 'rest', startBeat: 0, duration: 0 }, ...rhythmFrom(line.notes)],
      source: C_MAJOR,
      target: E_MINOR,
      method: 'M-NEAR',
      meter: { beats: 4, beatType: 4 },
    });
    assert.deepEqual(twice, once);
    assert.deepEqual(
      once.notes.map((note) => [note.startBeat, note.duration]),
      line.notes.map((note) => [note.startBeat, note.duration])
    );
    assert.equal(once.notes.length, line.notes.length);
  });

  let auditions: Dev4Audition[] = [];
  check('pilot auditions validate and keep rhythm, degree, nearest, round trip, and scale run', () => {
    auditions = writeDev4Auditions();
    assert.equal(auditions.length, 4);
    const byName = Object.fromEntries(auditions.map((audition) => [audition.filePath.split('/').pop(), audition]));
    const palaceDeg = byName['Dev4-Palace-Gates-M2-M-DEG.musicxml']!;
    const palaceNear = byName['Dev4-Palace-Gates-M2-M-NEAR.musicxml']!;
    const hoboDeg = byName['Dev4-Hobos-M1-M-DEG.musicxml']!;
    const hoboNear = byName['Dev4-Hobos-M1-M-NEAR.musicxml']!;
    assert.deepEqual(palaceDeg.extracted.motif.notes.map((note) => note.pitch), [57, 55, 52]);
    assert.deepEqual(palaceDeg.colour.notes.map((note) => note.pitch), [52, 50, 48]);
    assert.deepEqual(palaceNear.colour.notes.map((note) => note.pitch), [57, 55, 52]);
    assert.deepEqual(palaceNear.colour.commonToneRetentions, [2]);
    palaceDeg.colour.notes.forEach((note) => assert.equal(note.targetDegree, note.sourceDegree));
    assert.deepEqual(hoboDeg.extracted.motif.notes.map((note) => note.pitch), [55, 58, 62, 60, 58, 55]);
    assert.deepEqual(hoboDeg.colour.notes.map((note) => note.pitch), hoboNear.colour.notes.map((note) => note.pitch));
    assert.deepEqual(hoboDeg.colour.notes.map((note) => note.pitch), [56, 58, 63, 60, 58, 56]);
    for (const audition of auditions) {
      assert.equal(audition.valid, true);
      assert.equal(audition.roundTripEqual, true);
      assert.equal(audition.colour.scaleRun.valid, true);
      assert.deepEqual(audition.colour.contourCollisions, []);
      assert.equal(audition.xml.split('<score-part ').length - 1, 1);
      assert.equal(audition.xml.includes('Bass'), false);
      assert.equal((audition.xml.match(/<measure /g) ?? []).length, 5);
      assert.equal(audition.colour.notes.length, audition.extracted.motif.notes.length);
      assert.deepEqual(
        audition.colour.notes.map((note) => [note.startBeat, note.duration]),
        audition.extracted.motif.notes.map((note) => [note.startBeat, note.duration])
      );
      assert.ok(fs.existsSync(audition.filePath));
      const again = createHash('sha256').update(fs.readFileSync(`${ALBUM}/${audition.spec.file}`)).digest('hex');
      const expected = SOURCES.find((row) => row[0] === audition.spec.file)?.[1];
      assert.equal(again, expected);
    }
    assert.match(palaceDeg.xml, /C Major Pent · colour · M-DEG/);
    assert.match(palaceDeg.xml, /E Minor Pent · HOME · M-DEG/);
    assert.match(hoboNear.xml, /Ab Major Pent · colour · M-NEAR/);
    assert.equal(palaceDeg.extracted.colour.homeRelationshipLabel, null);
    assert.equal(palaceDeg.extracted.home.homeRelationshipLabel, 'HOME');
    assert.equal(staffText(palaceDeg.extracted.colour, 'colour', 'M-DEG'), 'C Major Pent · colour · M-DEG');
  });

  check('preserved ornament staff text is chr', () => {
    const passing = motif([60, 61, 62], [0, 1, 2], [1, 1, 1]);
    const colour = mapMotifPitches({
      motif: passing,
      rhythm: rhythmFrom(passing.notes),
      source: C_MAJOR,
      target: C_MAJOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    const returned = mapMotifPitches({
      motif: { ...passing, notes: colour.notes.map((note) => ({ pitch: note.pitch, startBeat: note.startBeat, duration: note.duration })) },
      rhythm: colour.rhythm,
      source: C_MAJOR,
      target: C_MAJOR,
      method: 'M-DEG',
      meter: { beats: 4, beatType: 4 },
    });
    const extracted = {
      motif: passing,
      rhythm: rhythmFrom(passing.notes),
      meter: { beats: 4, beatType: 4 },
      home: { ...C_MAJOR, homeRelationshipLabel: 'HOME' },
      colour: C_MAJOR,
    } as AnnotatedMotif;
    const score = buildAuditionScore({
      title: 'Dev4 audition — synthetic M1 C Major Pentatonic → C Major Pentatonic → C Major Pentatonic M-DEG',
      extracted,
      method: 'M-DEG',
      colour,
      returned,
    });
    const xml = exportScoreModelToMusicXml(score, { omitChordSymbols: true, barMeterMap: score.barMeterMap }).xml ?? '';
    assert.match(xml, />chr</);
    assert.equal(validateMusicXml(xml).valid, true);
    assert.equal(xml.includes('Bass'), false);
  });

  void DEV4_AUDITION_DIR;
  return rows;
}

const rows = runPentatonicDev4Tests();
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
if (rows.some((row) => !row.ok)) process.exit(1);
