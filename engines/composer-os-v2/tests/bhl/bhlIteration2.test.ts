/**
 * BHL iteration 2 — phrase plan, rhythm contract, guitar generation, source locks.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlIteration2.test.ts
 * Album path is read-only. The playable file is written under ~/Downloads only after the checks pass.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { generateBhlGuitar } from '../../core/bhl/bhlGenerate';
import { sha256File } from '../../core/bhl/bhlIngest';
import { deriveBhlPhrasePlan, evaluateBhlPredicates, neighborCell } from '../../core/bhl/bhlPhrase';
import { detectMechanicalOnsets, planPhraseOnsets, readBassBars, type BhlOnsetPlan } from '../../core/bhl/bhlRhythm';
import { ingestBhlSource } from '../../core/bhl/bhlIngest';
import { loadScore, measureViews, parseScoreDocument, partById } from '../../core/performance-composer/pcScore';

const SOURCE = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const SPAN = { from: 33, to: 40 };
const SEED = 3340;
const DOWNLOAD = path.join(os.homedir(), 'Downloads', 'Wrong-Turning-BHL-Iteration2-V1.musicxml');

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  }
}

const before = sha256File(SOURCE);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-iter2-'));
const firstPath = path.join(tmp, 'a.musicxml');
const secondPath = path.join(tmp, 'b.musicxml');

const first = composeBhlGuitar({
  sourcePath: SOURCE,
  span: SPAN,
  seed: SEED,
  outputPath: firstPath,
  permittedOutputDir: tmp,
});
const second = composeBhlGuitar({
  sourcePath: SOURCE,
  span: SPAN,
  seed: SEED,
  outputPath: secondPath,
  permittedOutputDir: tmp,
});

check('source SHA-256 is unchanged', () => {
  assert.equal(sha256File(SOURCE), before);
  assert.equal(first.sourceSha256, before);
  assert.equal(second.sourceSha256, before);
});

check('same seed and plan reproduce the guitar', () => {
  assert.equal(JSON.stringify(first.events), JSON.stringify(second.events));
  assert.equal(JSON.stringify(first.plan), JSON.stringify(second.plan));
  assert.ok(fs.readFileSync(firstPath).equals(fs.readFileSync(secondPath)));
});

check('MusicXML reimports and locks hold', () => {
  loadScore(first.xml);
  assert.equal(first.verification.ok, true, first.verification.errors.join('; '));
  assert.equal(first.verification.reimports, true);
  assert.equal(first.outsideIdentical, true);
  const imported = parseScoreDocument(first.xml);
  const guitar = measureViews(partById(imported, 'P1'));
  assert.equal(guitar[39]!.beats === undefined ? guitar[39]!.length : guitar[39]!.length, 12);
  assert.equal(guitar[32]!.length, 16);
});

check('metre, tempo and rehearsal marks stay', () => {
  const lock = ingestBhlSource({ sourcePath: firstPath, span: SPAN, protectedGuitarBars: [] });
  assert.equal(lock.metres.find((metre) => metre.partId === 'P1' && metre.bar === 39)?.beats, 4);
  assert.equal(lock.metres.find((metre) => metre.partId === 'P1' && metre.bar === 40)?.beats, 3);
  assert.equal(lock.metres.find((metre) => metre.partId === 'P2' && metre.bar === 40)?.beatType, 4);
  for (const tempo of lock.tempos) {
    assert.equal(tempo.perMinute, '120');
    assert.equal(tempo.beatUnit, 'quarter');
    assert.equal(tempo.statedAtBar, 1);
  }
  assert.deepEqual(
    lock.rehearsal.map((mark) => `${mark.bar}:${mark.text}`).sort(),
    ['33:B', '40:C'],
  );
});

check('bass events match the source', () => {
  const source = ingestBhlSource({ sourcePath: SOURCE, span: SPAN });
  const out = ingestBhlSource({ sourcePath: firstPath, span: SPAN });
  assert.equal(JSON.stringify(out.bass), JSON.stringify(source.bass));
  assert.equal(JSON.stringify(out.soundingBass), JSON.stringify(source.soundingBass));
});

check('protected guitar bar stays byte-identical', () => {
  const protectedPath = path.join(tmp, 'protected.musicxml');
  const run = composeBhlGuitar({
    sourcePath: SOURCE,
    span: SPAN,
    seed: SEED,
    protectedGuitarBars: [33],
    outputPath: protectedPath,
    permittedOutputDir: tmp,
  });
  assert.equal(run.verification.ok, true, run.verification.errors.join('; '));
  const sourceXml = fs.readFileSync(SOURCE, 'utf8');
  const outXml = fs.readFileSync(protectedPath, 'utf8');
  const grab = (xml: string) => {
    const partStart = xml.indexOf('<part id="P1">');
    const partEnd = xml.indexOf('</part>', partStart);
    const part = xml.slice(partStart, partEnd);
    const at = part.indexOf('<measure number="33">');
    const close = part.indexOf('</measure>', at);
    return part.slice(at, close + '</measure>'.length);
  };
  assert.equal(grab(outXml), grab(sourceXml));
  assert.ok(run.events.every((event) => event.bar !== 33));
});

check('phrase predicates pass on the generated notes', () => {
  const bad = first.predicates.filter((item) => !item.ok);
  assert.deepEqual(
    bad.map((item) => `${item.id}: ${item.detail}`),
    [],
  );
});

check('mechanical onset repetition is detected, and this piece has none', () => {
  assert.equal(detectMechanicalOnsets(first.onsetPlans).length, 0);
  const repeated: BhlOnsetPlan[] = [34, 36, 37, 38].map((bar) => ({
    bar,
    onsets: [1, 3],
    durations: [0.5, 0.5],
    signature: '1.0,3.0',
    transform: 'state-onsets',
    ostinatoJustified: false,
  }));
  const hits = detectMechanicalOnsets(repeated);
  assert.ok(hits.some((hit) => hit.beatTwoAndFour));
  const allowed = repeated.map((plan) => ({ ...plan, transform: 'ostinato' as const, ostinatoJustified: true }));
  assert.equal(detectMechanicalOnsets(allowed).length, 0);
});

check('passage-specific predicates are gone and stylistic constraints remain', () => {
  const ids = first.predicates.map((item) => item.id);
  assert.equal(ids.includes('phase9-beat-2-and-4-cleared'), false);
  assert.equal(ids.includes('ge-stall-cleared'), false);
  assert.equal(ids.includes('guitar-leaves-space'), false);
  assert.equal(ids.some((id) => id.endsWith('motif-interval-returns')), false);
  assert.ok(first.predicates.find((item) => item.id === 'no-circle-of-fifths')?.ok);
  assert.ok(first.predicates.find((item) => item.id === 'no-root-fifth-texture')?.ok);
  const silenced = structuredClone(first.plan);
  for (const region of silenced.regions) {
    region.rhythmTransform = 'silence-window';
    region.density = 'single';
    region.ostinatoJustified = false;
  }
  const bass = ingestBhlSource({ sourcePath: SOURCE, span: SPAN });
  const bars = readBassBars(bass.bass, bass.metres, bass.bassPartId);
  const quieter = generateBhlGuitar(silenced, bars);
  assert.ok(quieter.events.length < first.events.length);
  const report = evaluateBhlPredicates(silenced, quieter.events, quieter.onsetPlans);
  assert.ok(report.some((item) => item.id === 'no-unexplained-mechanical-grid'));
});

check('guitar grips are feasible and field snaps are recorded', () => {
  assert.ok(first.feasibility.length === first.events.length);
  assert.ok(first.feasibility.every((note) => note.feasible));
  assert.ok(first.snaps.length > 0);
  for (const snap of first.snaps) {
    if (snap.reason === 'partner-dropped') continue;
    const region = first.plan.regions.find((item) => item.bars.includes(snap.bar));
    assert.ok(region);
    assert.ok(region!.pitchClasses.includes(snap.toPc), `${snap.fromPc}->${snap.toPc} left ${region!.id}`);
    assert.notEqual(snap.fromPc, snap.toPc);
  }
  assert.ok(first.liquid.every((trace) => trace.chordType !== 'Maj7#11'));
});

check('the neighbor cell is not a hardcoded Wrong Turning line', () => {
  const cell = neighborCell([4, 7, 9, 10]);
  assert.deepEqual(first.plan.motif.pitchClasses, cell);
  assert.ok(first.plan.regions.every((region) => region.bars.length >= 1));
  assert.equal(first.plan.motif.pitchClasses.length, deriveBhlPhrasePlan(
    ingestBhlSource({ sourcePath: SOURCE, span: SPAN }).bass,
    ingestBhlSource({ sourcePath: SOURCE, span: SPAN }).metres,
    'P2',
    SPAN,
    SEED,
  ).motif.pitchClasses.length);
});

check('original F(add4) symbol is checked against the new guitar', () => {
  const change = first.harmony.find((item) => item.bar === 40);
  assert.ok(change, 'bar 40 had no harmony decision');
  assert.equal(change!.label, 'F(add4)');
  const pcs = new Set(first.events.filter((event) => event.bar === 40).flatMap((event) => event.pitchClasses));
  assert.ok(pcs.has(5) && pcs.has(10), `bar 40 pitches ${[...pcs].join(',')}`);
  assert.equal(change!.action, 'kept');
});

check('onset plans come from the phrase regions', () => {
  const bass = ingestBhlSource({ sourcePath: SOURCE, span: SPAN });
  const bars = readBassBars(bass.bass, bass.metres, bass.bassPartId);
  const planned = planPhraseOnsets(bars, first.plan.regions);
  assert.equal(JSON.stringify(planned), JSON.stringify(first.onsetPlans));
  const phase9 = [34, 36, 37, 38].filter((bar) => {
    const onsets = planned.find((item) => item.bar === bar)?.onsets ?? [];
    return onsets.includes(1) && onsets.includes(3);
  });
  assert.deepEqual(phase9, []);
});

if (failed === 0) {
  const proof = path.join(tmp, 'Wrong-Turning-BHL-Iteration2-V1.musicxml');
  fs.copyFileSync(firstPath, proof);
  console.log(`WROTE ${proof} ${fs.statSync(proof).size}`);
  if (fs.existsSync(DOWNLOAD)) {
    console.log(`SKIP existing download left untouched: ${DOWNLOAD}`);
  } else {
    fs.copyFileSync(firstPath, DOWNLOAD);
    console.log(`WROTE ${DOWNLOAD} ${fs.statSync(DOWNLOAD).size}`);
  }
}

if (failed) {
  console.error(`\n${failed} BHL ITERATION 2 CHECKS FAILED`);
  process.exit(1);
}
console.log('\nALL BHL ITERATION 2 CHECKS PASS');
