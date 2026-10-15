/**
 * Pentatonic Engine phase 2B — colour path checkpoint.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicColourPath.test.ts
 */
import assert from 'node:assert/strict';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import {
  colourInstance,
  colourMoveAllowed,
  colourPathCatalog,
  planColourRoute,
  recommendRegisteredColourPassage,
} from '../core/pentatonic/colourPath';
import { importPentatonicScoreFromMusicXml } from '../core/pentatonic/musicXmlScore';
import { collectionPitchClasses, mapMotifPitches, type RhythmSlot } from '../core/pentatonic/motifTransform';
import { exportGuitarMusicXml } from '../core/pentatonic/practiceFacade';
import { recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import { PENTATONIC_ARCHETYPES } from '../core/pentatonic/registry';
import { EXPERIMENTAL_COLOUR_PATH_GATE } from '../core/pentatonic/pathIntelligence';
import { COLOUR_VOCABULARY_ENTERS_PATH } from '../core/pentatonic/colourEvaluate';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import type { BaseMotif } from '../core/motif/motifTypes';
import { mod12 } from '../core/pentatonic/pitch';

assert.deepEqual(
  PENTATONIC_ARCHETYPES.map((item) => item.id),
  ['major_pentatonic', 'minor_pentatonic']
);
assert.equal(EXPERIMENTAL_COLOUR_PATH_GATE, false);
assert.equal(COLOUR_VOCABULARY_ENTERS_PATH, false);
assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);

const resources = listPentatonicColourResources();
assert.equal(resources.length, 20);
assert.equal(colourPathCatalog().length, 240);

const rejected = colourInstance('not_a_colour', 'C');
assert.ok('error' in rejected);
assert.match(rejected.error, /not registered/);
assert.match(rejected.error, /minor pentatonic/);
assert.equal(planColourRoute({ resourceId: 'not_a_colour', centre: 'C' }).ok, false);

const centres = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const lines: string[] = [];
let seedSwaps = 0;
let multiStep = 0;
let commonToneChanges = 0;
let collectionChanges = 0;

for (const resource of resources) {
  for (const centre of centres) {
    const planned = planColourRoute({ resourceId: resource.id, centre, seed: 1 });
    assert.equal(planned.ok, true);
    if (!planned.ok) continue;
    assert.equal(planned.catalogSize, 240);
    assert.equal(planned.search.algorithm, 'layered-beam');
    assert.ok(planned.route.steps.length >= planned.minSteps && planned.route.steps.length <= planned.maxSteps);
    assert.ok(planned.route.distinctPitchSets >= 2, `${resource.id} ${centre} stayed on one pitch set`);
    assert.ok(planned.route.switchCount >= 2, `${resource.id} ${centre} switches ${planned.route.switchCount}`);
    assert.ok(Number.isFinite(planned.route.totalCost));
    assert.ok(planned.route.totalCost > 0);
    assert.ok(planned.route.totalCost < 20);
    const start = planned.route.steps[0]!.instance;
    assert.equal(start.resourceId, resource.id);
    assert.deepEqual(
      start.orderedPitchClasses,
      resource.intervals.map((interval) => mod12(start.centrePc + interval))
    );
    assert.equal(new Set(start.orderedPitchClasses).size, 5);
    for (let index = 1; index < planned.route.steps.length; index += 1) {
      const previous = planned.route.steps[index - 1]!.instance;
      const current = planned.route.steps[index]!.instance;
      assert.equal(colourMoveAllowed(previous, current), true);
      if (previous.id !== current.id && previous.resourceId !== current.resourceId) {
        const shared = previous.canonicalPitchClasses.filter((pc) => current.canonicalPitchClasses.includes(pc));
        assert.ok(shared.length >= 1, `${previous.id} -> ${current.id} dropped every common tone`);
        collectionChanges += 1;
        commonToneChanges += 1;
      }
      assert.ok(Number.isFinite(planned.route.steps[index]!.transitionCost));
    }
    assert.equal(planned.route.steps[planned.route.steps.length - 1]!.instance.id, start.id);
    assert.ok(planned.route.steps.some((step) => step.instance.id !== start.id));
    assert.ok(planned.alternatives.length >= 1, `${resource.id} ${centre} has no alternate route`);
    const fingerprints = new Set([
      planned.route.id,
      ...planned.alternatives.map((route) => route.id),
    ]);
    assert.equal(fingerprints.size, 1 + planned.alternatives.length, `${resource.id} ${centre} alternatives repeat an instance sequence`);
    const again = planColourRoute({ resourceId: resource.id, centre, seed: 1 });
    assert.equal(again.ok, true);
    if (again.ok) assert.deepEqual(again.route.steps.map((step) => step.instance.id), planned.route.steps.map((step) => step.instance.id));
    const otherSeed = planColourRoute({ resourceId: resource.id, centre, seed: 2 });
    assert.equal(otherSeed.ok, true);
    if (otherSeed.ok) {
      assert.equal(otherSeed.route.totalCost, planned.route.totalCost);
      if (otherSeed.route.steps[1]!.instance.id !== planned.route.steps[1]!.instance.id) seedSwaps += 1;
    }
    multiStep += 1;
    const depart = planned.route.steps[1]!.instance;
    lines.push(
      [
        resource.id,
        centre,
        planned.route.totalCost.toFixed(6),
        planned.route.switchCount,
        planned.route.steps.map((step) => step.instance.id).join('>'),
        planned.alternatives.map((route) => `${route.id}:${route.totalCost.toFixed(6)}:${route.steps[1]!.instance.id}`).join(';'),
      ].join('\t')
    );
    assert.equal(depart.orderedPitchClasses.length, 5);
  }
}

