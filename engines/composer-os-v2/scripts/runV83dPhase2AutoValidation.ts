/**
 * V83d Phase 2 - BH melody rhythm enrichment auto-validation.
 * Run: npx.cmd tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runV83dPhase2AutoValidation.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  assertPreservePitchSequence,
  distinctMelodyIoiBuckets,
  enrichMelodyRhythm,
  melodyOffbeatRatio,
  melodyStructuralLandingCount,
  melodySyncopationScore,
} from '../core/barry-harris/enrichMelodyRhythm';
import { DEFAULT_BH_MELODY_RHYTHM_PROFILE } from '../core/barry-harris/bhMelodyRhythmProfile';
import {
  findDirectionTypeScopeViolations,
  findHarmonyChildOffsetViolations,
  validateMusicXmlSchema,
} from '../core/export/musicxmlValidation';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { importTimelineToLockedHarmony } from '../core/import/importTimelineAdapters';
import { musicXmlToImportTimeline } from '../core/import/musicXmlToImportTimeline';
import type { ImportMelodyNote } from '../core/import/mosaicImportTimeline';
import type { NoteEvent, ScoreModel } from '../core/score-model/scoreModelTypes';

const OFFBEAT_RATIO_MIN = 0.55;
const OFFBEAT_RATIO_MAX = 0.75;
const SYNC_DELTA_MIN = 0.15;
/** Reject saturated all-offgrid (delta ~1.0); allow enriched band aligned with offbeat window. */
const SYNC_DELTA_MAX = 0.85;

const V83D_PHASE2_QA_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'v83d-phase2-check.musicxml'
);

const JAZZ_BENCHMARK_FIXTURE = path.join(
  __dirname,
  '..',
  'core',
  'barry-harris',
  'test-fixtures',
  'BH_Benchmark_JazzMelody.musicxml'
);

function resolveJazzBenchmarkMusicXmlPath(): string {
  if (fs.existsSync(JAZZ_BENCHMARK_FIXTURE)) return JAZZ_BENCHMARK_FIXTURE;
  throw new Error(`BH jazz benchmark fixture missing: ${JAZZ_BENCHMARK_FIXTURE}`);
}

function guitarPart(score: ScoreModel) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function voice1MelodyFromScore(score: ScoreModel): ImportMelodyNote[] {
  const part = guitarPart(score);
  if (!part) return [];
  const out: ImportMelodyNote[] = [];
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      if ((n.voice ?? 1) !== 1) continue;
      out.push({
        bar: m.index,
        onsetBeat: n.startBeat,
        durationBeats: n.duration,
        midiPitch: n.pitch,
        confidence: 1,
        fieldOrigin: 'explicit',
      });
    }
  }
  return out.sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch);
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

function writePhase2QaExport(): {
  xml: string;
  scored: ScoreModel;
  inputMelody: ImportMelodyNote[];
  enrichedMelody: ImportMelodyNote[];
  exportedMelody: ImportMelodyNote[];
} {
  const xmlPath = resolveJazzBenchmarkMusicXmlPath();
  const ir = musicXmlToImportTimeline(fs.readFileSync(xmlPath, 'utf8'));
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);
  const inputMelody = [...ir.melodyLine];
  const enrichedMelody = enrichMelodyRhythm(inputMelody, DEFAULT_BH_MELODY_RHYTHM_PROFILE);

  const gp = runGoldenPathOnce(88109, {
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
    barryHarrisProfile: 'bebop_step',
  });

  const generationOk =
    gp.score != null &&
    gp.score.parts.length > 0 &&
    (gp.xml?.length ?? 0) > 0 &&
    !gp.errors.some((e) => /DESKTOP SONG MODE HARMONY|authority check/i.test(e));

  if (!generationOk || !gp.xml || !gp.score) {
    const outDir = path.dirname(V83D_PHASE2_QA_PATH);
    if (fs.existsSync(outDir)) {
      const existing = fs.readdirSync(outDir).filter((f) => f.includes('v83d') || f.includes('BH'));
      console.log(`Song Mode folder listing (v83d/BH): ${existing.join(', ') || '(none)'}`);
    }
    throw new Error(`V83d Phase 2 QA export failed: ${gp.errors[0] ?? 'no xml/score'}`);
  }

  fs.mkdirSync(path.dirname(V83D_PHASE2_QA_PATH), { recursive: true });
  fs.writeFileSync(V83D_PHASE2_QA_PATH, gp.xml, 'utf8');
  console.log(`\nV83d Phase 2 QA written: ${V83D_PHASE2_QA_PATH}`);
  console.log(`bytes: ${gp.xml.length}`);

  const exportedMelody = voice1MelodyFromScore(gp.score);
  return {
    xml: gp.xml,
    scored: gp.score,
    inputMelody,
    enrichedMelody,
    exportedMelody,
  };
}

