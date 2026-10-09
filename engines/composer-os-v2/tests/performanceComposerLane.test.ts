/**
 * Performance Composer 1A — general MusicXML import, bar span, locks, export.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/performanceComposerLane.test.ts
 * WWH sources: WWH_ALBUM_ROOT (default Mike's Mac album folder). Non-WWH source: repo fixture.
 * The lane events here are test fixtures for plumbing only — not musical output.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseChordLabel } from '../core/performance-composer/pcChord';
import { chooseLane, measureViews, parseScoreDocument, partById, resolveSpan } from '../core/performance-composer/pcScore';
import { notateTicks, verifyLockedCopy, writeLane, type PcLaneEvent } from '../core/performance-composer/pcLane';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';

const ALBUM = process.env.WWH_ALBUM_ROOT ?? '/Users/user/Documents/DEVS/ECM-Album-Nov-2027';
const LEAD = (name: string) => path.join(ALBUM, '00 - WWH DUO LEADSHEETS', name);
const FIXTURE = (name: string) => path.join(__dirname, '../resources/test-fixtures', name);

const REQUIRED = [
  { piece: 'Black Aura', file: LEAD('01-Black-Aura-Duo-Leadsheet-V1.1.musicxml'), from: 9, to: 24 },
  { piece: 'Orbit', file: LEAD('05-Orbit-Duo-Leadsheet-V2.1.musicxml'), from: 1, to: 0 },
  { piece: 'Metaphysics (guitar + string quartet, non-WWH)', file: FIXTURE('metaphysics-leadsheet/V1.12-Metaphysics.musicxml'), from: 1, to: 0 },
];
const EXTRA = [
  '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml',
  '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml',
  '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
].map((f) => ({ piece: f.replace(/-Duo-Leadsheet.*$/, ''), file: LEAD(f), from: 1, to: 0 }));
EXTRA.push({ piece: '07-Impossible-Metaphysics (bars 1–16)', file: LEAD('07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml'), from: 1, to: 16 });
const SINGLE = { piece: 'Mosaic 40-bar melody (one part)', file: FIXTURE('mosaic-40bar-musical-test.musicxml'), from: 1, to: 0 };

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.message : String(error)}`);
  }
}
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Fixture lane: a held dyad in the first part of each bar, then a rest, then a short note. Exercises rests, dots, ties. */
function fixtureEvents(xml: string, from: number, to: number): PcLaneEvent[] {
  const doc = parseScoreDocument(xml);
  const lane = chooseLane(doc, undefined, { from, to });
  const views = measureViews(partById(doc, lane.partId));
  const out: PcLaneEvent[] = [];
  for (let bar = from; bar <= to; bar++) {
    const v = views[bar - 1]!;
    const quarters = v.length / v.divisions;
    if (quarters >= 3) {
      out.push({ bar, onsetQuarters: 0, quarters: 1.5, midis: [55, 62] });
      out.push({ bar, onsetQuarters: quarters - 1, quarters: 1, midis: [57] });
    } else if (quarters > 0) {
      out.push({ bar, onsetQuarters: 0, quarters, midis: [55] });
    }
  }
  return out;
}

function runCase(c: { piece: string; file: string; from: number; to: number }): void {
  if (!fs.existsSync(c.file)) {
    check(`${c.piece}: source present`, () => assert.fail(`missing ${c.file}`));
    return;
  }
  const before = sha(fs.readFileSync(c.file, 'utf8'));
  const xml = fs.readFileSync(c.file, 'utf8');
  const doc = parseScoreDocument(xml);
  const total = doc.getElementsByTagName('part')[0]!.getElementsByTagName('measure').length;
  const span = { from: c.from, to: c.to || total };
  const events = fixtureEvents(xml, span.from, span.to);
  check(`${c.piece}: write lane bars ${span.from}–${span.to} of ${total}; all locks hold`, () => {
    const result = writeLane(xml, { span, events });
    const report = verifyLockedCopy(xml, result.xml, span, result.lane);
    assert.deepEqual(report.errors, []);
    assert.ok(Object.values(report.checks).every(Boolean), JSON.stringify(report.checks));
    assert.ok(result.barsWritten > 0 && result.notesWritten > 0, 'nothing written');
    assert.equal(result.barsWritten, new Set(events.map((e) => e.bar)).size);
    console.log(`     lane ${result.lane.partId} voice ${result.lane.voice}; ${result.barsWritten} bars, ${result.notesWritten} notes; printed ${result.bars[0]!.printed}–${result.bars[result.bars.length - 1]!.printed}; ${report.barsCompared} bars compared`);
  });
  check(`${c.piece}: source file unchanged`, () => assert.equal(sha(fs.readFileSync(c.file, 'utf8')), before));
  check(`${c.piece}: deterministic`, () => {
    assert.equal(writeLane(xml, { span, events }).xml, writeLane(xml, { span, events }).xml);
  });
}

