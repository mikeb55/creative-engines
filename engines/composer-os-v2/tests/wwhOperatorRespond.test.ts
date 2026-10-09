/**
 * Operator 1.1 RESPOND.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhOperatorRespond.test.ts
 * Album root defaults to Mike's Mac; override with WWH_ALBUM_ROOT.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRespondAudition,
  fingerFor,
  parseWwhChord,
  type RespondResult,
} from '../core/wwh/wwhOperatorRespond';

const ALBUM = process.env.WWH_ALBUM_ROOT ?? '/Users/user/Documents/DEVS/ECM-Album-Nov-2027';
const LEAD = (name: string) => path.join(ALBUM, '00 - WWH DUO LEADSHEETS', name);
const MAP = (name: string) => path.join(ALBUM, 'WWH-COMPING-VOICING-MAPS', name);
const OPERATOR = path.join(__dirname, '../core/wwh/wwhOperatorRespond.ts');

const CASES = [
  { piece: 'Black Aura', source: LEAD('01-Black-Aura-Duo-Leadsheet-V1.1.musicxml'), map: MAP('01-Black-Aura-Comping-Voicing-Map-V1.0.musicxml'), start: 9, end: 24 },
  { piece: 'The Mirror', source: LEAD('03-The-Mirror-Duo-Leadsheet-V1.0.musicxml'), map: MAP('03-The-Mirror-Comping-Voicing-Map-V1.0.musicxml'), start: 1, end: 16 },
  { piece: 'Orbit', source: LEAD('05-Orbit-Duo-Leadsheet-V2.1.musicxml'), map: MAP('05-Orbit-Comping-Voicing-Map-V1.0.musicxml'), start: 1, end: 39 },
  { piece: 'Impossible Metaphysics', source: LEAD('07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml'), map: MAP('07-Impossible-Metaphysics-Comping-Voicing-Map-V1.0.musicxml'), start: 1, end: 16 },
];

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.stack || error.message : error);
  }
}

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const pcs = (label: string) => parseWwhChord(label)!.chordPcs.map((p) => NAMES[p]).join(' ');

check('chord parser reads WWH labels (checked against tonal.js)', () => {
  assert.equal(pcs('Fm(add9)'), 'C F G Ab');
  assert.equal(pcs('Em(maj7)'), 'Eb E G B');
  assert.equal(pcs('Bm(add4)/D'), 'D E F# B');
  assert.equal(pcs('Eb(add9,11,13)'), 'C Eb F G Ab Bb');
  assert.equal(pcs('Ebmaj7#5'), 'D Eb G B');
  assert.equal(pcs('Fmaj7#11'), 'C E F A B');
  assert.equal(pcs('C°7'), 'C Eb F# A');
  assert.equal(pcs('Gminor'), 'D G Bb');
  assert.equal(parseWwhChord('Amajor/#C')!.bassPc, 1);
  assert.equal(parseWwhChord('N.C.'), null);
});

check('fingering respects max fret 7 and stopped span 3', () => {
  const f = fingerFor([60, 65, 67])!;
  assert.ok(f.frets.every((x) => x <= 7));
  assert.equal(fingerFor([40, 41, 42, 43]), null);
});

for (const c of CASES) {
  if (!fs.existsSync(c.source) || !fs.existsSync(c.map)) {
    check(`${c.piece}: source and comping map present`, () => assert.fail(`missing ${c.source} or ${c.map}`));
    continue;
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'wwh-respond-'));
  const runs: RespondResult[] = [1, 2, 3].map((seed) =>
    buildRespondAudition({ source: c.source, startBar: c.start, endBar: c.end, seed, compingMap: c.map, outDir: out })
  );
  check(`${c.piece}: source unchanged, melody/bass/harmony locked, bar maths, frets`, () => {
    for (const r of runs) {
      assert.equal(r.sourceShaAfter, r.sourceShaBefore);
      assert.deepEqual(r.checks, { melodyLocked: true, bassLocked: true, barMath: true, grid: true, frets: true });
      assert.ok(fs.existsSync(r.output));
    }
  });
  check(`${c.piece}: one audition file per run holds ORIGINAL + A/B/C`, () => {
    const xml = fs.readFileSync(runs[0]!.output, 'utf8');
    for (const label of ['ORIGINAL', 'A · YOUR GRIPS', 'B · QUARTAL + DYADS', 'C · QUINTAL + DYADS']) assert.ok(xml.includes(label), label);
    assert.ok(!/<harmony[\s\S]*?<attributes>/.test(xml.split('</measure>')[0]!), 'attributes before harmony in bar 1');
  });
  check(`${c.piece}: space kept, enough to audition, seeds really differ`, () => {
    for (let k = 0; k < 3; k += 1) {
      const sections = runs.map((r) => r.sections[k]!);
      for (const s of sections) {
        assert.ok(s.answered <= Math.ceil(s.windows * 0.5), `${s.label}: ${s.answered}/${s.windows} gaps filled`);
        assert.ok(s.events.length >= Math.floor(s.windows * 0.35), `${s.label}: only ${s.events.length} answers`);
        assert.ok(new Set(s.events.map((e) => e.bar)).size >= 4, `${s.label}: fewer than 4 bars`);
      }
      const keys = sections.map((s) => s.events.map((e) => `${e.bar}:${e.onsetQuarters}:${e.midis.join('.')}`));
      for (const [a, b] of [[0, 1], [0, 2], [1, 2]] as const) {
        const union = new Set([...keys[a]!, ...keys[b]!]);
        const shared = keys[a]!.filter((x) => keys[b]!.includes(x)).length;
        assert.ok(1 - shared / union.size >= 0.5, `${sections[0]!.label} seeds ${a + 1}/${b + 1} differ < 50%`);
        const sets = (i: number) => keys[i]!.map((x) => x.split(':')[2]).sort().join('|');
        assert.notEqual(sets(a), sets(b), 'voicing multiset identical (permutation only)');
      }
    }
  });
  check(`${c.piece}: families as labelled; stacks are true fourths/fifths`, () => {
    for (const r of runs) {
      for (const s of r.sections) {
        for (const e of s.events) {
          if (s.label.startsWith('B')) assert.ok(e.family === 'quartal' || e.family === 'dyads');
          if (s.label.startsWith('C')) assert.ok(e.family === 'quintal' || e.family === 'dyads');
          if (e.family === 'quartal') assert.deepEqual([e.midis[1]! - e.midis[0]!, e.midis[2]! - e.midis[1]!], [5, 5]);
          if (e.family === 'quintal') assert.deepEqual([e.midis[1]! - e.midis[0]!, e.midis[2]! - e.midis[1]!], [7, 7]);
        }
      }
    }
  });
  check(`${c.piece}: deterministic per seed`, () => {
    const again = buildRespondAudition({ source: c.source, startBar: c.start, endBar: c.end, seed: 1, compingMap: c.map, outDir: out });
    assert.equal(fs.readFileSync(again.output, 'utf8'), fs.readFileSync(runs[0]!.output, 'utf8'));
  });
}

check('operator never opens MuseScore unless asked, and holds no note-name tables', () => {
  const text = fs.readFileSync(OPERATOR, 'utf8');
  assert.ok(/if \(request\.open\) execFileSync/.test(text));
  assert.ok(!/\[\s*'[A-G][#b]?\d'\s*,/.test(text), 'literal pitch arrays');
});

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nALL RESPOND CHECKS PASS');
