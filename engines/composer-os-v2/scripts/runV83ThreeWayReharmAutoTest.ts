/**
 * V83 — three-way reharmonisation auto-test (same melody, three composers).
 * Run: npx.cmd tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runV83ThreeWayReharmAutoTest.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import {
  extractGuitarMelodyNotes,
  melodyLinesMatchPitchForPitch,
} from '../core/import/mosaicStyleTransfer';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { normalizeChordToken } from '../core/harmony/chordProgressionParser';
import { getDispatchEntry } from '../core/mosaic-mode/mosaicComposerDispatch';
import {
  findHarmonyChildOffsetViolations,
  validateMusicXmlSchema,
} from '../core/export/musicxmlValidation';

const FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);

const OUT_DIR = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode'
);

const SEED = 88301;

/** barry_harris + fripp + radiohead (wayne_shorter swapped — export fails on style-transfer). */
const COMPOSERS = [
  {
    id: 'barry_harris',
    fileSlug: 'barry-harris',
    character: 'Bebop sixth-dim functional harmony + chord-melody reharm',
  },
  {
    id: 'radiohead',
    fileSlug: 'radiohead',
    character: 'Chromatic rock — de-functionalised harmony, modal ambiguity, slash/colour chords',
    swappedFrom: 'wayne_shorter',
    swapReason:
      'wayne_shorter slice profile exists but style-transfer export fails (0-byte XML; unexportable symbols like Gmaj9#11)',
  },
  {
    id: 'fripp',
    fileSlug: 'robert-fripp',
    character: 'Process-systems intervallic loops — non-functional pedal/drone grammar (registry id fripp)',
  },
] as const;

type ComposerRun = {
  composerId: string;
  fileSlug: string;
  outPath: string;
  importedBars: string[];
  appliedBars: string[];
  harmonyDeltaCount: number;
  melodyNoteCount: number;
  melodyPreserved: boolean;
  measureCount: number;
  xmlBytes: number;
  warnings: string[];
  schemaValid: boolean;
  schemaErrors: string[];
  pass: boolean;
  failReasons: string[];
};

function countMeasures(xml: string): number {
  const nums = [...xml.matchAll(/<measure[^>]*number="(\d+)"/g)].map((x) => Number(x[1]));
  return nums.length > 0 ? Math.max(...nums) : 0;
}

function harmonyChanged(imported: string[], applied: string[]): number {
  const n = Math.min(imported.length, applied.length);
  let changed = 0;
  for (let i = 0; i < n; i++) {
    const a = normalizeChordToken(imported[i]?.trim() ?? '');
    const b = normalizeChordToken(applied[i]?.trim() ?? '');
    if (a && b && a !== b) changed++;
  }
  return changed;
}

function barsEqual(a: string[], b: string[]): boolean {
  const n = Math.min(a.length, b.length);
  if (n === 0) return true;
  for (let i = 0; i < n; i++) {
    if (normalizeChordToken(a[i] ?? '') !== normalizeChordToken(b[i] ?? '')) return false;
  }
  return true;
}

