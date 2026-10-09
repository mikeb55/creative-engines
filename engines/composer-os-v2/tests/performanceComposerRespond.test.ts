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
import { composeRespond, laneSetup } from '../core/performance-composer/pcRespond';
import { composeMixture, composeReduce, composeWyble, verifyReduce } from '../core/performance-composer/pcPhase2';
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

  check(`${item.piece}: four files (C Space, W Wyble, M Space + Wyble, R Reduce), every check PASS`, () => {
    assert.equal(run.alternatives.length, 4);
    for (const a of run.alternatives) {
      assert.ok(fs.existsSync(a.musicXmlPath), a.musicXmlPath);
      assert.deepEqual(a.checks, { locks: 'PASS', barFill: 'PASS', playable: 'PASS', stampReadBack: 'PASS' }, a.label);
    }
  });

  check(`${item.piece}: files on disk re-verify (locks, span, bar fill) after the stamp is removed`, () => {
    for (const a of run.alternatives) {
      const xml = fs.readFileSync(a.musicXmlPath, 'utf8');
      const r =
        a.character === 'reduce'
          ? verifyReduce(sourceXml, stripProvenance(xml), a.lane.partId)
          : verifyLockedCopy(sourceXml, stripProvenance(xml), { from: 1, to: bars }, a.lane);
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
  const space = composeRespond({ sourceXml, character: 'space', seed: run.seed });
  const wyble = composeWyble(sourceXml, run.seed);
  const mix = composeMixture(sourceXml, run.seed);
  const red = composeReduce(sourceXml, run.seed);
  const { tl } = laneSetup(sourceXml);
  const melodyAt = (a: number, b: number) => tl.melodyAll.filter((m) => m.start < b - 1e-9 && m.end > a + 1e-9).map((m) => m.midi);
  const absOf = (e: { bar: number; onsetQuarters: number }) => tl.barStart[e.bar - 1]! + e.onsetQuarters;

  check(`${item.piece}: Space keeps deliberate silence`, () => {
    assert.ok(space.answers.length >= 2 && space.answers.length <= Math.ceil(space.windows.length * 0.4), `${space.answers.length}/${space.windows.length}`);
  });

  check(`${item.piece}: Wyble sits under the melody and is playable with it`, () => {
    assert.ok(wyble.wybleKept >= Math.max(4, wyble.wybleProposed * 0.3), `kept ${wyble.wybleKept}/${wyble.wybleProposed}`);
    for (const e of wyble.events) {
      const t = absOf(e);
      assert.ok(melodyAt(t, t + e.quarters).length > 0, `bar ${e.bar}: Wyble note outside a phrase`);
      // A held note is fingered with one melody beat at a time.
      for (let b = t; b < t + e.quarters - 1e-9; b += 1) {
        const mel = melodyAt(b, Math.min(b + 1, t + e.quarters));
        if (!mel.length) continue;
        assert.ok(e.midis[0]! <= Math.min(...mel) - 3, `bar ${e.bar}: not under the melody`);
        assert.ok(assessGuitarFeasibility([...e.midis, ...mel]).feasible, `bar ${e.bar}: grip with melody`);
      }
    }
  });

  check(`${item.piece}: Mixture is one line (both resources, gap chords voice-led from Wyble)`, () => {
    assert.ok(mix.notes.some((n) => n.source === 'wyble') && mix.notes.some((n) => n.source === 'space'), 'both resources');
    assert.ok(mix.joins === 0 || mix.voiceLedJoins / mix.joins >= 0.6, `voice-led ${mix.voiceLedJoins}/${mix.joins}`);
    assert.ok(mix.events.length < wyble.events.length + space.events.length, 'thinner than W and C stacked');
    for (let i = 1; i < mix.notes.length; i++) assert.ok(mix.notes[i - 1]!.start + mix.notes[i - 1]!.dur <= mix.notes[i]!.start + 1e-9, 'one voice, no overlaps');
  });

  check(`${item.piece}: Reduce removes 15–60% of melody notes and nothing else`, () => {
    const share = red.plan.removed / red.plan.melodyNotes;
    assert.ok(share >= 0.15 && share <= 0.6, `removed ${red.plan.removed}/${red.plan.melodyNotes}`);
    const v = verifyReduce(sourceXml, red.xml, red.plan.partId);
    assert.ok(v.ok, v.errors.slice(0, 3).join('; '));
  });

  check(`${item.piece}: Space and Wyble are different resources (shared lane notes < 40%)`, () => {
    const k = (evs: readonly { bar: number; onsetQuarters: number; midis: number[] }[]) => new Set(evs.map((e) => `${e.bar}:${e.onsetQuarters}:${e.midis.join('+')}`));
    const a = k(space.events);
    const b = k(wyble.events);
    const shared = [...a].filter((x) => b.has(x)).length;
    assert.ok(shared / Math.max(1, Math.min(a.size, b.size)) < 0.4, `shared ${shared}`);
  });

  check(`${item.piece}: same seed repeats; a new seed changes the music`, () => {
    assert.deepEqual(composeWyble(sourceXml, run.seed).events, wyble.events);
    assert.deepEqual(composeMixture(sourceXml, run.seed).events, mix.events);
    assert.notDeepEqual(composeWyble(sourceXml, run.seed + 1).events, wyble.events);
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
  console.log(`${failed} PERFORMANCE COMPOSER PHASE 2 CHECK(S) FAILED`);
  process.exit(1);
}
console.log('ALL PERFORMANCE COMPOSER PHASE 2 CHECKS PASS');
