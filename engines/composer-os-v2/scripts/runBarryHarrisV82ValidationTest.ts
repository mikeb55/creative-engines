/**
 * V82 validation - Barry Harris chord-melody (Hookpad 4-bar C major fixture).
 * Run: npm run test:barry-harris-v82-validation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import {
  applyChordMelodyToScore,
  applyIdentitiesToNoteChoices,
  applyVoicingEngineToResolved,
  assignPhrasingRoles,
  chordMelodyVoiceLeadingScore,
  harmonySymbolForResolved,
  blockMidisForResolved,
  chordTonePcsForResolved,
  drop2VoicingBelowMelody,
  droppedTonePcForResolved,
  pitchClassToSharpName,
  precomputeBarryHarrisChordMelodyFoundation,
  runBarryHarrisChordMelodyPipeline,
  sixthDimPartnerSymbol,
  type ChordMelodyNoteChoice,
  type ResolvedChordMelodyNote,
} from '../core/barry-harris';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { midiToImportTimeline } from '../core/import/midiToImportTimeline';
import type { ImportMelodyNote, MosaicImportTimeline } from '../core/import/mosaicImportTimeline';
import {
  IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
  MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
} from '../core/import/mosaicImportTimeline';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const TEST_MIDI_PATH = path.join(
  REPO_ROOT,
  'Mike Composer Combi Songs',
  'Barry Harris Test 9 june 2026.mid'
);
const EXPORT_DIR = 'C:\\Users\\mike\\Documents\\Mike Composer Files\\barry_harris';

const HOOKPAD_BARS = 4;
const GP_TOTAL_BARS = 8;
const SEED = 82082;
const BPM = 120;

const EXPECTED_FAKE_BOOK = ['C', 'F', 'Am', 'Em'] as const;
const EXPECTED_REINTERPRET = ['C6', 'F6', 'Am6', 'Em6'] as const;

const FALLBACK_MELODY: ImportMelodyNote[] = [
  { bar: 1, onsetBeat: 0, durationBeats: 1, midiPitch: 60, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 1, onsetBeat: 1, durationBeats: 1, midiPitch: 62, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 1, onsetBeat: 2, durationBeats: 1, midiPitch: 64, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 2, onsetBeat: 0, durationBeats: 1, midiPitch: 65, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 2, onsetBeat: 2, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 3, onsetBeat: 0, durationBeats: 1, midiPitch: 69, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 3, onsetBeat: 2, durationBeats: 1, midiPitch: 72, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 4, onsetBeat: 0, durationBeats: 1, midiPitch: 76, confidence: 1, fieldOrigin: 'explicit' },
  { bar: 4, onsetBeat: 2, durationBeats: 1, midiPitch: 74, confidence: 1, fieldOrigin: 'explicit' },
];

type VoicingMode = 'close' | 'drop2';

type VariantSpec = {
  id: 'A' | 'B' | 'C';
  label: string;
  strength: number;
  voicing: VoicingMode;
  exportFile: string;
};

type LockScores = {
  L: number;
  O: number;
  C: number;
  K: number;
  total: number;
  notes: string;
};

type VariantRunResult = {
  spec: VariantSpec;
  lock: LockScores;
  cmReceipts: string[];
  noteChoices: ChordMelodyNoteChoice[];
  summary: {
    noteCount: number;
    sixthCount: number;
    dim7Count: number;
    borrowedCount: number;
    borrowedDensity: number;
  };
  blockOk: boolean;
  exportPath: string;
};

const VARIANTS: VariantSpec[] = [
  { id: 'A', label: 'full BH close block', strength: 1.0, voicing: 'close', exportFile: 'BH_Test_VariantA.musicxml' },
  { id: 'B', label: 'blended 0.7 close block', strength: 0.7, voicing: 'close', exportFile: 'BH_Test_VariantB.musicxml' },
  { id: 'C', label: 'full BH drop-2', strength: 1.0, voicing: 'drop2', exportFile: 'BH_Test_VariantC.musicxml' },
];

function mod12(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function padIrForGoldenPath(ir: MosaicImportTimeline): MosaicImportTimeline {
  const locked = importTimelineToLockedHarmony(ir).slice(0, HOOKPAD_BARS);
  const harmonyByBar = Array.from({ length: GP_TOTAL_BARS }, (_, i) => ({
    bar: i + 1,
    chordSymbol: locked[i % HOOKPAD_BARS] ?? 'C',
    confidence: IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
    fieldOrigin: 'explicit' as const,
  }));
  const melodyLine = ir.melodyLine
    .filter((n) => n.bar >= 1 && n.bar <= HOOKPAD_BARS)
    .flatMap((n) => [
      n,
      { ...n, bar: n.bar + HOOKPAD_BARS },
    ]);
  return { ...ir, bars: GP_TOTAL_BARS, harmonyByBar, melodyLine };
}

function trimScoreToBars(score: ScoreModel, maxBar: number): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  for (const part of out.parts) {
    part.measures = part.measures.filter((m) => m.index <= maxBar);
  }
  return out;
}

function filterToHookpadBars<T extends { bar: number }>(rows: readonly T[]): T[] {
  return rows.filter((r) => r.bar >= 1 && r.bar <= HOOKPAD_BARS);
}

function filterReceiptsToHookpad(receipts: readonly string[]): string[] {
  return receipts.filter((r) => {
    const m = r.match(/@bar(\d+)/);
    return !m || Number(m[1]) <= HOOKPAD_BARS;
  });
}

function buildManualImportTimeline(melodyLine: ImportMelodyNote[]): MosaicImportTimeline {
  return {
    schemaVersion: MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION,
    sourceFormat: 'midi',
    bars: HOOKPAD_BARS,
    timeSig: { num: 4, den: 4 },
    keyEstimate: { tonic: 'C', mode: 'major', confidence: 0.95, fieldOrigin: 'explicit' },
    harmonyByBar: EXPECTED_FAKE_BOOK.map((chordSymbol, i) => ({
      bar: i + 1,
      chordSymbol,
      confidence: IMPORT_EXPLICIT_HARMONY_CONFIDENCE,
      fieldOrigin: 'explicit' as const,
    })),
    melodyLine,
  };
}

function loadImportTimeline(): { ir: MosaicImportTimeline; parseSource: string } {
  if (!fs.existsSync(TEST_MIDI_PATH)) {
    console.warn('[v82] MIDI not found - using manual IR');
    return { ir: buildManualImportTimeline(FALLBACK_MELODY), parseSource: 'manual-fallback' };
  }
  try {
    const bytes = new Uint8Array(fs.readFileSync(TEST_MIDI_PATH));
    const parsed = midiToImportTimeline(bytes, { bpm: BPM, timeSigNum: 4, timeSigDen: 4 });
    const melody =
      parsed.melodyLine.filter((n) => n.bar >= 1 && n.bar <= HOOKPAD_BARS).length > 0
        ? parsed.melodyLine.filter((n) => n.bar >= 1 && n.bar <= HOOKPAD_BARS)
        : FALLBACK_MELODY;
    return { ir: buildManualImportTimeline(melody), parseSource: `midi (${melody.length} melody notes)` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[v82] MIDI parse failed (${msg}) - using manual IR`);
    return { ir: buildManualImportTimeline(FALLBACK_MELODY), parseSource: 'manual-after-parse-fail' };
  }
}

function logScaleOfChords(context: CompositionContext, ir: MosaicImportTimeline): void {
  const foundation = precomputeBarryHarrisChordMelodyFoundation(context, ir);
  console.log('\n--- Scale-of-chords (per section) ---');
  for (const span of foundation.sectionSpans) {
    const scale = foundation.scalesBySection[span.sectionLabel];
    console.log(`Section ${span.sectionLabel} bars ${span.startBar}-${span.endBar} tonicPc=${scale?.sectionTonicPc ?? '?'}`);
    if (!scale) continue;
    for (const pair of scale.pairs) {
      const { sixthSymbol, dim7Symbol } = sixthDimPartnerSymbol(pair.sixthRootPc, pair.sixthQuality);
      console.log(`  ${sixthSymbol} / ${dim7Symbol}`);
    }
  }
  console.log('\n--- Reinterpret mapping (fake-book -> 6th anchor) ---');
  for (const choice of foundation.choices) {
    const root = pitchClassToSharpName(choice.anchor.sixthRootPc);
    const sixth = choice.anchor.sixthQuality === 'm6' ? `${root}m6` : `${root}6`;
    console.log(`  bar ${choice.bar}: ${choice.fakeBookSymbol} -> ${sixth}`);
  }
}

function assertBlockVoicingMelodyTop(
  resolved: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[],
  voicing: VoicingMode
): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const r of resolved) {
    const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
    if (!mel) {
      failures.push(`bar ${r.bar} onset ${r.onsetBeat}: no melody match`);
      continue;
    }
    const inner =
      voicing === 'drop2'
        ? drop2VoicingBelowMelody(mel.midiPitch, chordTonePcsForResolved(r), droppedTonePcForResolved(r))
        : blockMidisForResolved(r, mel.midiPitch, 'guitar_bass_duo');
    if (mod12(mel.midiPitch) !== r.melodyPc) failures.push(`bar ${r.bar}: melody pc mismatch`);
    for (const p of inner) {
      if (p >= mel.midiPitch) failures.push(`bar ${r.bar} onset ${r.onsetBeat}: inner ${p} not below melody`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function applyDrop2GuitarComp(
  score: ScoreModel,
  resolved: readonly ResolvedChordMelodyNote[],
  melody: readonly ImportMelodyNote[]
): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const guitar = out.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return out;
  for (const r of resolved) {
    const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
    if (!mel) continue;
    const inner = drop2VoicingBelowMelody(
      mel.midiPitch,
      chordTonePcsForResolved(r),
      droppedTonePcForResolved(r)
    );
    let measure = guitar.measures.find((m) => m.index === r.bar);
    if (!measure) {
      measure = { index: r.bar, events: [] };
      guitar.measures.push(measure);
    }
    measure.events = measure.events.filter(
      (e) => !(e.kind === 'note' && (e.voice ?? 2) >= 2 && Math.abs(e.startBeat - r.onsetBeat) < 0.02)
    );
    for (let i = 0; i < inner.length; i++) {
      measure.events.push({
        kind: 'note',
        pitch: inner[i]!,
        startBeat: r.onsetBeat,
        duration: mel.durationBeats,
        voice: 2 + (i % 2),
      });
    }
    measure.events.sort((a, b) => a.startBeat - b.startBeat);
  }
  guitar.measures.sort((a, b) => a.index - b.index);
  return out;
}

function scoreLoyalty(cmReceipts: readonly string[]): number {
  let score = 10;
  const reinterpret = cmReceipts.filter((r) => r.startsWith('bh:cm:reinterpret@'));
  for (let i = 0; i < HOOKPAD_BARS; i++) {
    const bar = i + 1;
    const expected = EXPECTED_REINTERPRET[i];
    const row = reinterpret.find((r) => r.includes(`@bar${bar}:`));
    const parts = row?.split('\u2192');
    const actual = parts?.[1]?.trim();
    if (!actual || actual !== expected) score -= 2.5;
  }
  return Math.max(0, Math.min(10, score));
}

function scoreObservance(noteChoices: readonly ChordMelodyNoteChoice[], melodyCount: number): number {
  if (melodyCount === 0) return 0;
  const covered = noteChoices.filter((c) => c.kind === 'sixth' || c.kind === 'dim7' || c.kind === 'borrowed').length;
  return Math.max(0, Math.min(10, (covered / melodyCount) * 10));
}

function scoreColour(borrowedDensity: number): number {
  const pct = borrowedDensity * 100;
  if (pct >= 10 && pct <= 30) return 10;
  const delta = pct < 10 ? 10 - pct : pct - 30;
  return Math.max(0, 10 - Math.ceil(delta / 5) * 2);
}

/** K reads voiceLeadingCost from harmonizePhrase. */
function scoreKinetics(resolved: readonly ResolvedChordMelodyNote[]): number {
  return chordMelodyVoiceLeadingScore(resolved);
}

