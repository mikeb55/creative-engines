/**
 * Performance Composer 1B — RESPOND (technical checks only; musical acceptance is Mike's audition).
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/performanceComposerRespond.test.ts
 * WWH sources: WWH_ALBUM_ROOT (default Mike's Mac album folder). Non-WWH source: repo fixture.
 * Files are written to a temp folder and deleted; none are app output.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assessGuitarFeasibility } from '../core/barry-harris/guitarVoicingFeasibility';
import { verifyLockedCopy } from '../core/performance-composer/pcLane';
import { readProvenance, stripProvenance } from '../core/performance-composer/pcProvenance';
import { composeRespond, RESPOND_CHARACTERS, type RespondPlan } from '../core/performance-composer/pcRespond';
import { runRespondSession } from '../core/performance-composer/pcRespondSession';
import { measureViews, parseScoreDocument, partElements } from '../core/performance-composer/pcScore';

const ALBUM = process.env.WWH_ALBUM_ROOT ?? '/Users/user/Documents/DEVS/ECM-Album-Nov-2027';
const LEAD = (name: string) => path.join(ALBUM, '00 - WWH DUO LEADSHEETS', name);
const FIXTURE = (name: string) => path.join(__dirname, '../resources/test-fixtures', name);

const REQUIRED = [
  { piece: 'Black Aura', file: LEAD('01-Black-Aura-Duo-Leadsheet-V1.1.musicxml') },
  { piece: 'Orbit', file: LEAD('05-Orbit-Duo-Leadsheet-V2.1.musicxml') },
  { piece: 'Metaphysics (guitar + string quartet, non-WWH)', file: FIXTURE('metaphysics-leadsheet/V1.12-Metaphysics.musicxml') },
];
const EXTRA = [
  '02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml',
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
].map((f) => ({ piece: f.replace(/-Duo-Leadsheet.*$/, ''), file: LEAD(f) }));
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
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-respond-'));
const key = (p: RespondPlan) => new Set(p.events.map((e) => `${e.bar}:${e.onsetQuarters}:${e.midis.join('+')}`));

for (const item of [...REQUIRED, ...EXTRA]) {
  if (!fs.existsSync(item.file)) {
    check(`${item.piece}: source present`, () => assert.fail(`missing ${item.file}`));
    continue;
  }
  const required = REQUIRED.includes(item);
  const sourceBytes = fs.readFileSync(item.file);
  const sourceXml = sourceBytes.toString('utf8');
  const bars = measureViews(partElements(parseScoreDocument(sourceXml))[0]!).length;
  const now = new Date('2026-10-09T12:00:00Z');
  const run = runRespondSession({ sourcePath: item.file, outRoot: tmpRoot, build: BUILD, seed: 4242, now: new Date(now.getTime() + Math.random() * 1e9) });

  check(`${item.piece}: three files, every check PASS`, () => {
    assert.equal(run.alternatives.length, 3);
    for (const a of run.alternatives) {
      assert.ok(fs.existsSync(a.musicXmlPath), a.musicXmlPath);
      assert.deepEqual(a.checks, { locks: 'PASS', barFill: 'PASS', playable: 'PASS', stampReadBack: 'PASS' }, a.label);
    }
  });

  check(`${item.piece}: files on disk re-verify (locks, span, bar fill) after the stamp is removed`, () => {
    for (const a of run.alternatives) {
      const xml = fs.readFileSync(a.musicXmlPath, 'utf8');
      const r = verifyLockedCopy(sourceXml, stripProvenance(xml), { from: 1, to: bars }, a.lane);
      assert.ok(r.ok, `${a.label}: ${r.errors.slice(0, 3).join('; ')}`);
    }
  });

  check(`${item.piece}: source file untouched`, () => assert.equal(sha(fs.readFileSync(item.file)), sha(sourceBytes)));

  check(`${item.piece}: provenance stamp in each file matches the run`, () => {
    for (const a of run.alternatives) {
      const xml = fs.readFileSync(a.musicXmlPath, 'utf8');
      const p = readProvenance(xml);
      assert.ok(p, 'no stamp');
      assert.equal(p.app, 'Composer OS');
      assert.equal(p.operation, 'RESPOND');
      assert.equal(p.runId, run.runId);
      assert.equal(p.buildCommit, BUILD.buildCommit);
      assert.equal(p.sourceSha256, sha(sourceBytes));
      assert.equal(p.alternative, a.label);
      assert.ok(xml.split('<part-list')[0]!.includes('Composer OS · Performance Composer RESPOND'), 'visible credit line');
    }
  });

  if (!required) continue;
  const plans = RESPOND_CHARACTERS.map((c) => composeRespond({ sourceXml, character: c.id, seed: run.seed }));
  const [echo, counter, space] = plans as [RespondPlan, RespondPlan, RespondPlan];

  check(`${item.piece}: deliberate silence (most gaps unanswered; Space sparsest)`, () => {
    for (const p of plans) {
      assert.ok(p.answers.length >= 2, `${p.label}: ${p.answers.length} answers`);
      assert.ok(p.answers.length <= Math.ceil(p.windows.length * 0.6), `${p.label}: ${p.answers.length}/${p.windows.length}`);
    }
    assert.ok(space.answers.length < echo.answers.length && space.answers.length < counter.answers.length, 'Space answers least');
  });

  check(`${item.piece}: three clearly different alternatives (shared notes < 40%)`, () => {
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        const a = key(plans[i]!);
        const b = key(plans[j]!);
        const shared = [...a].filter((x) => b.has(x)).length;
        assert.ok(shared / Math.min(a.size, b.size) < 0.4, `${plans[i]!.label} vs ${plans[j]!.label}: ${shared} shared`);
      }
    const mean = (p: RespondPlan) => p.events.reduce((s, e) => s + e.quarters, 0) / p.events.length;
    assert.ok(mean(space) > mean(echo) && mean(space) > mean(counter), 'Space uses longer values');
  });

  check(`${item.piece}: Echo keeps the cell's contour; Counterline inverts it`, () => {
    const dirs = (xs: readonly number[]) => xs.slice(1).map((x, k) => Math.sign(x - xs[k]!));
    let echoKept = 0;
    let echoN = 0;
    for (const a of echo.answers) {
      if (a.device.startsWith('return') || a.device === 'fragment') continue;
      const w = echo.windows[a.window]!;
      const line = a.notes.map((n) => n.midis[n.midis.length - 1]!);
      const want = dirs(w.cell.pitches).slice(0, line.length - 1);
      echoN++;
      if (dirs(line).every((d, k) => want[k] === 0 || d === want[k])) echoKept++;
    }
    assert.ok(echoN >= 1 && echoKept === echoN, `Echo contour kept ${echoKept}/${echoN}`);
    let inv = 0;
    let invN = 0;
    for (const a of counter.answers) {
      if (a.device !== 'inversion' || counter.windows[a.window]!.held !== null) continue;
      const w = counter.windows[a.window]!;
      const line = a.notes.map((n) => n.midis[n.midis.length - 1]!);
      const want = dirs(w.cell.pitches).slice(0, line.length - 1).map((d) => -d);
      invN++;
      if (dirs(line).every((d, k) => want[k] === 0 || d === want[k])) inv++;
    }
    assert.ok(invN === 0 || inv === invN, `Counterline inversion ${inv}/${invN}`);
  });

  check(`${item.piece}: answers sit in gaps only and breathe before the melody returns`, () => {
    for (const p of plans)
      for (const a of p.answers) {
        const w = p.windows[a.window]!;
        for (const n of a.notes) {
          assert.ok(n.start >= w.start - 1e-9 && n.start + n.dur <= w.end + 1e-9, `${p.label} bar ${a.bar} outside its gap`);
          assert.ok(assessGuitarFeasibility(w.held === null ? n.midis : [...n.midis, w.held]).feasible, `${p.label} bar ${a.bar} grip`);
        }
      }
  });

  check(`${item.piece}: same seed repeats; a new seed changes the music`, () => {
    for (const c of RESPOND_CHARACTERS) {
      const a = composeRespond({ sourceXml, character: c.id, seed: run.seed });
      const b = composeRespond({ sourceXml, character: c.id, seed: run.seed });
      assert.deepEqual(a.events, b.events);
    }
    const other = composeRespond({ sourceXml, character: 'echo', seed: run.seed + 1 });
    assert.notDeepEqual(other.events, echo.events);
  });
}

check('Each press makes a new run folder; files are never overwritten', () => {
  const f = REQUIRED[1]!.file;
  const a = runRespondSession({ sourcePath: f, outRoot: tmpRoot, build: BUILD, now: new Date('2026-10-09T13:00:00Z') });
  const b = runRespondSession({ sourcePath: f, outRoot: tmpRoot, build: BUILD, now: new Date('2026-10-09T13:00:01Z') });
  assert.notEqual(a.folder, b.folder);
  assert.throws(() => runRespondSession({ sourcePath: f, outRoot: tmpRoot, build: BUILD, now: new Date('2026-10-09T13:00:00Z') }), /already exists/);
});

check('Missing build stamp is reported as not available, never invented', () => {
  const r = runRespondSession({ sourcePath: REQUIRED[1]!.file, outRoot: tmpRoot, build: { buildCommit: '', ipcBundleSha256: '', stampMatchesLiveIpc: '' }, now: new Date('2026-10-09T14:00:00Z') });
  assert.equal(readProvenance(fs.readFileSync(r.alternatives[0]!.musicXmlPath, 'utf8'))!.buildCommit, 'not available');
});

check("Meet Me at Hobo's: refused (note lengths disagree with note values throughout); nothing written", () => {
  if (!fs.existsSync(HOBOS)) assert.fail('missing Hobos source');
  const before = fs.readdirSync(tmpRoot).length;
  assert.throws(() => runRespondSession({ sourcePath: HOBOS, outRoot: tmpRoot, build: BUILD, now: new Date('2026-10-09T15:00:00Z') }), /disagree/);
  assert.equal(fs.readdirSync(tmpRoot).length, before);
});

fs.rmSync(tmpRoot, { recursive: true, force: true });
if (failed) {
  console.log(`${failed} PERFORMANCE COMPOSER 1B CHECK(S) FAILED`);
  process.exit(1);
}
console.log('ALL PERFORMANCE COMPOSER 1B CHECKS PASS');
