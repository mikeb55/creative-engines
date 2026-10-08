/**
 * Black Aura V8C guitar–bass conversation.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8c.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WwhImportedNote } from '../core/wwh/wwhDuoImport';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from '../core/wwh/wwhBlackAuraV8a';
import { gripById, parentsForMidi } from '../core/wwh/wwhBlackAuraV8bRecipe';
import {
  buildV8cBundle,
  readInsertionBass,
  reimportV8c,
  sha256File,
  verifyImportedInteractions,
  V8C_OUT_DIR,
  writeV8cPilot,
  type V8cVersion,
} from '../core/wwh/wwhBlackAuraV8c';

const MOCKUPS = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS';
const FILES = {
  lyrical: 'V8C-DUO-LYRICAL.musicxml',
  liquid: 'V8C-DUO-LIQUID-HARMONY.musicxml',
  adventurous: 'V8C-DUO-ADVENTUROUS.musicxml',
} as const;

function tone(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(tone).join(',');
}

function fileHashTree(root: string): string {
  const rows: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else rows.push(`${path.relative(root, full)}\t${createHash('sha256').update(fs.readFileSync(full)).digest('hex')}`);
    }
  };
  walk(root);
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

function soundingPcs(version: V8cVersion): number[] {
  return version.slots.flatMap((slots) => slots.flatMap((slot) => slot.writtenMidis.map((midi) => ((midi - 12) % 12 + 12) % 12)));
}

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  const sourceBefore = sha256File(V8A_DUO_FILE);
  const protectedDirs = ['V8-PILOT/A', 'V8-PILOT/B', 'V8-PILOT/B1'].filter((name) => fs.existsSync(path.join(MOCKUPS, name)));
  const protectedBefore = protectedDirs.map((name) => [name, fileHashTree(path.join(MOCKUPS, name))] as const);
  const bundle = buildV8cBundle();
  const again = buildV8cBundle();
  const written = writeV8cPilot();
  const { index } = loadBlackAuraIndex();
  const bass = readInsertionBass(index);

  check('seed regenerates the same three scores', () => {
    assert.equal(bundle.scores.lyrical, again.scores.lyrical);
    assert.equal(bundle.scores.liquid, again.scores.liquid);
    assert.equal(bundle.scores.adventurous, again.scores.adventurous);
    assert.equal(bundle.seed, 80083);
  });

  check('source and earlier pilots stay byte-identical', () => {
    assert.equal(sha256File(V8A_DUO_FILE), sourceBefore);
    assert.equal(bundle.sourceSha256, sourceBefore);
    for (const [name, hash] of protectedBefore) {
      assert.equal(fileHashTree(path.join(MOCKUPS, name)), hash, name);
    }
    assert.deepEqual(written.map((file) => path.basename(file)).sort(), [
      'V8C-DUO-ADVENTUROUS.musicxml',
      'V8C-DUO-LIQUID-HARMONY.musicxml',
      'V8C-DUO-LYRICAL.musicxml',
      'V8C-INTERACTION-REPORT.md',
      'V8C-RECIPE.json',
    ]);
  });

  check('parsed bass is the bar 16 D–A–D timeline', () => {
    assert.deepEqual(
      bass.filter((event) => !event.rest).map((event) => [event.id, event.startTick, event.durationTicks, event.soundingMidi]),
      [
        ['D-downbeat', 0, 256, 38],
        ['A-offbeat', 384, 128, 45],
        ['D-pickup', 704, 64, 38],
      ]
    );
    assert.equal(bass.filter((event) => event.rest).length, 3);
  });

  for (const version of bundle.versions) {
    check(`${version.id} reimports, keeps bass, and matches claimed interactions`, () => {
      const xml = fs.readFileSync(path.join(V8C_OUT_DIR, FILES[version.id]), 'utf8');
      assert.equal(xml.includes('<technical>'), false);
      assert.equal(xml.includes('tablature'), false);
      assert.match(xml, /<per-minute>92<\/per-minute>/);
      assert.equal(xml.includes('<pitch>'), true);
      const duo = reimportV8c(xml);
      assert.equal(duo.guitar.measures.length, index.measures.length + V8A_WINDOW.bars);
      const head = V8A_WINDOW.returnOrder;
      const tailStart = head + V8A_WINDOW.bars;
      for (let order = 0; order < head; order += 1) {
        assert.equal(lane(duo.guitar.measures[order]!.notes), lane(index.measures[order]!.guitar.notes));
        assert.equal(lane(duo.bass.measures[order]!.notes), lane(index.measures[order]!.bass.notes));
        assert.deepEqual(duo.guitar.measures[order]!.harmony, index.measures[order]!.guitar.harmony);
      }
      for (let order = V8A_WINDOW.returnOrder; order < index.measures.length; order += 1) {
        const out = tailStart + (order - V8A_WINDOW.returnOrder);
        assert.equal(lane(duo.guitar.measures[out]!.notes), lane(index.measures[order]!.guitar.notes));
        assert.equal(lane(duo.bass.measures[out]!.notes), lane(index.measures[order]!.bass.notes));
        assert.deepEqual(duo.guitar.measures[out]!.harmony, index.measures[order]!.guitar.harmony);
      }
      const guitarWindow = duo.guitar.measures.slice(head, tailStart);
      const bassWindow = duo.bass.measures.slice(head, tailStart);
      const template = lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes);
      for (const measure of bassWindow) assert.equal(lane(measure.notes), template);
      for (const measure of guitarWindow) {
        assert.equal(measure.beats, 4);
        assert.equal(measure.beatType, 4);
        assert.equal(measure.transposeOctave, -1);
        assert.deepEqual(measure.harmony, []);
        const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
        assert.equal(ticks, 1024);
        const attacks = measure.notes.filter((note) => !note.rest && !note.chord).length;
        assert.ok(attacks >= 1 && attacks <= 4);
        assert.ok(measure.notes.some((note) => note.rest));
      }
      assert.equal(version.interactions.length >= 2, true);
      assert.ok(version.interactions.some((interaction) => interaction.relation === 'rests-while-speaks'));
      assert.ok(version.interactions.some((interaction) => interaction.relation !== 'rests-while-speaks'));
      verifyImportedInteractions(guitarWindow, bass, version.interactions);
      const cut = index.measures[V8A_WINDOW.cutAfterOrder]!.guitar.harmony.join(' ');
      const back = index.measures[V8A_WINDOW.returnOrder]!.guitar.harmony.join(' ');
      assert.match(cut, /sus/i);
      assert.match(back, /m/);
      assert.equal(duo.guitar.measures[V8A_WINDOW.cutAfterOrder]!.harmony.join(' '), cut);
      assert.equal(duo.guitar.measures[tailStart]!.harmony.join(' '), back);
    });
  }

  check('the three guitar parts are different kinds of answer', () => {
    const [lyric, liquidVersion, adventure] = bundle.versions;
    assert.notDeepEqual(lyric!.sounding, liquidVersion!.sounding);
    assert.notDeepEqual(lyric!.sounding, adventure!.sounding);
    assert.notDeepEqual(liquidVersion!.sounding, adventure!.sounding);
    const cell = new Set([2, 3, 5, 8]);
    for (const pc of cell) assert.ok(soundingPcs(lyric!).includes(pc), `lyrical missing ${pc}`);
    const roles = new Set(
      liquidVersion!.slots.flatMap((slots) => slots.flatMap((slot) => (slot.gripId ? [gripById(slot.gripId).role] : [])))
    );
    assert.ok(roles.has('D_minor_fragment'));
    assert.ok(roles.has('Ab_major_fragment'));
    assert.ok(roles.has('mixed_fragment'));
    for (const pc of soundingPcs(liquidVersion!)) {
      assert.ok(parentsForMidi(pc + 60).length > 0);
    }
    const target = new Set([0, 2, 5, 7, 9]);
    for (const midi of [77, 79, 74, 72]) assert.ok(adventure!.slots.some((slots) => slots.some((slot) => slot.writtenMidis.includes(midi))));
    const outside = soundingPcs(adventure!).filter((pc) => !target.has(pc));
    assert.ok(outside.length >= 2);
    assert.ok(adventure!.slots.some((slots) => slots.some((slot) => slot.writtenMidis.length === 2)));
  });

  check('report names the bass events the guitar actually uses', () => {
    const report = fs.readFileSync(path.join(V8C_OUT_DIR, 'V8C-INTERACTION-REPORT.md'), 'utf8');
    assert.match(report, /NOT VERIFIED/);
    assert.match(report, /D-downbeat/);
    assert.match(report, /A-offbeat/);
    assert.match(report, /D-pickup/);
    const recipe = JSON.parse(fs.readFileSync(path.join(V8C_OUT_DIR, 'V8C-RECIPE.json'), 'utf8')) as {
      versions: Array<{ interactions: Array<{ bassId: string; startTick: number }> }>;
    };
    for (const version of recipe.versions) {
      assert.ok(version.interactions.length >= 2);
      for (const interaction of version.interactions) {
        assert.ok(bass.some((event) => event.id === interaction.bassId && !event.rest));
      }
    }
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
if (failed.length) {
  console.error(`${failed.length} failed`);
  process.exit(1);
}
console.log(`${rows.length} passed`);
