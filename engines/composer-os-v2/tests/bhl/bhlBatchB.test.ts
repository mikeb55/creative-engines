/**
 * BHL Batch B — resources, profiles, candidates, projects, from-scratch scores.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlBatchB.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { presentBhlScore } from '../../core/bhl/bhlPresent';
import { sha256File } from '../../core/bhl/bhlIngest';
import { worldPitchSignature } from '../../core/bhl/bhlPhraseShape';
import { BHL_WORLD_IDS } from '../../core/bhl/bhlWorlds';
import { planLiquidHarmony } from '../../core/harmony/liquidHarmonyPlanner';
import { generateRiffCoreMotif } from '../../core/motif/songModeMotifEngine';
import { listPentatonicArchetypes } from '../../core/pentatonic/registry';
import {
  apiBhlCandidates,
  apiBhlCatalog,
  apiBhlCompare,
  apiBhlCompose,
  apiBhlOpenProject,
  apiBhlRefine,
  apiBhlSaveProject,
  apiBhlScratch,
} from '../../app-api/bhlApp';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { compareBhlCandidateXml } from '../../core/bhl/bhlCandidates';
import { loadBhlProject, validateBhlProject } from '../../core/bhl/bhlProject';
import { bhlLiquidPreview, bhlPentatonicPitchClasses, bhlVaultChoice, resolveBhlMotif } from '../../core/bhl/bhlResources';
import { verifyBhlLocks } from '../../core/bhl/bhlVerify';
import { ingestBhlSource, lockSpecOf } from '../../core/bhl/bhlIngest';
import { parseScoreDocument } from '../../core/performance-composer/pcScore';

const SOURCE = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const SPAN = { from: 33, to: 40 };
const AUDITION = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Batch-B-Complete');

function signatureOf(xmlEvents: { bar: number; onsetQuarters: number; midis: number[] }[]): string {
  return xmlEvents
    .map((event) => `${event.bar}@${event.onsetQuarters}:${[...event.midis].sort((a, b) => a - b).join('.')}`)
    .join('|');
}

const beforeAlbum = sha256File(SOURCE);
const catalog = apiBhlCatalog();
assert.equal(catalog.ok, true);
assert.equal(catalog.catalog.pentatonic.length, listPentatonicArchetypes().length);
assert.ok(catalog.catalog.profiles.length >= 5);
assert.equal(catalog.catalog.engines.riff, 'generateRiffCoreMotif');
assert.equal(catalog.catalog.engines.liquid, 'planLiquidHarmony');
assert.ok(catalog.catalog.notWired.some((line) => /Audio playback/i.test(line)));

const major = bhlPentatonicPitchClasses({ archetypeId: 'major_pentatonic', referenceNote: 'C', relationshipId: 'home' });
const minor = bhlPentatonicPitchClasses({ archetypeId: 'minor_pentatonic', referenceNote: 'C', relationshipId: 'home' });
assert.notDeepEqual(major.pitchClasses, minor.pitchClasses);
const related = bhlPentatonicPitchClasses({ archetypeId: 'minor_pentatonic', referenceNote: 'A', relationshipId: 'major' });
assert.ok(related.pitchClasses.length === 5);

const riff = generateRiffCoreMotif(17);
const resolved = resolveBhlMotif({ kind: 'riff', riffSeed: 17, pitchTransform: 'none' }, null);
assert.equal(resolved.intervals.join(','), riff.intervalPattern.join(','));
assert.ok(resolved.riffRhythm && resolved.riffRhythm.length === riff.rhythmPattern.length);
const transposed = resolveBhlMotif({ kind: 'import', pitches: [64, 67, 71], pitchTransform: 'transpose', semitones: 2 }, null);
assert.deepEqual(transposed.pitchClasses, [6, 9, 1]);
const inverted = resolveBhlMotif({ kind: 'import', pitches: [64, 67, 71], pitchTransform: 'invert' }, null);
assert.notDeepEqual(inverted.pitchClasses, [4, 7, 11]);

const vault = bhlVaultChoice([0, 4, 7], 0);
const liquid = bhlLiquidPreview(vault.chordType, 0, 'primary');
assert.deepEqual(liquid, planLiquidHarmony(vault.chordType, 0, 'primary'));
assert.ok(!/maj7/i.test(vault.chordType));

const base = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: 3340, world: 'E', rhythm: 'derived', phraseArc: 'derived' });
assert.equal(base.ok, true);
if (!base.ok) throw new Error('base');
const pent = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'E',
  rhythm: 'derived',
  phraseArc: 'derived',
  musical: { pentatonic: { archetypeId: 'minor_pentatonic', referenceNote: 'C', relationshipId: 'home' } },
});
assert.equal(pent.ok, true);
if (!pent.ok) throw new Error('pent');
assert.notEqual(signatureOf(base.events), signatureOf(pent.events));
assert.equal(pent.pentatonicLabel?.includes('Minor'), true);

const chamber = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { profileId: 'chamber-lyricism' },
});
const counter = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { profileId: 'rhythmic-counterpoint' },
});
assert.equal(chamber.ok && counter.ok, true);
if (!chamber.ok || !counter.ok) throw new Error('profiles');
assert.notEqual(signatureOf(chamber.events), signatureOf(counter.events));
assert.ok((counter.binder?.independentVoiceAttacks ?? 0) > (chamber.binder?.independentVoiceAttacks ?? 0));
const overridden = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  rhythm: 'derived',
  musical: { profileId: 'rhythmic-counterpoint' },
});
assert.equal(overridden.ok, true);
if (!overridden.ok) throw new Error('override');
assert.notEqual(signatureOf(overridden.events), signatureOf(counter.events));

const importedMotif = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { motif: { kind: 'import', pitches: [60, 63, 67], pitchTransform: 'none' } },
});
const otherMotif = apiBhlCompose({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A',
  musical: { motif: { kind: 'import', pitches: [64, 66, 69], pitchTransform: 'invert' } },
});
assert.equal(importedMotif.ok && otherMotif.ok, true);
if (!importedMotif.ok || !otherMotif.ok) throw new Error('motif');
assert.notEqual(signatureOf(importedMotif.events), signatureOf(otherMotif.events));
assert.equal(importedMotif.motifSource, 'import');

const worlds = BHL_WORLD_IDS.map((world) => {
  const row = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: 5150, world });
  assert.equal(row.ok, true);
  if (!row.ok) throw new Error(world);
  return worldPitchSignature(row.events);
});
assert.equal(new Set(worlds).size, 6);

const firstSet = apiBhlCandidates({ sourcePath: SOURCE, span: SPAN, seed: 3340, world: 'A' });
const secondSet = apiBhlCandidates({ sourcePath: SOURCE, span: SPAN, seed: 3340, world: 'A' });
assert.equal(firstSet.ok && secondSet.ok, true);
if (!firstSet.ok || !secondSet.ok) throw new Error('candidates');
assert.equal(firstSet.candidates.length, 3);
assert.deepEqual(
  firstSet.candidates.map((item) => item.xml),
  secondSet.candidates.map((item) => item.xml),
);
assert.equal(new Set(firstSet.candidates.map((item) => item.evidenceSummary.signature)).size, 3);
const candidate3Bar40 = /<part id="P1">[\s\S]*?<measure number="40">([\s\S]*?)<\/measure>/.exec(firstSet.candidates[2]!.xml)?.[1] ?? '';
assert.equal(candidate3Bar40.includes('text="(add4)"'), false);
assert.match(candidate3Bar40, /<step>A<\/step>/);
assert.match(candidate3Bar40, /<step>B<\/step>/);
assert.match(candidate3Bar40, /<step>D<\/step>/);
const snapshot = firstSet.candidates.map((item) => item.xml).join('');
const compared = apiBhlCompare({
  leftXml: firstSet.candidates[0]!.xml,
  rightXml: firstSet.candidates[1]!.xml,
  span: SPAN,
});
assert.equal(compared.ok, true);
if (!compared.ok) throw new Error('compare');
assert.equal(compared.comparison.provisional, true);
assert.equal(firstSet.candidates.map((item) => item.xml).join(''), snapshot);
const direct = compareBhlCandidateXml(firstSet.candidates[0]!.xml, firstSet.candidates[1]!.xml, SPAN);
assert.equal(direct.comparison.notice, compared.comparison.notice);

const refined = apiBhlRefine({
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3341,
  world: 'A',
  original: firstSet.candidates[0],
});
assert.equal(refined.ok, true);
if (!refined.ok) throw new Error('refine');
assert.equal(refined.original.xml, firstSet.candidates[0]!.xml);
assert.notEqual(refined.refined.xml, refined.original.xml);
assert.equal(refined.refined.parentId, refined.original.id);

const scratch = apiBhlScratch({
  bars: 16,
  beats: 4,
  beatType: 4,
  tempo: 96,
  seed: 4400,
  title: 'BHL Batch B scratch',
  overwrite: true,
});
assert.equal(scratch.ok, true);
if (!scratch.ok) throw new Error('scratch');
assert.ok(scratch.sections.some((section) => section.role === 'opening'));
assert.ok(scratch.sections.some((section) => section.role === 'development'));
assert.ok(scratch.sections.some((section) => section.role === 'contrast'));
assert.ok(scratch.sections.some((section) => section.role === 'return'));
assert.ok(scratch.sections.some((section) => section.role === 'ending'));
assert.ok(scratch.xml.includes('CANDIDATE FOR AUDITION'));
assert.equal(scratch.xml.includes('<credit-words>'), false);
const scratchBass = scratch.xml.split('<part id="B">')[1] ?? '';
assert.equal(scratchBass.includes('<rehearsal>'), false);
assert.match(scratch.xml, /<movement-title>BHL Batch B scratch<\/movement-title>/);
const scratchCompose = apiBhlCompose({
  sourcePath: scratch.sourcePath,
  span: scratch.span,
  seed: 4400,
  world: 'C',
  musical: { profileId: 'colour-field', motif: { kind: 'constraints', intervals: [2, 1, -2], pitchTransform: 'none' } },
});
assert.equal(scratchCompose.ok, true);
if (!scratchCompose.ok) throw new Error('scratch compose');
assert.equal(scratchCompose.verification.ok, true);
assert.equal(scratchCompose.guitarChanged, true);
assert.equal(sha256File(scratch.sourcePath), scratch.sha256);
const roles = new Set(scratchCompose.plan.regions.map((region) => region.role));
assert.ok(roles.has('statement'));
assert.ok(roles.has('development') || roles.has('transformation'));
assert.ok(roles.has('return') || roles.has('continuation'));
parseScoreDocument(scratchCompose.xml);
const scratchLock = ingestBhlSource({ sourcePath: scratch.sourcePath, span: scratch.span, protectedGuitarBars: [] });
const scratchVerify = verifyBhlLocks(fs.readFileSync(scratch.sourcePath, 'utf8'), scratchCompose.xml, lockSpecOf(scratchLock));
assert.equal(scratchVerify.ok, true, scratchVerify.errors.join('; '));

const importedCompose = composeBhlGuitar({ sourcePath: SOURCE, span: SPAN, seed: 3340, world: 'B' });
assert.equal(importedCompose.verification.ok, true);
assert.ok(importedCompose.liquid.length > 0);
const importedLock = ingestBhlSource({ sourcePath: SOURCE, span: SPAN, protectedGuitarBars: [] });
assert.deepEqual(
  importedLock.bass.map((event) => event.midis.join(',')),
  ingestBhlSource({ sourcePath: SOURCE, span: SPAN, protectedGuitarBars: [] }).bass.map((event) => event.midis.join(',')),
);
assert.equal(sha256File(SOURCE), beforeAlbum);

const projectDir = path.join(AUDITION, 'project-test');
fs.mkdirSync(projectDir, { recursive: true });
process.env.BHL_EXPORT_DIR = AUDITION;
const project = {
  format: 'bhl-project' as const,
  version: 1 as const,
  id: 'batch-b-example',
  title: 'Batch B example',
  savedAt: '2026-10-14T00:00:00.000Z',
  notes: 'Human audition still required.',
  mode: 'import' as const,
  source: { path: SOURCE, sha256: beforeAlbum },
  span: SPAN,
  world: 'A' as const,
  settings: { seed: 3340, world: 'A' },
  candidates: [...firstSet.candidates, refined.refined],
  selectedCandidateId: firstSet.candidates[0]!.id,
};
const projectPath = path.join(AUDITION, 'projects', 'batch-b-example.bhl.json');
fs.rmSync(projectPath, { force: true });
const saved = apiBhlSaveProject({ project, path: projectPath, overwrite: false });
assert.equal(saved.ok, true);
if (!saved.ok) throw new Error('save');
const refused = apiBhlSaveProject({ project, path: projectPath, overwrite: false });
assert.equal(refused.ok, false);
const opened = apiBhlOpenProject({ path: projectPath });
assert.equal(opened.ok, true);
if (!opened.ok) throw new Error('open');
assert.equal(opened.project.candidates[0]!.xml, firstSet.candidates[0]!.xml);
assert.equal(opened.project.candidates.length, 4);
const recompared = compareBhlCandidateXml(opened.project.candidates[0]!.xml, opened.project.candidates[1]!.xml, SPAN);
assert.equal(recompared.comparison.notice, direct.comparison.notice);

const invalid = validateBhlProject({ format: 'bhl-project', version: 9, candidates: 'nope' });
assert.equal(invalid.ok, false);
assert.ok(invalid.errors.length >= 2);
const broken = loadBhlProject(path.join(projectDir, 'missing.bhl.json'));
assert.equal(broken.ok, false);

fs.mkdirSync(AUDITION, { recursive: true });
const names = ['Candidate-1.musicxml', 'Candidate-2.musicxml', 'Candidate-3.musicxml', 'Candidate-1-refined.musicxml'];
function labelAudition(xml: string): string {
  const presented = presentBhlScore(xml);
  if (presented.includes('CANDIDATE FOR AUDITION')) return presented;
  return presented.replace(/(<score-partwise\b[^>]*>)/, '$1\n<!-- CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED -->');
}
[firstSet.candidates[0]!, firstSet.candidates[1]!, firstSet.candidates[2]!, refined.refined].forEach((candidate, index) => {
  fs.writeFileSync(path.join(AUDITION, names[index]!), labelAudition(candidate.xml));
});
fs.writeFileSync(path.join(AUDITION, 'Scratch-World-C.musicxml'), labelAudition(scratchCompose.xml));
const report = [
  'CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED',
  '',
  'Imported Wrong Turning bars 33–40, world A, seed 3340, plus two varied candidates.',
  `Candidate 1 attacks ${String(compared.left.guitarAttacks)} rests ${String(compared.left.guitarRests)} voices ${JSON.stringify(compared.left.voices)} silences ${String(compared.left.silences)}`,
  `Candidate 2 attacks ${String(compared.right.guitarAttacks)} rests ${String(compared.right.guitarRests)} voices ${JSON.stringify(compared.right.voices)} silences ${String(compared.right.silences)}`,
  compared.comparison.notice,
  `Refined parent ${refined.refined.parentId} seed ${refined.refined.seed}`,
  'From scratch: 16 bars, 4/4, 96, world C, colour-field profile, constraint motif.',
  `Scratch sections: ${scratch.sections.map((section) => `${section.mark} ${section.role} ${section.from}-${section.to}`).join('; ')}`,
  `Reopen matched candidate 1 XML: ${opened.project.candidates[0]!.xml === firstSet.candidates[0]!.xml}`,
  'No numerical artistic score. No automatic winner.',
].join('\n');
fs.writeFileSync(path.join(AUDITION, 'EVIDENCE-COMPARISON.txt'), report);
fs.writeFileSync(path.join(AUDITION, 'REOPEN-OK.txt'), `project ${projectPath}\ncandidate sha ${opened.project.candidates[0]!.xmlSha256}\nmatched true\n`);

assert.equal(sha256File(SOURCE), beforeAlbum);
console.log('bhlBatchB: PASS');
console.log(AUDITION);
