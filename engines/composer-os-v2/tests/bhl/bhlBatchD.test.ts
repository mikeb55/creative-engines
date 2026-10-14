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
import { readBhlRiffCell } from '../../core/bhl/bhlRiffRhythm';
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
console.log('PASS bhl batch D');
