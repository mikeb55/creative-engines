/**
 * Pentatonic Engine phase 2A — motif and phrase generation for all 20 colours.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicColourPhrase.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBhlWorldField, BHL_WORLD_IDS } from '../core/bhl/bhlWorlds';
import { bhlPentatonicPitchClasses, resolveBhlMotif } from '../core/bhl/bhlResources';
import type { BhlBassBar } from '../core/bhl/bhlRhythm';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import {
  collectionPitchClasses,
  mapMotifPitches,
  strongBeatOnsets,
  type PentatonicCollectionView,
  type RhythmSlot,
} from '../core/pentatonic/motifTransform';
import { importPentatonicScoreFromMusicXml } from '../core/pentatonic/musicXmlScore';
import { realisePentatonicPhrase, transformCell } from '../core/pentatonic/phraseOperators';
import { exportGuitarMusicXml, transformPracticeCell } from '../core/pentatonic/practiceFacade';
import { PENTATONIC_ARCHETYPES, getPentatonicArchetype } from '../core/pentatonic/registry';
import type { BaseMotif } from '../core/motif/motifTypes';
import { mod12 } from '../core/pentatonic/pitch';

const CENTRES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

function view(id: string, referenceNote: string, name: string): PentatonicCollectionView {
  return { name, archetypeId: id, referenceNote, homeRelationshipLabel: null };
}

function midiNear(pc: number, anchor: number): number {
  let best = anchor;
  let bestDistance = 99;
  for (let midi = anchor - 18; midi <= anchor + 18; midi += 1) {
    if (mod12(midi) !== mod12(pc)) continue;
    const distance = Math.abs(midi - anchor);
    if (distance < bestDistance || (distance === bestDistance && midi < best)) {
      best = midi;
      bestDistance = distance;
    }
  }
  return best;
}

function cell(classes: readonly number[]): number[] {
  return [0, 2, 4].map((degree, index) => midiNear(classes[degree]!, 60 + index * 2));
}

function motifOf(pitches: readonly number[]): BaseMotif {
  return {
    id: 'colour-cell',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: 0.5 + index, duration: 0.5 })),
  };
}

function rhythmFor(pitches: readonly number[]): RhythmSlot[] {
  const slots: RhythmSlot[] = [];
  pitches.forEach((_, index) => {
    slots.push({ kind: 'note', startBeat: index, duration: 0.5 });
    if (index === 0) slots.push({ kind: 'rest', startBeat: 0.5, duration: 0.5 });
  });
  return slots;
}

const resources = listPentatonicColourResources();
assert.equal(resources.length, 20);
assert.deepEqual(
  PENTATONIC_ARCHETYPES.map((item) => item.id),
  ['major_pentatonic', 'minor_pentatonic']
);

let pairs = 0;
let phrases = 0;
let xmlPairs = 0;
const sampleXml: { id: string; xml: string }[] = [];

for (const resource of resources) {
  const steps = resource.intervals.map((interval, index) => {
    const next = resource.intervals[(index + 1) % resource.intervals.length]!;
    return index + 1 < resource.intervals.length ? next - interval : 12 - interval;
  });
  assert.equal(new Set(resource.intervals).size, 5, resource.id);

  for (let centrePc = 0; centrePc < 12; centrePc += 1) {
    const centre = CENTRES[centrePc]!;
    const home = view(resource.id, centre, `${resource.displayName} ${centre}`);
    const classes = collectionPitchClasses(home);
    assert.deepEqual(
      classes,
      resource.intervals.map((interval) => mod12(centrePc + interval)),
      `${resource.id} ${centre}`
    );
    assert.equal(new Set(classes).size, 5);
    for (let index = 0; index < classes.length; index += 1) {
      assert.equal(mod12(classes[(index + 1) % classes.length]! - classes[index]!), mod12(steps[index]!));
    }

    const pitches = cell(classes);
    const shifted = view(resource.id, CENTRES[(centrePc + 1) % 12]!, `${resource.displayName} +1`);
    const shiftedClasses = collectionPitchClasses(shifted);
    const motif = motifOf(pitches);
    const rhythm = rhythmFor(pitches);
    const meter = centrePc === 0 ? { beats: 5, beatType: 4 } : centrePc === 1 ? { beats: 6, beatType: 8 } : { beats: 4, beatType: 4 };
    const mapped = mapMotifPitches({
      motif,
      rhythm,
      source: home,
      target: shifted,
      method: 'M-DEG',
      meter,
    });
    assert.deepEqual(mapped.rhythm, rhythm);
    assert.equal(mapped.notes.length, pitches.length);
    mapped.notes.forEach((note, index) => {
      assert.equal(note.startBeat, motif.notes[index]!.startBeat);
      assert.equal(note.duration, motif.notes[index]!.duration);
      assert.ok(shiftedClasses.includes(mod12(note.pitch)), `${resource.id} ${centre} M-DEG left the collection`);
      if (!note.retainedCommonTone && !note.repeatHeld) {
        assert.equal(note.sourceDegree, index === 0 ? 0 : index === 1 ? 2 : 4);
        assert.equal(note.targetDegree, note.sourceDegree);
        assert.equal(mod12(note.pitch), shiftedClasses[note.sourceDegree!]!);
      }
    });

    const outsider = midiNear(classes.find((pc) => !classes.includes(mod12(pc + 1)))! + 1, 64);
    assert.equal(classes.includes(mod12(outsider)), false);
    const near = mapMotifPitches({
      motif: motifOf([outsider]),
      rhythm: [{ kind: 'note', startBeat: 0.5, duration: 0.5 }],
      source: home,
      target: home,
      method: 'M-NEAR',
      meter: { beats: 4, beatType: 4 },
    });
    assert.equal(classes.includes(mod12(near.notes[0]!.pitch)), true);
    const member = mapMotifPitches({
      motif: motifOf([pitches[0]!]),
      rhythm: [{ kind: 'note', startBeat: 0.5, duration: 0.5 }],
      source: home,
      target: home,
      method: 'M-NEAR',
      meter: { beats: 4, beatType: 4 },
    });
    assert.equal(mod12(member.notes[0]!.pitch), mod12(pitches[0]!));

    const turned = transformCell({ pitches, collection: home, transform: 'M-DEG', target: shifted });
    assert.equal(turned.length, pitches.length);
    turned.forEach((pitch) => assert.ok(shiftedClasses.includes(mod12(pitch))));
    const rotated = transformCell({ pitches, collection: home, transform: 'rotation' });
    assert.deepEqual(rotated, [pitches[1], pitches[2], pitches[0]]);
    const transposed = transformCell({ pitches, collection: home, transform: 'transposition' });
    assert.deepEqual(
      transposed,
      pitches.map((pitch) => pitch + steps[0]!)
    );

    const phrase = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home,
      motif,
      method: 'M-DEG',
      operator: 'CELL_LINEAGE',
      sourceRhythm: rhythm,
    });
    assert.equal(phrase.phraseResult, 'PHRASE', `${resource.id} ${centre} produced no phrase`);
    assert.ok(phrase.pitches.length >= 3);
    phrase.pitches.forEach((pitch) => assert.ok(classes.includes(mod12(pitch)), `${resource.id} phrase left the collection`));
    assert.equal(phrase.rhythm, 'source');
    assert.ok(phrase.rhythmEvents.some((event) => event.kind === 'rest'));
    assert.deepEqual(
      phrase.rhythmEvents.filter((event) => event.kind === 'note').map((event) => event.duration),
      rhythm.filter((slot) => slot.kind === 'note').map((slot) => slot.duration)
    );
    phrases += 1;

    const silent = realisePentatonicPhrase({ purpose: 'NO_PHRASE', home, motif, operator: 'NONE' });
    assert.equal(silent.phraseResult, 'NO_PHRASE');
    assert.deepEqual(silent.pitches, []);
    assert.equal(silent.plan.operator, 'NONE');

    const timed = phrase.rhythmEvents.map((event) =>
      event.kind === 'rest' || event.pitch === undefined
        ? { kind: 'rest' as const, startBeat: event.startBeat, duration: event.duration }
        : { kind: 'note' as const, startBeat: event.startBeat, duration: event.duration, pitch: event.pitch }
    );
    const xml = exportGuitarMusicXml({
      title: `${resource.displayName} ${centre}`,
      chord: 'N.C.',
      bars: [phrase.pitches],
      timed: [timed],
      beats: meter.beats,
      beatType: meter.beatType,
    });
    const imported = importPentatonicScoreFromMusicXml(xml);
    const event = imported.events[0];
    assert.ok(event, `${resource.id} ${centre} reimport dropped the bar`);
    assert.equal(event.timeBeats, meter.beats);
    assert.equal(event.timeBeatType, meter.beatType);
    const midis = (event.registerAttacks ?? []).filter((attack) => attack.role === 'melody').map((attack) => attack.midi);
    const written = timed.filter((item) => item.kind === 'note').map((item) => item.pitch);
    assert.deepEqual(midis, written, `${resource.id} ${centre} MusicXML pitch mismatch`);
    assert.match(xml, /<rest[\s/>]/);
    xmlPairs += 1;
    if (centre === 'C' && (resource.id === 'iwato' || resource.id === 'major_pentatonic' || resource.id === 'minor_pentatonic')) {
      sampleXml.push({ id: resource.id, xml });
    }
    pairs += 1;
  }
}

assert.equal(pairs, 240);
assert.equal(phrases, 240);
assert.equal(xmlPairs, 240);
assert.deepEqual(strongBeatOnsets(5, 4), [0, 2, 4]);
assert.deepEqual(strongBeatOnsets(6, 8), [0, 1.5]);

const major = getPentatonicArchetype('major_pentatonic')!;
const minor = getPentatonicArchetype('minor_pentatonic')!;
for (let centrePc = 0; centrePc < 12; centrePc += 1) {
  assert.deepEqual(
    collectionPitchClasses(view('major_pentatonic', CENTRES[centrePc]!, 'major')),
    major.intervals.map((interval) => mod12(centrePc + interval))
  );
  assert.deepEqual(
    collectionPitchClasses(view('minor_pentatonic', CENTRES[centrePc]!, 'minor')),
    minor.intervals.map((interval) => mod12(centrePc + interval))
  );
}

const cMajor = view('major_pentatonic', 'C', 'C Major Pentatonic');
const aMinor = view('minor_pentatonic', 'A', 'A Minor Pentatonic');
const cross = mapMotifPitches({
  motif: motifOf([60, 62, 64]),
  rhythm: motifOf([60, 62, 64]).notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration })),
  source: cMajor,
  target: aMinor,
  method: 'M-DEG',
  meter: { beats: 4, beatType: 4 },
});
assert.deepEqual(
  cross.notes.map((note) => note.pitch),
  [57, 60, 64]
);
assert.deepEqual(
  cross.notes.map((note) => note.targetDegree),
  [0, 1, 3]
);

const iwato = view('iwato', 'C', 'Iwato C');
const iwatoSteps = collectionPitchClasses(iwato);
assert.deepEqual(
  iwatoSteps.map((pc, index) => mod12(iwatoSteps[(index + 1) % iwatoSteps.length]! - pc)),
  [1, 4, 1, 4, 2]
);
const onIwato = transformPracticeCell({ pitches: [60, 61, 65], fieldId: 'iwato', centre: 'C', transform: 'M-DEG' });
const asMinor = transformPracticeCell({ pitches: [60, 61, 65], fieldId: 'minor_pentatonic', centre: 'C', transform: 'M-DEG' });
assert.notDeepEqual(onIwato, asMinor);
assert.equal(mod12(onIwato[1]!), 1);
assert.ok(collectionPitchClasses(iwato).includes(mod12(onIwato[1]!)));
assert.equal(collectionPitchClasses(view('minor_pentatonic', 'C', 'minor')).includes(1), false);

assert.throws(() => collectionPitchClasses(view('not_a_colour', 'C', 'missing')), /not registered/);
assert.throws(() => transformPracticeCell({ pitches: [60, 64, 67], fieldId: 'not_a_colour', centre: 'C' }), /not registered/);

const bhlMajor = bhlPentatonicPitchClasses({ archetypeId: 'major_pentatonic', referenceNote: 'C', relationshipId: 'home' });
const bhlMinor = bhlPentatonicPitchClasses({ archetypeId: 'minor_pentatonic', referenceNote: 'C', relationshipId: 'home' });
assert.deepEqual(bhlMajor.pitchClasses, [0, 2, 4, 7, 9]);
assert.deepEqual(bhlMinor.pitchClasses, [0, 3, 5, 7, 10]);
for (const resource of resources) {
  const built = bhlPentatonicPitchClasses({ archetypeId: resource.id, referenceNote: 'C', relationshipId: 'home' });
  assert.deepEqual(
    [...built.pitchClasses].sort((left, right) => left - right),
    [...resource.intervals].sort((left, right) => left - right)
  );
}
const majorMotif = resolveBhlMotif(
  { kind: 'import', pitches: [60, 62, 64, 67], pitchTransform: 'none' },
  { archetypeId: 'major_pentatonic', referenceNote: 'C', relationshipId: 'home' }
);
assert.deepEqual(
  majorMotif.notes.map((note) => note.pitch),
  [60, 62, 64, 67]
);
const suspendedMotif = resolveBhlMotif(
  { kind: 'import', pitches: [60, 62, 64], pitchTransform: 'none' },
  { archetypeId: 'suspended_pentatonic', referenceNote: 'C', relationshipId: 'home' }
);
assert.match(suspendedMotif.limitations.join(' '), /not rewritten as major or minor pentatonic/);
for (const pitch of suspendedMotif.notes.map((note) => note.pitch)) {
  assert.ok([0, 2, 5, 7, 10].includes(mod12(pitch)));
}

const bass: BhlBassBar = {
  bar: 1,
  quarters: 4,
  attacks: [0],
  rests: [],
  notes: [{ onset: 0, quarters: 4, midi: 48, pitchClass: 0 }],
  pitchClasses: [0, 4, 7],
  rootPc: 0,
};
const worldPcs = Object.fromEntries(BHL_WORLD_IDS.map((world) => [world, buildBhlWorldField(world, bass, 'primary').pitchClasses]));
assert.deepEqual(worldPcs.A, [0, 2, 4, 6, 7, 9]);
assert.deepEqual(worldPcs.C, [0, 4, 7, 8]);
assert.deepEqual(worldPcs.D, [0, 3, 4, 6, 7]);
assert.deepEqual(worldPcs.E, [0, 2, 4, 7, 9]);
assert.deepEqual(worldPcs.F, [0, 1, 3, 4, 6, 7, 10]);
assert.deepEqual(buildBhlWorldField('B', bass, 'primary').pitchClasses, worldPcs.B);
assert.ok(worldPcs.B.length >= 3);

const outDir = path.join(os.tmpdir(), 'pentatonic-phase2a');
fs.mkdirSync(outDir, { recursive: true });
for (const sample of sampleXml) {
  fs.writeFileSync(path.join(outDir, `${sample.id}-C.musicxml`), sample.xml);
}

console.log(`pentatonicColourPhrase: PASS ${pairs} collections×centres, ${phrases} phrases, ${xmlPairs} MusicXML round-trips`);
console.log(`samples ${outDir}`);
