/**
 * H6-B2 — Dialogue, Liquid, and Sparse on the existing BHL candidate set.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlHexatonicB2.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCandidates, apiBhlRefine } from '../../app-api/bhlApp';
import { buildBhlScratchScore } from '../../core/bhl/bhlScratch';
import { verifyBhlLocks } from '../../core/bhl/bhlVerify';
import { ingestBhlSource, lockSpecOf } from '../../core/bhl/bhlIngest';
import { positionShiftWarnings, resolveBhlHexatonicColour } from '../../core/bhl/bhlHexatonicColour';
import type { BhlGuitarEvent } from '../../core/bhl/bhlPhrase';

const scratch = buildBhlScratchScore({ bars: 8, beats: 4, beatType: 4, tempo: 96, seed: 11 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-hex-b2-'));
const sourcePath = path.join(dir, 'scratch.musicxml');
fs.writeFileSync(sourcePath, scratch.xml);
const body = {
  sourcePath,
  span: { from: 1, to: 8 },
  seed: 21,
  world: 'A' as const,
  hexatonic: { family: 'provisional' as const, id: 'cm-dbm', referencePc: 0 },
};
const made = apiBhlCandidates(body);
assert.equal(made.ok, true);
if (!made.ok) throw new Error('candidates failed');
assert.deepEqual(made.candidates.map((candidate) => candidate.label), ['Dialogue', 'Liquid', 'Sparse']);
assert.equal(new Set(made.candidates.map((candidate) => candidate.xml)).size, 3);
const lock = ingestBhlSource({ sourcePath, span: body.span, protectedGuitarBars: [] });
for (const candidate of made.candidates) {
  const verified = verifyBhlLocks(scratch.xml, candidate.xml, lockSpecOf(lock));
  assert.equal(verified.ok, true, verified.errors.join('; '));
  assert.equal(candidate.evidenceSummary.commonToneRetentions, 0);
  assert.equal((candidate.settings.hexatonic as { sharedPitchClasses: number[] }).sharedPitchClasses.length, 0);
}
const repeat = apiBhlCandidates(body);
assert.equal(repeat.ok, true);
if (repeat.ok) assert.equal(repeat.candidates[1]?.xml, made.candidates[1]?.xml);

const refined = apiBhlRefine({ ...body, original: made.candidates[0], seed: 22 });
assert.equal(refined.ok, true);
if (refined.ok) {
  assert.equal(refined.original.xml, made.candidates[0]?.xml);
  assert.notEqual(refined.refined.xml, made.candidates[1]?.xml);
  assert.equal(made.candidates[1]?.xml, apiBhlCandidates(body).ok ? made.candidates[1]?.xml : '');
}

const colour = resolveBhlHexatonicColour(body.hexatonic);
assert.deepEqual(colour.sharedPitchClasses, []);
const far: BhlGuitarEvent[] = [
  { bar: 1, regionId: 'a', onsetQuarters: 0, quarters: 1, midis: [40, 45, 50], pitchClasses: [4, 9, 2] },
  { bar: 2, regionId: 'a', onsetQuarters: 0, quarters: 1, midis: [76, 81, 85], pitchClasses: [4, 9, 1] },
];
const warnings = positionShiftWarnings(far);
assert.ok(warnings.some((warning) => /position|feasible/i.test(warning)));

console.log('bhlHexatonicB2 ok');
