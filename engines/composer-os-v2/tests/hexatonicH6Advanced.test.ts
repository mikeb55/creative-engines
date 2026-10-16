/**
 * H6-C2 — advanced colours and alternate constructions.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicH6Advanced.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCandidates, apiBhlCompose } from '../app-api/bhlApp';
import { buildBhlScratchScore } from '../core/bhl/bhlScratch';
import { BHL_WORLD_IDS } from '../core/bhl/bhlWorlds';
import { readHexatonicStamp, resolveBhlHexatonicColour, stampHexatonicColour, listBhlHexatonicChoices } from '../core/bhl/bhlHexatonicColour';
import {
  ADVANCED_STATUS,
  CORE_CANDIDATES,
  EXPLORER_STATUS,
  HEXATONIC_REGISTRY_VERSION,
  classifyPitchClassSet,
  constructionsForPitchClasses,
  getAdvancedColour,
  listAdvancedColours,
  listAlternativeConstructions,
  listExplorerCatalogue,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  openGuitarVoicings,
  suspendedQuartalOnlyFortes,
  triadMotionAuditionMusicXml,
  validateHexatonicProject,
} from '../core/hexatonic';
import { listPentatonicColourResources } from '../core/pentatonic';

const scalarIds = listHexatonicScalars().map((row) => row.id);
assert.deepEqual(scalarIds, [
  'hex_western_claim_not_ritsu',
  'hex_major_omit_seventh',
  'hex_major_omit_fourth',
  'hex_lydian_triad_pair',
  'hex_minor_primary',
  'hex_whole_tone_even',
  'hex_whole_tone_odd',
  'hex_augmented_t0',
  'hex_augmented_t1',
  'hex_augmented_t2',
  'hex_augmented_t3',
]);
assert.equal(listHexatonicWpsPairs().length, 16);
assert.deepEqual(CORE_CANDIDATES.map((row) => row.id), [
  'cm-dbm', 'cm-bd', 'cM-bd', 'cM-ebd', 'cm-bbd', 'cM-bbm', 'cm-fsm', 'cm-dA', 'cM-dA', 'cm-dbA', 'cM-ebm', 'cM-fsm',
]);

const advanced = listAdvancedColours();
assert.deepEqual(advanced.map((row) => row.forte), ['6-13', '6-23', '6-28']);
for (const row of advanced) {
  assert.equal(row.status, ADVANCED_STATUS);
  assert.equal(row.mathematicallyValid, true);
  assert.equal(row.humanApproved, false);
  assert.equal(classifyPitchClassSet(row.pitchClasses).forte, row.forte);
  assert.equal(row.pitchClasses.length, 6);
  assert.equal(scalarIds.includes(row.id), false);
  assert.equal(CORE_CANDIDATES.some((candidate) => candidate.id === row.id), false);
}

const ids = new Set<string>();
for (const id of [...scalarIds, ...listHexatonicWpsPairs().map((row) => row.id), ...CORE_CANDIDATES.map((row) => row.id), ...advanced.map((row) => row.id)]) {
  assert.equal(ids.has(id), false, id);
  ids.add(id);
}

const constructions = listAlternativeConstructions();
assert.ok(constructions.length > 0);
const linked = constructions.filter((row) => row.links.length > 0);
assert.ok(linked.length > 0);
for (const row of linked) {
  assert.equal(ids.has(row.id), false);
  assert.equal(row.pitchClasses.length, 6);
}
const diatonic = listHexatonicScalars().find((row) => row.id === 'hex_major_omit_seventh')!;
const diatonicBuilds = constructionsForPitchClasses(diatonic.pitchClasses);
assert.ok(diatonicBuilds.some((row) => row.links.some((link) => link.id === 'hex_major_omit_seventh' && link.family === 'scalar')));

const susOnly = suspendedQuartalOnlyFortes();
assert.ok(susOnly.includes('6-7'));
assert.ok(susOnly.includes('6-38'));
assert.equal(susOnly.includes('6-32'), false);
assert.equal(susOnly.includes('6-13'), false);

const explorer = listExplorerCatalogue();
assert.equal(explorer.length, 50);
assert.equal(explorer.filter((row) => row.suspendedQuartalOnly).every((row) => row.tier === 'explorer' && row.status === EXPLORER_STATUS), true);
assert.equal(explorer.find((row) => row.forte === '6-32')?.tier, 'established');
assert.equal(explorer.find((row) => row.forte === '6-13')?.tier, 'advanced');
assert.equal(explorer.find((row) => row.forte === '6-49')?.tier, 'provisional');

const grips = openGuitarVoicings([0, 2, 7]);
assert.ok(grips.length > 0);
assert.ok(grips.some((row) => row.openStrings > 0));
assert.equal(grips[0]?.humanPlayability, 'NOT VERIFIED');

const colour = getAdvancedColour('adv-6-13');
assert.ok(colour);
const xml = triadMotionAuditionMusicXml(colour!.leftSpelling, colour!.rightSpelling, colour!.label, ADVANCED_STATUS);
assert.match(xml, /<note>/);
assert.doesNotMatch(xml, /<staff-type>\s*tab\s*<\/staff-type>/i);
assert.doesNotMatch(xml, /PROVISIONAL — NOT MUSICALLY APPROVED/);

const resolved = resolveBhlHexatonicColour({ family: 'advanced', id: 'adv-6-23', referencePc: 0 });
assert.equal(resolved.status, ADVANCED_STATUS);
assert.equal(resolved.artisticApproval, false);
assert.equal(resolved.provisional, false);
assert.equal(resolved.pitchClasses.length, 6);
const choices = listBhlHexatonicChoices();
assert.equal(choices.filter((row) => row.family === 'scalar').length, 11);
assert.equal(choices.filter((row) => row.family === 'wps').length, 16);
assert.equal(choices.filter((row) => row.family === 'provisional').length, 12);
assert.equal(choices.filter((row) => row.family === 'advanced').length, 3);
assert.equal(choices.some((row) => row.family === 'explorer'), false);

const bare = '<?xml version="1.0"?><score-partwise></score-partwise>';
const remap = readHexatonicStamp(stampHexatonicColour(bare, resolved, null));
assert.equal(remap?.strategy, null);
assert.equal(remap?.hexatonicWriting, 'colour-remap');
assert.equal(remap?.artisticApproval, false);
const named = readHexatonicStamp(stampHexatonicColour(bare, resolved, 'dialogue'));
assert.equal(named?.strategy, 'dialogue');
assert.equal(named?.hexatonicWriting, 'dialogue');
const legacy = readHexatonicStamp(bare.replace('?>', `?><!-- bhl-hexatonic ${JSON.stringify({ ...resolved, strategy: null, artisticApproval: false })} -->`));
assert.equal(legacy?.strategy, null);
assert.equal(legacy?.hexatonicWriting, 'colour-remap');

assert.deepEqual([...BHL_WORLD_IDS], ['A', 'B', 'C', 'D', 'E', 'F']);
assert.equal(HEXATONIC_REGISTRY_VERSION, 'hexatonic-registry-h2.0');
assert.equal(listPentatonicColourResources().length, 20);
assert.equal(validateHexatonicProject({ format: 'hexatonic-project', version: 1 }).ok, false);

const scratch = buildBhlScratchScore({ bars: 8, beats: 4, beatType: 4, tempo: 96, seed: 11 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-hex-c2-'));
const sourcePath = path.join(dir, 'scratch.musicxml');
fs.writeFileSync(sourcePath, scratch.xml);
const single = apiBhlCompose({
  sourcePath,
  span: { from: 1, to: 8 },
  seed: 11,
  world: 'A',
  hexatonic: { family: 'advanced', id: 'adv-6-13', referencePc: 0 },
});
assert.equal(single.ok, true);
if (single.ok) {
  const stamp = readHexatonicStamp(single.xml);
  assert.equal(stamp?.strategy, null);
  assert.equal(stamp?.hexatonicWriting, 'colour-remap');
  assert.equal(stamp?.id, 'adv-6-13');
  assert.equal(stamp?.status, ADVANCED_STATUS);
  assert.equal(stamp?.artisticApproval, false);
  assert.doesNotMatch(single.xml, /<staff-type>\s*tab\s*<\/staff-type>/i);
}
const set = apiBhlCandidates({
  sourcePath,
  span: { from: 1, to: 8 },
  seed: 11,
  world: 'A',
  hexatonic: { family: 'provisional', id: 'cM-ebm', referencePc: 0 },
});
assert.equal(set.ok, true);
if (set.ok) {
  assert.deepEqual(set.candidates.map((row) => row.label), ['Dialogue', 'Liquid', 'Sparse']);
  for (const candidate of set.candidates) {
    const stamp = readHexatonicStamp(candidate.xml);
    assert.equal(stamp?.strategy, candidate.label?.toLowerCase());
    assert.equal(stamp?.hexatonicWriting, stamp?.strategy);
    assert.equal(stamp?.artisticApproval, false);
    assert.equal(stamp?.status, 'PROVISIONAL — NOT MUSICALLY APPROVED');
    assert.equal(candidate.evidenceSummary.artisticApproval, false);
    assert.equal(candidate.evidenceSummary.musicalQualityScore ?? null, null);
  }
}

console.log(`hexatonicH6Advanced: PASS sus-only ${susOnly.join(' ')} constructions ${constructions.length}`);
