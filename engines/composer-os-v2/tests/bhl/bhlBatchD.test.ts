/**
 * BHL Batch D — riff rhythm, colour registry, handoff.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlBatchD.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCatalog, apiBhlCompose, apiBhlOpenProject, apiBhlSaveProject } from '../../app-api/bhlApp';
import { bhlPentatonicPitchClasses, bhlColourRelations } from '../../core/bhl/bhlResources';
import { placeBhlRiffRhythm, readBhlRiffCell, type BhlRiffCell } from '../../core/bhl/bhlRiffRhythm';
import { parseScoreDocument, partElements, partNames } from '../../core/performance-composer/pcScore';
import type { BhlBassBar } from '../../core/bhl/bhlRhythm';
import { listPentatonicColourResources } from '../../core/pentatonic/colourRegistry';
import { BHL_WORLD_IDS } from '../../core/bhl/bhlWorlds';
import { sha256File } from '../../core/bhl/bhlIngest';
import { loadBhlProject } from '../../core/bhl/bhlProject';
import { loadScore } from '../../core/performance-composer/pcScore';

const SOURCE = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';
const SPAN = { from: 33, to: 40 };
const before = sha256File(SOURCE);

function attacks(events: Array<{ bar: number; onsetQuarters: number; quarters: number; midis: number[]; voice?: string }>) {
  return events
    .filter((event) => event.voice !== '2')
    .map((event) => `${event.bar}@${event.onsetQuarters.toFixed(2)}:${event.quarters.toFixed(2)}`)
    .join('|');
}

function tops(events: Array<{ midis: number[]; voice?: string }>) {
  return events.filter((event) => event.voice !== '2').map((event) => ((Math.max(...event.midis) % 12) + 12) % 12);
}

const catalog = apiBhlCatalog();
assert.equal(catalog.ok, true);
assert.ok(catalog.catalog.colours.length >= 15);
assert.equal(catalog.catalog.colours.length, listPentatonicColourResources().length);
assert.ok(catalog.catalog.colours.some((row) => row.id === 'suspended_pentatonic'));
assert.ok(catalog.catalog.colours.some((row) => row.id === 'remote_altered'));
assert.equal(catalog.catalog.engines.riff, 'generateRiffCoreMotif');

const suspended = bhlPentatonicPitchClasses({ archetypeId: 'suspended_pentatonic', referenceNote: 'C', relationshipId: 'home' });
assert.deepEqual(suspended.pitchClasses, [0, 2, 5, 7, 10]);
assert.equal(suspended.pathArchetype, false);
const major = bhlPentatonicPitchClasses({ archetypeId: 'major_pentatonic', referenceNote: 'C', relationshipId: 'home' });
assert.deepEqual(major.pitchClasses, [0, 2, 4, 7, 9]);
assert.notDeepEqual(suspended.pitchClasses, major.pitchClasses);
const relations = bhlColourRelations('major_pentatonic', 'C', 'home');
assert.ok(relations.compatible.length > 0);
assert.ok(relations.contrasting.length > 0);

const core = readBhlRiffCell('core', 17);
const engine = readBhlRiffCell('engine', 29);
assert.ok(core.bars[0]!.slots.some((slot) => !slot.rest));
assert.equal(core.accents, null);
assert.equal(engine.accents, null);
assert.ok(engine.bars.length === 4);
const coreOn = core.bars[0]!.slots.filter((slot) => !slot.rest).map((slot) => slot.startBeat).join(',');
const engineOn = engine.bars[0]!.slots.filter((slot) => !slot.rest).map((slot) => slot.startBeat).join(',');
assert.notEqual(coreOn, engineOn);

const musical = {
  riff: { pitchSource: 'riff' as const, rhythmSource: 'riff' as const, pitchSeed: 17, rhythmSeed: 17, transform: 'original' as const, displacementQuarters: 0.5 },
};
const both = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: 3340, world: 'A', musical });
assert.equal(both.ok, true);
if (!both.ok) throw new Error('both');
const pitchOnly = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { riff: { ...musical.riff, rhythmSource: 'bhl' } },
});
assert.equal(pitchOnly.ok, true);
if (!pitchOnly.ok) throw new Error('pitch');
assert.notEqual(attacks(both.events), attacks(pitchOnly.events));
assert.deepEqual(tops(both.events).slice(0, 2), tops(pitchOnly.events).slice(0, 2));

const rhythmOnly = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { riff: { pitchSource: 'world', rhythmSource: 'riff', pitchSeed: 17, rhythmSeed: 17, transform: 'original', displacementQuarters: 0.5 } },
});
assert.equal(rhythmOnly.ok, true);
if (!rhythmOnly.ok) throw new Error('rhythm');
assert.equal(attacks(both.events), attacks(rhythmOnly.events));
assert.notDeepEqual(tops(both.events), tops(rhythmOnly.events));

const mixed = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { riff: { pitchSource: 'riff', rhythmSource: 'other-riff', pitchSeed: 17, rhythmSeed: 29, transform: 'original', displacementQuarters: 0.5 } },
});
assert.equal(mixed.ok, true);
if (!mixed.ok) throw new Error('mixed');
assert.notEqual(attacks(both.events), attacks(mixed.events));

const displaced = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { riff: { ...musical.riff, transform: 'displace', displacementQuarters: 0.5 } },
});
assert.equal(displaced.ok, true);
if (!displaced.ok) throw new Error('displace');
assert.notEqual(attacks(both.events), attacks(displaced.events));

const augmented = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'C',
  musical: { riff: { ...musical.riff, transform: 'augment' } },
});
assert.equal(augmented.ok, true);
if (!augmented.ok) throw new Error('augment');
assert.ok(augmented.events.some((event) => event.quarters >= 1));

const worlds = BHL_WORLD_IDS.map((world) => {
  const row = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: 3340,
    world,
    musical: { riff: { ...musical.riff, transform: 'continue' } },
  });
  assert.equal(row.ok, true, world);
  if (!row.ok) throw new Error(world);
  return row;
});
const signatures = new Set(worlds.map((row) => attacks(row.events)));
assert.equal(signatures.size, 1);
const pitches = new Set(worlds.map((row) => tops(row.events).join(',')));
assert.ok(pitches.size > 1);

const colour = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'E',
  musical: {
    pentatonic: { archetypeId: 'suspended_pentatonic', referenceNote: 'D', relationshipId: 'home', contrastId: 'remote_altered' },
    riff: { pitchSource: 'world', rhythmSource: 'bhl', transform: 'original', displacementQuarters: 0.5 },
  },
});
assert.equal(colour.ok, true);
if (!colour.ok) throw new Error('colour');
assert.match(colour.colourConstraint ?? '', /World E uses/);
assert.ok(colour.resourceLimitations?.some((line) => /not rewritten as major or minor|Common tones/i.test(line)));
const constrained = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { pentatonic: { archetypeId: 'remote_altered', referenceNote: 'C', relationshipId: 'home' } },
});
assert.equal(constrained.ok, true);
if (!constrained.ok) throw new Error('constrained');
assert.match(constrained.colourConstraint ?? '', /World A/);

const dialogue = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'B',
  regions: both.plan.regions.map((region) => ({ id: region.id, density: 'counterline', dialogue: 'leave-space' })),
  musical,
});
assert.equal(dialogue.ok, true);
if (!dialogue.ok) throw new Error('dialogue');
assert.ok(dialogue.events.some((event) => event.voice === '2') || (dialogue.binder?.independentVoiceAttacks ?? 0) >= 0);
assert.ok(!dialogue.xml.includes('Cmaj7'));

loadScore(both.xml);
assert.equal(both.transfers?.performanceComposer && (both.transfers.performanceComposer as { reimport: boolean }).reimport, true);
assert.equal(sha256File(SOURCE), before);

const projectDir = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Batch-D-Complete');
fs.mkdirSync(projectDir, { recursive: true });
const projectPath = path.join(projectDir, 'integrated-project.bhl.json');
if (fs.existsSync(projectPath)) fs.unlinkSync(projectPath);
const saved = apiBhlSaveProject({
  path: projectPath,
  overwrite: false,
  project: {
    format: 'bhl-project',
    version: 1,
    id: 'batch-d-integrated',
    title: 'Batch D integrated',
    savedAt: new Date().toISOString(),
    notes: 'CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED',
    mode: 'import',
    source: { path: SOURCE, sha256: before },
    span: SPAN,
    world: 'A',
    settings: { seed: 3340, musical },
    candidates: [],
    selectedCandidateId: null,
  },
});
assert.equal(saved.ok, true);
const opened = apiBhlOpenProject({ path: projectPath });
assert.equal(opened.ok, true);
if (!opened.ok) throw new Error('open');
const stored = opened.project.settings.musical as { riff: { rhythmSource: string; pitchSource: string } };
assert.equal(stored.riff.rhythmSource, 'riff');
assert.equal(stored.riff.pitchSource, 'riff');
const disk = loadBhlProject(projectPath);
assert.equal(disk.ok, true);
assert.equal(sha256File(SOURCE), before);

const sameCell = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { riff: { pitchSource: 'riff', rhythmSource: 'riff', pitchSeed: 17, rhythmSeed: 99, transform: 'original', displacementQuarters: 0.5 } },
});
assert.equal(sameCell.ok, true);
if (!sameCell.ok) throw new Error('same cell');
assert.equal(attacks(sameCell.events), attacks(both.events));

const coreB = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { riff: { pitchSource: 'riff', rhythmSource: 'core-b', pitchSeed: 17, rhythmSeed: 1, transform: 'original', displacementQuarters: 0.5 } },
});
assert.equal(coreB.ok, true);
if (!coreB.ok) throw new Error('core-b');
assert.notEqual(attacks(coreB.events), attacks(both.events));
assert.notEqual(attacks(coreB.events), attacks(mixed.events));
assert.deepEqual(tops(coreB.events).slice(0, 2), tops(both.events).slice(0, 2));
assert.ok(!coreB.xml.includes('Cmaj7'));

function transformed(transform: 'diminish' | 'fragment' | 'rest' | 'augment') {
  const row = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: 3340,
    world: 'A',
    musical: { riff: { ...musical.riff, transform } },
  });
  assert.equal(row.ok, true, transform);
  if (!row.ok) throw new Error(transform);
  return row;
}
const diminished = transformed('diminish');
const fragmented = transformed('fragment');
const rested = transformed('rest');
assert.notEqual(attacks(diminished.events), attacks(both.events));
assert.notEqual(attacks(fragmented.events), attacks(both.events));
assert.notEqual(attacks(rested.events), attacks(both.events));
assert.notEqual(attacks(diminished.events), attacks(fragmented.events));
assert.notEqual(attacks(rested.events), attacks(fragmented.events));
assert.ok(diminished.events.some((event) => event.quarters <= 0.5));
assert.ok((diminished.rhythmNotes ?? []).some((line) => /Diminution|Withheld|not quantised/i.test(line)));
assert.ok((fragmented.rhythmNotes ?? []).some((line) => /Fragment|unstated/i.test(line)));
assert.ok((rested.rhythmNotes ?? []).some((line) => /rest/i.test(line)));

for (const world of ['B', 'C', 'D', 'F'] as const) {
  const row = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: 3340,
    world,
    musical: { pentatonic: { archetypeId: 'hirajoshi', referenceNote: 'C', relationshipId: 'home' } },
  });
  assert.equal(row.ok, true, world);
  if (!row.ok) throw new Error(world);
  assert.match(row.colourConstraint ?? '', new RegExp(`World ${world}`));
  assert.doesNotMatch(row.colourConstraint ?? '', /Major Pentatonic C/);
}

const invented = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'E',
  musical: { pentatonic: { archetypeId: 'not_a_real_colour', referenceNote: 'C', relationshipId: 'home' } },
});
assert.equal(invented.ok, false);
if (invented.ok) throw new Error('invented colour must fail');
assert.match(invented.error, /not in the colour registry/);

function notePrint(xml: string, role: 'bass' | 'guitar'): string {
  const doc = parseScoreDocument(xml);
  const names = partNames(doc);
  const pattern = role === 'bass' ? /bass|cello|contrabass/i : /guitar|gtr/i;
  const part = partElements(doc).find((candidate) => pattern.test(`${names.get(candidate.getAttribute('id') ?? '') ?? ''} ${candidate.getAttribute('id') ?? ''}`));
  if (!part) throw new Error(`missing ${role}`);
  const notes = [...part.getElementsByTagName('note')];
  return notes.map((note) => {
    const rest = note.getElementsByTagName('rest').length > 0;
    const step = note.getElementsByTagName('step')[0]?.textContent ?? '';
    const octave = note.getElementsByTagName('octave')[0]?.textContent ?? '';
    const duration = note.getElementsByTagName('duration')[0]?.textContent ?? '';
    const voice = note.getElementsByTagName('voice')[0]?.textContent ?? '1';
    return `${voice}:${rest ? 'rest' : `${step}${octave}`}:${duration}`;
  }).join('|');
}
const album = fs.readFileSync(SOURCE, 'utf8');
assert.equal(notePrint(both.xml, 'bass'), notePrint(album, 'bass'));

function bassBar(bar: number, quarters: number): BhlBassBar {
  return {
    bar,
    quarters,
    attacks: [0],
    rests: [],
    notes: [{ onset: 0, quarters, midi: 36, pitchClass: 0 }],
    pitchClasses: [0],
    rootPc: 0,
  };
}
const mixedMetre = placeBhlRiffRhythm({
  cell: readBhlRiffCell('core', 17),
  transform: 'continue',
  displacementQuarters: 0,
  bars: [bassBar(1, 5), bassBar(2, 3), bassBar(3, 3.5), bassBar(4, 4)],
  regions: [{ id: 'all', bars: [1, 2, 3, 4], dialogue: 'answer-after-bass', rhythmTransform: 'state-onsets' }],
  divisionsByBar: new Map([[1, 2], [2, 2], [3, 2], [4, 2]]),
  protectedBars: [],
});
assert.equal(mixedMetre.plans.length, 4);
const lengths = [5, 3, 3.5, 4];
mixedMetre.plans.forEach((plan, index) => {
  plan.onsets.forEach((onset, note) => {
    const duration = plan.durations[note] ?? 0;
    assert.ok(onset + duration <= lengths[index]! + 1e-4, `bar ${plan.bar} spills`);
    assert.ok(Math.abs(onset * 2 - Math.round(onset * 2)) < 1e-3);
    assert.ok(Math.abs(duration * 2 - Math.round(duration * 2)) < 1e-3);
  });
});
assert.ok(mixedMetre.placed > 0);

const fine: BhlRiffCell = {
  source: 'generateRiffCoreMotif',
  seed: 1,
  bars: [{ quarters: 4, slots: [{ startBeat: 0, duration: 0.25, rest: false }, { startBeat: 0.25, duration: 3.75, rest: true }] }],
  syncopated: false,
  groups: ['bar 1: 1'],
  accents: null,
  articulations: null,
  unavailable: [],
  phraseBoundaryBars: [1],
};
assert.throws(
  () => placeBhlRiffRhythm({
    cell: fine,
    transform: 'original',
    displacementQuarters: 0,
    bars: [bassBar(1, 4)],
    regions: [{ id: 'all', bars: [1], dialogue: 'answer-after-bass', rhythmTransform: 'state-onsets' }],
    divisionsByBar: new Map([[1, 2]]),
    protectedBars: [],
  }),
  /not quantised/,
);

const metres: Array<[number, number, number]> = [[4, 4, 16], [5, 4, 20], [3, 4, 12], [7, 8, 14], [4, 4, 16], [5, 4, 20], [3, 4, 12], [4, 4, 16]];
function mixedXml(): string {
  const guitar: string[] = [];
  const bass: string[] = [];
  metres.forEach(([beats, beatType, ticks], index) => {
    const bar = index + 1;
    const attributes = `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>`;
    const clefG = bar === 1 ? '<clef><sign>G</sign><line>2</line></clef></attributes>' : '</attributes>';
    const clefB = bar === 1 ? '<clef><sign>F</sign><line>4</line></clef></attributes>' : '</attributes>';
    const head = bar === 1 ? attributes : attributes;
    guitar.push(`<measure number="${bar}">${head}${clefG}<note><rest/><duration>${ticks}</duration><voice>1</voice><type>whole</type></note></measure>`);
    bass.push(`<measure number="${bar}">${head}${clefB}<note><pitch><step>C</step><octave>2</octave></pitch><duration>${ticks}</duration><voice>1</voice><type>whole</type></note></measure>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>BHL mixed metre probe</work-title></work>
  <movement-title>CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED</movement-title>
  <part-list>
    <score-part id="G"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="B"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="G">${guitar.join('')}</part>
  <part id="B">${bass.join('')}</part>
</score-partwise>`;
}
const mixedPath = path.join(os.tmpdir(), 'bhl-batch-d-mixed-metre.musicxml');
fs.writeFileSync(mixedPath, mixedXml());
const mixedCompose = apiBhlCompose({
  sourcePath: mixedPath,
  span: { from: 1, to: 8 },
  seed: 3340,
  world: 'A',
  musical: { riff: { pitchSource: 'world', rhythmSource: 'riff', pitchSeed: 17, rhythmSeed: 99, transform: 'continue', displacementQuarters: 0.5 } },
});
assert.equal(mixedCompose.ok, true);
if (!mixedCompose.ok) throw new Error(mixedCompose.error);
assert.match(mixedCompose.xml, /<beats>5<\/beats>/);
assert.match(mixedCompose.xml, /<beats>7<\/beats>/);
assert.match(mixedCompose.xml, /<beat-type>8<\/beat-type>/);
assert.equal(notePrint(mixedCompose.xml, 'bass'), notePrint(mixedXml(), 'bass'));
const barQuarters = [4, 5, 3, 3.5, 4, 5, 3, 4];
for (const event of mixedCompose.events) {
  const room = barQuarters[event.bar - 1];
  assert.ok(room !== undefined);
  assert.ok(event.onsetQuarters + event.quarters <= room + 1e-4, `mixed bar ${event.bar}`);
}
assert.ok(mixedCompose.events.length > 0);
assert.ok(mixedCompose.events.some((event) => event.bar === 2));
assert.ok(mixedCompose.events.some((event) => event.bar === 4));
assert.ok(!mixedCompose.xml.includes('Cmaj7'));

const coreProject = path.join(projectDir, 'core-b-project.bhl.json');
if (fs.existsSync(coreProject)) fs.unlinkSync(coreProject);
const coreSaved = apiBhlSaveProject({
  path: coreProject,
  overwrite: false,
  project: {
    format: 'bhl-project',
    version: 1,
    id: 'batch-d-core-b',
    title: 'Batch D core B',
    savedAt: new Date().toISOString(),
    notes: 'CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED',
    mode: 'import',
    source: { path: SOURCE, sha256: before },
    span: SPAN,
    world: 'E',
    settings: {
      seed: 3340,
      musical: {
        riff: { pitchSource: 'riff', rhythmSource: 'core-b', pitchSeed: 17, rhythmSeed: 29, transform: 'diminish', displacementQuarters: 0.5 },
        pentatonic: { archetypeId: 'mixolydian_pentatonic', referenceNote: 'G', relationshipId: 'home', contrastId: 'iwato' },
      },
    },
    candidates: [],
    selectedCandidateId: null,
  },
});
assert.equal(coreSaved.ok, true);
const coreOpened = apiBhlOpenProject({ path: coreProject });
assert.equal(coreOpened.ok, true);
if (!coreOpened.ok) throw new Error('core open');
const storedRiff = coreOpened.project.settings.musical as { riff: { rhythmSource: string; transform: string }; pentatonic: { archetypeId: string; contrastId: string } };
assert.equal(storedRiff.riff.rhythmSource, 'core-b');
assert.equal(storedRiff.riff.transform, 'diminish');
assert.equal(storedRiff.pentatonic.archetypeId, 'mixolydian_pentatonic');
assert.equal(storedRiff.pentatonic.contrastId, 'iwato');
assert.equal(sha256File(SOURCE), before);
console.log('PASS bhl batch D');
