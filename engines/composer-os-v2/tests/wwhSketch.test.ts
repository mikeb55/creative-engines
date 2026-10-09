/**
 * V9 sketch mode.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhSketch.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { V8A_DUO_FILE } from '../core/wwh/wwhBlackAuraV8a';
import { V9_OUT_DIR } from '../core/wwh/wwhBlackAuraV9Pilot';
import {
  formatSketchFailure,
  handAuthoredV9Sketches,
  placeholderText,
  runWwhSketch,
  sketchFileName,
  validateWwhSketch,
  type WwhSketch,
  type WwhSketchEvent,
} from '../core/wwh/wwhSketch';

const SKETCH_DIR = path.join(__dirname, '../core/wwh/sketches');
const EXISTING: Record<string, string> = {
  LIQUID: path.join(V9_OUT_DIR, 'V9-BLACK-AURA-CREATIVE-LIQUID-V1.musicxml'),
  WYBLE: path.join(V9_OUT_DIR, 'V9-BLACK-AURA-CREATIVE-WYBLE-V1.musicxml'),
  SPACE: path.join(V9_OUT_DIR, 'V9-BLACK-AURA-CREATIVE-SPACE-V1.musicxml'),
  'ANGULAR V2': path.join(V9_OUT_DIR, 'V9-BLACK-AURA-CREATIVE-ANGULAR-V2.musicxml'),
};

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function restBar(): WwhSketchEvent[] {
  return [{ dur: 'whole', rest: true }];
}

function baseSketch(label: string, bars: WwhSketchEvent[][]): WwhSketch {
  return { source: V8A_DUO_FILE, insertAfterBar: 16, label, bars };
}

function writeTemp(sketch: WwhSketch): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wwh-sketch-'));
  const file = path.join(dir, 'sketch.json');
  fs.writeFileSync(file, JSON.stringify(sketch));
  return file;
}

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

const sourceSha = sha256(V8A_DUO_FILE);
const sourceMtime = fs.statSync(V8A_DUO_FILE).mtimeMs;
fs.mkdirSync(SKETCH_DIR, { recursive: true });
const authored = handAuthoredV9Sketches();
for (const sketch of authored) {
  fs.writeFileSync(path.join(SKETCH_DIR, `${sketchFileName('Black Aura', sketch.label).replace('.musicxml', '')}.json`), `${JSON.stringify(sketch, null, 2)}\n`);
}

check('four hand-authored sketches exist', () => {
  assert.deepEqual(
    authored.map((sketch) => sketch.label),
    ['LIQUID', 'WYBLE', 'SPACE', 'ANGULAR V2']
  );
  for (const sketch of authored) {
    const file = path.join(SKETCH_DIR, `${sketchFileName('Black Aura', sketch.label).replace('.musicxml', '')}.json`);
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8')) as WwhSketch;
    assert.equal(validateWwhSketch(loaded).length, 0, sketch.label);
  }
});

const reports: string[] = [];
check('each existing V9 export reproduced', () => {
  const place = placeholderText(16);
  for (const sketch of authored) {
    const json = path.join(SKETCH_DIR, `${sketchFileName('Black Aura', sketch.label).replace('.musicxml', '')}.json`);
    const report = runWwhSketch(json, { open: false });
    const got = fs.readFileSync(report.output, 'utf8');
    const previous = fs.readFileSync(EXISTING[sketch.label]!, 'utf8');
    const identical = got === previous;
    if (identical) {
      reports.push(`${sketch.label}: byte-identical`);
      continue;
    }
    const direction = `<direction placement="above"><direction-type><words>${place}</words></direction-type></direction>`;
    const stripped = got.split(direction).join('');
    assert.equal(stripped, previous, `${sketch.label} differs by more than the bass placeholder`);
    assert.equal(got.includes(direction), true);
    assert.equal(previous.includes(place), false, `${sketch.label} original already had the placeholder`);
    reports.push(`${sketch.label}: identical except one bass placeholder "${place}" on bar ${report.placeholderBars.join(',')}`);
  }
});

check('invalid fret rejected and no file written', () => {
  const label = 'BAD FRET';
  const out = path.join(V9_OUT_DIR, sketchFileName('Black Aura', label));
  if (fs.existsSync(out)) fs.unlinkSync(out);
  const sketch = baseSketch(label, [
    [
      { dur: 'whole', tones: [{ step: 'F', alter: 0, octave: 5, string: 1, fret: 12 }] },
    ],
  ]);
  const failures = validateWwhSketch(sketch);
  assert.ok(failures.some((failure) => failure.message.includes('fret 12')));
  assert.match(formatSketchFailure(failures[0]!), /bar 1 beat 1 note F5/);
  assert.throws(() => runWwhSketch(writeTemp(sketch), { open: false }));
  assert.equal(fs.existsSync(out), false);
});

check('invalid span rejected and no file written', () => {
  const label = 'BAD SPAN';
  const out = path.join(V9_OUT_DIR, sketchFileName('Black Aura', label));
  if (fs.existsSync(out)) fs.unlinkSync(out);
  const sketch = baseSketch(label, [
    [
      {
        dur: 'whole',
        tones: [
          { step: 'F', alter: 0, octave: 5, string: 1, fret: 1 },
          { step: 'E', alter: 0, octave: 5, string: 2, fret: 5 },
        ],
      },
    ],
  ]);
  const failures = validateWwhSketch(sketch);
  assert.ok(failures.some((failure) => failure.message.includes('stopped span')));
  assert.match(formatSketchFailure(failures.find((failure) => failure.message.includes('stopped span'))!), /bar 1 beat 1 note F5\+E5/);
  assert.throws(() => runWwhSketch(writeTemp(sketch), { open: false }));
  assert.equal(fs.existsSync(out), false);
});

check('bar-math error rejected and no file written', () => {
  const label = 'BAD BAR';
  const out = path.join(V9_OUT_DIR, sketchFileName('Black Aura', label));
  if (fs.existsSync(out)) fs.unlinkSync(out);
  const sketch = baseSketch(label, [[{ dur: 'quarter', rest: true }, { dur: 'quarter', rest: true }]]);
  const failures = validateWwhSketch(sketch);
  assert.ok(failures.some((failure) => failure.message.includes('duration 512 != 1024')));
  assert.match(formatSketchFailure(failures[0]!), /bar 1 beat /);
  assert.throws(() => runWwhSketch(writeTemp(sketch), { open: false }));
  assert.equal(fs.existsSync(out), false);
  assert.equal(restBar().length, 1);
});

check('source sha and mtime unchanged', () => {
  assert.equal(sha256(V8A_DUO_FILE), sourceSha);
  assert.equal(fs.statSync(V8A_DUO_FILE).mtimeMs, sourceMtime);
});

console.log(reports.join('\n'));
if (failed) {
  console.error(`FAILED ${failed}`);
  process.exit(1);
}
console.log('ALL PASS');
