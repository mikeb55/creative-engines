/**
 * E2 C — scheduled realisation and the source-lock boundary.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/e2HarmonicRealisation.test.ts
 */
import assert from 'node:assert/strict';
import { captureSource } from '../core/orchestrate/sourceFoundation';
import { verifySourceLocks } from '../core/orchestrate/sourceLocks';
import { expandLockPolicy, spansOverlap } from '../core/orchestrate/e2LockBoundary';
import {
  attacksMatchPrimitive,
  developMemberOrder,
  fixedAlternateFixture,
  intervalPreserved,
  realiseScheduled,
} from '../core/orchestrate/harmonicRealisation';
import {
  contraryDyad,
  dyadPair,
  dyadParent,
  polychord,
  realiseAlternateBar,
  realiseSimultaneous,
  realiseSuperpose,
  triadPair,
  triadParent,
} from '../core/orchestrate/harmonicColour';
import { q } from '../core/piano/pianoExactTiming';
import type { HarmonicRegion } from '../core/orchestrate/harmonicColourTypes';

const rows: { name: string; ok: boolean }[] = [];
function check(name: string, fn: () => void): void {
  try {
    fn();
    rows.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    rows.push({ name, ok: false });
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  }
}

const lower = () => triadParent('lower-C', 'major', ['C', 'E', 'G'], ['C3', 'E3', 'G3']);
const upper = () => triadParent('upper-D', 'major', ['D', 'F#', 'A'], ['D5', 'F#5', 'A5']);
const cMajor = () => triadParent('Cmaj', 'major', ['C', 'E', 'G'], ['C4', 'E4', 'G4']);
const dMajor = () => triadParent('Dmaj', 'major', ['D', 'F#', 'A'], ['D4', 'F#4', 'A4']);

function region(intent: HarmonicRegion['intent']): HarmonicRegion {
  return { span: { onset: q(0), duration: q(4) }, intent };
}

const spanXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>8</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>5</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><rest/><duration>26</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

check('C1 fractional span selects 5/8 inside [1/2, 3/4) and the raw lock span does not', () => {
  assert.equal(spansOverlap(q(5, 8), q(1, 8), { onset: q(1, 2), duration: q(1, 4) }), true);
  assert.equal(spansOverlap(q(3, 4), q(1, 8), { onset: q(1, 2), duration: q(1, 4) }), false);
  assert.equal(spansOverlap(q(1, 4), q(1, 2), { onset: q(1, 2), duration: q(1, 4) }), true);
  const source = captureSource(spanXml, 'span.musicxml');
  const note = source.records.find((record) => !record.canonical.rest);
  assert.ok(note);
  assert.equal(note.canonical.onset.n, 5);
  assert.equal(note.canonical.onset.d, 8);
  const mutated = spanXml.replace('<octave>4</octave>', '<octave>5</octave>');
  const candidate = captureSource(mutated, 'span-mutated.musicxml');
  const spanPolicy = {
    selectedSourceEventIds: [],
    spans: [{ onset: q(1, 2), duration: q(1, 4) }],
    preserve: { pitch: true, spelling: false, rhythm: false, silence: false, harmony: false, form: false, tempo: false },
    harmonyMeaning: 'declared-intent' as const,
  };
  const raw = verifySourceLocks(source, candidate, spanPolicy);
  assert.equal(raw.ok, true);
  const expanded = expandLockPolicy(source, spanPolicy);
  assert.equal(expanded.mode, 'restricted');
  assert.ok(expanded.expandedIds.includes(note.canonical.id));
  assert.deepEqual(expanded.verifierPolicy.spans, []);
  const guarded = verifySourceLocks(source, candidate, expanded.verifierPolicy);
  assert.equal(guarded.ok, false);
  assert.equal(guarded.failures[0]?.lock, 'pitch');
});

check('C2 zero selected events are not unrestricted', () => {
  const source = captureSource(spanXml, 'zero.musicxml');
  const mutated = captureSource(spanXml.replace('<octave>4</octave>', '<octave>5</octave>'), 'zero-mut.musicxml');
  const emptySpan = {
    selectedSourceEventIds: [],
    spans: [{ onset: q(10), duration: q(1) }],
    preserve: { pitch: true, spelling: false, rhythm: false, silence: false, harmony: false, form: false, tempo: false },
    harmonyMeaning: 'declared-intent' as const,
  };
  const expanded = expandLockPolicy(source, emptySpan);
  assert.equal(expanded.mode, 'zero');
  assert.deepEqual(expanded.expandedIds, []);
  assert.notEqual(expanded.verifierPolicy.selectedSourceEventIds.length, 0);
  assert.equal(verifySourceLocks(source, mutated, expanded.verifierPolicy).ok, true);
  const unrestricted = expandLockPolicy(source, { ...emptySpan, spans: [] });
  assert.equal(unrestricted.mode, 'unrestricted');
  assert.ok(unrestricted.expandedIds.length > 0);
  assert.equal(verifySourceLocks(source, mutated, unrestricted.verifierPolicy).ok, false);
});