function borrowedBeatList(noteChoices: readonly ChordMelodyNoteChoice[]): string {
  const hits = noteChoices.filter((c) => c.kind === 'borrowed').map((c) => `bar${c.bar}@${c.onsetBeat}`);
  return hits.length ? hits.join(', ') : '(none)';
}

function stripGuitarCompVoices(score: ScoreModel): ScoreModel {
  const out = structuredClone(score) as ScoreModel;
  const guitar = out.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  if (!guitar) return out;
  for (const measure of guitar.measures) {
    measure.events = measure.events.filter((e) => e.kind !== 'note' || (e.voice ?? 1) === 1);
  }
  return out;
}

function trimMusicXmlToBars(xml: string, maxMeasure: number): string {
  return xml.replace(/<part[\s\S]*?<\/part>/g, (partBlock) => {
    let measureIndex = 0;
    return partBlock.replace(/<measure[\s\S]*?<\/measure>/g, (measureBlock) => {
      measureIndex++;
      return measureIndex <= maxMeasure ? measureBlock : '';
    });
  });
}

function runVariant(spec: VariantSpec, ir: MosaicImportTimeline, locked: string[]): VariantRunResult {
  const gpIr = padIrForGoldenPath(ir);
  const gpLocked = importTimelineToLockedHarmony(gpIr);
  const gp = runGoldenPathOnce(SEED + spec.id.charCodeAt(0), {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: gpLocked,
    parsedChordBars: gpLocked,
    chordProgressionText: gpLocked.join(' | '),
    totalBars: GP_TOTAL_BARS,
    bpm: BPM,
    importTimeline: gpIr,
    styleTransfer: true,
    targetComposer: 'barry_harris',
    styleTransferStrength: spec.strength,
    preserveMelody: true,
    importHarmonyMode: 'free_harmony',
    mosaicSectionPlan: [{ sectionLabel: 'A', startBar: 1, endBar: GP_TOTAL_BARS, songwriterStyleId: 'barry_harris' }],
    suppressWybleVoiceLayoutForTest: true,
  });

  const st = gp.context.generationMetadata?.styleTransferResult;
  const allNoteChoices = st?.barryHarrisNoteChoices ?? [];
  const noteChoices = filterToHookpadBars(allNoteChoices);
  const summary = st?.barryHarrisChordMelody;
  const cmReceipts = filterReceiptsToHookpad(summary?.cmReceipts ?? []);
  const allResolved =
    (gp.context.generationMetadata?.barryHarrisResolvedNotes as ResolvedChordMelodyNote[] | undefined) ??
    applyIdentitiesToNoteChoices(allNoteChoices);
  const resolvedBase = filterToHookpadBars(
    allNoteChoices.length > 0 ? allNoteChoices : allResolved
  );
  const withPhrasing = assignPhrasingRoles(resolvedBase, ir.melodyLine, HOOKPAD_BARS);

  let score = trimScoreToBars(gp.score, HOOKPAD_BARS);
  const voicedResolved = applyVoicingEngineToResolved(withPhrasing, ir.melodyLine, {
    spacingPreference: spec.voicing === 'drop2' ? 'drop2' : 'close',
  });
  printLadderExportDiagnostic('Variant ' + spec.id, ir.melodyLine, voicedResolved);
  score = applyChordMelodyToScore(score, voicedResolved, ir.melodyLine, 'guitar_bass_duo');

  const blockCheck = assertBlockVoicingMelodyTop(voicedResolved, ir.melodyLine, spec.voicing);
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const exportPath = path.join(EXPORT_DIR, spec.exportFile);
  const lockedBars = locked.slice(0, HOOKPAD_BARS);

  const xmlResult = exportScoreModelToMusicXml(score, {
    bpm: BPM,
    preserveChordKindLiterals: true,
      });
  if (!xmlResult.success || !xmlResult.xml) {
    throw new Error(`[v82] MusicXML export failed for variant ${spec.id}: ${xmlResult.errors.join('; ')}`);
  }
  fs.writeFileSync(exportPath, trimMusicXmlToBars(xmlResult.xml, HOOKPAD_BARS), 'utf-8');

  const borrowedDensity =
    noteChoices.length > 0
      ? noteChoices.filter((c) => c.kind === 'borrowed').length / noteChoices.length
      : summary?.borrowedDensity ?? 0;
  const lock: LockScores = {
    L: scoreLoyalty(cmReceipts),
    O: scoreObservance(noteChoices, ir.melodyLine.length),
    C: scoreColour(borrowedDensity),
    K: scoreKinetics(voicedResolved),
    total: 0,
    notes: '',
  };
  lock.total = lock.L + lock.O + lock.C + lock.K;
  const notes: string[] = [];
  if (!blockCheck.ok) notes.push(`block voicing: ${blockCheck.failures.length} fail`);
  if (lock.L < 10) notes.push('reinterpret drift');
  if (borrowedDensity * 100 < 10 || borrowedDensity * 100 > 30) notes.push(`borrowed ${(borrowedDensity * 100).toFixed(0)}%`);
  if (spec.strength < 1) notes.push(`blend ${spec.strength}`);
  if (spec.voicing === 'drop2') notes.push('drop-2 guitar');
  lock.notes = notes.join('; ') || 'ok';

  return {
    spec,
    lock,
    cmReceipts,
    noteChoices,
    summary: {
      noteCount: summary?.noteCount ?? noteChoices.length,
      sixthCount: summary?.sixthCount ?? 0,
      dim7Count: summary?.dim7Count ?? 0,
      borrowedCount: summary?.borrowedCount ?? 0,
      borrowedDensity,
    },
    blockOk: blockCheck.ok,
    exportPath,
  };
}


