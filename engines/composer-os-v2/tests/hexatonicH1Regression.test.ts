/**
 * Hexatonic Phase H1 — regression baseline.
 * Freezes pentatonic collections, five-note extraction, the pentatonic project format,
 * BHL Worlds A–F, the 16 WPS pairs, the quadratonic vault table, and triad-pair-pendulum.
 * Does not add a hexatonic registry. Pitch-class catalogue checks match docs/HEXATONIC_PHASE_H1.md.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicH1Regression.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBhlWorldField, BHL_WORLDS } from '../core/bhl/bhlWorlds';
import type { BhlBassBar } from '../core/bhl/bhlRhythm';
import { generateVaultRiff } from '../core/guitar/vaultRiffGenerator';
import { TONALITY_VAULT_DATABASE } from '../core/harmony/tonalityVaultDatabase';
import { TRIAD_PAIR_CHORUS_ROTATION } from '../core/irealpro/irealVaultPipeline';
import { listPentatonicColourResources, PENTATONIC_COLOUR_REGISTRY_VERSION } from '../core/pentatonic/colourRegistry';
import { fieldFromPitchClasses } from '../core/pentatonic/fieldDistance';
import { extractParentField, PENTATONIC_PARENT_EXTRACTION_VERSION } from '../core/pentatonic/parentExtraction';
import {
  capturePentatonicProject,
  collectionState,
  PENTATONIC_PROJECT_FORMAT,
  PENTATONIC_PROJECT_VERSION,
  validatePentatonicProject,
} from '../core/pentatonic/pentatonicProject';
import { listPentatonicArchetypes, PENTATONIC_REGISTRY_VERSION } from '../core/pentatonic/registry';
import {
  pitchClassOf,
  spellName,
  WPS_VAULT_TONALITIES,
  type Spelled,
} from '../core/wwh/wps/wpsTonalityVaultRecord';

const specPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/HEXATONIC_PHASE_H1.md');

const COLOUR_INTERVALS: Record<string, readonly number[]> = {
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  suspended_pentatonic: [0, 2, 5, 7, 10],
  open_pentatonic: [0, 2, 5, 7, 9],
  minor_sixth_pentatonic: [0, 3, 5, 8, 10],
  mixolydian_pentatonic: [0, 2, 4, 7, 10],
  dorian_pentatonic: [0, 2, 3, 7, 10],
  aeolian_pentatonic: [0, 3, 5, 7, 8],
  kumoi: [0, 2, 3, 7, 9],
  hirajoshi: [0, 2, 3, 7, 8],
  insen: [0, 1, 5, 7, 10],
  iwato: [0, 1, 5, 6, 10],
  phrygian_pentatonic: [0, 1, 3, 7, 8],
  lydian_pentatonic: [0, 2, 4, 6, 9],
  whole_tone_pentachord: [0, 2, 4, 6, 8],
  blue_pentatonic: [0, 3, 5, 6, 10],
  ambiguous_third: [0, 3, 4, 7, 10],
  leading_major: [0, 2, 4, 7, 11],
  leading_minor: [0, 3, 5, 7, 11],
  remote_altered: [0, 1, 4, 6, 10],
};

const SCALAR: Record<string, readonly number[]> = {
  ritsu_as_open_pentatonic: [0, 2, 5, 7, 9],
  hex_western_claim_not_ritsu: [0, 1, 3, 5, 8, 10],
  hex_major_omit_seventh: [0, 2, 4, 5, 7, 9],
  hex_major_omit_fourth: [0, 2, 4, 7, 9, 11],
  hex_lydian_triad_pair: [0, 2, 4, 6, 7, 9],
  hex_minor_primary: [0, 2, 3, 5, 7, 10],
  hex_minor_omit_second: [0, 3, 5, 7, 8, 10],
  hex_minor_dorian_omit_second: [0, 3, 5, 7, 9, 10],
  hex_blues: [0, 3, 5, 6, 7, 10],
  hex_whole_tone_even: [0, 2, 4, 6, 8, 10],
  hex_whole_tone_odd: [1, 3, 5, 7, 9, 11],
  hex_augmented_t0: [0, 3, 4, 7, 8, 11],
  hex_augmented_t1: [0, 1, 4, 5, 8, 9],
  hex_augmented_t2: [1, 2, 5, 6, 9, 10],
  hex_augmented_t3: [2, 3, 6, 7, 10, 11],
};

const WPS_PAIRS: Record<string, { parent: string; harris: string; resolution: string; tension: string; union: readonly number[] }> = {
  'maj7-sharp5': { parent: 'Cmaj7#5', harris: 'T3', resolution: 'E G# B', tension: 'F# A C', union: [0, 4, 6, 8, 9, 11] },
  'sus-b9': { parent: 'Csusb9', harris: 'tb7', resolution: 'Bb Db F', tension: 'C Eb G', union: [0, 1, 3, 5, 7, 10] },
  'minmaj13-sharp11': { parent: 'CminMaj13#11(9)', harris: 'T2', resolution: 'D F# A', tension: 'G B D#', union: [2, 3, 6, 7, 9, 11] },
  'maj7-sharp11-sharp9': { parent: 'Cmaj7#11#9', harris: 'T7', resolution: 'B D# F#', tension: 'C E G', union: [0, 3, 4, 6, 7, 11] },
  sus9: { parent: 'Csus9', harris: 'Tb7', resolution: 'Bb D F', tension: 'C E G', union: [0, 2, 4, 5, 7, 10] },
  min9: { parent: 'Cmin9', harris: 't5', resolution: 'G Bb D', tension: 'A C Eb', union: [0, 2, 3, 7, 9, 10] },
  maj7: { parent: 'Cmaj7', harris: 't3', resolution: 'E G B', tension: 'F A C', union: [0, 4, 5, 7, 9, 11] },
  'dim7-b13': { parent: 'Cdim7b13', harris: 'Tb6', resolution: 'Ab C Eb', tension: 'D F# A', union: [0, 2, 3, 6, 8, 9] },
  '13-sharp11': { parent: 'C13#11(9)', harris: 'T2', resolution: 'D F# A', tension: 'E G Bb', union: [2, 4, 6, 7, 9, 10] },
  'maj7-sharp11': { parent: 'Cmaj7#11', harris: 't3', resolution: 'E G B', tension: 'F# A C', union: [0, 4, 6, 7, 9, 11] },
  minmaj9: { parent: 'CminMaj9', harris: 'T5', resolution: 'G B D', tension: 'A C Eb', union: [0, 2, 3, 7, 9, 11] },
  min7b5: { parent: 'Cmin7b5', harris: 'tb3', resolution: 'Eb Gb Bb', tension: 'F Ab C', union: [0, 3, 5, 6, 8, 10] },
  '7-sharp9-sharp5': { parent: 'C7#9#5', harris: 'Tb6', resolution: 'Ab C Eb', tension: 'Bb Db Fb', union: [0, 1, 3, 4, 8, 10] },
  '13b9': { parent: 'C13b9', harris: 'T6', resolution: 'A C# E', tension: 'Eb G Bb', union: [1, 3, 4, 7, 9, 10] },
  min11: { parent: 'Cmin11(9)', harris: 'Tb7', resolution: 'Bb D F', tension: 'C Eb G', union: [0, 2, 3, 5, 7, 10] },
  maj9: { parent: 'Cmaj9', harris: 'T5', resolution: 'G B D', tension: 'A C E', union: [0, 2, 4, 7, 9, 11] },
};

const SHELL_OUTSIDE: Record<string, readonly number[]> = {
  'sus-b9': [11],
  'minmaj13-sharp11': [0],
  '13-sharp11': [0],
  '13b9': [0],
};

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values.map((value) => ((value % 12) + 12) % 12))].sort((left, right) => left - right);
}

function transpose(pitchClasses: readonly number[], semitones: number): number[] {
  return uniqueSorted(pitchClasses.map((pitchClass) => pitchClass + semitones));
}

function pcsOf(notes: readonly Spelled[]): number[] {
  return uniqueSorted(notes.map(pitchClassOf));
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

assert.equal(PENTATONIC_REGISTRY_VERSION, 'pentatonic-registry-1.0');
assert.equal(PENTATONIC_COLOUR_REGISTRY_VERSION, 'pentatonic-colour-registry-5a');
assert.equal(PENTATONIC_PARENT_EXTRACTION_VERSION, 'pentatonic-parent-extraction-7c');

const archetypes = listPentatonicArchetypes();
assert.deepEqual(archetypes.map((row) => row.id), ['major_pentatonic', 'minor_pentatonic']);
assert.deepEqual(archetypes[0]!.intervals, [0, 2, 4, 7, 9]);
assert.deepEqual(archetypes[1]!.intervals, [0, 3, 5, 7, 10]);

const colours = listPentatonicColourResources();
assert.equal(colours.length, 20);
assert.deepEqual(
  colours.map((row) => row.id),
  Object.keys(COLOUR_INTERVALS)
);
for (const colour of colours) {
  assert.deepEqual(colour.intervals, COLOUR_INTERVALS[colour.id]);
  assert.equal(colour.intervals.length, 5);
  assert.equal(colour.id.startsWith('hex_'), false);
}
assert.deepEqual(COLOUR_INTERVALS.open_pentatonic, SCALAR.ritsu_as_open_pentatonic);
assert.notDeepEqual(SCALAR.hex_western_claim_not_ritsu, SCALAR.ritsu_as_open_pentatonic);
assert.deepEqual(COLOUR_INTERVALS.whole_tone_pentachord, [0, 2, 4, 6, 8]);
assert.equal(colours.some((row) => row.intervals.join(',') === SCALAR.hex_whole_tone_even.join(',')), false);

assert.equal(fieldFromPitchClasses([0, 2, 4, 6, 8, 10]), null);
assert.equal(fieldFromPitchClasses([0, 2, 5, 7, 9])?.pitchClasses.length, 5);
const fromHexatonic = extractParentField({ parentPitchClasses: [0, 2, 4, 6, 8, 10], centreSpelling: 'C' });
assert.equal(fromHexatonic.version, PENTATONIC_PARENT_EXTRACTION_VERSION);
assert.ok(fromHexatonic.disposition === 'FIELDS' || fromHexatonic.disposition === 'NONE' || fromHexatonic.disposition === 'INSUFFICIENT_CONTEXT');
for (const candidate of fromHexatonic.candidates) {
  assert.equal(candidate.field.pitchClasses.length, 5);
}
const openField = extractParentField({
  parentPitchClasses: [0, 2, 5, 7, 9],
  chordPitchClasses: [0, 2, 5, 7, 9],
  melodyPitchClasses: [0, 5, 9],
  centreSpelling: 'C',
});
assert.equal(openField.disposition, 'FIELDS');
assert.equal(openField.candidates[0]?.field.pitchClasses.length, 5);
assert.ok(openField.candidates.every((candidate) => candidate.field.pitchClasses.length === 5));

assert.equal(PENTATONIC_PROJECT_FORMAT, 'pentatonic-project');
assert.equal(PENTATONIC_PROJECT_VERSION, 1);
const openCollection = collectionState('open_pentatonic', 'C');
assert.equal('error' in openCollection, false);
if (!('error' in openCollection)) {
  assert.deepEqual(openCollection.intervals, [0, 2, 5, 7, 9]);
  assert.equal(openCollection.resourceId, 'open_pentatonic');
}
const refused = collectionState('hex_major_omit_seventh', 'C');
assert.equal('error' in refused, true);
const captured = capturePentatonicProject({
  id: 'h1-format-lock',
  title: 'H1 format lock',
  notes: '',
  savedAt: '2026-10-15T00:00:00.000Z',
  resourceId: 'open_pentatonic',
  centre: 'C',
  routeMinSteps: 2,
  routeMaxSteps: 4,
  routeEnding: 'return',
  routeSeed: 1,
  routePick: 0,
  colourRoute: null,
  phraseSeed: 1,
  motif: null,
  purpose: 'MOTIF',
  activity: '',
  method: 'M-DEG',
  silence: false,
  noPhrase: false,
  generated: null,
  transform: null,
  chosen: null,
  importFileName: null,
  importXml: null,
  regionIndex: 0,
  mode: 'analyse',
  resourceMode: 'manual',
  colourReference: 'C',
});
assert.equal(captured.ok, true, captured.errors.join('; '));
assert.equal(captured.project?.format, 'pentatonic-project');
assert.equal(captured.project?.version, 1);
assert.deepEqual(Object.keys(captured.project ?? {}).sort(), [
  'collection',
  'format',
  'id',
  'notes',
  'phrase',
  'route',
  'savedAt',
  'source',
  'title',
  'version',
  'workflow',
].sort());
const reloaded = validatePentatonicProject(captured.project);
assert.equal(reloaded.ok, true, reloaded.errors.join('; '));
const hexatonicFormat = validatePentatonicProject({ ...captured.project, format: 'hexatonic-project' });
assert.equal(hexatonicFormat.ok, false);
assert.match(hexatonicFormat.errors.join(' '), /pentatonic-project/);

assert.deepEqual(BHL_WORLDS.map((world) => world.id), ['A', 'B', 'C', 'D', 'E', 'F']);
const worlds = Object.fromEntries(['A', 'B', 'C', 'D', 'E', 'F'].map((id) => {
  const field = buildBhlWorldField(id as 'A', bass, 'primary');
  return [id, { pitchClasses: field.pitchClasses, groups: field.groups, chordType: field.chordType, contrastInterval: field.contrastInterval, liquidMelodyPc: field.liquidMelodyPc }];
}));
assert.deepEqual(worlds.A, { pitchClasses: [0, 2, 4, 6, 7, 9], groups: [[0, 4, 7], [2, 6, 9]], chordType: null, contrastInterval: 2, liquidMelodyPc: null });
assert.deepEqual(worlds.B, { pitchClasses: [0, 1, 5, 8], groups: [[0, 1, 5], [8]], chordType: 'sus-b9', contrastInterval: 8, liquidMelodyPc: 8 });
assert.deepEqual(worlds.C, { pitchClasses: [0, 4, 7, 8], groups: [[0, 4, 7], [0, 4, 8], [4, 8, 0]], chordType: null, contrastInterval: 8, liquidMelodyPc: null });
assert.deepEqual(worlds.D, { pitchClasses: [0, 3, 4, 6, 7], groups: [[0, 4, 7], [0, 3, 6]], chordType: null, contrastInterval: 3, liquidMelodyPc: null });
assert.deepEqual(worlds.E, { pitchClasses: [0, 2, 4, 7, 9], groups: [[0, 4, 7], [2, 9]], chordType: null, contrastInterval: 2, liquidMelodyPc: null });
assert.deepEqual(worlds.F, { pitchClasses: [0, 1, 3, 4, 6, 7, 10], groups: [[0, 4, 7], [3, 7, 10], [6, 10, 1]], chordType: null, contrastInterval: 6, liquidMelodyPc: null });
assert.deepEqual(worlds.A.pitchClasses, [...SCALAR.hex_lydian_triad_pair]);
assert.equal(worlds.A.pitchClasses.length, 6);
assert.equal(worlds.C.pitchClasses.length, 4);
assert.equal(worlds.F.pitchClasses.length, 7);

assert.equal(WPS_VAULT_TONALITIES.length, 16);
assert.deepEqual(WPS_VAULT_TONALITIES.map((row) => row.id), Object.keys(WPS_PAIRS));
for (const row of WPS_VAULT_TONALITIES) {
  const expected = WPS_PAIRS[row.id]!;
  const resolution = pcsOf(row.resolutionTriad.notes);
  const tension = pcsOf(row.tensionTriad.notes);
  const union = uniqueSorted([...resolution, ...tension]);
  const shared = resolution.filter((pitchClass) => tension.includes(pitchClass));
  assert.equal(row.symbol, expected.parent);
  assert.equal(row.harrisLabel, expected.harris);
  assert.equal(row.resolutionTriad.notes.map(spellName).join(' '), expected.resolution);
  assert.equal(row.tensionTriad.notes.map(spellName).join(' '), expected.tension);
  assert.deepEqual(union, [...expected.union]);
  assert.equal(union.length, 6);
  assert.deepEqual(shared, []);
  assert.equal(row.primaryQuadratonic.notes.length, 4);
  const shell = pcsOf(row.shell);
  const outside = shell.filter((pitchClass) => !union.includes(pitchClass));
  assert.deepEqual(outside, [...(SHELL_OUTSIDE[row.id] ?? [])]);
}
assert.deepEqual(WPS_PAIRS.maj9.union, [...SCALAR.hex_major_omit_fourth]);
assert.equal(WPS_VAULT_TONALITIES.find((row) => row.id === 'maj9')?.resolutionTriad.notes.map(spellName).join(' '), 'G B D');
assert.equal(WPS_VAULT_TONALITIES.some((row) => row.id === 'maj6'), false);

assert.deepEqual(
  TONALITY_VAULT_DATABASE.map((row) => row.chordType),
  ['Maj7#5', 'sus-b9', 'minMaj13#11#9', 'Maj7#11#9', 'sus9', 'min9', 'Maj7', 'Maj6', 'dim7b13', '13#11#9', 'Maj7#11', 'minMaj9', 'min7b5', '7#9#5', '13b9', 'Maj9', 'min11']
);
assert.equal(TONALITY_VAULT_DATABASE.length, 17);
assert.equal(TONALITY_VAULT_DATABASE.find((row) => row.chordType === 'Maj7')?.melodicTriadQuality, 'major');
assert.equal(WPS_VAULT_TONALITIES.find((row) => row.id === 'maj7')?.melodicTriad.quality, 'minor');
assert.equal(TONALITY_VAULT_DATABASE.some((row) => row.chordType === 'Maj6'), true);

assert.deepEqual([...TRIAD_PAIR_CHORUS_ROTATION], ['triad-pair-pendulum', 'bebop-placement', 'triad-pair-pendulum', 'quadratonic', 'triad-pair-pendulum']);
const pendulum = generateVaultRiff({ chordTypeId: 'Maj7', rootPc: 0, bars: 1, style: 'triad-pair-pendulum' });
assert.deepEqual(pendulum.map((note) => ((note.pitch % 12) + 12) % 12), [4, 11, 4, 11, 4, 11, 4, 11]);
assert.deepEqual(pendulum.map((note) => note.pitch), [52, 59, 52, 59, 52, 59, 52, 59]);
const quadratonic = generateVaultRiff({ chordTypeId: 'Maj7', rootPc: 0, bars: 1, style: 'quadratonic' });
assert.notDeepEqual(quadratonic.map((note) => note.pitch), pendulum.map((note) => note.pitch));

for (const [id, pitchClasses] of Object.entries(SCALAR)) {
  assert.equal(new Set(pitchClasses).size, pitchClasses.length, id);
  if (id.startsWith('hex_')) assert.equal(pitchClasses.length, 6, id);
}
assert.deepEqual(transpose(SCALAR.hex_augmented_t0, 1), [...SCALAR.hex_augmented_t1]);
assert.deepEqual(transpose(SCALAR.hex_augmented_t0, 2), [...SCALAR.hex_augmented_t2]);
assert.deepEqual(transpose(SCALAR.hex_augmented_t0, 3), [...SCALAR.hex_augmented_t3]);
assert.deepEqual(transpose(SCALAR.hex_augmented_t0, 4), [...SCALAR.hex_augmented_t0]);
const augmentedOrbits = new Set([0, 1, 2, 3].map((step) => transpose(SCALAR.hex_augmented_t0, step).join(',')));
assert.equal(augmentedOrbits.size, 4);
const wholeToneOrbits = new Set([0, 1].map((step) => transpose(SCALAR.hex_whole_tone_even, step).join(',')));
assert.equal(wholeToneOrbits.size, 2);
assert.deepEqual(transpose(SCALAR.hex_whole_tone_even, 1), [...SCALAR.hex_whole_tone_odd]);
assert.notDeepEqual(SCALAR.hex_minor_primary, SCALAR.hex_minor_omit_second);
assert.notDeepEqual(SCALAR.hex_minor_primary, SCALAR.hex_minor_dorian_omit_second);
assert.notDeepEqual(SCALAR.hex_minor_primary, SCALAR.hex_blues);

const spec = fs.readFileSync(specPath, 'utf8');
assert.match(spec, /hexatonic-h1\.0/);
for (const id of Object.keys(SCALAR)) assert.match(spec, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
for (const id of Object.keys(WPS_PAIRS)) assert.match(spec, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

console.log('hexatonicH1Regression: PASS');
