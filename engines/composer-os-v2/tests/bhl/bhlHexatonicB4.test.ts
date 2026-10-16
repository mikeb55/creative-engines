/**
 * H6-B4 — evidence hand-off. No artistic score.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlHexatonicB4.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCandidates, apiBhlRefine } from '../../app-api/bhlApp';
import { demonstrablyMechanical } from '../../core/bhl/bhlHexatonicColour';
import { buildBhlScratchScore } from '../../core/bhl/bhlScratch';
import type { BhlGuitarEvent } from '../../core/bhl/bhlPhrase';
import { evaluateScore } from '../../core/musical-evaluation/service';

const cell: BhlGuitarEvent = { bar: 1, regionId: 'a', onsetQuarters: 0, quarters: 1, midis: [60], pitchClasses: [0] };
const repeated = [0, 1, 2, 3].flatMap((bar) => [
  { ...cell, bar: bar + 1, onsetQuarters: 0 },
  { ...cell, bar: bar + 1, onsetQuarters: 1 },
  { ...cell, bar: bar + 1, onsetQuarters: 2, midis: [], pitchClasses: [] },
]);
assert.equal(demonstrablyMechanical(repeated), false);

const scratch = buildBhlScratchScore({ bars: 8, beats: 4, beatType: 4, tempo: 96, seed: 11 });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-hex-b4-'));
const sourcePath = path.join(dir, 'scratch.musicxml');
fs.writeFileSync(sourcePath, scratch.xml);
const body = {
  sourcePath,
  span: { from: 1, to: 8 },
  seed: 21,
  world: 'C' as const,
  hexatonic: { family: 'provisional' as const, id: 'cm-dbm', referencePc: 3 },
  hexatonicShape: { tension: 'return', space: 'rests', density: 'sparse', texture: 'melody', motif: 'statement', interaction: 'with-bass' },
};
const made = apiBhlCandidates(body);
assert.equal(made.ok, true);
if (!made.ok) throw new Error('candidates failed');
assert.deepEqual(made.candidates.map((row) => row.label), ['Dialogue', 'Liquid', 'Sparse']);
const refined = apiBhlRefine({ ...body, original: made.candidates[2], seed: 22 });
assert.equal(refined.ok, true);
if (!refined.ok) throw new Error('refine failed');
assert.equal(made.candidates[0]?.xml, apiBhlCandidates(body).ok ? made.candidates[0]?.xml : '');
assert.notEqual(refined.refined.id, made.candidates[0]?.id);

const receipt = evaluateScore({
  score: { label: 'Dialogue', xml: made.candidates[0]!.xml },
  declared: { label: 'C minor / Db minor', family: 'hexatonic', pitchClasses: [1, 3, 6, 8, 10] },
});
assert.equal(receipt.bmef.machineRatings, null);
assert.equal(receipt.bmef.machineDecision, null);
assert.equal('musicalQualityScore' in receipt, false);
const structural = receipt.structural[0]?.findings ?? [];
assert.ok(structural.some((finding) => finding.metricId === 'hexatonic-status' && finding.observations.artisticApproval === false));
assert.ok(structural.some((finding) => finding.metricId === 'hexatonic-writing'));
assert.equal(structural.some((finding) => typeof (finding.observations as { score?: unknown }).score === 'number'), false);

console.log('bhlHexatonicB4 ok');