check('C3 simultaneous and superpose primitives stay intact inside the scheduler', () => {
  const intent = polychord('CD', upper(), lower());
  const primitive = realiseSimultaneous(intent, q(0), q(2));
  const scheduled = realiseScheduled({
    regions: [region(intent)],
    schedule: [{ regionId: 'CD', slotId: 'all', logicalVoiceId: 'harmony', onset: q(0), duration: q(2), parent: 'both' }],
    seed: 3,
    fullAnchors: [{ regionId: 'CD', onset: q(0), duration: q(2) }],
  });
  assert.equal(scheduled.ok, true);
  if (!scheduled.ok) return;
  assert.equal(attacksMatchPrimitive(scheduled.receipt.placements.map((item) => item.attack), primitive), true);
  const pair = triadPair('pair', cMajor(), dMajor(), 'superpose');
  const stacked = realiseSuperpose(cMajor(), dMajor(), q(1), q(1));
  const via = realiseScheduled({
    regions: [region(pair)],
    schedule: [{ regionId: 'pair', slotId: 'stack', logicalVoiceId: 'harmony', onset: q(1), duration: q(1), parent: 'both' }],
    seed: 3,
  });
  assert.equal(via.ok, true);
  if (!via.ok) return;
  assert.equal(attacksMatchPrimitive(via.receipt.placements.map((item) => item.attack), stacked), true);
  const alternate = fixedAlternateFixture(triadPair('alt', cMajor(), dMajor(), 'alternate'));
  assert.deepEqual(alternate, realiseAlternateBar(triadPair('alt', cMajor(), dMajor(), 'alternate')));
  assert.equal(alternate.filter((attack) => attack.rest).length, 2);
});

check('C4 a bar-wide union is not a full polychord', () => {
  const intent = polychord('CD', upper(), lower());
  const split = realiseScheduled({
    regions: [region(intent)],
    schedule: [
      { regionId: 'CD', slotId: 'low', logicalVoiceId: 'low', onset: q(0), duration: q(1), parent: 'lower' },
      { regionId: 'CD', slotId: 'up', logicalVoiceId: 'up', onset: q(1), duration: q(1), parent: 'upper' },
    ],
    seed: 4,
    fullAnchors: [{ regionId: 'CD', onset: q(0), duration: q(2) }],
  });
  assert.equal(split.ok, false);
  if (split.ok) return;
  assert.match(split.reason, /infeasible|union/);
});

check('C5 dyads keep directed interval and contrary motion', () => {
  const left = dyadParent('A', 'C4', 'F4');
  const right = dyadParent('B', 'D5', 'G5');
  assert.equal(intervalPreserved(left, right, 'directed-semitone'), true);
  assert.equal(intervalPreserved(left, dyadParent('C', 'C4', 'G4'), 'directed-semitone'), false);
  assert.equal(intervalPreserved(left, dyadParent('C', 'C4', 'G4'), 'interval-class'), true);
  const moved = contraryDyad(dyadParent('B', 'D4', 'G4'), 2, false);
  assert.equal('ok' in moved, false);
  if ('ok' in moved) return;
  assert.equal(moved.members[0].pitch.midi, 64);
  assert.equal(moved.members[1].pitch.midi, 65);
  const locked = contraryDyad(left, 1, true);
  assert.equal(locked && 'ok' in locked && locked.ok, false);
  const intent = dyadPair('pair', left, right, 'alternate');
  const realised = realiseScheduled({
    regions: [region(intent)],
    schedule: [
      { regionId: 'pair', slotId: 'a', logicalVoiceId: 'a', onset: q(0), duration: q(1), parent: 'a' },
      { regionId: 'pair', slotId: 'gap', logicalVoiceId: 'a', onset: q(1), duration: q(1, 2), parent: 'a', rest: true },
      { regionId: 'pair', slotId: 'b', logicalVoiceId: 'b', onset: q(3, 2), duration: q(1), parent: 'b' },
    ],
    seed: 5,
  });
  assert.equal(realised.ok, true);
  if (!realised.ok) return;
  assert.equal(realised.receipt.placements.length, 4);
  assert.equal(realised.receipt.rests.length, 1);
  assert.notDeepEqual(
    realised.receipt.placements.map((item) => item.attack.pitch.midi).sort(),
    realiseSimultaneous(polychord('no', upper(), lower())).map((item) => item.pitch.midi).sort(),
  );
});

check('C6 retrograde reuses the motif operator on member order', () => {
  const developed = developMemberOrder(['root', 'third', 'fifth'], 6);
  assert.deepEqual(developed.order, ['fifth', 'third', 'root']);
  assert.match(developed.operator, /retrograde/);
  const intent = triadPair('CD', cMajor(), dMajor(), 'alternate');
  const realised = realiseScheduled({
    regions: [region(intent)],
    schedule: [{ regionId: 'CD', slotId: 'cell:return', logicalVoiceId: 'line', onset: q(0), duration: q(1, 2), parent: 'a', arpeggio: true }],
    seed: 6,
  });
  assert.equal(realised.ok, true);
  if (!realised.ok) return;
  assert.deepEqual(realised.receipt.development[0]?.memberOrder, ['fifth', 'third', 'root']);
  assert.deepEqual(realised.receipt.placements.map((item) => item.attack.pitch.midi), [67, 64, 60]);
});

check('C7 repeated regions get distinct placement ids', () => {
  const intent = polychord('CD', upper(), lower());
  const realised = realiseScheduled({
    regions: [region(intent)],
    schedule: [
      { regionId: 'CD', slotId: 'a', logicalVoiceId: 'h', onset: q(0), duration: q(1), parent: 'both', occurrence: 1 },
      { regionId: 'CD', slotId: 'a', logicalVoiceId: 'h', onset: q(2), duration: q(1), parent: 'both', occurrence: 2 },
    ],
    seed: 7,
  });
  assert.equal(realised.ok, true);
  if (!realised.ok) return;
  const ids = realised.receipt.placements.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

export function runE2HarmonicRealisationTests(): { name: string; ok: boolean }[] {
  return rows;
}

if (rows.some((row) => !row.ok)) process.exitCode = 1;
