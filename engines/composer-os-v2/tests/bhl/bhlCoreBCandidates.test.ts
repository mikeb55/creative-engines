/**
 * Core-b candidate distinctness.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlCoreBCandidates.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { apiBhlCandidates, apiBhlRefine, bhlWrongTurningPath } from '../../app-api/bhlApp';
import { readBhlEvidence } from '../../core/bhl/bhlEvidence';
import { ingestBhlSource, lockSpecOf, sha256File } from '../../core/bhl/bhlIngest';
import { verifyBhlLocks } from '../../core/bhl/bhlVerify';
import type { BhlSpan } from '../../core/bhl/bhlTypes';

const SOURCE = bhlWrongTurningPath();
const SPAN: BhlSpan = { from: 33, to: 40 };
const BODY = {
  sourcePath: SOURCE,
  span: SPAN,
  seed: 3340,
  world: 'A' as const,
  rhythm: 'derived' as const,
  phraseArc: 'derived' as const,
  musical: {
    riff: {
      pitchSource: 'riff' as const,
      rhythmSource: 'core-b' as const,
      pitchSeed: 17,
      rhythmSeed: 1,
      transform: 'original' as const,
      displacementQuarters: 0.5,
    },
  },
};

function q(value: { n: number; d: number }): string {
  return `${value.n}/${value.d}`;
}

function guitarRows(xml: string) {
  return readBhlEvidence(xml, SPAN).events.filter((event) => /guitar|gtr/i.test(`${event.partName} ${event.partId}`));
}

function sequence(xml: string): string {
  return guitarRows(xml)
    .map((event) => `${event.bar}@${q(event.onsetInBar)}:${event.rest ? 'rest' : event.midi}:d${q(event.duration)}:v${event.voice}`)
    .join('|');
}

function leadRhythm(xml: string): string {
  return guitarRows(xml)
    .filter((event) => event.voice === '1' && event.attack && !event.rest)
    .map((event) => `${event.bar}@${q(event.onsetInBar)}:d${q(event.duration)}`)
    .join('|');
}

function transformOf(settings: Record<string, unknown>): string {
  const musical = settings.musical as { riff?: { transform?: string; rhythmSeed?: number } } | undefined;
  return `${musical?.riff?.transform ?? ''}:${String(musical?.riff?.rhythmSeed ?? '')}`;
}

const before = sha256File(SOURCE);
const sourceXml = fs.readFileSync(SOURCE, 'utf8');
const lock = ingestBhlSource({ sourcePath: SOURCE, span: SPAN, protectedGuitarBars: [] });

const first = apiBhlCandidates(BODY);
const second = apiBhlCandidates(BODY);
assert.equal(first.ok, true);
assert.equal(second.ok, true);
if (!first.ok || !second.ok) throw new Error('candidates');
assert.equal(first.candidates.length, 3);
assert.deepEqual(
  first.candidates.map((item) => item.xml),
  second.candidates.map((item) => item.xml),
);
assert.deepEqual(
  first.candidates.map((item) => item.seed),
  [3340, 3357, 3369],
);
assert.deepEqual(first.candidates.map((item) => transformOf(item.settings)), ['original:1', 'displace:1', 'fragment:1']);

const sequences = first.candidates.map((item) => sequence(item.xml));
const rhythms = first.candidates.map((item) => leadRhythm(item.xml));
assert.equal(new Set(sequences).size, 3);
assert.equal(new Set(rhythms).size, 3);
assert.match(rhythms[0]!, /^33@1\/4:d3\/4\|33@5\/4:d1\/2\|33@2\/1:d1\/1\|33@3\/1:d1\/1$/);
assert.match(rhythms[1]!, /33@3\/4:d3\/4\|33@7\/4:d1\/2\|33@5\/2:d1\/1/);
assert.equal(rhythms[2], '33@1/4:d3/4|33@5/4:d1/2');

for (const candidate of first.candidates) {
  const verified = verifyBhlLocks(sourceXml, candidate.xml, lockSpecOf(lock));
  assert.equal(verified.ok, true, verified.errors.join('; '));
}
assert.equal(sha256File(SOURCE), before);

const refined = apiBhlRefine({ ...BODY, original: first.candidates[0] });
assert.equal(refined.ok, true);
if (!refined.ok) throw new Error('refine');
assert.equal(refined.original.xml, first.candidates[0]!.xml);
assert.notEqual(refined.refined.xml, refined.original.xml);
assert.equal(refined.refined.parentId, refined.original.id);
assert.notEqual(leadRhythm(refined.refined.xml), leadRhythm(refined.original.xml));
assert.equal(sha256File(SOURCE), before);

console.log('bhlCoreBCandidates: PASS');
