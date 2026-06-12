/**
 * V89/V0 locked-soprano Bartok CLE proof (standalone, not production).
 * Run: npx tsx engines/composer-os-v2/scripts/bartokCleV0LockedSopranoProof.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import { buildBartokScoredLineSet } from '../core/counterpoint/bartokPitchScorer';
import { abstractLineSetToSqScoreModel } from '../core/counterpoint/sqToBbScoreExport';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';

const SEED = 61234;
const LENGTH_BARS = 8;
const TOTAL_SLOTS = LENGTH_BARS * 4;

const V0_MELODY_BY_BAR: readonly { midi: number; durationQuarters: number }[][] = [
  [{ midi: 67, durationQuarters: 1 }, { midi: 69, durationQuarters: 1 }, { midi: 71, durationQuarters: 1 }, { midi: 72, durationQuarters: 1 }],
  [{ midi: 71, durationQuarters: 1 }, { midi: 69, durationQuarters: 1 }, { midi: 67, durationQuarters: 2 }],
  [{ midi: 64, durationQuarters: 1 }, { midi: 67, durationQuarters: 1 }, { midi: 69, durationQuarters: 1 }, { midi: 71, durationQuarters: 1 }],
  [{ midi: 72, durationQuarters: 1 }, { midi: 74, durationQuarters: 1 }, { midi: 72, durationQuarters: 2 }],
  [{ midi: 71, durationQuarters: 1 }, { midi: 69, durationQuarters: 1 }, { midi: 67, durationQuarters: 1 }, { midi: 66, durationQuarters: 1 }],
  [{ midi: 67, durationQuarters: 1 }, { midi: 69, durationQuarters: 1 }, { midi: 71, durationQuarters: 2 }],
  [{ midi: 72, durationQuarters: 1 }, { midi: 71, durationQuarters: 1 }, { midi: 69, durationQuarters: 1 }, { midi: 67, durationQuarters: 1 }],
  [{ midi: 66, durationQuarters: 1 }, { midi: 67, durationQuarters: 2 }, { midi: 64, durationQuarters: 1 }],
];

const V0_LOCKED_HARMONY = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'] as const;

function expandMelodyToCantus(melodyByBar: readonly { midi: number; durationQuarters: number }[][], lengthBars: number): number[] {
  const out: number[] = [];
  if (melodyByBar.length !== lengthBars) throw new Error(`melody bar count ${melodyByBar.length} !== lengthBars ${lengthBars}`);
  for (let b = 0; b < lengthBars; b++) {
    const bar = melodyByBar[b]!;
    let barSlots = 0;
    for (const ev of bar) {
      if (ev.durationQuarters < 1 || !Number.isInteger(ev.durationQuarters)) throw new Error(`bar ${b + 1}: invalid duration ${ev.durationQuarters}`);
      for (let d = 0; d < ev.durationQuarters; d++) out.push(ev.midi);
      barSlots += ev.durationQuarters;
    }
    if (barSlots !== 4) throw new Error(`bar ${b + 1}: ${barSlots} slots (expected 4)`);
  }
  return out;
}

function assertCantusPreflight(cantus: readonly number[]): void {
  if (cantus.length !== TOTAL_SLOTS) throw new Error(`cantus length ${cantus.length} !== ${TOTAL_SLOTS}`);
  for (let g = 0; g < cantus.length; g++) {
    const m = cantus[g]!;
    if (m < 60 || m > 96) throw new Error(`slot ${g}: MIDI ${m} outside soprano range 60-96`);
  }
}

function buildContext(seed: number, lengthBars: number): CompositionContext {
  if (V0_LOCKED_HARMONY.length !== lengthBars) throw new Error(`harmony length ${V0_LOCKED_HARMONY.length} !== lengthBars ${lengthBars}`);
  return {
    seed,
    lockedHarmonyBarsRaw: [...V0_LOCKED_HARMONY],
    form: { totalBars: lengthBars },
    generationMetadata: { songwriterStyleId: 'bartok', harmonyModeRequested: 'custom_locked' },
  } as unknown as CompositionContext;
}

function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function runProof() {
  const cantus = expandMelodyToCantus(V0_MELODY_BY_BAR, LENGTH_BARS);
  assertCantusPreflight(cantus);
  const ctx = buildContext(SEED, LENGTH_BARS);
  const { lineSet, trace } = buildBartokScoredLineSet(ctx, LENGTH_BARS, SEED, cantus);
  const sqScore = abstractLineSetToSqScoreModel(lineSet);
  const ex = exportScoreModelToMusicXml(sqScore, { bpm: 120 });
  if (!ex.success || !ex.xml) throw new Error(`exportScoreModelToMusicXml failed: ${ex.errors?.[0] ?? 'unknown'}`);
  const outDir = path.join(__dirname, '../../../qa-output/bartok');
  fs.mkdirSync(outDir, { recursive: true });
  const xmlPath = path.join(outDir, 'bartok_cle_v0_locked_soprano_seed61234.musicxml');
  fs.writeFileSync(xmlPath, ex.xml, 'utf8');
  return { cantus, lineSet, trace, xml: ex.xml, xmlPath };
}

function slotMidiByRole(trace: ReturnType<typeof buildBartokScoredLineSet>['trace'], role: 'alto' | 'tenor' | 'bass'): number[] {
  return trace.slots.map((s) => s.chosenMidiByRole[role]);
}

function formatBars(slots: number[]): string {
  const bars: string[] = [];
  for (let b = 0; b < LENGTH_BARS; b++) bars.push(`bar ${b + 1}: ${slots.slice(b * 4, b * 4 + 4).join(', ')}`);
  return bars.join('\n');
}

function sopranoNotesFromLineSet(lineSet: ReturnType<typeof buildBartokScoredLineSet>['lineSet']): number[] {
  const sop = lineSet.voices.find((v) => v.role === 'soprano');
  if (!sop) throw new Error('no soprano voice');
  return [...sop.notes].sort((a, b) => a.offsetBars - b.offsetBars).map((n) => Math.round(n.pitchMidi));
}

const run1 = runProof();
const run2 = runProof();
const hash1 = sha256Hex(run1.xml);
const hash2 = sha256Hex(run2.xml);

console.log('=== V89/V0 locked-soprano proof ===');
console.log(`seed=${SEED} lengthBars=${LENGTH_BARS} slots=${TOTAL_SLOTS}`);
console.log(`cantusFirmusMidiBySlot: [${run1.cantus.join(', ')}]`);
console.log('');

const mismatches: string[] = [];
for (let g = 0; g < TOTAL_SLOTS; g++) {
  const chosen = run1.trace.slots[g]?.chosenMidiByRole.soprano;
  if (chosen !== run1.cantus[g]) mismatches.push(`slot ${g}: cantus=${run1.cantus[g]} chosen=${chosen ?? 'MISSING'}`);
}
console.log('--- cantus lock ---');
if (mismatches.length === 0) console.log(`PASS: chosenMidiByRole.soprano === cantus[g] for all ${TOTAL_SLOTS} slots`);
else { console.log('FAIL mismatches:'); for (const m of mismatches) console.log(' ', m); }
console.log('');

console.log('--- no collapse ---');
const slotCount = run1.trace.slots.length;
const emptySlots = run1.trace.slots.filter((s) => !s.chosenMidiByRole).length;
console.log(`trace.slots.length=${slotCount} (expected ${TOTAL_SLOTS})`);
console.log(`empty/skipped slots=${emptySlots}`);
console.log(slotCount === TOTAL_SLOTS && emptySlots === 0 ? 'PASS' : 'FAIL');
console.log('');

console.log('--- Bartok response (transformation + margin > 0) ---');
let transformMarginCount = 0;
const examples: string[] = [];
for (const s of run1.trace.slots) {
  const g = s.slot.globalSlotIndex;
  const margin = s.marginVsNonTransformational;
  const tbr = s.transformationByRole;
  if (!tbr || margin == null || margin <= 0) continue;
  transformMarginCount += 1;
  if (examples.length < 3) {
    for (const [role, kind] of Object.entries(tbr)) {
      examples.push(`slot ${g} (${role}): ${kind}, marginVsNonTransformational=${margin.toFixed(6)}`);
      break;
    }
  }
}
console.log(`slots with transformationByRole AND marginVsNonTransformational > 0: ${transformMarginCount}/${TOTAL_SLOTS}`);
for (const ex of examples) console.log(`  example: ${ex}`);
console.log('');

console.log('--- determinism ---');
console.log(`run1 sha256: ${hash1}`);
console.log(`run2 sha256: ${hash2}`);
console.log(hash1 === hash2 ? 'PASS: identical MusicXML hash' : 'FAIL: hash mismatch');
console.log('');

console.log('--- export ---');
console.log(`MusicXML: ${run1.xmlPath}`);
const exportedSop = sopranoNotesFromLineSet(run1.lineSet);
const cantusMatch = exportedSop.length === run1.cantus.length && exportedSop.every((m, i) => m === run1.cantus[i]);
console.log(`Violin I (soprano) note count=${exportedSop.length}, cantus match=${cantusMatch ? 'PASS' : 'FAIL'}`);
if (!cantusMatch) console.log(`  exported: [${exportedSop.join(', ')}]`);
console.log('');

console.log('--- lower voices MIDI by slot (8 bars x 4) ---');
console.log('ALTO:\n' + formatBars(slotMidiByRole(run1.trace, 'alto')));
console.log('');
console.log('TENOR:\n' + formatBars(slotMidiByRole(run1.trace, 'tenor')));
console.log('');
console.log('BASS:\n' + formatBars(slotMidiByRole(run1.trace, 'bass')));

const missingGlobals = [...Array(TOTAL_SLOTS).keys()].filter((g) => !run1.trace.slots.some((s) => s.slot.globalSlotIndex === g));
if (mismatches.length > 0 || slotCount !== TOTAL_SLOTS || missingGlobals.length > 0 || hash1 !== hash2 || !cantusMatch) process.exit(1);



