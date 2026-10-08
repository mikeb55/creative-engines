/**
 * WWH V8 session generation for the desktop panel.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhV8Session.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hashForRoute, routeFromPathname } from '../../../apps/composer-os-app/src/router/appRouter';
import { importWwhDuoMusicXml, pitchFingerprint } from '../core/wwh/wwhDuoImport';
import { V8A_DUO_FILE } from '../core/wwh/wwhBlackAuraV8a';
import {
  adviseBlackAuraPair,
  generateWwhV8Session,
  parentTriadFromRoot,
  V8_SESSION_DIR,
} from '../core/wwh/wwhV8Session';

const APPROVED = path.resolve(V8_SESSION_DIR, '..');

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function tree(dir: string): string {
  if (!fs.existsSync(dir)) return 'missing';
  const rows: string[] = [];
  const walk = (current: string) => {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else rows.push(`${path.relative(dir, full)}\t${sha(full)}`);
    }
  };
  walk(dir);
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

function events(file: string): string {
  const score = importWwhDuoMusicXml(fs.readFileSync(file, 'utf8'));
  return `${pitchFingerprint(score.guitar.measures)}||${pitchFingerprint(score.bass.measures)}`;
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

  const sourceBefore = sha(V8A_DUO_FILE);
  const approvedBefore = ['A', 'B', 'B1', 'C'].map((name) => [name, tree(path.join(APPROVED, name))] as const);

  check('navigation exposes WWH V8 and still has Generate', () => {
    assert.equal(routeFromPathname('/wwh-v8'), 'wwh-v8');
    assert.equal(hashForRoute('wwh-v8'), '#/wwh-v8');
    assert.equal(routeFromPathname('/'), 'home');
  });

  check('D minor / Ab major keeps Ab and does not become G#', () => {
    const tension = parentTriadFromRoot({ rootSpelling: 'Ab', quality: 'major' });
    assert.deepEqual(tension.notes, ['Ab', 'C', 'Eb']);
    assert.equal(tension.rootSpelling, 'Ab');
  });

  check('invalid pairs report the problem', () => {
    assert.throws(() => parentTriadFromRoot({ rootSpelling: 'H', quality: 'major' }), /Root spelling/);
    assert.throws(() => parentTriadFromRoot({ rootSpelling: 'D', quality: 'dominant' as 'major' }), /Quality/);
    assert.throws(() => adviseBlackAuraPair({ rootSpelling: 'D', quality: 'minor' }, { rootSpelling: 'D', quality: 'minor' }), /both parents/);
  });

  check('advice is the analyser, with fact, use, and caution', () => {
    const advice = adviseBlackAuraPair({ rootSpelling: 'D', quality: 'minor' }, { rootSpelling: 'Ab', quality: 'major' });
    assert.equal(advice.advice.length, 3);
    assert.match(advice.advice.join('\n'), /→/);
    assert.ok(advice.movingCandidates.some((link) => link.from === 'A' && link.to === 'Ab' && link.semitones === -1));
  });

  const liquid = generateWwhV8Session({
    piece: 'black-aura',
    approach: 'liquid',
    seed: 80082,
    pair: { resolution: { rootSpelling: 'D', quality: 'minor' }, tension: { rootSpelling: 'Ab', quality: 'major' } },
  });
  const liquidAgain = generateWwhV8Session({
    piece: 'black-aura',
    approach: 'liquid',
    seed: 80082,
    pair: { resolution: { rootSpelling: 'D', quality: 'minor' }, tension: { rootSpelling: 'Ab', quality: 'major' } },
  });
  const otherPair = generateWwhV8Session({
    piece: 'black-aura',
    approach: 'liquid',
    seed: 80082,
    pair: { resolution: { rootSpelling: 'C', quality: 'major' }, tension: { rootSpelling: 'A', quality: 'minor' } },
  });

  check('liquid generation writes a new pitched file and preserves the source', () => {
    assert.equal(liquid.ok, true);
    assert.equal(liquid.sourcePreservation, 'PASS');
    assert.equal(liquid.guitarFeasibility, 'PASS');
    assert.equal(liquid.bassBehaviour, 'preserved');
    assert.ok(liquid.pitchedGuitarNotes > 0);
    assert.ok(liquid.musicXmlPath.startsWith(V8_SESSION_DIR));
    assert.ok(!liquid.musicXmlPath.includes(`${path.sep}B${path.sep}`));
    assert.notEqual(liquid.musicXmlPath, liquidAgain.musicXmlPath);
    assert.equal(events(liquid.musicXmlPath), events(liquidAgain.musicXmlPath));
    assert.notEqual(events(liquid.musicXmlPath), events(otherPair.musicXmlPath));
    assert.match(fs.readFileSync(liquid.musicXmlPath, 'utf8'), /<pitch>/);
    assert.equal(sha(V8A_DUO_FILE), sourceBefore);
    for (const [name, hash] of approvedBefore) assert.equal(tree(path.join(APPROVED, name)), hash, name);
  });

  check('wrong approach parameters are rejected', () => {
    assert.throws(() => generateWwhV8Session({ piece: 'black-aura', approach: 'lyrical', seed: 80082 }), /80083/);
    assert.throws(
      () =>
        generateWwhV8Session({
          piece: 'black-aura',
          approach: 'adventurous',
          seed: 80083,
          pair: { resolution: { rootSpelling: 'D', quality: 'minor' }, tension: { rootSpelling: 'Ab', quality: 'major' } },
        }),
      /does not use a triad pair/
    );
    assert.throws(() => generateWwhV8Session({ piece: 'palace-gates', approach: 'liquid', seed: 80083 }), /not yet supported/);
  });

  check('V8C lyrical, liquid, and adventurous are three different scores', () => {
    const lyrical = generateWwhV8Session({ piece: 'black-aura', approach: 'lyrical', seed: 80083 });
    const v8cLiquid = generateWwhV8Session({
      piece: 'black-aura',
      approach: 'liquid',
      seed: 80083,
      pair: { resolution: { rootSpelling: 'D', quality: 'minor' }, tension: { rootSpelling: 'Ab', quality: 'major' } },
    });
    const adventurous = generateWwhV8Session({ piece: 'black-aura', approach: 'adventurous', seed: 80083 });
    const lyricalXml = fs.readFileSync(lyrical.musicXmlPath, 'utf8');
    const liquidXml = fs.readFileSync(v8cLiquid.musicXmlPath, 'utf8');
    const adventurousXml = fs.readFileSync(adventurous.musicXmlPath, 'utf8');
    assert.match(lyricalXml, /Composer OS WWH V8C/);
    assert.match(liquidXml, /Composer OS WWH V8C/);
    assert.match(adventurousXml, /Composer OS WWH V8C/);
    assert.notEqual(events(lyrical.musicXmlPath), events(v8cLiquid.musicXmlPath));
    assert.notEqual(events(v8cLiquid.musicXmlPath), events(adventurous.musicXmlPath));
    assert.notEqual(events(lyrical.musicXmlPath), events(liquid.musicXmlPath));
    assert.match(fs.readFileSync(liquid.musicXmlPath, 'utf8'), /Composer OS WWH V8B\.1/);
  });

  check('custom F# diminished / Bb augmented is accepted and differs', () => {
    const custom = generateWwhV8Session({
      piece: 'black-aura',
      approach: 'liquid',
      seed: 11,
      pair: { resolution: { rootSpelling: 'F#', quality: 'diminished' }, tension: { rootSpelling: 'Bb', quality: 'augmented' } },
    });
    assert.equal(custom.pairLabel, 'F# diminished / Bb augmented');
    assert.notEqual(events(custom.musicXmlPath), events(otherPair.musicXmlPath));
    assert.equal(custom.guitarFeasibility, 'PASS');
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
