/**
 * Hexatonic Phase H3 — phrases and MusicXML.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicH3.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  HEXATONIC_PHRASE_VERSION,
  generateHexatonicPhrase,
  getHexatonicWpsPair,
  hexatonicScoreMatchesPhrase,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  outsideScalarId,
  readHexatonicScore,
  scalarTriadsAt,
  transposedScalarOrder,
} from '../core/hexatonic';
import { canonicalPitchSet, mod12 } from '../core/pentatonic/pitch';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { listPentatonicArchetypes } from '../core/pentatonic/registry';
import { mapMotifPitches, type PentatonicCollectionView } from '../core/pentatonic/motifTransform';
import { transposeScalar } from '../core/hexatonic/collections';

const ROOT = path.resolve(__dirname, '../../..');
const EXAMPLES = path.join(ROOT, 'engines/composer-os-v2/core/hexatonic/examples');

function pcs(phrase: ReturnType<typeof generateHexatonicPhrase>, role: 'inside' | 'outside' | 'return'): number[] {
  return canonicalPitchSet(
    phrase.bars
      .filter((bar) => bar.role === role)
      .flatMap((bar) => bar.attacks)
      .filter((attack) => attack.part === 'guitar' && attack.pitches.length > 0)
      .flatMap((attack) => attack.pitchClasses)
  );
}

function melodyPcs(phrase: ReturnType<typeof generateHexatonicPhrase>, barIndex: number): number[] {
  return phrase.bars[barIndex]!.attacks
    .filter((attack) => attack.part === 'guitar' && attack.surface === 'melody')
    .map((attack) => attack.pitchClasses[0]!);
}

assert.equal(HEXATONIC_PHRASE_VERSION, 'hexatonic-phrase-h3.0');
assert.equal(listPentatonicColourResources().length, 20);
assert.equal(listPentatonicArchetypes().length, 2);

const major: PentatonicCollectionView = {
  name: 'C major pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: null,
};
const minor: PentatonicCollectionView = {
  name: 'C minor pentatonic',
  archetypeId: 'minor_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: null,
};
const motif = {
  id: 'five',
  barCount: 1,
  notes: [
    { pitch: 60, startBeat: 0, duration: 1 },
    { pitch: 64, startBeat: 1, duration: 1 },
    { pitch: 67, startBeat: 2, duration: 1 },
  ],
};
const rhythm = motif.notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration }));
const meter = { beats: 4, beatType: 4 };
const plain = mapMotifPitches({ motif, rhythm, source: major, target: minor, method: 'M-DEG', meter });
const explicit = mapMotifPitches({
  motif,
  rhythm,
  source: { ...major, orderedPitchClasses: [0, 2, 4, 7, 9] },
  target: { ...minor, orderedPitchClasses: [0, 3, 5, 7, 10] },
  method: 'M-DEG',
  meter,
});
assert.deepEqual(explicit.notes.map((note) => note.pitch), plain.notes.map((note) => note.pitch));
assert.throws(() =>
  mapMotifPitches({
    motif,
    rhythm,
    source: { ...major, archetypeId: 'hex_major_omit_seventh' },
    target: minor,
    method: 'M-DEG',
    meter,
  })
);

const hexSource: PentatonicCollectionView = {
  name: 'major omit seventh',
  archetypeId: 'hex_major_omit_seventh',
  referenceNote: 'C',
  homeRelationshipLabel: null,
  orderedPitchClasses: [0, 2, 4, 5, 7, 9],
};
const hexTarget: PentatonicCollectionView = {
  name: 'western claim',
  archetypeId: 'hex_western_claim_not_ritsu',
  referenceNote: 'C',
  homeRelationshipLabel: null,
  orderedPitchClasses: [0, 1, 3, 5, 8, 10],
};
const degreeFive = mapMotifPitches({
  motif: { id: 'six', barCount: 1, notes: [{ pitch: 69, startBeat: 0, duration: 1 }] },
  rhythm: [{ kind: 'note', startBeat: 0, duration: 1 }],
  source: hexSource,
  target: hexTarget,
  method: 'M-DEG',
  meter,
});
assert.equal(degreeFive.notes[0]!.sourceDegree, 5);
assert.equal(degreeFive.notes[0]!.targetDegree, 5);
assert.equal(mod12(degreeFive.notes[0]!.pitch), 10);
const near = mapMotifPitches({
  motif: { id: 'near', barCount: 1, notes: [{ pitch: 64, startBeat: 0, duration: 1 }] },
  rhythm: [{ kind: 'note', startBeat: 0, duration: 1 }],
  source: hexSource,
  target: hexTarget,
  method: 'M-NEAR',
  meter,
});
assert.ok(hexTarget.orderedPitchClasses!.includes(mod12(near.notes[0]!.pitch)));
const oddTarget: PentatonicCollectionView = {
  name: 'whole tone odd',
  archetypeId: 'hex_whole_tone_odd',
  referenceNote: 'C#',
  homeRelationshipLabel: null,
  orderedPitchClasses: [1, 3, 5, 7, 9, 11],
};
const degreeNear = mapMotifPitches({
  motif: { id: 'split', barCount: 1, notes: [{ pitch: 62, startBeat: 0, duration: 1 }] },
  rhythm: [{ kind: 'note', startBeat: 0, duration: 1 }],
  source: hexSource,
  target: oddTarget,
  method: 'M-DEG',
  meter,
});
const nearest = mapMotifPitches({
  motif: { id: 'split', barCount: 1, notes: [{ pitch: 62, startBeat: 0, duration: 1 }] },
  rhythm: [{ kind: 'note', startBeat: 0, duration: 1 }],
  source: hexSource,
  target: oddTarget,
  method: 'M-NEAR',
  meter,
});
assert.equal(mod12(degreeNear.notes[0]!.pitch), 3);
assert.equal(mod12(nearest.notes[0]!.pitch), 1);
assert.equal(degreeNear.notes[0]!.pitch === nearest.notes[0]!.pitch, false);

for (const row of listHexatonicScalars()) {
  for (let centre = 0; centre < 12; centre += 1) {
    const phrase = generateHexatonicPhrase({ seed: 4, centre, scalarId: row.id, method: 'M-DEG' });
    assert.equal(phrase.family, 'scalar');
    assert.equal(phrase.bars.length, 6);
    assert.equal(phrase.bmef.artisticApproval, false);
    assert.equal(phrase.bmef.humanPlayability, 'NOT VERIFIED');
    assert.equal(phrase.bmef.guitar.sixNoteChords, 0);
    assert.ok(phrase.bmef.guitar.maxSimultaneous <= 3);
    assert.ok(phrase.bmef.guitar.maxFretSpan <= 4);
    assert.ok(phrase.bmef.harmonicDisplacement.outsideOnlyPitchClasses > 0);
    assert.equal(phrase.bmef.returnEvidence.homeRecovered, true);
    assert.equal(phrase.bmef.collectionMembership.inside, true);
    assert.equal(phrase.bmef.collectionMembership.outside, true);
    assert.equal(phrase.bmef.collectionMembership.return, true);
    assert.ok(phrase.bmef.motifRecurrence.cellNotes >= 2 && phrase.bmef.motifRecurrence.cellNotes <= 4);
    assert.ok(phrase.bmef.restCount > 0);
    assert.equal(phrase.developmentMethod, 'M-DEG');
    const home = transposedScalarOrder(row.id, centre);
    const away = transposedScalarOrder(outsideScalarId(row.id), centre);
    assert.ok(pcs(phrase, 'inside').every((pc) => home.pitchClasses.includes(pc)));
    assert.ok(pcs(phrase, 'outside').every((pc) => away.pitchClasses.includes(pc)));
    assert.ok(pcs(phrase, 'return').every((pc) => home.pitchClasses.includes(pc)));
    assert.deepEqual(canonicalPitchSet(home.pitchClasses), canonicalPitchSet(transposeScalar(row.id, centre)));
    if (centre === 0) assert.equal(hexatonicScoreMatchesPhrase(phrase), true);
  }
}

for (const pair of listHexatonicWpsPairs()) {
  for (let centre = 0; centre < 12; centre += 1) {
    const phrase = generateHexatonicPhrase({ seed: 4, centre, wpsId: pair.id, method: 'M-NEAR' });
    const record = getHexatonicWpsPair(pair.id)!;
    assert.equal(phrase.parentSymbol, record.parentSymbol);
    assert.equal(phrase.harrisLabel, record.harrisLabel);
    assert.equal(phrase.provenance, `WPS_VAULT_TONALITIES:${pair.id}`);
    assert.equal(phrase.resolutionQuality, record.resolution.quality);
    assert.equal(phrase.tensionQuality, record.tension.quality);
    assert.equal(phrase.bmef.guitar.sixNoteChords, 0);
    assert.ok(phrase.bmef.guitar.maxSimultaneous <= 3);
    assert.equal(phrase.homeId, pair.id);
    const inside = new Set(pcs(phrase, 'inside'));
    const outside = new Set(pcs(phrase, 'outside'));
    const returned = new Set(pcs(phrase, 'return'));
    for (const pc of inside) assert.equal(outside.has(pc), false, pair.id);
    for (const pc of returned) assert.equal(outside.has(pc), false, pair.id);
    assert.ok(inside.size >= 2, pair.id);
    assert.ok(outside.size >= 2, pair.id);
    assert.deepEqual(
      phrase.shellOutsideUnion,
      pair.shellOutsideUnion.map((pc) => mod12(pc + centre))
    );
    if (centre === 0) {
      assert.equal(hexatonicScoreMatchesPhrase(phrase), true);
      const guitar = new Set(phrase.bars.flatMap((bar) => bar.attacks).filter((attack) => attack.part === 'guitar').flatMap((attack) => attack.pitchClasses));
      for (const shell of pair.shellOutsideUnion) assert.equal(guitar.has(shell), false, pair.id);
      if (pair.shellOutsideUnion.length > 0) {
        const bass = new Set(phrase.bars.flatMap((bar) => bar.attacks).filter((attack) => attack.part === 'bass').flatMap((attack) => attack.pitchClasses));
        assert.equal(bass.has(pair.shellOutsideUnion[0]!), true, pair.id);
      }
    }
  }
}

const home = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: 'hex_major_omit_seventh', method: 'M-DEG' });
const again = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: 'hex_major_omit_seventh', method: 'M-DEG' });
assert.equal(home.musicXml, again.musicXml);
const minorHome = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: 'hex_minor_primary', method: 'M-DEG' });
const minorOther = generateHexatonicPhrase({ seed: 5, centre: 0, scalarId: 'hex_minor_primary', method: 'M-DEG' });
assert.equal(
  generateHexatonicPhrase({ seed: 5, centre: 0, scalarId: 'hex_minor_primary', method: 'M-DEG' }).musicXml,
  minorOther.musicXml
);
assert.notEqual(minorHome.musicXml, minorOther.musicXml);
const nearPhrase = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: 'hex_major_omit_seventh', method: 'M-NEAR' });
assert.equal(nearPhrase.developmentMethod, 'M-NEAR');
assert.equal(home.developmentMethod, 'M-DEG');

const up = generateHexatonicPhrase({ seed: 4, centre: 7, scalarId: 'hex_major_omit_seventh', method: 'M-DEG' });
assert.deepEqual(melodyPcs(up, 0).map((pc) => mod12(pc - 7)), melodyPcs(home, 0));
assert.equal(home.symmetryLandingId, 'hex_major_omit_seventh');
assert.equal(up.symmetryLandingId, null);

const even = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: 'hex_whole_tone_even', method: 'M-DEG' });
const evenTwo = generateHexatonicPhrase({ seed: 4, centre: 2, scalarId: 'hex_whole_tone_even', method: 'M-DEG' });
assert.equal(even.symmetryLandingId, 'hex_whole_tone_even');
assert.equal(evenTwo.symmetryLandingId, 'hex_whole_tone_even');
assert.deepEqual(melodyPcs(evenTwo, 0).map((pc) => mod12(pc - 2)), melodyPcs(even, 0));
const augmented = generateHexatonicPhrase({ seed: 4, centre: 4, scalarId: 'hex_augmented_t0', method: 'M-DEG' });
assert.equal(augmented.symmetryLandingId, 'hex_augmented_t0');

const lower = scalarTriadsAt('hex_major_omit_seventh')!;
const lydian = scalarTriadsAt('hex_lydian_triad_pair')!;
for (const [id, reading] of [
  ['hex_major_omit_seventh', lower],
  ['hex_lydian_triad_pair', lydian],
] as const) {
  const phrase = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: id, method: 'M-DEG' });
  const sounding = new Set(pcs(phrase, 'inside').concat(pcs(phrase, 'return')));
  for (const triad of reading) {
    for (const pc of triad.pitchClasses) assert.equal(sounding.has(pc), true, `${id} ${pc}`);
  }
}

const fragment = home.bars[1]!.attacks.filter((attack) => attack.part === 'guitar' && attack.surface === 'melody');
const cell = home.bars[0]!.attacks.filter((attack) => attack.part === 'guitar' && attack.surface === 'melody');
assert.ok(fragment.length < cell.length);
assert.equal(fragment[0]!.startBeat, 0.5);
const staggerGuitar = home.bars[3]!.attacks.filter((attack) => attack.part === 'guitar' && attack.pitches.length > 0);
const staggerBass = home.bars[3]!.attacks.filter((attack) => attack.part === 'bass' && attack.pitches.length > 0);
assert.ok(staggerGuitar.every((attack) => attack.startBeat >= 2));
assert.ok(staggerBass.every((attack) => attack.startBeat + attack.duration <= 2));
assert.ok(home.bars[5]!.attacks.some((attack) => attack.part === 'guitar' && attack.pitches.length === 0));
assert.equal(home.bmef.registerChanged, true);
assert.ok(home.bmef.returnEvidence.registerOrRhythmChange);
assert.equal(home.bmef.phraseBars, 6);

const reading = readHexatonicScore(home.musicXml);
assert.equal(reading.harmonyCount, 0);
assert.equal(reading.tabStaff, false);
assert.ok(reading.words.some((word) => word.startsWith('INSIDE')));
assert.ok(reading.words.some((word) => word.startsWith('OUTSIDE')));
assert.ok(reading.words.some((word) => word.startsWith('RETURN')));
assert.ok(reading.words.some((word) => word.includes('hex_major_omit_seventh')));
assert.ok(reading.words.some((word) => word.includes('hex_western_claim_not_ritsu')));
assert.ok(reading.words.some((word) => word.includes('centre C')));
assert.ok(!home.musicXml.includes('<harmony'));
assert.ok(!home.musicXml.includes('<staff-type>tab</staff-type>'));

const wps = generateHexatonicPhrase({ seed: 4, centre: 0, wpsId: 'maj9', method: 'M-DEG' });
assert.equal(wps.parentSymbol, 'Cmaj9');
assert.equal(wps.resolutionQuality, 'major');
assert.equal(wps.tensionQuality, 'minor');
assert.ok(wps.musicXml.includes('WPS_VAULT_TONALITIES:maj9'));
assert.ok(wps.musicXml.includes('INSIDE'));
assert.equal(hexatonicScoreMatchesPhrase(wps), true);
const omitFourth = generateHexatonicPhrase({ seed: 4, centre: 0, scalarId: 'hex_major_omit_fourth', method: 'M-DEG' });
assert.equal(omitFourth.parentSymbol, null);
assert.notEqual(omitFourth.provenance, wps.provenance);

fs.mkdirSync(EXAMPLES, { recursive: true });
fs.writeFileSync(path.join(EXAMPLES, 'h3-scalar-major-omit-seventh.musicxml'), home.musicXml);
fs.writeFileSync(path.join(EXAMPLES, 'h3-wps-maj9.musicxml'), wps.musicXml);

console.log(JSON.stringify({
  scalar: {
    home: home.homeId,
    outside: home.outsideId,
    centre: home.centreName,
    cell: melodyPcs(home, 0),
    outsideMelody: melodyPcs(home, 2),
    returnMelody: melodyPcs(home, 4),
    bmef: home.bmef,
  },
  wps: {
    id: wps.homeId,
    parent: wps.parentSymbol,
    resolution: wps.resolutionSpelling,
    tension: wps.tensionSpelling,
    cell: melodyPcs(wps, 0),
    outsideMelody: melodyPcs(wps, 2),
    returnMelody: melodyPcs(wps, 4),
    bmef: wps.bmef,
  },
}, null, 2));
