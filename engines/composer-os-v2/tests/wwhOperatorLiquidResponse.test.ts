/**
 * Operator 1 liquid response.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhOperatorLiquidResponse.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importWwhDuoMusicXml } from '../core/wwh/wwhDuoImport';
import { buildLiquidResponse, type LiquidResponseResult } from '../core/wwh/wwhOperatorLiquidResponse';

const BLACK_AURA = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/01-Black-Aura-Duo-Leadsheet-V1.1.musicxml';
const ORBIT = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/05-Orbit-Duo-Leadsheet-V2.1.musicxml';
const OPERATOR = path.join(__dirname, '../core/wwh/wwhOperatorLiquidResponse.ts');
const CLI = path.join(__dirname, '../scripts/wwhLiquidResponse.ts');

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

function run(source: string, startBar: number, endBar: number, seed: number, outDir: string): LiquidResponseResult {
  return buildLiquidResponse({
    source,
    startBar,
    endBar,
    seed,
    resolution: 'Cm',
    tension: 'Ab',
    outDir,
    open: false,
  });
}

function soundingDiffs(left: LiquidResponseResult, right: LiquidResponseResult): number {
  assert.equal(left.slots.length, right.slots.length);
  return left.slots.filter((slot, index) => slot.sounding !== right.slots[index]!.sounding).length;
}

function fingeringOnly(left: LiquidResponseResult, right: LiquidResponseResult): number {
  return left.slots.filter(
    (slot, index) => slot.sounding === right.slots[index]!.sounding && slot.fingering !== right.slots[index]!.fingering
  ).length;
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wwh-liquid-'));

check('no vault pair writes nothing', () => {
  const before = fs.readdirSync(outDir);
  const result = buildLiquidResponse({ source: BLACK_AURA, startBar: 28, endBar: 29, seed: 1, outDir, open: false });
  assert.equal(result.status, 'no-vault-pair');
  assert.match(result.message, /missing capability/);
  assert.match(result.message, /BLOCKED/);
  assert.equal(result.output, undefined);
  assert.deepEqual(fs.readdirSync(outDir), before);
  assert.equal(result.sourceShaBefore, result.sourceShaAfter);
});

check('no space writes nothing', () => {
  const result = buildLiquidResponse({
    source: BLACK_AURA,
    startBar: 21,
    endBar: 21,
    seed: 1,
    resolution: 'Cm',
    tension: 'Ab',
    outDir,
    open: false,
  });
  assert.equal(result.status, 'no-space');
  assert.equal(result.message, 'NO SPACE');
  assert.equal(result.output, undefined);
});

const aura = [1, 2, 3].map((seed) => run(BLACK_AURA, 28, 29, seed, outDir));
const orbit = [1, 2, 3].map((seed) => run(ORBIT, 25, 25, seed, outDir));

check('a Black Aura bars 28-29 seeds change sounding pitches', () => {
  assert.equal(aura[0]!.status, 'written');
  assert.ok(aura[0]!.slots.length >= 2);
  console.log(aura.map((item) => item.slots.map((slot) => `${slot.bar}:${slot.sounding}/${slot.rhythm}/${slot.fingering}`).join(' | ')).join('\n'));
  const pairDiffs = [
    soundingDiffs(aura[0]!, aura[1]!),
    soundingDiffs(aura[0]!, aura[2]!),
    soundingDiffs(aura[1]!, aura[2]!),
  ];
  const best = Math.max(...pairDiffs);
  assert.ok(best / aura[0]!.slots.length >= 0.5, `sounding diffs ${pairDiffs.join(',')}`);
  console.log(
    `fingering-only ${fingeringOnly(aura[0]!, aura[1]!)} ${fingeringOnly(aura[0]!, aura[2]!)} ${fingeringOnly(aura[1]!, aura[2]!)}`
  );
});

check('b Orbit bar 25 same command', () => {
  assert.equal(orbit[0]!.status, 'written');
  assert.ok(orbit[0]!.slots.length >= 1);
  console.log(orbit.map((item) => item.slots.map((slot) => `${slot.bar}:${slot.sounding}/${slot.rhythm}`).join(' | ')).join('\n'));
  const best = Math.max(soundingDiffs(orbit[0]!, orbit[1]!), soundingDiffs(orbit[0]!, orbit[2]!), soundingDiffs(orbit[1]!, orbit[2]!));
  assert.ok(best / orbit[0]!.slots.length >= 0.5);
});

check('c no literal pitch arrays', () => {
  const source = fs.readFileSync(OPERATOR, 'utf8') + fs.readFileSync(CLI, 'utf8');
  assert.equal(/\[[^\]]*['"][A-G](?:#|b)*['"]\s*,\s*['"][A-G]/.test(source), false);
  assert.equal(/step:\s*['"][A-G]/.test(source), false);
});

check('d source untouched and melody bass other bars unchanged', () => {
  for (const result of [...aura, ...orbit]) {
    assert.equal(result.sourceShaBefore, result.sourceShaAfter);
    assert.equal(result.sourceMtimeBeforeMs, result.sourceMtimeAfterMs);
    assert.equal(result.melodyUnchanged, true);
    assert.equal(result.bassUnchanged, true);
    assert.equal(result.otherBarsUnchanged, true);
  }
});

check('e bar math fret stretch and musicxml', () => {
  for (const result of [...aura, ...orbit]) {
    assert.equal(result.barMathOk, true);
    assert.equal(result.fretOk, true);
    assert.equal(result.xmlOk, true);
    const written = importWwhDuoMusicXml(fs.readFileSync(result.output!, 'utf8'));
    assert.ok(written.guitar.measures.every((measure) => measure.gridAgrees));
    assert.ok(written.bass.measures.every((measure) => measure.gridAgrees));
    for (const slot of result.slots) {
      assert.equal(slot.place, 'in-rest');
      assert.equal(slot.relation, 'in-rest');
      if (slot.fingering === 'rest') continue;
      for (const finger of slot.fingering.split('+')) {
        const [stringText, fretText] = finger.split(':');
        const fret = Number(fretText);
        assert.ok(fret >= 0 && fret <= 7);
        void stringText;
      }
    }
  }
});

if (failed) {
  console.error(`FAILED ${failed}`);
  process.exit(1);
}
console.log('ALL PASS');