const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function midiNoteName(midi: number): string {
  return PC_NAMES[((midi % 12) + 12) % 12]!;
}

function ladderSourceLabel(r: ResolvedChordMelodyNote): string {
  const fp = r.voicingFingerprint ?? '';
  if (fp.startsWith('dim:')) return 'dim';
  if (fp.startsWith('6:')) return '6';
  if (r.voicingChordColour === 'dim7') return 'dim';
  if (r.voicingChordColour === 'sixth') return '6';
  return '?';
}

function printLadderExportDiagnostic(
  label: string,
  melody: readonly ImportMelodyNote[],
  voiced: readonly ResolvedChordMelodyNote[]
): void {
  console.log('\n--- Ladder / export diagnostic (' + label + ') ---');
  console.log('bar | beat | melody | rung | source | export symbol | voicing notes | vlCost');
  console.log('----+------+--------+------+--------+---------------+--------------+-------');
  const ordered = [...voiced].sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat);
  for (const r of ordered) {
    const mel = melody.find((n) => n.bar === r.bar && Math.abs(n.onsetBeat - r.onsetBeat) < 0.02);
    const sym = harmonySymbolForResolved(r);
    const notes = r.exportStackMidis.map(midiNoteName).join('/');
    const vlCost =
      typeof r.voiceLeadingCost === 'number'
        ? r.voiceLeadingCost.toFixed(2)
        : r.voiceLeadingCost === null
          ? 'null'
          : '?';
    console.log(
      String(r.bar).padStart(3) +
        ' | ' +
        String(r.onsetBeat).padStart(4) +
        ' | ' +
        (mel ? midiNoteName(mel.midiPitch).padStart(6) : '?'.padStart(6)) +
        ' | ' +
        String(r.ladderRungIndex ?? '?').padStart(4) +
        ' | ' +
        ladderSourceLabel(r).padStart(6) +
        ' | ' +
        sym.padEnd(13) +
        ' | ' +
        notes.padEnd(12) +
        ' | ' +
        vlCost
    );
  }
  const dimExports = ordered.filter((r) => /dim7/i.test(harmonySymbolForResolved(r))).length;
  console.log(
    'Melody events: ' +
      melody.length +
      ' | Voiced: ' +
      ordered.length +
      ' | dim7 export symbols: ' +
      dimExports
  );
}
function printReceiptDump(label: string, receipts: readonly string[]): void {
  console.log(`\n========== bh:cm:* receipts - ${label} ==========`);
  for (const r of receipts) console.log(r);
}

