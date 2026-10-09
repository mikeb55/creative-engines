/**
 * Performance Composer — TRITONE PAIR (technical checks only; musical acceptance is Mike's playing).
 * Run: WWH_ALBUM_ROOT=… npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/performanceComposerTritonePair.test.ts
 * Files go to a temp folder and are deleted.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readProvenance, stripProvenance } from '../core/performance-composer/pcProvenance';
import { measureViews, parseScoreDocument, partElements, serializeNode } from '../core/performance-composer/pcScore';
import { composeTritonePair } from '../core/performance-composer/pcTritonePair';
import { verifyTritonePair, writeTritonePair, tritonePairStats } from '../core/performance-composer/pcTritonePairWrite';
import { runTritonePairSession } from '../core/performance-composer/pcTritonePairSession';

const ALBUM = process.env.WWH_ALBUM_ROOT ?? '/Users/user/Documents/DEVS/ECM-Album-Nov-2027';
const LEAD = (name: string) => path.join(ALBUM, '00 - WWH DUO LEADSHEETS', name);
const BLACK_AURA = LEAD('01-Black-Aura-Duo-Leadsheet-V1.1.musicxml');
const OTHERS = [
  '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '05-Orbit-Duo-Leadsheet-V2.1.musicxml',
  '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml',
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
].map(LEAD);
const HOBOS = LEAD('04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml');
const BUILD = { buildCommit: 'testbuild0000000000000000000000000000000', ipcBundleSha256: 'test', stampMatchesLiveIpc: 'unknown' };

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-tritone-'));

if (!fs.existsSync(BLACK_AURA)) {
  check('Black Aura source present', () => assert.fail(`missing ${BLACK_AURA}`));
} else {
  const xml = fs.readFileSync(BLACK_AURA, 'utf8');
  const before = sha(fs.readFileSync(BLACK_AURA));
  const plan = composeTritonePair(xml, 4242);
  const out = writeTritonePair(xml, plan);

  check('Black Aura: fields are F minor pentatonic and its tritone mirror B minor pentatonic', () => {
    assert.deepEqual(plan.home.names, ['F', 'Ab', 'Bb', 'C', 'Eb']);
    assert.deepEqual(plan.mirror.names, ['B', 'D', 'E', 'F#', 'A']);
    assert.equal(plan.home.pcs.filter((pc) => plan.mirror.pcs.includes(pc)).length, 0);
  });
  check('Black Aura: sections read from the score (A 1–8, B 9–16, C 17–18, D 19–23, G 24–27, 28–29, I 30–39)', () => {
    assert.deepEqual(plan.sections.map((s) => [s.from, s.to]), [[1, 8], [9, 16], [17, 18], [19, 23], [24, 27], [28, 29], [30, 39]]);
  });
  check('Black Aura: every lock holds (bass identical, chords/metre/tempo/barlines kept, bars full, re-imports)', () => {
    const r = verifyTritonePair(xml, out, plan);
    assert.ok(r.ok, r.errors.join('; '));
  });
  check('Black Aura: bass part byte-identical', () => {
    const a = partElements(parseScoreDocument(xml))[1]!;
    const b = partElements(parseScoreDocument(out))[1]!;
    assert.equal(serializeNode(a), serializeNode(b));
  });
  check('Black Aura: 39 bars, guitar notes all new (red)', () => {
    const g = partElements(parseScoreDocument(out))[0]!;
    assert.equal(measureViews(g).length, 39);
    const notes = Array.from(g.getElementsByTagName('note')).filter((n) => n.getElementsByTagName('pitch').length);
    assert.ok(notes.length > 60);
    assert.ok(notes.every((n) => n.getAttribute('color') === '#E0201B'));
  });
  check('Black Aura: playable — every moment fingered, max fret ≤ 13, span ≤ 4, no hard jumps', () => {
    assert.ok(plan.fret.ok);
    assert.ok(plan.fret.maxFret <= 13, `max fret ${plan.fret.maxFret}`);
    assert.ok(plan.fret.maxSpan <= 4);
    assert.equal(plan.fret.hardShifts, 0);
  });
  check('Black Aura: grip bursts, not grip comping — 4 to 16 grips, never two bars running, placement varies', () => {
    const s = tritonePairStats(plan);
    assert.ok(s.quartalGrips >= 4 && s.quartalGrips <= 16, `${s.quartalGrips} grips`);
    const bursts = plan.events.filter((e) => e.kind === 'grip' || e.kind === 'clash-grip').sort((a, b) => a.bar - b.bar);
    for (let i = 1; i < bursts.length; i++) {
      assert.ok(bursts[i]!.bar - bursts[i - 1]!.bar >= 2, `bursts in bars ${bursts[i - 1]!.bar} and ${bursts[i]!.bar}`);
    }
    assert.ok(new Set(bursts.map((e) => e.onset)).size >= Math.min(3, bursts.length), 'burst placements vary');
    assert.ok(s.gripsOnBeats1and3 <= Math.ceil(s.quartalGrips / 2), `${s.gripsOnBeats1and3} grips on beats 1 or 3`);
  });
  check('Black Aura: the score\'s PEAK bar carries the highest guitar note', () => {
    const top = Math.max(...plan.events.flatMap((e) => e.midis));
    assert.ok(plan.events.some((e) => e.bar === 36 && e.midis.includes(top)), `top ${top} not in bar 36`);
  });
  check('Black Aura: not mechanical — varied bar rhythms, inner voice moves', () => {
    const s = tritonePairStats(plan);
    assert.ok(s.distinctRhythms >= 25, `${s.distinctRhythms} rhythms`);
    assert.ok(s.innerVoiceDistinctPitches >= 3, `${s.innerVoiceDistinctPitches} inner pitches`);
  });
  check('Black Aura: ending is the mirror quartal stack sliding up one fret into the home stack', () => {
    const last = plan.events.filter((e) => e.bar === 39);
    const before38 = plan.events.filter((e) => e.bar === 38 && e.kind === 'stack');
    assert.equal(last.length, 1);
    assert.equal(before38.length, 1);
    assert.deepEqual(before38[0]!.midis.map((m) => m + 1), last[0]!.midis);
  });
  check('A different seed gives different notes; the same seed gives the same notes', () => {
    const again = composeTritonePair(xml, 4242);
    const other = composeTritonePair(xml, 9001);
    const key = (p: typeof plan) => JSON.stringify(p.events.map((e) => [e.bar, e.onset, e.midis]));
    assert.equal(key(again), key(plan));
    assert.notEqual(key(other), key(plan));
  });
  check('Session: writes MusicXML + field map, both stamped; source untouched', () => {
    const run = runTritonePairSession({ sourcePath: BLACK_AURA, outRoot: tmp, build: BUILD, seed: 4242, now: new Date('2026-10-09T12:00:00Z') });
    assert.ok(fs.existsSync(run.musicXmlPath) && fs.existsSync(run.fieldMapPath));
    assert.equal(path.basename(run.musicXmlPath), 'Black Aura Tritone Pair.musicxml');
    const written = fs.readFileSync(run.musicXmlPath, 'utf8');
    assert.equal(readProvenance(written)?.runId, run.runId);
    assert.equal(readProvenance(written)?.buildCommit, BUILD.buildCommit);
    assert.ok(verifyTritonePair(xml, stripProvenance(written), composeTritonePair(xml, 4242)).ok);
    assert.ok(fs.readFileSync(run.fieldMapPath, 'utf8').includes(BUILD.buildCommit.slice(0, 12)));
    assert.equal(sha(fs.readFileSync(BLACK_AURA)), before);
  });
  check('Session: each press is a new folder; nothing overwritten', () => {
    const a = runTritonePairSession({ sourcePath: BLACK_AURA, outRoot: tmp, build: BUILD, seed: 1, now: new Date('2026-10-09T12:00:01Z') });
    const b = runTritonePairSession({ sourcePath: BLACK_AURA, outRoot: tmp, build: BUILD, seed: 2, now: new Date('2026-10-09T12:00:02Z') });
    assert.notEqual(a.folder, b.folder);
  });
}

for (const file of OTHERS) {
  const name = path.basename(file).replace(/-Duo-Leadsheet.*$/, '');
  if (!fs.existsSync(file)) {
    check(`${name}: source present`, () => assert.fail(`missing ${file}`));
    continue;
  }
  check(`${name}: same code, no changes — locks hold and it is playable`, () => {
    const xml = fs.readFileSync(file, 'utf8');
    const plan = composeTritonePair(xml, 4242);
    const r = verifyTritonePair(xml, writeTritonePair(xml, plan), plan);
    assert.ok(r.ok, r.errors.slice(0, 3).join('; '));
    assert.ok(plan.fret.ok && plan.fret.hardShifts === 0);
  });
}
if (fs.existsSync(HOBOS)) {
  check("Meet Me at Hobo's: refused (note lengths disagree with note values); nothing written", () => {
    assert.throws(() => runTritonePairSession({ sourcePath: HOBOS, outRoot: tmp, build: BUILD, seed: 1 }), /note lengths disagree/);
  });
}

check('Engine source holds no hand-written note lists', () => {
  const src = ['pcTritonePair.ts', 'pcTritonePairWrite.ts', 'pcFretboard.ts']
    .map((f) => fs.readFileSync(path.join(__dirname, '../core/performance-composer', f), 'utf8'))
    .join('\n');
  // Four or more MIDI-range integers in one array literal would be a note list.
  const lists = src.match(/\[\s*(?:(?:3[6-9]|[4-8]\d|9[0-6])\s*,\s*){3,}(?:3[6-9]|[4-8]\d|9[0-6])\s*\]/g) ?? [];
  const allowed = ['[64, 59, 55, 50, 45, 40]'];
  assert.deepEqual(lists.filter((l) => !allowed.includes(l.replace(/\s+/g, ' '))), []);
});

fs.rmSync(tmp, { recursive: true, force: true });
if (failed) {
  console.log(`${failed} TRITONE PAIR CHECK(S) FAILED`);
  process.exit(1);
}
console.log('ALL TRITONE PAIR CHECKS PASS');