check('chord parser reads WWH labels (moved from RESPOND, checked against tonal.js)', () => {
  const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const pcs = (label: string) => parseChordLabel(label)!.chordPcs.map((p) => NAMES[p]).join(' ');
  assert.equal(pcs('Fm(add9)'), 'C F G Ab');
  assert.equal(pcs('Em(maj7)'), 'Eb E G B');
  assert.equal(pcs('Bm(add4)/D'), 'D E F# B');
  assert.equal(pcs('Eb(add9,11,13)'), 'C Eb F G Ab Bb');
  assert.equal(pcs('C°7'), 'C Eb F# A');
  assert.equal(parseChordLabel('Amajor/#C')!.bassPc, 1);
  assert.equal(parseChordLabel('N.C.'), null);
});

check('note values: dotted and tied splits; impossible values rejected', () => {
  assert.deepEqual(notateTicks(768, 256).map((x) => `${x.type}${'.'.repeat(x.dots)}`), ['half.']);
  assert.deepEqual(notateTicks(1280, 256).map((x) => `${x.type}${'.'.repeat(x.dots)}`), ['whole', 'quarter']);
  assert.throws(() => notateTicks(1, 3));
});

for (const c of REQUIRED) runCase(c);
for (const c of EXTRA) runCase(c);
runCase(SINGLE);

