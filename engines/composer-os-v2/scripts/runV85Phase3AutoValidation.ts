/**
 * V85 Phase 3 - BH melody rhythm cell library auto-validation.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/scripts/runV85Phase3AutoValidation.ts
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
  durationTrigramDiversity,
  melodyIoiEntropy,
  onsetClassDominance,
  phraseDensityArcPresent,
  type BhRhythmEnrichmentMeta,
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

// ---------------------------------------------------------------------------
// Phase 2 thresholds (unchanged from V83d)
// ---------------------------------------------------------------------------
const OFFBEAT_RATIO_MIN = 0.55;
const OFFBEAT_RATIO_MAX = 0.75;
const SYNC_DELTA_MIN = 0.15;
const SYNC_DELTA_MAX = 0.85;

// ---------------------------------------------------------------------------
// Phase 3 thresholds (calibrated after first run)
// ---------------------------------------------------------------------------
const IOI_BUCKETS_MIN = 5;
// Calibrated on BH_Benchmark_JazzMelody (seed 88109) after V85 Phase 3 cell library:
// buckets=11 entropy=3.374 dominance=0.250 trigrams=13 families=5 arc=true offbeat=0.688
const ONSET_DOMINANCE_MAX = 0.30;  // dominant onset class <= 30% (degenerate ladder ~0.45+)
const IOI_ENTROPY_MIN = 2.0;       // Shannon entropy floor (bits); degenerate ladder ~1.0
const DURATION_TRIGRAM_MIN = 6;    // distinct duration 3-grams; degenerate ~1-2
const CELL_FAMILIES_MIN = 3;       // >= 3 distinct cell families used

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------
const V85_PHASE3_QA_PATH = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'Song Mode',
  'v85-phase3-check.musicxml'
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

function writePhase3QaExport(): {
  xml: string;
  scored: ScoreModel;
  inputMelody: ImportMelodyNote[];
  enrichedMelody: ImportMelodyNote[];
  exportedMelody: ImportMelodyNote[];
  meta: BhRhythmEnrichmentMeta;
} {
  const xmlPath = resolveJazzBenchmarkMusicXmlPath();
  const ir = musicXmlToImportTimeline(fs.readFileSync(xmlPath, 'utf8'));
  const locked = importTimelineToLockedHarmony(ir);
  const totalBars = Math.max(locked.length, ir.bars, 8);
  const inputMelody = [...ir.melodyLine];

  const meta: BhRhythmEnrichmentMeta = {
    familyCounts: {},
    totalNotes: 0,
  };
  const enrichedMelody = enrichMelodyRhythm(inputMelody, DEFAULT_BH_MELODY_RHYTHM_PROFILE, {
    seed: 88109,
    meta,
  });

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
    const outDir = path.dirname(V85_PHASE3_QA_PATH);
    if (fs.existsSync(outDir)) {
      const existing = fs.readdirSync(outDir).filter((f) => f.includes('v85') || f.includes('BH'));
      console.log(`Song Mode folder listing (v85/BH): ${existing.join(', ') || '(none)'}`);
    }
    throw new Error(`V85 Phase 3 QA export failed: ${gp.errors[0] ?? 'no xml/score'}`);
  }

  fs.mkdirSync(path.dirname(V85_PHASE3_QA_PATH), { recursive: true });
  fs.writeFileSync(V85_PHASE3_QA_PATH, gp.xml, 'utf8');
  console.log(`\nV85 Phase 3 QA written: ${V85_PHASE3_QA_PATH}`);
  console.log(`bytes: ${gp.xml.length}`);

  const exportedMelody = voice1MelodyFromScore(gp.score);
  return {
    xml: gp.xml,
    scored: gp.score,
    inputMelody,
    enrichedMelody,
    exportedMelody,
    meta,
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

  return printAssertions('V85 Phase 3 - Phase 2 checks (preserved)', [
    {
      label: `syncopation delta in [+${SYNC_DELTA_MIN}, +${SYNC_DELTA_MAX}]`,
      pass: syncDelta >= SYNC_DELTA_MIN && syncDelta <= SYNC_DELTA_MAX,
      detail: `pre=${preSync.toFixed(3)} post=${postSync.toFixed(3)} delta=${syncDelta.toFixed(3)}`,
    },
    {
      label: `offbeatRatio in [${OFFBEAT_RATIO_MIN}, ${OFFBEAT_RATIO_MAX}] (exported v1)`,
      pass: offbeat >= OFFBEAT_RATIO_MIN && offbeat <= OFFBEAT_RATIO_MAX,
      detail: `offbeatRatio=${offbeat.toFixed(3)}`,
    },
    {
      label: 'structural landings on beat 1/3 (exported v1)',
      pass: structuralLandings >= 1,
      detail: `structuralLandings=${structuralLandings}`,
    },
    {
      label: 'pitch sequence bit-exact (input vs exported v1)',
      pass: pitchExact,
      detail: pitchDetail,
    },
    {
      label: `>= 3 distinct IOI buckets (exported v1)`,
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

function assertPhase3Metrics(
  enrichedMelody: readonly ImportMelodyNote[],
  exportedMelody: readonly ImportMelodyNote[],
  meta: BhRhythmEnrichmentMeta
): boolean {
  const ioiBuckets = distinctMelodyIoiBuckets(exportedMelody);
  const dominance = onsetClassDominance(exportedMelody);
  const entropy = melodyIoiEntropy(exportedMelody);
  const trigramDiv = durationTrigramDiversity(exportedMelody);
  const densityArc = phraseDensityArcPresent(exportedMelody);
  const familiesUsed = Object.keys(meta.familyCounts).length;

  // Print calibration numbers
  console.log('\n--- Phase 3 calibration numbers (observed) ---');
  console.log(`  IOI buckets:        ${ioiBuckets}`);
  console.log(`  Onset dominance:    ${dominance.toFixed(3)} (threshold: <= ${ONSET_DOMINANCE_MAX})`);
  console.log(`  IOI entropy:        ${entropy.toFixed(3)} (threshold: >= ${IOI_ENTROPY_MIN})`);
  console.log(`  Duration 3-grams:   ${trigramDiv} (threshold: >= ${DURATION_TRIGRAM_MIN})`);
  console.log(`  Phrase density arc: ${densityArc}`);
  console.log(`  Cell families used: ${familiesUsed} (threshold: >= ${CELL_FAMILIES_MIN})`);
  console.log(`  Family counts:      ${JSON.stringify(meta.familyCounts)}`);
  console.log(`  Dominant family:    ${meta.dominantFamily ?? '(none)'}`);
  console.log(`  IOI entropy (meta): ${(meta.ioiEntropy ?? 0).toFixed(3)}`);
  console.log(`  Offbeat ratio (interior): ${(meta.offbeatRatio ?? 0).toFixed(3)}`);

  return printAssertions('V85 Phase 3 - cell library checks', [
    {
      label: `>= ${IOI_BUCKETS_MIN} distinct IOI buckets`,
      pass: ioiBuckets >= IOI_BUCKETS_MIN,
      detail: `buckets=${ioiBuckets}`,
    },
    {
      label: `dominant onset class <= ${ONSET_DOMINANCE_MAX}`,
      pass: dominance <= ONSET_DOMINANCE_MAX,
      detail: `dominance=${dominance.toFixed(3)}`,
    },
    {
      label: `IOI entropy >= ${IOI_ENTROPY_MIN} bits`,
      pass: entropy >= IOI_ENTROPY_MIN,
      detail: `entropy=${entropy.toFixed(3)}`,
    },
    {
      label: `>= ${DURATION_TRIGRAM_MIN} distinct duration 3-grams`,
      pass: trigramDiv >= DURATION_TRIGRAM_MIN,
      detail: `trigrams=${trigramDiv}`,
    },
    {
      label: 'phrase density arc sparse->dense->land (exported v1)',
      pass: densityArc,
      detail: `arc=${densityArc} notes=${exportedMelody.length}`,
    },
    {
      label: `>= ${CELL_FAMILIES_MIN} cell families used`,
      pass: familiesUsed >= CELL_FAMILIES_MIN,
      detail: `families=${familiesUsed} (${Object.keys(meta.familyCounts).join(', ')})`,
    },
  ]);
}

function main(): void {
  console.log('V85 Phase 3 auto-validation\n');

  const qa = writePhase3QaExport();

  const p2ok = assertPhase2Metrics(
    qa.inputMelody,
    qa.enrichedMelody,
    qa.exportedMelody,
    qa.xml
  );

  const p3ok = assertPhase3Metrics(qa.enrichedMelody, qa.exportedMelody, qa.meta);

  const allOk = p2ok && p3ok;
  console.log(`\nV85 Phase 3 overall: ${allOk ? 'PASS' : 'FAIL'}`);
  process.exit(allOk ? 0 : 1);
}

main();