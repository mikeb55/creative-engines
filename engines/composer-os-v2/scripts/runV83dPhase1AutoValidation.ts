/**
 * V83d Phase 1 - BH duo comp-side rhythm (passing_dim export + inner stagger).
 * Run: npx.cmd tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runV83dPhase1AutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CompositionContext } from '../core/compositionContext';
import {
  applyChordMelodyToScore,
  precomputeBarryHarrisChordMelodyFoundation,
  runBarryHarrisChordMelodyPipeline,
} from '../core/barry-harris';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import type { ImportMelodyNote } from '../core/import/mosaicImportTimeline';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const V83D_QA_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'v83d-phase1-check.musicxml'
);

const JAZZ_BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);

const JAZZ_HARMONY = ['G', 'G', 'Am7', 'D7', 'Bm7', 'Bm7', 'D7', 'G'] as const;

function melodyNote(
  bar: number,
  onsetBeat: number,
  midiPitch: number,
  durationBeats = 1
): ImportMelodyNote {
  return { bar, onsetBeat, durationBeats, midiPitch, confidence: 1, fieldOrigin: 'explicit' };
}

const JAZZ_MELODY: ImportMelodyNote[] = [
  melodyNote(1, 0, 66),
  melodyNote(1, 2, 71),
  melodyNote(2, 0, 69),
  melodyNote(2, 2, 67),
  melodyNote(3, 0, 69),
  melodyNote(3, 2, 68),
  melodyNote(4, 0, 70),
  melodyNote(4, 2, 66),
  melodyNote(5, 0, 71),
  melodyNote(5, 2, 69),
  melodyNote(6, 0, 71),
  melodyNote(6, 2, 66),
  melodyNote(7, 0, 70),
  melodyNote(7, 2, 68),
  melodyNote(8, 0, 67),
  melodyNote(8, 2, 71),
];

function resolveJazzBenchmarkMusicXmlPath(): string {
  if (fs.existsSync(JAZZ_BENCHMARK_FIXTURE)) return JAZZ_BENCHMARK_FIXTURE;
  throw new Error(`BH jazz benchmark fixture missing: ${JAZZ_BENCHMARK_FIXTURE}`);
}

function isWeakBeat(startBeat: number): boolean {
  const beat = ((startBeat % 4) + 4) % 4;
  return Math.abs(beat - 1) < 0.05 || Math.abs(beat - 3) < 0.05;
}

function guitarPart(score: ScoreModel) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function voiceNotes(score: ScoreModel, voice: number): Array<{ bar: number; startBeat: number; pitch: number }> {
  const part = guitarPart(score);
  if (!part) return [];
  const out: Array<{ bar: number; startBeat: number; pitch: number }> = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if ((n.voice ?? 1) !== voice) continue;
      out.push({ bar: m.index, startBeat: n.startBeat, pitch: n.pitch });
    }
    for (const e of m.events) {
      if (e.kind !== 'chord') continue;
      const c = e as { startBeat: number; pitches: number[]; voice?: number };
      if ((c.voice ?? 1) !== voice) continue;
      for (const pitch of c.pitches) {
        out.push({ bar: m.index, startBeat: c.startBeat, pitch });
      }
    }
  }
  return out.sort((a, b) => a.bar - b.bar || a.startBeat - b.startBeat || a.pitch - b.pitch);
}

function runBhDuoPipeline(melody: readonly ImportMelodyNote[]) {
  const harmonyBars = [...JAZZ_HARMONY];
  const context = {
    form: { totalBars: harmonyBars.length, sections: [] },
    lockedHarmonyBarsRaw: harmonyBars,
    generationMetadata: {},
  } as CompositionContext;
  const foundation = precomputeBarryHarrisChordMelodyFoundation(context);
  const pipeline = runBarryHarrisChordMelodyPipeline(foundation, melody, harmonyBars.length, harmonyBars, {
    presetId: 'guitar_bass_duo',
  });
  const emptyScore: ScoreModel = {
    title: 'V83d BH duo',
    parts: [
      {
        id: 'guitar',
        name: 'Guitar',
        instrumentIdentity: 'clean_electric_guitar',
        measures: [],
      },
    ],
  };
  const scored = applyChordMelodyToScore(emptyScore, pipeline.resolvedNotes, melody, 'guitar_bass_duo');
  const xmlResult = exportScoreModelToMusicXml(scored, { bpm: 120, preserveChordKindLiterals: true });
  return { pipeline, scored, xml: xmlResult.xml ?? '' };
}

type AssertResult = { label: string; pass: boolean; detail?: string };

function printAssertions(title: string, assertions: AssertResult[]): boolean {
  console.log(`\n=== ${title} ===`);
  let all = true;
  for (const a of assertions) {
    console.log(`${a.pass ? 'PASS' : 'FAIL'}: ${a.label}${a.detail ? ` (${a.detail})` : ''}`);
    if (!a.pass) all = false;
  }
  console.log(`CHECK ${all ? 'PASS' : 'FAIL'}`);
  return all;
}

function assertV83dPhase1OnScore(
  scored: ScoreModel,
  xml: string,
  melody: readonly ImportMelodyNote[],
  passingDimCount: number
): boolean {
  const v1 = voiceNotes(scored, 1);
  const v2 = voiceNotes(scored, 2);

  const melodyLocked = melody.every((m) => {
    const hit = v1.find(
      (n) => n.bar === m.bar && Math.abs(n.startBeat - m.onsetBeat) < 0.02 && n.pitch === m.midiPitch
    );
    return !!hit;
  });

  const melodyPitchSeq = [...melody].map((m) => m.midiPitch).join(',');
  const v1PitchSeq = [...melody]
    .map((m) => v1.find((n) => n.bar === m.bar && Math.abs(n.startBeat - m.onsetBeat) < 0.02)?.pitch)
    .filter((p): p is number => p != null)
    .join(',');
  const pitchesUnchanged = melodyPitchSeq === v1PitchSeq;

  const weakBeatComp = v2.filter((n) => isWeakBeat(n.startBeat));
  const passingDimsExported = passingDimCount > 0 ? weakBeatComp.length >= passingDimCount : weakBeatComp.length >= 1;

  let staggerHits = 0;
  for (const m of melody) {
    const inner = v2.filter((n) => n.bar === m.bar);
    if (inner.some((n) => Math.abs(n.startBeat - m.onsetBeat) >= 0.02)) staggerHits++;
  }
  const innerStaggered = staggerHits >= Math.min(4, melody.length);

  const schema = validateMusicXmlSchema(xml);

  return printAssertions('V83d Phase 1 - exported duo comp rhythm', [
    {
      label: 'melody v1 onsets + pitches locked to import',
      pass: melodyLocked && pitchesUnchanged,
      detail: `v1=${v1.length} melody=${melody.length}`,
    },
    {
      label: 'inner v2 onsets staggered vs melody (>=4 bars or all)',
      pass: innerStaggered,
      detail: `staggerHits=${staggerHits}`,
    },
    {
      label: 'passing_dim comp attacks on weak beats in export',
      pass: passingDimsExported,
      detail: `weakBeatComp=${weakBeatComp.length} passingDimCount=${passingDimCount}`,
    },
    {
      label: 'MusicXML schema valid',
      pass: schema.valid,
      detail: schema.errors?.[0],
    },
  ]);
}

function writeV83dQaExport(): { xml: string; scored: ScoreModel; melody: ImportMelodyNote[] } {
  const xmlPath = resolveJazzBenchmarkMusicXmlPath();
  const ir = musicXmlToImportTimeline(fs.readFileSync(xmlPath, 'utf8'));
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);
  const melody = [...ir.melodyLine];

  const gp = runGoldenPathOnce(88108, {
    presetId: 'guitar_bass_duo',
    harmonyMode: 'custom_locked',
    lockedHarmonyBarsRaw: [...locked],
    parsedChordBars: [...locked],
    chordProgressionText: locked.join(' | '),
    totalBars,
    importTimeline: ir,
    styleTransfer: true,
    targetComposer: 'barry_harris',
    styleTransferStrength: 1,
    preserveMelody: true,
    reorchestrate: false,
    suppressWybleVoiceLayoutForTest: true,
  });

  const generationOk =
    gp.score != null &&
    gp.score.parts.length > 0 &&
    (gp.xml?.length ?? 0) > 0 &&
    !gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e));
  if (!generationOk || !gp.xml || !gp.score) {
    throw new Error(`V83d QA export failed: ${gp.errors[0] ?? 'no xml/score'}`);
  }
  if (gp.errors.length > 0) {
    console.log(`V83d QA note: ${gp.errors.length} non-fatal gate message(s) (phrase/duo LOCK may still fail gp.success)`);
  }

  fs.mkdirSync(path.dirname(V83D_QA_PATH), { recursive: true });
  fs.writeFileSync(V83D_QA_PATH, gp.xml, 'utf8');
  console.log(`\nV83d QA written: ${V83D_QA_PATH}`);
  console.log(`bytes: ${gp.xml.length}`);
  return { xml: gp.xml, scored: gp.score, melody };
}

function main(): void {
  console.log('V83d Phase 1 auto-validation\n');

  const { pipeline, scored, xml } = runBhDuoPipeline(JAZZ_MELODY);
  const pipelineOk = assertV83dPhase1OnScore(
    scored,
    xml,
    JAZZ_MELODY,
    pipeline.summary.passingDimCount ?? 0
  );

  const qa = writeV83dQaExport();
  const passingFromMeta = pipeline.summary.passingDimCount ?? 0;
  const qaOk = assertV83dPhase1OnScore(qa.scored, qa.xml, qa.melody, passingFromMeta);

  const v2qa = voiceNotes(qa.scored, 2);
  const v1qa = voiceNotes(qa.scored, 1);
  console.log(`\nQA summary: v1 attacks=${v1qa.length} v2 comp attacks=${v2qa.length}`);
  console.log(
    `QA weak-beat comp: ${v2qa.filter((n) => isWeakBeat(n.startBeat)).map((n) => `bar${n.bar}@${n.startBeat}`).join(', ') || '(none)'}`
  );

  const allOk = pipelineOk && qaOk;
  console.log(`\nV83d Phase 1 overall: ${allOk ? 'PASS' : 'FAIL'}`);
  process.exit(allOk ? 0 : 1);
}

main();