assert.equal(multiStep, 240);
assert.ok(collectionChanges > 0);
assert.ok(seedSwaps > 0, 'equal-cost departures never moved under a second seed');

const majorPassage = {
  tonalCentre: { root: 'C', mode: 'major' as const },
  home: { archetypeId: 'major_pentatonic', referenceNote: 'C' },
  events: [
    { id: 'a', sourceLabel: '1', melodyNotes: ['C', 'D', 'E'] },
    { id: 'b', sourceLabel: '2', melodyNotes: ['G', 'A', 'C'] },
    { id: 'c', sourceLabel: '3', melodyNotes: ['C', 'D', 'E'], melodyRest: false, bassRest: true },
  ],
};
const majorBefore = recommendPentatonicPath(majorPassage);
const majorAfter = recommendPentatonicPath(majorPassage);
assert.equal(majorBefore.disposition, 'PATH');
assert.deepEqual(majorAfter, majorBefore);
assert.ok((majorBefore.totalPathCost ?? 99) < 20);

const colourPassage = recommendRegisteredColourPassage({
  tonalCentre: { root: 'C', mode: 'major' },
  home: { archetypeId: 'hirajoshi', referenceNote: 'C' },
  events: [
    { id: 'a', sourceLabel: '1', melodyNotes: ['C', 'D', 'Eb'] },
    { id: 'b', sourceLabel: '2', melodyNotes: ['Db', 'F', 'Gb'] },
    { id: 'c', sourceLabel: '3', melodyRest: true, bassRest: true },
    { id: 'd', sourceLabel: '4', melodyNotes: ['C', 'D', 'Eb'], phraseBoundaryAfter: false },
  ],
});
assert.equal(colourPassage.disposition, 'PATH');
assert.ok(colourPassage.events.length === 4);
assert.equal(colourPassage.events[2]!.changeFlag, 'retained');
assert.equal(colourPassage.events[2]!.chosenId, colourPassage.events[1]!.chosenId);
assert.ok((colourPassage.switchCount ?? 0) >= 1);
assert.ok(Number.isFinite(colourPassage.totalPathCost));
assert.ok(colourPassage.alternatives.length >= 1);
const altIds = colourPassage.alternatives[0]!.chosenIds.join('>');
const bestIds = colourPassage.events.map((event) => event.chosenId).join('>');
assert.notEqual(altIds, bestIds);
for (const event of colourPassage.events) {
  if (!event.canonicalPitchSet) continue;
  assert.equal(event.canonicalPitchSet.length, 5);
  if (event.archetypeId) {
    const resource = resources.find((item) => item.id === event.archetypeId);
    assert.ok(resource);
    const centrePc = centres.indexOf(event.referenceNote as (typeof centres)[number]);
    assert.deepEqual(
      [...event.canonicalPitchSet].sort((a, b) => a - b),
      resource!.intervals.map((interval) => mod12(centrePc + interval)).sort((a, b) => a - b)
    );
  }
}

