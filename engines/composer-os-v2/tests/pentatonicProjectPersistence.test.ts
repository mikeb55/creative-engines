/**
 * Phase 2D — pentatonic project save and reload.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicProjectPersistence.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiPentatonicOpenProject, apiPentatonicSaveProject } from '../app-api/pentatonicProjectApp';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { colourInstance, planColourRoute } from '../core/pentatonic/colourPath';
import { importPentatonicScoreFromMusicXml } from '../core/pentatonic/musicXmlScore';
import {
  capturePentatonicProject,
  extractPentatonicProjectMusic,
  validatePentatonicProject,
  type PentatonicProjectCapture,
  type PentatonicProjectV1,
} from '../core/pentatonic/pentatonicProject';
import { loadPentatonicProject, savePentatonicProject } from '../core/pentatonic/pentatonicProjectFile';
import { exportGuitarMusicXml, generatePracticeExample } from '../core/pentatonic/practiceFacade';
import { getPentatonicArchetype, PENTATONIC_ARCHETYPES } from '../core/pentatonic/registry';
import type { PentatonicCandidateView, PentatonicGenerateResult, PentatonicTransformResult } from '../core/pentatonic/dev4cWorkflow';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pentatonic-project-'));
process.env.COMPOSER_OS_OUTPUT_DIR = root;
const centres = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const resources = listPentatonicColourResources();
assert.equal(resources.length, 20);
assert.deepEqual(
  PENTATONIC_ARCHETYPES.map((item) => item.id),
  ['major_pentatonic', 'minor_pentatonic']
);
assert.deepEqual(getPentatonicArchetype('major_pentatonic')?.intervals, [0, 2, 4, 7, 9]);
assert.deepEqual(getPentatonicArchetype('minor_pentatonic')?.intervals, [0, 3, 5, 7, 10]);

function baseCapture(patch: Partial<PentatonicProjectCapture> & Pick<PentatonicProjectCapture, 'id' | 'resourceId' | 'centre'>): PentatonicProjectCapture {
  return {
    title: patch.id,
    notes: 'phase-2d',
    savedAt: '2026-10-15T00:00:00.000Z',
    routeMinSteps: 3,
    routeMaxSteps: 5,
    routeEnding: 'return',
    routeSeed: 1,
    routePick: 0,
    colourRoute: null,
    phraseSeed: 1,
    motif: null,
    purpose: 'MOTIF',
    activity: 'SPARSE',
    method: 'M-DEG',
    silence: false,
    noPhrase: false,
    generated: null,
    transform: null,
    chosen: null,
    importFileName: null,
    importXml: null,
    regionIndex: 0,
    mode: 'generate',
    resourceMode: 'manual',
    colourReference: patch.centre ?? 'C',
    ...patch,
  };
}

function roundTrip(project: PentatonicProjectV1): PentatonicProjectV1 {
  const saved = savePentatonicProject(path.join(root, 'Pentatonic Projects', `${project.id}.pentatonic.json`), project, true);
  assert.ok(!('error' in saved), 'error' in saved ? saved.error : '');
  const loaded = loadPentatonicProject(saved.path);
  assert.equal(loaded.ok, true, loaded.errors.join('; '));
  assert.deepEqual(loaded.project, project);
  return loaded.project!;
}

let identityPairs = 0;
for (const resource of resources) {
  for (const centre of centres) {
    const instance = colourInstance(resource.id, centre);
    assert.ok(!('error' in instance));
    if ('error' in instance) continue;
    const captured = capturePentatonicProject(baseCapture({ id: `id-${resource.id}-${centre.replace('#', 's')}`, resourceId: resource.id, centre }));
    assert.equal(captured.ok, true, captured.errors.join('; '));
    const loaded = roundTrip(captured.project!);
    assert.equal(loaded.collection.resourceId, resource.id);
    assert.equal(loaded.collection.centre, instance.centre);
    assert.deepEqual(loaded.collection.spelling, [...instance.spelling]);
    assert.deepEqual(loaded.collection.orderedPitchClasses, [...instance.orderedPitchClasses]);
    assert.equal(loaded.collection.canonicalId, instance.canonicalId);
    assert.equal(loaded.route.retention.maxConsecutiveRetentions, 1);
    identityPairs += 1;
  }
}
assert.equal(identityPairs, 240);

function storeRoute(id: string, resourceId: string, centre: string, minSteps: number, maxSteps: number, ending: 'return' | 'open', seed: number, pick: number) {
  const planned = planColourRoute({ resourceId, centre, seed, minSteps, maxSteps, ending });
  assert.equal(planned.ok, true, !planned.ok ? planned.error : '');
  if (!planned.ok) return;
  const routes = [planned.route, ...planned.alternatives];
  const index = Math.min(pick, routes.length - 1);
  const captured = capturePentatonicProject(
    baseCapture({
      id,
      resourceId,
      centre,
      routeMinSteps: minSteps,
      routeMaxSteps: maxSteps,
      routeEnding: ending,
      routeSeed: seed,
      routePick: index,
      colourRoute: planned,
    })
  );
  assert.equal(captured.ok, true, captured.errors.join('; '));
  const loaded = roundTrip(captured.project!);
  assert.equal(loaded.route.generated?.ok, true);
  assert.deepEqual(loaded.route.generated, planned);
  assert.equal(loaded.route.selectedCandidateId, routes[index]!.id);
  assert.equal(loaded.route.minSteps, minSteps);
  assert.equal(loaded.route.maxSteps, maxSteps);
  assert.equal(loaded.route.ending, ending);
  assert.equal(loaded.route.seed, seed);
}

for (const resource of resources) {
  storeRoute(`return-${resource.id}`, resource.id, 'C', 3, 4, 'return', 4, 0);
  storeRoute(`open-${resource.id}`, resource.id, 'G', 2, 3, 'open', 9, 1);
}
for (const centre of centres) {
  storeRoute(`hirajoshi-${centre.replace('#', 's')}`, 'hirajoshi', centre, 3, 5, 'return', 11, 1);
}
storeRoute('long-iwato', 'iwato', 'Bb', 6, 7, 'return', 3, 2);
storeRoute('major-route', 'major_pentatonic', 'Eb', 3, 3, 'return', 1, 0);
storeRoute('minor-route', 'minor_pentatonic', 'A', 4, 6, 'open', 8, 1);

const timed = exportGuitarMusicXml({
  title: 'persisted events',
  chord: 'N.C.',
  bars: [[], []],
  beats: 5,
  beatType: 8,
  timed: [
    [
      { kind: 'note', startBeat: 0, duration: 1, pitch: 64, spelling: { step: 'E', alter: 0 } },
      { kind: 'rest', startBeat: 1, duration: 0.5 },
      { kind: 'note', startBeat: 1.5, duration: 1, pitch: 66, spelling: { step: 'F', alter: 1 } },
    ],
    [{ kind: 'rest', startBeat: 0, duration: 2.5 }],
  ],
  collection: { resourceId: 'hirajoshi', centre: 'F#' },
});
const extracted = extractPentatonicProjectMusic(timed);
assert.equal(extracted.ok, true);
if (!extracted.ok) throw new Error('extract failed');
assert.equal(extracted.music.events.some((event) => event.kind === 'rest'), true);
assert.equal(extracted.music.events.some((event) => event.kind === 'note' && event.midi === 66 && event.alter === 1), true);
assert.equal(extracted.music.events[0]?.beats, 5);
assert.equal(extracted.music.events[0]?.beatType, 8);
assert.deepEqual(extracted.music.collectionMarks, [{ partId: 'guitar', measure: 1, resourceId: 'hirajoshi', centre: 'F#' }]);

const candidate: PentatonicCandidateView = {
  letter: 'A',
  purpose: 'MOTIF',
  purposeLabel: 'Motif',
  activityLabel: 'Sparse',
  silence: false,
  resultLabel: 'E4 rest F#4',
  selectedResource: 'F# Hirajoshi',
  resourceNotes: 'F# G A C D#',
  actualNotes: 'E4 F#4',
  outsideResourceNotes: 'NONE',
  scaleLike: null,
  gceOverall: null,
  gceCategories: [],
  gceWarnings: [],
  musicXml: timed,
  method: 'M-DEG',
  pitchChange: 'YES',
};
const generated: PentatonicGenerateResult = {
  notice: 'stored phrase',
  musicContext: { presetId: 'colour-path', seed: 11, meter: '5/8', harmonyChecksum: 'locked', barCount: 2 },
  candidates: [candidate],
};
const transform: PentatonicTransformResult = {
  method: 'M-NEAR',
  pitchChange: 'YES',
  selectedResource: 'F# Hirajoshi',
  resourceNotes: 'F# G A C D#',
  actualNotes: 'E4 F#4',
  outsideResourceNotes: 'NONE',
  musicXml: timed,
  sourcePitches: [64, 66],
  resultPitches: [64, 66],
};
const musical = capturePentatonicProject(
  baseCapture({
    id: 'events-hirajoshi',
    resourceId: 'hirajoshi',
    centre: 'F#',
    routeSeed: 11,
    phraseSeed: 11,
    motif: 'F# G A',
    method: 'M-NEAR',
    generated,
    transform,
    chosen: 'A',
    importFileName: 'events.musicxml',
    importXml: timed,
    colourReference: 'F#',
  })
);
assert.equal(musical.ok, true, musical.errors.join('; '));
const musicalLoaded = roundTrip(musical.project!);
assert.equal(musicalLoaded.phrase?.motif, 'F# G A');
assert.equal(musicalLoaded.phrase?.method, 'M-NEAR');
assert.deepEqual(musicalLoaded.phrase?.transform?.sourcePitches, [64, 66]);
assert.deepEqual(musicalLoaded.phrase?.music[0]?.events, extracted.music.events);
assert.equal(musicalLoaded.phrase?.generated?.candidates[0]?.musicXml, timed);
assert.equal(musicalLoaded.source.xml, timed);
const reimported = importPentatonicScoreFromMusicXml(musicalLoaded.phrase!.generated!.candidates[0]!.musicXml);
assert.equal(reimported.events[0]?.timeBeats, 5);
assert.equal(reimported.events[0]?.timeBeatType, 8);
assert.equal(reimported.events.some((event) => event.melodyRest), true);
const sounded = reimported.events.flatMap((event) => event.registerAttacks?.map((attack) => attack.midi) ?? []);
assert.deepEqual(sounded, [64, 66]);

const practice = generatePracticeExample({ fieldId: 'kumoi', centre: 'D', motif: 'D F G', category: 'HOME_CONTINUITY', difficulty: 'SPARSE', variation: 0 });
const practiceView: PentatonicCandidateView = {
  ...candidate,
  purpose: 'MOTIF',
  silence: practice.pitches.length === 0,
  musicXml: practice.musicXml,
  actualNotes: practice.notes || 'NONE',
  resultLabel: practice.notes || 'NONE',
};
const practiceProject = capturePentatonicProject(
  baseCapture({
    id: 'practice-kumoi',
    resourceId: 'kumoi',
    centre: 'D',
    motif: 'D F G',
    phraseSeed: 1,
    generated: { notice: practice.notes, musicContext: { presetId: 'colour-path', seed: 1, meter: '4/4', harmonyChecksum: '', barCount: practice.barCount }, candidates: [practiceView] },
    chosen: 'A',
  })
);
assert.equal(practiceProject.ok, true, practiceProject.errors.join('; '));
const practiceLoaded = roundTrip(practiceProject.project!);
assert.equal(practiceLoaded.phrase?.generated?.candidates[0]?.musicXml, practice.musicXml);
assert.deepEqual(practiceLoaded.phrase?.music[0]?.events.map((event) => event.midi), extractPentatonicProjectMusic(practice.musicXml).ok ? extractPentatonicProjectMusic(practice.musicXml).music?.events.map((event) => event.midi) : []);

const silentXml = exportGuitarMusicXml({ title: 'silence', chord: 'N.C.', bars: [[]], beats: 4, beatType: 4 });
const silentCandidate: PentatonicCandidateView = {
  ...candidate,
  purpose: 'NO_PHRASE',
  purposeLabel: 'No phrase / silence',
  silence: true,
  resultLabel: 'NONE',
  selectedResource: 'NONE',
  resourceNotes: 'NONE',
  actualNotes: 'NONE',
  musicXml: silentXml,
};
const silent = capturePentatonicProject(
  baseCapture({
    id: 'none-no-phrase',
    resourceId: 'NONE',
    centre: 'C',
    purpose: 'NO_PHRASE',
    silence: true,
    noPhrase: true,
    motif: null,
    generated: {
      notice: 'NONE',
      musicContext: { presetId: 'colour-path', seed: 2, meter: '4/4', harmonyChecksum: '', barCount: 1 },
      candidates: [silentCandidate],
    },
    chosen: 'A',
    colourReference: 'C',
  })
);
assert.equal(silent.ok, true, silent.errors.join('; '));
const silentLoaded = roundTrip(silent.project!);
assert.equal(silentLoaded.collection.resourceId, 'NONE');
assert.deepEqual(silentLoaded.collection.spelling, []);
assert.equal(silentLoaded.phrase?.none, true);
assert.equal(silentLoaded.phrase?.noPhrase, true);
assert.equal(silentLoaded.phrase?.silence, true);
assert.equal(silentLoaded.phrase?.purpose, 'NO_PHRASE');
assert.equal(silentLoaded.phrase?.music[0]?.events.every((event) => event.kind === 'rest'), true);

const tampered = JSON.parse(JSON.stringify(musicalLoaded)) as PentatonicProjectV1;
tampered.collection.spelling = ['C'];
assert.equal(validatePentatonicProject(tampered).ok, false);
tampered.collection.spelling = musicalLoaded.collection.spelling;
tampered.version = 2 as unknown as 1;
assert.equal(validatePentatonicProject(tampered).ok, false);
assert.equal(validatePentatonicProject({ format: 'bhl-project', version: 1 }).ok, false);
assert.match(validatePentatonicProject({ ...musicalLoaded, collection: { ...musicalLoaded.collection, resourceId: 'not_a_colour' } }).errors.join(' '), /not registered/);
const badEvents = JSON.parse(JSON.stringify(musicalLoaded)) as PentatonicProjectV1;
badEvents.phrase!.music[0]!.events = [];
assert.equal(validatePentatonicProject(badEvents).ok, false);
const badHash = JSON.parse(JSON.stringify(musicalLoaded)) as PentatonicProjectV1;
badHash.phrase!.music[0]!.musicXmlSha256 = '0'.repeat(64);
assert.equal(validatePentatonicProject(badHash).ok, false);
assert.equal(loadPentatonicProject(path.join(root, 'Pentatonic Projects', 'missing.pentatonic.json')).ok, false);
fs.writeFileSync(path.join(root, 'Pentatonic Projects', 'broken.pentatonic.json'), '{', 'utf8');
assert.equal(loadPentatonicProject(path.join(root, 'Pentatonic Projects', 'broken.pentatonic.json')).ok, false);
const outside = savePentatonicProject(path.join(root, 'escape.pentatonic.json'), musicalLoaded, true);
assert.ok('error' in outside);

const savedApi = apiPentatonicSaveProject({ project: musicalLoaded, overwrite: true });
assert.equal(savedApi.ok, true);
if (!savedApi.ok) throw new Error('save failed');
const openedApi = apiPentatonicOpenProject({ path: savedApi.path });
assert.equal(openedApi.ok, true);
if (!openedApi.ok) throw new Error('open failed');
assert.deepEqual(openedApi.project.phrase?.music[0]?.events, musicalLoaded.phrase?.music[0]?.events);
assert.equal(apiPentatonicOpenProject({ path: path.join(root, 'not-a-project.json') }).ok, false);
assert.equal(apiPentatonicSaveProject({ project: { format: 'pentatonic-project', version: 9, id: 'nope' } }).ok, false);

console.log(`pentatonic project persistence PASS pairs=${identityPairs} routes=${resources.length * 2 + centres.length + 3}`);
