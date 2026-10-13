/**
 * BHL Batch A — six harmonic worlds, phrase binder, source locks.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlBatchA.test.ts
 * Album path is read-only. Audition files go under ~/Downloads/BHL-Composer/Batch-A.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BhlExportRejected, BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { sha256File } from '../../core/bhl/bhlIngest';
import { worldPitchSignature } from '../../core/bhl/bhlPhraseShape';
import { BHL_WORLD_IDS, type BhlWorldId } from '../../core/bhl/bhlWorlds';
import { apiBhlCompose } from '../../app-api/bhlApp';
import { verifyBhlLocks } from '../../core/bhl/bhlVerify';
import { ingestBhlSource, lockSpecOf } from '../../core/bhl/bhlIngest';
import { loadScore } from '../../core/performance-composer/pcScore';

const SOURCE = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const SPAN = { from: 33, to: 40 };
const SEED = 3340;
const NAMES: Record<BhlWorldId, string> = {
  A: 'Wrong-Turning-BHL-World-A.musicxml',
  B: 'Wrong-Turning-BHL-World-B.musicxml',
  C: 'Wrong-Turning-BHL-World-C.musicxml',
  D: 'Wrong-Turning-BHL-World-D.musicxml',
  E: 'Wrong-Turning-BHL-World-E.musicxml',
  F: 'Wrong-Turning-BHL-World-F.musicxml',
};

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

function uniqueFile(dir: string, name: string): string {
  const target = path.join(dir, name);
  if (!fs.existsSync(target)) return target;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const stamped = name.replace(/\.musicxml$/i, `-${stamp}.musicxml`);
  return path.join(dir, stamped);
}

const before = sha256File(SOURCE);
const outDir = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Batch-A');
fs.mkdirSync(outDir, { recursive: true });

const runs = BHL_WORLD_IDS.map((world) => {
  const outputPath = uniqueFile(outDir, NAMES[world]);
  const run = composeBhlGuitar({
    sourcePath: SOURCE,
    span: SPAN,
    seed: SEED,
    world,
    outputPath,
    permittedOutputDir: outDir,
  });
  return { world, outputPath, run };
});

check('source file is unchanged after six worlds', () => {
  assert.equal(sha256File(SOURCE), before);
  for (const item of runs) assert.equal(item.run.sourceSha256, before);
});

check('each world keeps locks, metre, tempo, rehearsal, and reimport', () => {
  for (const item of runs) {
    assert.equal(item.run.verification.ok, true, `${item.world} ${item.run.verification.errors.join('; ')}`);
    assert.equal(item.run.verification.reimports, true);
    assert.equal(item.run.outsideIdentical, true);
    loadScore(item.run.xml);
    loadScore(fs.readFileSync(item.outputPath, 'utf8'));
    const lock = ingestBhlSource({ sourcePath: item.outputPath, span: SPAN, protectedGuitarBars: [] });
    assert.equal(lock.metres.find((metre) => metre.partId === 'P1' && metre.bar === 40)?.beats, 3);
    assert.equal(lock.metres.find((metre) => metre.partId === 'P1' && metre.bar === 33)?.beats, 4);
    for (const tempo of lock.tempos) {
      assert.equal(tempo.perMinute, '120');
      assert.equal(tempo.beatUnit, 'quarter');
    }
    assert.deepEqual(
      lock.rehearsal.map((mark) => `${mark.bar}:${mark.text}`).sort(),
      ['33:B', '40:C'],
    );
    const source = ingestBhlSource({ sourcePath: SOURCE, span: SPAN });
    assert.equal(JSON.stringify(lock.bass), JSON.stringify(source.bass));
    assert.equal(JSON.stringify(lock.soundingBass), JSON.stringify(source.soundingBass));
  }
});

check('protected guitar bar is unchanged', () => {
  const outputPath = uniqueFile(outDir, 'Wrong-Turning-BHL-World-A-protected.musicxml');
  const run = composeBhlGuitar({
    sourcePath: SOURCE,
    span: SPAN,
    seed: SEED,
    world: 'A',
    protectedGuitarBars: [33],
    outputPath,
    permittedOutputDir: outDir,
  });
  assert.equal(run.verification.ok, true, run.verification.errors.join('; '));
  assert.ok(run.events.every((event) => event.bar !== 33));
  const grab = (xml: string) => {
    const partStart = xml.indexOf('<part id="P1">');
    const partEnd = xml.indexOf('</part>', partStart);
    const part = xml.slice(partStart, partEnd);
    const at = part.indexOf('<measure number="33">');
    const close = part.indexOf('</measure>', at);
    return part.slice(at, close + '</measure>'.length);
  };
  assert.equal(grab(run.xml), grab(fs.readFileSync(SOURCE, 'utf8')));
  assert.equal(sha256File(SOURCE), before);
});

check('six worlds write different guitar pitch sequences', () => {
  const signatures = runs.map((item) => worldPitchSignature(item.run.events));
  const unique = new Set(signatures);
  assert.equal(unique.size, 6, signatures.join('\n'));
  for (const item of runs) {
    assert.ok(item.run.events.length > 0, item.world);
    assert.equal(item.run.world?.worldId, item.world);
    assert.notEqual(item.run.world?.pitchClasses.join(','), '');
    assert.equal(item.run.world?.fifthSteps, 0, item.world);
    assert.ok(item.run.liquid.every((trace) => !/maj7#11/i.test(trace.chordType)));
    assert.ok(item.run.feasibility.every((note) => note.feasible), item.world);
    assert.ok(item.run.binder, item.world);
    assert.ok(item.run.binder!.relationshipCount > 0, item.world);
    assert.ok(item.run.predicates.length > 0, item.world);
  }
});

check('phrase controls and seed change the notes', () => {
  const base = runs[0]!.run;
  const otherSeed = composeBhlGuitar({ sourcePath: SOURCE, span: SPAN, seed: SEED + 1, world: 'A' });
  assert.notEqual(worldPitchSignature(base.events), worldPitchSignature(otherSeed.events));
  const same = composeBhlGuitar({ sourcePath: SOURCE, span: SPAN, seed: SEED, world: 'A' });
  assert.equal(worldPitchSignature(base.events), worldPitchSignature(same.events));
  const sparse = composeBhlGuitar({ sourcePath: SOURCE, span: SPAN, seed: SEED, world: 'A', rhythm: 'sparse' });
  assert.notEqual(JSON.stringify(base.onsetPlans), JSON.stringify(sparse.onsetPlans));
  const invert = composeBhlGuitar({ sourcePath: SOURCE, span: SPAN, seed: SEED, world: 'A', phraseArc: 'invert' });
  assert.notEqual(worldPitchSignature(base.events), worldPitchSignature(invert.events));
  const single = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: SEED,
    world: 'C',
    regions: base.plan.regions.map((region) => ({ id: region.id, density: 'single', dialogue: 'leave-space' })),
  });
  const triad = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: SEED,
    world: 'C',
    regions: base.plan.regions.map((region) => ({ id: region.id, density: 'triad', dialogue: 'counter-motion' })),
  });
  assert.equal(single.ok, true);
  assert.equal(triad.ok, true);
  if (!single.ok || !triad.ok) return;
  assert.ok(single.events.every((event) => event.midis.length === 1));
  assert.ok(triad.events.some((event) => event.midis.length >= 2) || triad.xml.includes('<voice>2</voice>'));
  assert.notEqual(
    single.events.map((event) => event.midis.join('.')).join('|'),
    triad.events.map((event) => event.midis.join('.')).join('|'),
  );
  assert.ok(single.binder && single.binder.relationshipCount > 0);
  assert.equal(single.gce.musicallyApproved, false);
});

check('illegal source writes are refused', () => {
  assert.throws(
    () =>
      composeBhlGuitar({
        sourcePath: SOURCE,
        span: SPAN,
        seed: SEED,
        world: 'A',
        outputPath: path.join(path.dirname(SOURCE), 'illegal-bhl-write.musicxml'),
        permittedOutputDir: outDir,
      }),
    (error: unknown) => error instanceof BhlExportRejected,
  );
  const tampered = runs[0]!.run.xml
    .replace(/<per-minute>120<\/per-minute>/, '<per-minute>90</per-minute>')
    .replace(/<sound tempo="120"\/>/, '<sound tempo="90"/>');
  const lock = ingestBhlSource({ sourcePath: SOURCE, span: SPAN });
  const report = verifyBhlLocks(fs.readFileSync(SOURCE, 'utf8'), tampered, lockSpecOf(lock));
  assert.equal(report.ok, false);
  assert.equal(sha256File(SOURCE), before);
});

if (failed === 0) {
  for (const item of runs) {
    console.log(`WROTE ${item.outputPath} ${fs.statSync(item.outputPath).size} world ${item.world} pcs ${item.run.world?.pitchClasses.join(',')}`);
    const bad = item.run.predicates.filter((predicate) => !predicate.ok);
    console.log(`  predicates ${item.run.predicates.length - bad.length}/${item.run.predicates.length}`);
    if (bad.length) console.log(`  revise ${bad.map((predicate) => predicate.id).join(', ')}`);
    console.log(
      `  binder rel ${item.run.binder?.relationshipCount} dyad ${item.run.binder?.dyadOrTriadAttacks} voices ${item.run.binder?.independentVoiceAttacks} sustain ${item.run.binder?.sustainedAttacks} reattack ${item.run.binder?.reattackCount} common ${item.run.world?.commonToneRetentions} contrast ${item.run.world?.contrastingMoves}`,
    );
  }
}

if (failed) {
  console.error(`\n${failed} BHL BATCH A CHECKS FAILED`);
  process.exit(1);
}
console.log('\nALL BHL BATCH A CHECKS PASS');