const unknownPassage = recommendRegisteredColourPassage({
  events: [{ id: 'a', sourceLabel: '1', melodyNotes: ['C'] }],
  home: { archetypeId: 'nope', referenceNote: 'C' },
});
assert.equal(unknownPassage.kind, 'validation');
assert.match(unknownPassage.validationErrors.join(' '), /not registered/);

const sample = planColourRoute({ resourceId: 'hirajoshi', centre: 'F#', seed: 1 });
assert.equal(sample.ok, true);
if (sample.ok) {
  const source = sample.route.steps[0]!.instance;
  const target = sample.route.steps[1]!.instance;
  const sourceView = {
    name: `${source.centre} ${source.displayName}`,
    archetypeId: source.resourceId,
    referenceNote: source.centre,
    homeRelationshipLabel: null,
  };
  const targetView = {
    name: `${target.centre} ${target.displayName}`,
    archetypeId: target.resourceId,
    referenceNote: target.centre,
    homeRelationshipLabel: null,
  };
  const classes = collectionPitchClasses(sourceView);
  const pitches = [0, 2, 4].map((degree) => 60 + classes[degree]!);
  const motif: BaseMotif = {
    id: 'route-cell',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: index, duration: 0.5 })),
  };
  const rhythm: RhythmSlot[] = [
    { kind: 'note', startBeat: 0, duration: 0.5 },
    { kind: 'rest', startBeat: 0.5, duration: 0.5 },
    { kind: 'note', startBeat: 1, duration: 0.5 },
    { kind: 'note', startBeat: 1.5, duration: 0.5 },
  ];
  const mapped = mapMotifPitches({
    motif,
    rhythm,
    source: sourceView,
    target: targetView,
    method: 'M-DEG',
    meter: { beats: 4, beatType: 4 },
  });
  const near = mapMotifPitches({
    motif,
    rhythm,
    source: sourceView,
    target: targetView,
    method: 'M-NEAR',
    meter: { beats: 4, beatType: 4 },
  });
  const targetClasses = new Set(collectionPitchClasses(targetView));
  for (const note of mapped.notes) assert.ok(targetClasses.has(mod12(note.pitch)));
  for (const note of near.notes) assert.ok(targetClasses.has(mod12(note.pitch)));
  assert.deepEqual(mapped.rhythm, rhythm);
  const timed = [
    [
      ...mapped.notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration, pitch: note.pitch })),
      { kind: 'rest' as const, startBeat: 2, duration: 2 },
    ],
  ];
  const xml = exportGuitarMusicXml({
    title: 'Hirajoshi F# path',
    chord: 'N.C.',
    bars: [mapped.notes.map((note) => note.pitch)],
    timed,
    beats: 4,
    beatType: 4,
  });
  assert.match(xml, /<rest/);
  const imported = importPentatonicScoreFromMusicXml(xml);
  const event = imported.events[0];
  assert.ok(event);
  assert.equal(event.timeBeats, 4);
  assert.equal(event.timeBeatType, 4);
  const midis = (event.registerAttacks ?? []).filter((attack) => attack.role === 'melody').map((attack) => attack.midi);
  assert.deepEqual(midis, mapped.notes.map((note) => note.pitch));
}

console.log(`pentatonicColourPath: PASS ${multiStep} routes, ${collectionChanges} collection changes, ${seedSwaps} seed swaps`);
console.log(lines.join('\n'));
