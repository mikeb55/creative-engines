/**
 * H6-B3 — shape controls on the existing phrase plan.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlHexatonicB3.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCandidates } from '../../app-api/bhlApp';
import { applyHexatonicShape } from '../../core/bhl/bhlHexatonicColour';
import { ingestBhlSource } from '../../core/bhl/bhlIngest';
import { deriveBhlPhrasePlan } from '../../core/bhl/bhlPhrase';
import { buildBhlScratchScore } from '../../core/bhl/bhlScratch';
import { BHL_WORLD_IDS } from '../../core/bhl/bhlWorlds';

const scratch = buildBhlScratchScore({ bars: 8, beats: 4, beatType: 4, tempo: 96, seed: 11 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-hex-b3-'));
const sourcePath = path.join(dir, 'scratch.musicxml');
fs.writeFileSync(sourcePath, scratch.xml);
const span = { from: 1, to: 8 };
const lock = ingestBhlSource({ sourcePath, span, protectedGuitarBars: [] });
const plan = deriveBhlPhrasePlan(lock.bass, lock.metres, lock.bassPartId, span, 11);
const shaped = applyHexatonicShape(plan, {
  tension: 'return',
  space: 'rests',
  density: 'sparse',
  texture: 'melody-inner',
  motif: 'transform',
  interaction: 'with-bass',
});
assert.equal(shaped.regions.at(-1)?.pitchTransform, 'recall-cell');
assert.equal(shaped.regions.at(-1)?.tensionState, 'recover');
assert.ok(shaped.regions.every((region) => region.density === 'counterline'));
assert.ok(shaped.regions.every((region) => region.dialogue === 'leave-space'));
assert.deepEqual([...BHL_WORLD_IDS], ['A', 'B', 'C', 'D', 'E', 'F']);

const body = {
  sourcePath,
  span,
  seed: 21,
  world: 'A' as const,
  hexatonic: { family: 'provisional' as const, id: 'cM-ebm', referencePc: 0 },
};
const open = apiBhlCandidates(body);
const rested = apiBhlCandidates({
  ...body,
  hexatonicShape: { tension: 'outside', space: 'rests', density: 'sparse', texture: 'melody', motif: 'statement', interaction: 'with-bass' },
});
assert.equal(open.ok, true);
assert.equal(rested.ok, true);
if (open.ok && rested.ok) {
  assert.equal(rested.candidates.length, 3);
  assert.notEqual(rested.candidates[0]?.xml, open.candidates[0]?.xml);
  assert.equal(rested.candidates[0]?.evidenceSummary.hexatonicProvisional, true);
  assert.equal(rested.candidates[1]?.xml, rested.candidates[1]?.xml);
}

console.log('bhlHexatonicB3 ok');
