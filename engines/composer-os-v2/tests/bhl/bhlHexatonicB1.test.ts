/**
 * H6-B1 — hexatonic colour on the existing BHL composer.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlHexatonicB1.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCandidates } from '../../app-api/bhlApp';
import { BHL_WORLD_IDS } from '../../core/bhl/bhlWorlds';
import { buildBhlScratchScore } from '../../core/bhl/bhlScratch';
import { readHexatonicStamp, resolveBhlHexatonicColour } from '../../core/bhl/bhlHexatonicColour';
import { CORE_LABORATORY_STATUS } from '../../core/hexatonic/coreLaboratory';
import { listHexatonicScalars } from '../../core/hexatonic/collections';
import { listHexatonicWpsPairs } from '../../core/hexatonic/triadPairs';

const scratch = buildBhlScratchScore({ bars: 8, beats: 4, beatType: 4, tempo: 96, seed: 11 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-hex-b1-'));
const sourcePath = path.join(dir, 'scratch.musicxml');
fs.writeFileSync(sourcePath, scratch.xml);

assert.deepEqual([...BHL_WORLD_IDS], ['A', 'B', 'C', 'D', 'E', 'F']);

const provisional = resolveBhlHexatonicColour({ family: 'provisional', id: 'cm-dbm', referencePc: 0 });
assert.equal(provisional.provisional, true);
assert.equal(provisional.status, CORE_LABORATORY_STATUS);
assert.equal(provisional.artisticApproval, false);
assert.equal(provisional.pitchClasses.length, 6);

const scalar = resolveBhlHexatonicColour({ family: 'scalar', id: listHexatonicScalars()[0]!.id, referencePc: 2 });
assert.equal(scalar.provisional, false);
assert.equal(scalar.status, 'catalogue');
assert.equal(scalar.artisticApproval, false);

const wps = resolveBhlHexatonicColour({ family: 'wps', id: listHexatonicWpsPairs()[0]!.id, referencePc: 0 });
assert.equal(wps.provisional, false);
assert.ok(wps.provenance);

assert.throws(() => resolveBhlHexatonicColour({ family: 'provisional', id: 'not-a-pair', referencePc: 0 }), /unknown provisional/);

const plain = apiBhlCandidates({ sourcePath, span: { from: 1, to: 8 }, seed: 11, world: 'A' });
assert.equal(plain.ok, true);
if (plain.ok) {
  assert.deepEqual(plain.candidates.map((candidate) => candidate.label), ['Candidate 1', 'Candidate 2', 'Candidate 3']);
  assert.equal(plain.candidates[0]?.xml.includes('bhl-hexatonic'), false);
}

const coloured = apiBhlCandidates({
  sourcePath,
  span: { from: 1, to: 8 },
  seed: 11,
  world: 'A',
  hexatonic: { family: 'provisional', id: 'cm-dbm', referencePc: 0 },
});
assert.equal(coloured.ok, true);
if (!coloured.ok) throw new Error('colour candidates failed');
for (const candidate of coloured.candidates) {
  const stamp = readHexatonicStamp(candidate.xml);
  assert.ok(stamp);
  assert.equal(stamp?.provisional, true);
  assert.equal(stamp?.status, CORE_LABORATORY_STATUS);
  assert.equal(stamp?.artisticApproval, false);
  assert.equal(stamp?.id, 'cm-dbm');
  assert.equal(candidate.settings.hexatonic && (candidate.settings.hexatonic as { provisional: boolean }).provisional, true);
  assert.equal(candidate.evidenceSummary.artisticApproval, false);
}
const again = apiBhlCandidates({
  sourcePath,
  span: { from: 1, to: 8 },
  seed: 11,
  world: 'A',
  hexatonic: { family: 'provisional', id: 'cm-dbm', referencePc: 0 },
});
assert.equal(again.ok, true);
if (again.ok) assert.equal(again.candidates[0]?.xml, coloured.candidates[0]?.xml);

console.log('bhlHexatonicB1 ok');
