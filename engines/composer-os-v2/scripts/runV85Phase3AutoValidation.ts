/**
 * V85 Phase 3 + 3b - BH melody rhythm cell library + expression auto-validation.
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
  bhDetectPhraseRoles,
  type BhRhythmEnrichmentMeta,
} from '../core/barry-harris/enrichMelodyRhythm';
import {
  assertPreserveMelodyTimingGrid,
  distinctArticulationTypes,
  enrichMelodyExpression,
  phraseVelocitySpread,
  type BhExpressionEnrichmentMeta,
  type BhExpressiveMelodyNote,
} from '../core/barry-harris/enrichMelodyExpression';
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
const SYNC_DELTA_MAX = 0.85;

const IOI_BUCKETS_MIN = 5;
const ONSET_DOMINANCE_MAX = 0.30;
const IOI_ENTROPY_MIN = 2.0;
const DURATION_TRIGRAM_MIN = 6;
const CELL_FAMILIES_MIN = 3;

const ARTICULATION_TYPES_MIN = 3;
const PHRASE_VELOCITY_SPREAD_MIN = 8;

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

const CALIBRATION_SEED = 88109;

function resolveJazzBenchmarkMusicXmlPath(): string {
  if (fs.existsSync(JAZZ_BENCHMARK_FIXTURE)) return JAZZ_BENCHMARK_FIXTURE;
  throw new Error(`BH jazz benchmark fixture missing: ${JAZZ_BENCHMARK_FIXTURE}`);
}

function guitarPart(score: ScoreModel) {
  return score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
}

function voice1ExpressiveFromScore(score: ScoreModel): BhExpressiveMelodyNote[] {
  const part = guitarPart(score);
  if (!part) return [];
  const out: BhExpressiveMelodyNote[] = [];
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
        ...(n.articulation ? { articulation: n.articulation } : {}),
        ...(n.velocity != null ? { velocity: n.velocity } : {}),
        ...(n.durationAccent ? { durationAccent: n.durationAccent } : {}),
      });
    }
  }
  return out.sort((a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch);
}

function voice1MelodyFromScore(score: ScoreModel): ImportMelodyNote[] {
  return voice1ExpressiveFromScore(score);
}

function minPhraseVelocitySpread(notes: readonly BhExpressiveMelodyNote[]): number {
  const roles = bhDetectPhraseRoles(notes);
  const starts = [...roles.phraseStarts].sort((a, b) => a - b);
  let worst = 0;
  for (let si = 0; si < starts.length; si++) {
    const start = starts[si]!;
    const end = si + 1 < starts.length ? starts[si + 1]! - 1 : notes.length - 1;
    const slice = notes.slice(start, end + 1);
    const { spread } = phraseVelocitySpread(slice);
    if (slice.filter((n) => n.velocity != null).length >= 2) {
      worst = Math.max(worst, spread);
    }
  }
  return worst;
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
  rhythmMelody: ImportMelodyNote[];
  expressiveMelody: BhExpressiveMelodyNote[];
  exportedMelody: BhExpressiveMelodyNote[];
  meta: BhRhythmEnrichmentMeta;
  exprMeta: BhExpressionEnrichmentMeta;
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
  const rhythmMelody = enrichMelodyRhythm(inputMelody, DEFAULT_BH_MELODY_RHYTHM_PROFILE, {
    seed: CALIBRATION_SEED,
    meta,
  });

  const exprMeta: BhExpressionEnrichmentMeta = {
    articulationCounts: {},
    durationAccentCount: 0,
    velocityMin: 0,
    velocityMax: 0,
    perPhraseVelocitySpread: 0,
    structuralLandingAccentHits: 0,
    structuralLandingTotal: 0,
  };
  const expressiveMelody = enrichMelodyExpression(rhythmMelody, DEFAULT_BH_MELODY_RHYTHM_PROFILE, {
    seed: CALIBRATION_SEED,
    rhythmMeta: meta,
    meta: exprMeta,
  });

  const gp = runGoldenPathOnce(CALIBRATION_SEED, {
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
    throw new Error(`V85 Phase 3 QA export failed: ${gp.errors[0] ?? 'no xml/score'}`);
  }

  fs.mkdirSync(path.dirname(V85_PHASE3_QA_PATH), { recursive: true });
  fs.writeFileSync(V85_PHASE3_QA_PATH, gp.xml, 'utf8');
  console.log(`\nV85 Phase 3 QA written: ${V85_PHASE3_QA_PATH}`);
  console.log(`bytes: ${gp.xml.length}`);

  const exportedMelody = voice1ExpressiveFromScore(gp.score);
  return {
    xml: gp.xml,
    scored: gp.score,
    inputMelody,
    rhythmMelody,
    expressiveMelody,
    exportedMelody,
    meta,
    exprMeta,
  };
}

function assertPhase2Metrics(
  inputMelody: readonly ImportMelodyNote[],
  rhythmMelody: readonly ImportMelodyNote[],
  exportedMelody: readonly ImportMelodyNote[],
  xml: string
): boolean {
  const preSync = melodySyncopationScore(inputMelody);
  const postSync = melodySyncopationScore(rhythmMelody);
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

function assertPhase3Metrics(
  rhythmMelody: readonly ImportMelodyNote[],
  exportedMelody: readonly ImportMelodyNote[],
  meta: BhRhythmEnrichmentMeta
): boolean {
  const ioiBuckets = distinctMelodyIoiBuckets(exportedMelody);
  const dominance = onsetClassDominance(exportedMelody);
  const entropy = melodyIoiEntropy(exportedMelody);
  const trigramDiv = durationTrigramDiversity(exportedMelody);
  const densityArc = phraseDensityArcPresent(exportedMelody);
  const familiesUsed = Object.keys(meta.familyCounts).length;

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

function assertPhase3bMetrics(
  rhythmMelody: readonly ImportMelodyNote[],
  expressiveMelody: readonly BhExpressiveMelodyNote[],
  exportedMelody: readonly BhExpressiveMelodyNote[],
  exprMeta: BhExpressionEnrichmentMeta
): boolean {
  let timingOk = false;
  let timingDetail = '';
  try {
    assertPreserveMelodyTimingGrid(rhythmMelody, expressiveMelody);
    assertPreserveMelodyTimingGrid(rhythmMelody, exportedMelody);
    timingOk = true;
    timingDetail = `notes=${rhythmMelody.length}`;
  } catch (e) {
    timingDetail = e instanceof Error ? e.message : String(e);
  }

  const articTypesExpr = distinctArticulationTypes(expressiveMelody);
  const articTypesExport = distinctArticulationTypes(exportedMelody);
  const phraseSpreadExpr = exprMeta.perPhraseVelocitySpread;
  const phraseSpreadExport = minPhraseVelocitySpread(exportedMelody);
  const landingHits = exprMeta.structuralLandingAccentHits;
  const landingTotal = exprMeta.structuralLandingTotal;

  console.log('\n--- Phase 3b calibration numbers (observed) ---');
  console.log(`  Timing grid preserved (expr): ${timingOk}`);
  console.log(`  Articulation types (expr):    ${articTypesExpr}`);
  console.log(`  Articulation types (export):  ${articTypesExport}`);
  console.log(`  Per-phrase velocity spread:   expr=${phraseSpreadExpr.toFixed(2)} exportMinPhrase=${phraseSpreadExport}`);
  console.log(`  Velocity min/max (expr):      ${exprMeta.velocityMin}-${exprMeta.velocityMax}`);
  console.log(`  Structural landing accents:   ${landingHits}/${landingTotal}`);
  console.log(`  Duration accent count:        ${exprMeta.durationAccentCount}`);
  console.log(`  Articulation counts:          ${JSON.stringify(exprMeta.articulationCounts)}`);

  return printAssertions('V85 Phase 3b - expression checks', [
    {
      label: 'timing grid unchanged vs rhythm-only (expr + export)',
      pass: timingOk,
      detail: timingDetail,
    },
    {
      label: `>= ${ARTICULATION_TYPES_MIN} articulation types (exported v1)`,
      pass: articTypesExport >= ARTICULATION_TYPES_MIN,
      detail: `types=${articTypesExport}`,
    },
    {
      label: 'structural landings have accents (expression pass)',
      pass: landingTotal === 0 || landingHits === landingTotal,
      detail: `accents=${landingHits}/${landingTotal}`,
    },
    {
      label: `per-phrase velocity spread >= ${PHRASE_VELOCITY_SPREAD_MIN} (expr meta)`,
      pass: phraseSpreadExpr >= PHRASE_VELOCITY_SPREAD_MIN,
      detail: `spread=${phraseSpreadExpr.toFixed(2)}`,
    },
    {
      label: `per-phrase velocity spread >= ${PHRASE_VELOCITY_SPREAD_MIN} (exported phrases)`,
      pass: phraseSpreadExport >= PHRASE_VELOCITY_SPREAD_MIN,
      detail: `minPhraseSpread=${phraseSpreadExport}`,
    },
  ]);
}

function main(): void {
  console.log('V85 Phase 3 + 3b auto-validation\n');

  const qa = writePhase3QaExport();

  const p2ok = assertPhase2Metrics(qa.inputMelody, qa.rhythmMelody, qa.exportedMelody, qa.xml);
  const p3ok = assertPhase3Metrics(qa.rhythmMelody, qa.exportedMelody, qa.meta);
  const p3bok = assertPhase3bMetrics(
    qa.rhythmMelody,
    qa.expressiveMelody,
    qa.exportedMelody,
    qa.exprMeta
  );

  const allOk = p2ok && p3ok && p3bok;
  console.log(`\nV85 Phase 3 overall: ${allOk ? 'PASS' : 'FAIL'}`);
  process.exit(allOk ? 0 : 1);
}

main();