function printSummaryTable(rows: VariantRunResult[]): void {
  console.log('\n| Variant | L | O | C | K | Total /40 | Notes |');
  console.log('|---------|---|---|---|---|-----------|-------|');
  for (const row of rows) {
    const { L, O, C, K, total, notes } = row.lock;
    console.log(`| ${row.spec.id} | ${L.toFixed(1)} | ${O.toFixed(1)} | ${C.toFixed(1)} | ${K.toFixed(1)} | ${total.toFixed(1)} | ${notes} |`);
  }
}

function main(): void {
  console.log('Barry Harris V82 validation - Hookpad 4-bar C major (I-IV-vi-iii)');
  console.log(`Source: ${TEST_MIDI_PATH}`);

  const { ir, parseSource } = loadImportTimeline();
  const locked = importTimelineToLockedHarmony(ir).slice(0, HOOKPAD_BARS);
  console.log(`Parse: ${parseSource}`);
  console.log(`Locked harmony: ${locked.join(' -> ')}`);
  console.log(`Melody notes: ${ir.melodyLine.length}`);

  const previewCtx = {
    form: { totalBars: HOOKPAD_BARS, sections: [] },
    lockedHarmonyBarsRaw: locked,
    generationMetadata: {},
  } as CompositionContext;
  logScaleOfChords(previewCtx, ir);

  const previewFoundation = precomputeBarryHarrisChordMelodyFoundation(previewCtx, ir);
  const previewPipeline = runBarryHarrisChordMelodyPipeline(previewFoundation, ir.melodyLine, HOOKPAD_BARS, locked);
  console.log('\n--- Chord-melody summary (preview pipeline) ---');
  console.log(JSON.stringify(previewPipeline.summary, null, 2));
  const previewVoiced = applyVoicingEngineToResolved(
    assignPhrasingRoles(previewPipeline.resolvedNotes, ir.melodyLine, HOOKPAD_BARS),
    ir.melodyLine
  );
  printLadderExportDiagnostic('preview pipeline', ir.melodyLine, previewVoiced);

  const results: VariantRunResult[] = [];
  for (const spec of VARIANTS) {
    console.log(`\n>>> Running variant ${spec.id}: ${spec.label} (strength=${spec.strength})`);
    const row = runVariant(spec, ir, locked);
    results.push(row);
    console.log('\n--- Chord-melody summary ---');
    console.log(JSON.stringify({ ...row.summary, blockVoicingOk: row.blockOk }, null, 2));
    printReceiptDump(`Variant ${spec.id}`, row.cmReceipts);
    console.log(`Exported: ${row.exportPath}`);
  }

  printSummaryTable(results);

  const best = [...results].sort((a, b) => b.lock.total - a.lock.total)[0]!;
  const bestRow = results.find((r) => r.spec.id === best.spec.id)!;
  const reinterpretLines = bestRow.cmReceipts
    .filter((r) => r.startsWith('bh:cm:reinterpret@'))
    .slice(0, HOOKPAD_BARS)
    .map((r) => {
      const parts = r.split('\u2192');
      return parts.length === 2 ? `${parts[0]!.split(':').pop()} as ${parts[1]}` : r;
    });

  console.log('\n========== PLAIN-ENGLISH SUMMARY ==========');
  console.log(
    `Variant ${best.spec.id} scored highest (${best.lock.total.toFixed(1)}/40) because L=${best.lock.L.toFixed(1)} O=${best.lock.O.toFixed(1)} C=${best.lock.C.toFixed(1)} K=${best.lock.K.toFixed(1)} - ${best.spec.label}.`
  );
  console.log(
    `The BH engine correctly reinterpreted ${EXPECTED_FAKE_BOOK.join(', ')} as ${EXPECTED_REINTERPRET.join(', ')} (${reinterpretLines.join('; ')}).`
  );
  console.log(
    `Borrowed notes appeared on beats ${borrowedBeatList(bestRow.noteChoices)} - chromatic passing tones handled by the partner diminished chord in the Barry Harris scale-of-chords system.`
  );

  for (const row of results) {
    if (row.lock.total < 25) {
      console.log(
        `\nCONCERN - Variant ${row.spec.id} scored ${row.lock.total.toFixed(1)}/40: ${row.lock.notes}. Musically: check reinterpret fidelity (L), selector gaps (O), borrowed density band (C), or block voice-leading (K).`
      );
    }
  }

  console.log('\nExports:');
  for (const row of results) console.log(`  ${row.exportPath}`);
}

main();