const BA = REQUIRED[0]!.file;
if (fs.existsSync(BA)) {
  const xml = fs.readFileSync(BA, 'utf8');
  const span = { from: 9, to: 24 };
  const events = fixtureEvents(xml, 9, 24);
  const result = writeLane(xml, { span, events });

  check('Black Aura: duo importer still reads the copy; guitar melody and bass notes identical', () => {
    const a = importWwhDuoMusicXml(xml);
    const b = importWwhDuoMusicXml(result.xml);
    const key = (ms: typeof a.bass.measures, skipVoice?: string) =>
      ms.map((m) => m.notes.filter((n) => n.voice !== skipVoice).map((n) => `${n.step}${n.alter ?? 0}${n.octave}:${n.duration}:${n.voice}`).join(' ')).join('|');
    assert.equal(key(b.bass.measures), key(a.bass.measures));
    assert.equal(key(b.guitar.measures, result.lane.voice), key(a.guitar.measures));
  });
  check('verify catches a changed locked melody note', () => {
    const tampered = result.xml.replace(/<step>([A-G])<\/step>/, (_m, s) => `<step>${s === 'C' ? 'D' : 'C'}</step>`);
    assert.equal(verifyLockedCopy(xml, tampered, span, result.lane).ok, false);
  });
  check('verify catches a changed locked melody note inside the span (bar 9)', () => {
    const doc = parseScoreDocument(result.xml);
    const bar9 = partById(doc, result.lane.partId).getElementsByTagName('measure')[8]!;
    const step = [...bar9.getElementsByTagName('note')].find((n) => n.getElementsByTagName('voice')[0]?.textContent === '1' && n.getElementsByTagName('step')[0])!.getElementsByTagName('step')[0]!;
    step.textContent = step.textContent === 'C' ? 'D' : 'C';
    const { serializeNode } = require('../core/performance-composer/pcScore');
    assert.equal(verifyLockedCopy(xml, serializeNode(doc), span, result.lane).checks.lockedInsideLane, false);
  });
  check('verify catches lane material outside the span', () => {
    const wide = writeLane(xml, { span: { from: 9, to: 25 }, events: [...events, { bar: 25, onsetQuarters: 0, quarters: 1, midis: [55] }] });
    assert.equal(verifyLockedCopy(xml, wide.xml, span, wide.lane).ok, false);
  });
  check('verify catches a short lane bar', () => {
    const short = result.xml.replace(/(<voice>2<\/voice>[\s\S]*?)<\/note>/, '$1</note>').replace(/<duration>(\d+)<\/duration>(\s*<voice>2<\/voice>)/, (_m, d, v) => `<duration>${Number(d) / 2}</duration>${v}`);
    assert.equal(verifyLockedCopy(xml, short, span, result.lane).ok, false);
  });
  check('rejects bad requests: span out of range, overlap, off-grid, past bar end, event outside span', () => {
    const doc = parseScoreDocument(xml);
    assert.throws(() => resolveSpan(doc, { from: 0, to: 4 }));
    assert.throws(() => resolveSpan(doc, { from: 1, to: 9999 }));
    assert.throws(() => writeLane(xml, { span, events: [{ bar: 9, onsetQuarters: 0, quarters: 2, midis: [55] }, { bar: 9, onsetQuarters: 1, quarters: 1, midis: [57] }] }));
    assert.throws(() => writeLane(xml, { span, events: [{ bar: 9, onsetQuarters: 1 / 1000, quarters: 1, midis: [55] }] }));
    assert.throws(() => writeLane(xml, { span, events: [{ bar: 9, onsetQuarters: 3.5, quarters: 1, midis: [55] }] }));
    assert.throws(() => writeLane(xml, { span, events: [{ bar: 30, onsetQuarters: 0, quarters: 1, midis: [55] }] }));
  });
  check('command line writes a verified copy and refuses to overwrite the source', () => {
    const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pc-lane-'));
    const ev = path.join(tmp, 'events.json');
    fs.writeFileSync(ev, JSON.stringify(events));
    const out = path.join(tmp, 'copy.musicxml');
    const script = path.join(__dirname, '../scripts/performanceComposerLane.ts');
    const tsx = path.join(__dirname, '../../../node_modules/.bin/tsx');
    const cfg = path.join(__dirname, '../../../tsconfig.json');
    const stdout = execFileSync(tsx, ['--tsconfig', cfg, script, '--in', BA, '--from', '9', '--to', '24', '--events', ev, '--out', out], { encoding: 'utf8' });
    assert.ok(JSON.parse(stdout).ok);
    assert.ok(fs.existsSync(out));
    assert.throws(() => execFileSync(tsx, ['--tsconfig', cfg, script, '--in', BA, '--from', '9', '--to', '24', '--events', ev, '--out', BA], { stdio: 'pipe' }));
  });
}

const IM = LEAD('07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml');
if (fs.existsSync(IM)) {
  check('Impossible Metaphysics whole piece: refuses a lane when bar 48 already uses voices 1–5', () => {
    const xml = fs.readFileSync(IM, 'utf8');
    assert.throws(() => writeLane(xml, { span: { from: 1, to: 72 }, events: [{ bar: 1, onsetQuarters: 0, quarters: 1, midis: [55] }] }), /no free voice/);
  });
}
const HOBOS = LEAD('04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml');
if (fs.existsSync(HOBOS)) {
  check('Meet Me at Hobos (divisions 1): exact regrid of the guitar part only; bass text untouched', () => {
    const xml = fs.readFileSync(HOBOS, 'utf8');
    const r = writeLane(xml, { span: { from: 1, to: 4 }, events: [{ bar: 1, onsetQuarters: 0, quarters: 1.5, midis: [55, 62] }] });
    assert.ok((r.lane.regrid ?? 1) > 1, 'expected a regrid');
    assert.ok(verifyLockedCopy(xml, r.xml, { from: 1, to: 4 }, r.lane).ok);
    const rep = verifyLockedCopy(xml, r.xml, { from: 1, to: 4 }, r.lane);
    assert.ok(rep.checks.lockedOutsideLane, 'bass changed');
  });
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nALL PERFORMANCE COMPOSER 1A CHECKS PASS');
