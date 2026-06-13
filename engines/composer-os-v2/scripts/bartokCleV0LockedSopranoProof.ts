/**
 * V89 V0/V1 locked-soprano Bartok CLE proof (standalone, not production).
 *
 * V1: one imported MusicXML/MIDI → extracted harmony + cantus lock → V88 scorer.
 * Run: npx tsx engines/composer-os-v2/scripts/bartokCleV0LockedSopranoProof.ts <path-to-musicxml-or-midi>
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import type { ImportMelodyNote, MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import { midiToImportTimeline } from '../core/import/midiToImportTimeline';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import { buildBartokScoredLineSet } from '../core/counterpoint/bartokPitchScorer';
import { abstractLineSetToSqScoreModel } from '../core/counterpoint/sqToBbScoreExport';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';

const SEED = 61234;
const LENGTH_BARS = 8;
const TOTAL_SLOTS = LENGTH_BARS * 4;
const SLOTS_PER_BAR = 4;

function expandMelodyLineToCantus(melodyLine: readonly ImportMelodyNote[], lengthBars: number): number[] {
  const out: number[] = [];
  let lastPitch: number | null = null;

  for (let bar = 1; bar <= lengthBars; bar++) {
    const barNotes = melodyLine
      .filter((n) => n.bar === bar)
      .sort((a, b) => a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch);

    for (let beatIndex = 0; beatIndex < SLOTS_PER_BAR; beatIndex++) {
      const beatStart = beatIndex;
      const covering = barNotes.find(
        (n) => n.onsetBeat <= beatStart + 1e-9 && n.onsetBeat + n.durationBeats > beatStart + 1e-9,
      );
      if (covering) {
        lastPitch = covering.midiPitch;
        out.push(covering.midiPitch);
      } else if (lastPitch != null) {
        out.push(lastPitch);
      } else {
        throw new Error(`bar ${bar} beat ${beatIndex}: no melody pitch (no prior carry)`);
      }
    }
  }

  if (out.length !== lengthBars * SLOTS_PER_BAR) {
    throw new Error(`cantus expand produced ${out.length} slots (expected ${lengthBars * SLOTS_PER_BAR})`);
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

function buildContext(seed: number, lengthBars: number, lockedHarmony: readonly string[]): CompositionContext {
  if (lockedHarmony.length !== lengthBars) {
    throw new Error(`harmony length ${lockedHarmony.length} !== lengthBars ${lengthBars}`);
  }
  return {
    seed,
    lockedHarmonyBarsRaw: [...lockedHarmony],
    form: { totalBars: lengthBars },
    generationMetadata: { songwriterStyleId: 'bartok', harmonyModeRequested: 'custom_locked' },
  } as unknown as CompositionContext;
}

function sha256Hex(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function isMidiPath(sourcePath: string): boolean {
  const ext = path.extname(sourcePath).toLowerCase();
  return ext === '.mid' || ext === '.midi';
}

function parseImportTimeline(sourcePath: string): MosaicImportTimeline {
  const abs = path.resolve(sourcePath);
  if (!fs.existsSync(abs)) throw new Error(`source file missing: ${abs}`);

  if (isMidiPath(abs)) {
    const bytes = new Uint8Array(fs.readFileSync(abs));
    const ir = midiToImportTimeline(bytes);
    if (ir.bars < LENGTH_BARS) {
      throw new Error(`MIDI parse yielded ${ir.bars} bars (need >= ${LENGTH_BARS})`);
    }
    return {
      ...ir,
      bars: LENGTH_BARS,
      melodyLine: ir.melodyLine.filter((n) => n.bar >= 1 && n.bar <= LENGTH_BARS),
      harmonyByBar: ir.harmonyByBar.filter((h) => h.bar >= 1 && h.bar <= LENGTH_BARS),
    };
  }

  const xml = fs.readFileSync(abs, 'utf8');
  const ir = musicXmlToImportTimeline(xml, { targetBars: LENGTH_BARS });
  if (ir.bars !== LENGTH_BARS) {
    throw new Error(`MusicXML parse yielded ${ir.bars} bars (expected ${LENGTH_BARS})`);
  }
  return ir;
}

function loadV1Inputs(sourcePath: string): { cantus: number[]; lockedHarmony: string[]; ir: MosaicImportTimeline } {
  const ir = parseImportTimeline(sourcePath);
  const lockedHarmony = importTimelineToLockedHarmony(ir).slice(0, LENGTH_BARS);
  if (lockedHarmony.length !== LENGTH_BARS) {
    throw new Error(`extracted harmony length ${lockedHarmony.length} !== ${LENGTH_BARS}`);
  }
  const cantus = expandMelodyLineToCantus(ir.melodyLine, LENGTH_BARS);
  assertCantusPreflight(cantus);
  return { cantus, lockedHarmony, ir };
}

function runProof(sourcePath: string) {
  const { cantus, lockedHarmony } = loadV1Inputs(sourcePath);
  const ctx = buildContext(SEED, LENGTH_BARS, lockedHarmony);
  const { lineSet, trace } = buildBartokScoredLineSet(ctx, LENGTH_BARS, SEED, cantus);
  const sqScore = abstractLineSetToSqScoreModel(lineSet);
  const ex = exportScoreModelToMusicXml(sqScore, { bpm: 120 });
  if (!ex.success || !ex.xml) throw new Error(`exportScoreModelToMusicXml failed: ${ex.errors?.[0] ?? 'unknown'}`);
  const outDir = path.join(__dirname, '../../../qa-output/bartok');
  fs.mkdirSync(outDir, { recursive: true });
  const xmlPath = path.join(outDir, 'bartok_cle_v1_extracted_harmony_seed61234.musicxml');
  fs.writeFileSync(xmlPath, ex.xml, 'utf8');
  return { cantus, lockedHarmony, lineSet, trace, xml: ex.xml, xmlPath };
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

function main(): void {
  const sourcePath = process.argv[2]?.trim();
  if (!sourcePath || sourcePath.includes('[FILE PATH GOES HERE')) {
    console.error('STOP: V1 imported melody source path missing or placeholder.');
    console.error('Usage: npx tsx engines/composer-os-v2/scripts/bartokCleV0LockedSopranoProof.ts <path-to-musicxml-or-midi>');
    process.exit(1);
  }

  let run1: ReturnType<typeof runProof>;
  let run2: ReturnType<typeof runProof>;
  try {
    run1 = runProof(sourcePath);
    run2 = runProof(sourcePath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`STOP: V1 preflight/parse failed — ${msg}`);
    process.exit(1);
  }

  const hash1 = sha256Hex(run1.xml);
  const hash2 = sha256Hex(run2.xml);

  console.log('=== V89/V1 locked-soprano proof (extracted harmony) ===');
  console.log(`source=${path.resolve(sourcePath)}`);
  console.log(`seed=${SEED} lengthBars=${LENGTH_BARS} slots=${TOTAL_SLOTS}`);
  console.log('');
  console.log('--- extracted harmony (8 bars) ---');
  for (let b = 0; b < LENGTH_BARS; b++) {
    console.log(`  bar ${b + 1}: ${run1.lockedHarmony[b]}`);
  }
  console.log('');
  console.log(`cantusFirmusMidiBySlot: [${run1.cantus.join(', ')}]`);
  console.log('');

  const mismatches: string[] = [];
  for (let g = 0; g < TOTAL_SLOTS; g++) {
    const chosen = run1.trace.slots[g]?.chosenMidiByRole.soprano;
    if (chosen !== run1.cantus[g]) mismatches.push(`slot ${g}: cantus=${run1.cantus[g]} chosen=${chosen ?? 'MISSING'}`);
  }
  console.log('--- cantus lock ---');
  if (mismatches.length === 0) console.log(`PASS: chosenMidiByRole.soprano === cantus[g] for all ${TOTAL_SLOTS} slots`);
  else {
    console.log('FAIL mismatches:');
    for (const m of mismatches) console.log(' ', m);
  }
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
  console.log('Violin II / Viola / Cello: generated by V88 scorer (not locked)');
  console.log('');

  console.log('--- lower voices MIDI by slot (8 bars x 4) ---');
  console.log('ALTO:\n' + formatBars(slotMidiByRole(run1.trace, 'alto')));
  console.log('');
  console.log('TENOR:\n' + formatBars(slotMidiByRole(run1.trace, 'tenor')));
  console.log('');
  console.log('BASS:\n' + formatBars(slotMidiByRole(run1.trace, 'bass')));

  const missingGlobals = [...Array(TOTAL_SLOTS).keys()].filter((g) => !run1.trace.slots.some((s) => s.slot.globalSlotIndex === g));
  if (mismatches.length > 0 || slotCount !== TOTAL_SLOTS || missingGlobals.length > 0 || hash1 !== hash2 || !cantusMatch) process.exit(1);
}

main();