function runComposer(
  composerId: string,
  fileSlug: string,
  ir: ReturnType<typeof musicXmlToImportTimeline>,
  locked: string[],
  inputMelody: readonly import('../core/import/mosaicImportTimeline').ImportMelodyNote[],
  totalBars: number
): ComposerRun {
  const failReasons: string[] = [];
  const warnings: string[] = [];

  if (!getDispatchEntry(composerId)) warnings.push('no mosaic dispatch entry');

  const gp = runGoldenPathOnce(SEED, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    totalBars,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: composerId,
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    suppressWybleVoiceLayoutForTest: true,
  });

  const st = gp.context?.generationMetadata?.styleTransferResult;
  const appliedBars = st?.appliedHarmonyBars ?? locked;
  const retained = st?.retainedMelody ?? [];
  const melodyPreserved =
    inputMelody.length > 0 &&
    retained.length === inputMelody.length &&
    melodyLinesMatchPitchForPitch(inputMelody, retained);

  if (!melodyPreserved) failReasons.push('melody not preserved pitch-for-pitch');
  const deltaCount = harmonyChanged(locked, appliedBars);
  if (deltaCount < 1) failReasons.push('harmony unchanged vs import (pass-through)');

  const xml = gp.xml ?? '';
  if (!xml || xml.length < 200) failReasons.push('missing or tiny MusicXML');
  const measureCount = countMeasures(xml);
  if (measureCount < totalBars) failReasons.push(`measure count ${measureCount} < expected ${totalBars}`);
  if (!xml.includes('<score-partwise')) failReasons.push('not score-partwise XML');
  if (!xml.includes('</score-partwise>')) failReasons.push('truncated XML');

  if (gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e))) {
    warnings.push(`gp.errors: ${gp.errors[0]}`);
  }
  if (!gp.score?.parts.length) warnings.push('empty score parts');
  if (st?.composerApplied !== composerId) {
    warnings.push(`composerApplied=${st?.composerApplied ?? 'none'}`);
  }
  if (st?.evalResult?.failures?.length) {
    warnings.push(`eval: ${st.evalResult.failures.slice(0, 2).join('; ')}`);
  }

  const outPath = path.join(OUT_DIR, `reharm-${fileSlug}.musicxml`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, xml, 'utf8');

  if (!melodyPreserved && gp.score) {
    const extracted = extractGuitarMelodyNotes(gp.score);
    if (extracted.length === inputMelody.length && melodyLinesMatchPitchForPitch(inputMelody, extracted)) {
      warnings.push('melody OK on score extract (retainedMelody mismatch only)');
    }
  }

  if (!/<harmony>/.test(xml)) warnings.push('no <harmony> in exported XML');

  const schema = validateMusicXmlSchema(xml);
  const harmonyOffsetViolations = findHarmonyChildOffsetViolations(xml);
  if (harmonyOffsetViolations.length) {
    failReasons.push(`harmony <offset> out of scope: ${harmonyOffsetViolations.join('; ')}`);
  }
  if (!schema.valid) {
    failReasons.push(`MusicXML schema: ${schema.errors.slice(0, 3).join('; ')}`);
  }

  return {
    composerId,
    fileSlug,
    outPath,
    importedBars: [...locked],
    appliedBars: [...appliedBars],
    harmonyDeltaCount: deltaCount,
    melodyNoteCount: inputMelody.length,
    melodyPreserved,
    measureCount,
    xmlBytes: Buffer.byteLength(xml, 'utf8'),
    warnings,
    schemaValid: schema.valid && harmonyOffsetViolations.length === 0,
    schemaErrors: [...harmonyOffsetViolations, ...schema.errors],
    pass: failReasons.length === 0,
    failReasons,
  };
}

function main(): void {
  console.log('V83 three-way reharm auto-test\n');
  console.log('STEP 1 — Composer trio (eligibility + contrast):');
  for (const c of COMPOSERS) {
    const dispatch = getDispatchEntry(c.id);
    console.log(`  ${c.id}: dispatch=${dispatch ? 'yes' : 'NO'} — ${c.character}`);
    if ('swappedFrom' in c && c.swappedFrom) {
      console.log(`    SWAP: requested ${c.swappedFrom} -> using ${c.id} (${c.swapReason})`);
    }
    if (c.id === 'fripp') console.log('    Note: registry id is fripp (not robert_fripp)');
  }
  console.log('');

  if (!fs.existsSync(FIXTURE)) {
    console.error(`FAIL: fixture missing: ${FIXTURE}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(FIXTURE, 'utf8');
  const ir = musicXmlToImportTimeline(xml);
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);
  const inputMelody = ir.melodyLine;

  console.log(`Fixture: ${FIXTURE}`);
  console.log(`Bars: ${totalBars} | Melody notes: ${inputMelody.length}`);
  console.log(`Import harmony: ${locked.join(' | ')}\n`);

  const runs: ComposerRun[] = [];
  for (const c of COMPOSERS) {
    console.log(`--- Running ${c.id} ---`);
    const run = runComposer(c.id, c.fileSlug, ir, locked, inputMelody, totalBars);
    runs.push(run);
    console.log(
      `  ${run.pass ? 'PASS' : 'FAIL'} | melody=${run.melodyPreserved} | harmonyChanged=${run.harmonyDeltaCount} | measures=${run.measureCount} | schema=${run.schemaValid ? 'ok' : 'FAIL'} | ${run.xmlBytes} bytes`
    );
    console.log(`  applied: ${run.appliedBars.join(' | ')}`);
    console.log(`  output: ${run.outPath}`);
    if (run.failReasons.length) console.log(`  fail: ${run.failReasons.join('; ')}`);
    if (run.warnings.length) console.log(`  warn: ${run.warnings.join('; ')}`);
    console.log('');
  }

  let pairFails = 0;
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      if (barsEqual(runs[i]!.appliedBars, runs[j]!.appliedBars)) {
        pairFails++;
        console.log(`FAIL: ${runs[i]!.composerId} and ${runs[j]!.composerId} identical harmony`);
      }
    }
  }

  const allPass = runs.every((r) => r.pass) && pairFails === 0;
  console.log('=== Summary ===');
  for (const r of runs) {
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'} ${r.composerId}: notes=${r.melodyNoteCount} harmonyChanged=${r.harmonyDeltaCount} -> ${r.outPath}`
    );
  }
  console.log(`Pairwise distinct harmony: ${pairFails === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`Overall: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

main();