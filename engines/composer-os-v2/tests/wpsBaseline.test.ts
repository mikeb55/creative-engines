/**
 * WPS checks carried forward from the V1.1 baseline.
 * The frozen V1.1 sources are in core/wwh/wps/baseline/v1.1/.
 * This file runs against V1.2. The Mirror case now expects the chord-tone read to pass.
 *
 * Run from the repo root:
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wpsBaseline.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWps } from '../core/wwh/wps/wpsAssess';
import type { WpsSongSpec } from '../core/wwh/wps/wpsTypes';

const specDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../core/wwh/wps/specs');

function loadSpec(name: string): WpsSongSpec {
  return JSON.parse(fs.readFileSync(path.join(specDir, name), 'utf8')) as WpsSongSpec;
}

function alterBassStep(xml: string): string {
  const part = xml.indexOf('<part id="P2">');
  assert.ok(part > 0, 'performance file has a P2 part');
  const step = xml.indexOf('<step>', part);
  const end = xml.indexOf('</step>', step);
  const letter = xml.slice(step + 6, end);
  const next = letter === 'C' ? 'D' : 'C';
  return `${xml.slice(0, step + 6)}${next}${xml.slice(end)}`;
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

  const spec = loadSpec('07-impossible-metaphysics.json');
  const watched = [spec.leadsheet, spec.performanceEdition!, ...spec.arrangements!.map((item) => item.path)];
  const before = new Map(watched.map((file) => [file, fs.statSync(file).mtimeMs]));

  check('Impossible Metaphysics spec resolves performance edition V1.3', () => {
    assert.equal(spec.wpsVersion, '1.2');
    assert.equal(spec.performanceEditionId, 'V1.3');
    const base = path.basename(spec.performanceEdition!);
    assert.equal(base, '07-Impossible-Metaphysics-Performance-Edition-V1.3.musicxml');
    assert.equal(base.includes('V1.2'), false);
    assert.equal(base.includes('V1.1'), false);
    assert.equal(base.includes('V1.0'), false);
  });

  let report = runWps(spec);
  check('Impossible Metaphysics V1.3 baseline passes', () => {
    assert.equal(report.ok, true, report.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    const text = report.lines.join('\n');
    assert.match(text, /WPS V1\.2/);
    assert.match(text, /does not generate musical notes/);
    assert.match(text, /bass event stream matches the leadsheet/);
    assert.match(text, /metre map matches the leadsheet/);
    assert.match(text, /rehearsal A@1, B@9, C@22, D@33, E@55, F@65/);
    assert.match(text, /29, 47, 58, 60, 64, 70/);
    assert.match(text, /arrangement inventory A, B, C, D, E-V3\.0, F, G, H/);
    assert.match(text, /solveFretPath ok=true/);
    assert.match(text, /assessGuitarFeasibility span 4 failures: 0/);
    assert.match(text, /duration under five minutes: 4:17\.30/);
    assert.match(text, /NO OFFICIAL NUMERIC GCE/);
    assert.match(text, /1 refinement/);
    assert.match(text, /CBV no-change: 0 proposal/);
    assert.match(text, /65% melody \/ 20% harmony \/ 40% rhythm/);
    assert.match(text, /WPS RESULT: PASS/);
  });

  check('source and output files are unchanged', () => {
    for (const file of watched) {
      assert.equal(fs.statSync(file).mtimeMs, before.get(file));
      assert.equal(fs.statSync(file).size > 0, true);
    }
  });

  check('missing leadsheet fails', () => {
    const broken = { ...spec, leadsheet: path.join(specDir, 'missing-leadsheet.musicxml') };
    const result = runWps(broken);
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /missing leadsheet/);
  });

  check('missing arrangement fails', () => {
    const arrangements = spec.arrangements!.map((item, index) =>
      index === 0 ? { ...item, path: path.join(specDir, 'missing-A.musicxml') } : item
    );
    const result = runWps({ ...spec, arrangements });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /missing arrangement A/);
  });

  check('altered arrangement fails', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wps-bad-xml-'));
    const bad = path.join(dir, 'A.musicxml');
    fs.writeFileSync(bad, '<not-musicxml');
    const arrangements = spec.arrangements!.map((item, index) => (index === 0 ? { ...item, path: bad } : item));
    const result = runWps({ ...spec, arrangements });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /arrangement A unreadable/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  check('altered bass fails strict LOCK', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wps-bass-'));
    const copy = path.join(dir, '07-Impossible-Metaphysics-Performance-Edition-V1.3.musicxml');
    fs.writeFileSync(copy, alterBassStep(fs.readFileSync(spec.performanceEdition!, 'utf8')));
    const result = runWps({ ...spec, performanceEdition: copy });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /bass event stream differs from the leadsheet/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  check('outdated performance edition filename fails', () => {
    const stale = spec.performanceEdition!.replace('V1.3.musicxml', 'V1.2.musicxml');
    assert.equal(fs.existsSync(stale), true);
    const result = runWps({ ...spec, performanceEdition: stale });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /is not edition V1\.3/);
  });

  check('missing performance file fails', () => {
    const result = runWps({
      ...spec,
      performanceEdition: path.join(specDir, '07-Impossible-Metaphysics-Performance-Edition-V1.3.musicxml'),
    });
    assert.equal(result.ok, false);
    assert.match(result.lines.join('\n'), /missing performance edition/);
  });

  check('03-the-mirror.json planning import passes; bar 39 chord tones stay stored as 512', () => {
    const song = loadSpec('03-the-mirror.json');
    assert.equal(song.wpsVersion, '1.2');
    assert.equal(song.performanceEdition, undefined);
    const before = fs.readFileSync(song.leadsheet);
    const result = runWps(song);
    assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    const text = result.lines.join('\n');
    assert.match(text, /does not generate musical notes/);
    assert.match(text, /bar 39 chord D5 duration 512 aligned to 768/);
    assert.match(text, /bar 39 chord B5 duration 512 aligned to 768/);
    assert.match(text, /duration\/type mismatches 0/);
    assert.equal(fs.readFileSync(song.leadsheet).equals(before), true);
  });

  for (const name of ['05-orbit-v2.1.json', '06-wrong-turning.json']) {
    check(`${name} uses the same checker without a performance edition`, () => {
      const song = loadSpec(name);
      assert.equal(song.wpsVersion, '1.2');
      assert.equal(song.performanceEdition, undefined);
      assert.equal(song.selectiveSynthesis, true);
      assert.equal(song.cbv.incorporated, false);
      const result = runWps(song);
      assert.equal(result.ok, true, result.lines.filter((line) => line.startsWith('FAIL')).join('; '));
      assert.match(result.lines.join('\n'), /no performance edition/);
      assert.match(result.lines.join('\n'), /does not generate musical notes/);
    });
  }

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
