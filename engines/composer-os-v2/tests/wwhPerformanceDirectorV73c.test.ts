/**
 * WWH Performance Director V7.3C album plans.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhPerformanceDirectorV73c.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { executePerformancePlan } from '../core/wwh/director/executePerformancePlan';
import { proposeV73cPlan, WWH_V73C_PIECES } from '../core/wwh/director/proposeV73cAlbum';
import { indexSource } from '../core/wwh/director/sourceIndexAdapter';

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function measureCount(xml: string): number {
  const part = xml.split(/<part id="/)[1] ?? '';
  return part.split('<measure ').length - 1;
}

function metres(run: ReturnType<typeof executePerformancePlan>): string[] {
  return [...new Set(run.compiled.bars.map((bar) => `${bar.beats}/${bar.beatType}`))];
}

function primaryIds(run: ReturnType<typeof executePerformancePlan>, player: 'guitar' | 'bass'): string[] {
  return run.compiled.receipt.sourceMap
    .filter((row) => row.player === player && (row.use === 'primary' || row.use === 'chord_melody'))
    .map((row) => row.sourceMeasureId ?? '');
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

  const before = WWH_V73C_PIECES.flatMap((piece) => [piece.duoFile, piece.arrangementFile].filter((file): file is string => Boolean(file))).map((file) => [file, sha(file)] as const);

  for (const piece of WWH_V73C_PIECES) {
    check(`${piece.key} binds, covers source, and writes four scores`, () => {
      const duoXml = fs.readFileSync(piece.duoFile, 'utf8');
      const duoHash = sha(piece.duoFile);
      const arrangementXml = piece.arrangementFile ? fs.readFileSync(piece.arrangementFile, 'utf8') : undefined;
      const duo = indexSource(duoXml, duoHash);
      const arrangement = arrangementXml ? indexSource(arrangementXml) : null;
      const plan = proposeV73cPlan(piece, duo, arrangement);
      const first = executePerformancePlan(duoXml, plan, duo.sha256, piece.key, arrangementXml);
      const second = executePerformancePlan(duoXml, plan, duo.sha256, piece.key, arrangementXml);
      assert.equal(first.bound.planSha256, second.bound.planSha256);
      assert.equal(JSON.stringify(first.compiled.receipt.sourceMap), JSON.stringify(second.compiled.receipt.sourceMap));
      assert.equal(first.compiled.receipt.schedule ? JSON.stringify(first.compiled.receipt.schedule) : '', second.compiled.receipt.schedule ? JSON.stringify(second.compiled.receipt.schedule) : '');
      const guitarPrimary = primaryIds(first, 'guitar');
      const bassPrimary = primaryIds(first, 'bass');
      assert.deepEqual(guitarPrimary, duo.measures.map((measure) => measure.id));
      assert.deepEqual(bassPrimary, duo.measures.map((measure) => measure.id));
      assert.equal(measureCount(first.scores.leadsheet), duo.measures.length);
      assert.equal(measureCount(first.scores.performance), first.compiled.bars.length);
      assert.equal(measureCount(first.scores.guitar_study), first.compiled.bars.length);
      assert.equal(measureCount(first.scores.bass_partner), first.compiled.bars.length);
      assert.match(first.scores.guitar_study, /MINIMAL/);
      assert.match(first.scores.guitar_study, /LYRICAL/);
      assert.match(first.scores.guitar_study, /ADVENTUROUS/);
      const added = first.compiled.bars.length - duo.measures.length;
      if (piece.key === 'after-everything') assert.equal(added, 0);
      else assert.ok(added > 0, `expected added bars, found ${added}`);
      const cm = first.compiled.bars.filter((bar) => bar.guitar.kind === 'chord_melody');
      if (piece.key === 'black-aura' || piece.key === 'the-mirror') assert.ok(cm.length > 0);
      else assert.equal(cm.length, 0);
      if (piece.arrangementFile) {
        for (const bar of cm) {
          assert.equal(bar.bass.kind, 'source');
          assert.ok(bar.guitar.arrangementMeasureId);
        }
      }
    });
  }

  check('metres stay with the source spans', () => {
    const load = (key: string) => {
      const piece = WWH_V73C_PIECES.find((item) => item.key === key);
      if (!piece) throw new Error(key);
      const xml = fs.readFileSync(piece.duoFile, 'utf8');
      const arrangement = piece.arrangementFile ? fs.readFileSync(piece.arrangementFile, 'utf8') : undefined;
      const index = indexSource(xml, sha(piece.duoFile));
      const plan = proposeV73cPlan(piece, index, arrangement ? indexSource(arrangement) : null);
      return executePerformancePlan(xml, plan, index.sha256, key, arrangement);
    };
    const palace = metres(load('palace-gates'));
    assert.ok(palace.includes('6/8'));
    assert.ok(!palace.includes('4/4'));
    const hobo = metres(load('meet-me-at-hobos'));
    assert.ok(hobo.includes('12/8'));
    const orbit = metres(load('orbit'));
    assert.ok(orbit.includes('3/4'));
    assert.ok(!orbit.includes('4/4'));
    const wrong = metres(load('wrong-turning'));
    assert.ok(wrong.includes('3/4'));
    assert.ok(wrong.includes('4/4'));
    const im = metres(load('impossible-metaphysics'));
    for (const meter of ['4/4', '5/4', '7/8', '3/4']) assert.ok(im.includes(meter), meter);
    const small = metres(load('small-testimony'));
    assert.ok(small.includes('5/4'));
    const after = metres(load('after-everything'));
    assert.ok(after.includes('3/4'));
    assert.ok(!after.includes('4/4'));
  });

  check('source files stay byte-identical', () => {
    for (const [file, hash] of before) assert.equal(sha(file), hash);
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