function assertPhase2Metrics(
  inputMelody: readonly ImportMelodyNote[],
  enrichedMelody: readonly ImportMelodyNote[],
  exportedMelody: readonly ImportMelodyNote[],
  xml: string
): boolean {
  const preSync = melodySyncopationScore(inputMelody);
  const postSync = melodySyncopationScore(enrichedMelody);
  const syncDelta = postSync - preSync;

  const offbeat = melodyOffbeatRatio(exportedMelody);
  const structuralLandings = melodyStructuralLandingCount(exportedMelody);
  const ioiBuckets = distinctMelodyIoiBuckets(exportedMelody);

  let pitchExact = false;
  let pitchDetail = '';
  try {
    assertPreservePitchSequence(inputMelody, exportedMelody);
    pitchExact = true;
    pitchDetail = `count=${inputMelody.length}`;
  } catch (e) {
    pitchDetail = e instanceof Error ? e.message : String(e);
  }

  const schema = validateMusicXmlSchema(xml);
  const harmonyOffsets = findHarmonyChildOffsetViolations(xml);
  const directionScope = findDirectionTypeScopeViolations(xml);
  const schemaOk = schema.valid && harmonyOffsets.length === 0 && directionScope.length === 0;

  return printAssertions('V83d Phase 2 - BH melody rhythm enrichment', [
    {
      label: `syncopation delta in [+${SYNC_DELTA_MIN}, +${SYNC_DELTA_MAX}] (enriched vs input, not saturated)`,
      pass: syncDelta >= SYNC_DELTA_MIN && syncDelta <= SYNC_DELTA_MAX,
      detail: `pre=${preSync.toFixed(3)} post=${postSync.toFixed(3)} delta=${syncDelta.toFixed(3)}`,
    },
    {
      label: `offbeatRatio in [${OFFBEAT_RATIO_MIN}, ${OFFBEAT_RATIO_MAX}] (exported v1)`,
      pass: offbeat >= OFFBEAT_RATIO_MIN && offbeat <= OFFBEAT_RATIO_MAX,
      detail: `offbeatRatio=${offbeat.toFixed(3)}`,
    },
    {
      label: 'structural landings on beat 1/3 at phrase start or cadence (exported v1)',
      pass: structuralLandings >= 1,
      detail: `structuralLandings=${structuralLandings}`,
    },
    {
      label: 'pitch sequence bit-exact (input vs exported v1)',
      pass: pitchExact,
      detail: pitchDetail,
    },
    {
      label: '>= 3 distinct IOI buckets (exported v1)',
      pass: ioiBuckets >= 3,
      detail: `buckets=${ioiBuckets}`,
    },
    {
      label: 'MusicXML schema + harmony offset + direction scope',
      pass: schemaOk,
      detail: schemaOk
        ? 'valid'
        : schema.errors?.[0] ?? harmonyOffsets[0] ?? directionScope[0] ?? 'invalid',
    },
  ]);
}

function main(): void {
  console.log('V83d Phase 2 auto-validation\n');

  const qa = writePhase2QaExport();
  const ok = assertPhase2Metrics(
    qa.inputMelody,
    qa.enrichedMelody,
    qa.exportedMelody,
    qa.xml
  );

  console.log(`\nV83d Phase 2 overall: ${ok ? 'PASS' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
}

main();
