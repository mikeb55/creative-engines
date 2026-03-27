/**
 * Inspection only: one score, first bass bar (measure 1), full model + tick + MusicXML trace.
 * Does not change generation or export.
 *
 * Run (from composer-os-v2):
 *   npx ts-node --project ../../tsconfig.json scripts/inspectBassBar1Trace.ts [seed]
 */

import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { parseChordProgressionInput } from '../core/harmony/chordProgressionParser';
import {
  DIVISIONS,
  MEASURE_DIVISIONS,
  type MeasureModel,
  type PartModel,
} from '../core/score-model/scoreModelTypes';
import {
  beatSpanToTicks,
  decomposeTicksToStandardParts,
  tickSpecForLength,
} from '../core/export/musicXmlTickEncoding';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';

const CHORD_PROGRESSION =
  'Am9 | C13 | Fmaj9 | B7alt | Em9 | G13 | Cmaj9 | F#7alt';

const BAR = 1;
const BASS_PART_ID = 'bass';

function extractPartMeasureXml(xml: string, partId: string, measureNumber: number): string {
  const partOpen = `<part id="${partId}">`;
  const i0 = xml.indexOf(partOpen);
  if (i0 < 0) return '';
  const sub = xml.slice(i0);
  const re = new RegExp(`<measure number="${measureNumber}"[\\s\\S]*?</measure>`, 'm');
  const m = sub.match(re);
  return m ? m[0] : '';
}

/** Sum every <duration>N</duration> in a measure fragment (duo bass is monophonic). */
function sumDurationTagsInMeasureXml(measureXml: string): number {
  let s = 0;
  const re = /<duration>(\d+)<\/duration>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(measureXml)) !== null) {
    s += parseInt(m[1], 10);
  }
  return s;
}

function traceBassBar(m: MeasureModel, label: string): void {
  const evs = [...m.events]
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .sort((a, b) => a.startBeat - b.startBeat);

  let sumBeats = 0;
  let sumTicksModel = 0;

  console.log(`\n=== ${label} ===`);
  console.log(`Events (score model order, bar index ${m.index}):`);

  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    const sb = e.startBeat;
    const durBeats = e.duration;
    const eb = sb + durBeats;
    const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb);
    const durTicks = endDiv - Math.max(startDiv, 0);
    const voice = e.voice ?? 1;

    sumBeats += durBeats;
    sumTicksModel += durTicks;

    const kind = e.kind === 'note' ? 'note' : 'rest';
    const pitchStr = e.kind === 'note' ? ` pitch=${(e as { pitch: number }).pitch}` : '';

    console.log(`  [${i}] ${kind}${pitchStr}`);
    console.log(`      start (beats): ${sb}`);
    console.log(`      duration (beats): ${durBeats}`);
    console.log(`      span ticks (quantizeBeatToTicks): startDiv=${startDiv} endDiv=${endDiv} → durationTicks=${durTicks} (divisions=${DIVISIONS})`);

    const parts = decomposeTicksToStandardParts(durTicks);
    const typeStrs: string[] = [];
    for (const t of parts) {
      const spec = tickSpecForLength(t);
      typeStrs.push(`${spec.type}${spec.dots ? ` dots=${spec.dots}` : ''} (${t} ticks)`);
    }
    console.log(`      notation (standard decomposition of span): ${typeStrs.join(' + ')}`);
    console.log(`      voice: ${voice}`);
  }

  console.log(`\n--- TOTALS (score model, this bar) ---`);
  console.log(`  Sum of event durations (beats): ${sumBeats}`);
  console.log(`  Sum of quantized span ticks: ${sumTicksModel}`);
  console.log(`  Expected measure ticks @ 4/4: ${MEASURE_DIVISIONS}`);
}

function attackPositions(m: MeasureModel): number[] {
  const xs: number[] = [];
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') {
      xs.push((e as { startBeat: number }).startBeat);
    }
  }
  return [...new Set(xs.map((x) => Math.round(x * 10000) / 10000))].sort((a, b) => a - b);
}

function main(): void {
  const seed = process.argv[2] !== undefined ? parseInt(process.argv[2], 10) : 0;
  if (Number.isNaN(seed)) {
    console.error('Invalid seed');
    process.exit(1);
  }

  const parsed = parseChordProgressionInput(CHORD_PROGRESSION);
  if (!parsed.ok) {
    console.error('Chord parse failed:', parsed.error);
    process.exit(1);
  }

  console.log('=== inspectBassBar1Trace (inspection only) ===');
  console.log(`Chord progression (8 bars): ${CHORD_PROGRESSION}`);
  console.log(`Parsed bars: ${parsed.bars.join(' | ')}`);
  console.log(`runGoldenPathOnce(seed=${seed}) — single seed, no candidate sweep`);

  const r = runGoldenPathOnce(seed, {
    harmonyMode: 'custom',
    chordProgressionText: CHORD_PROGRESSION,
    parsedChordBars: parsed.bars,
  });

  if (!r.success || !r.score) {
    console.error('runGoldenPathOnce failed:', r.errors);
    process.exit(1);
  }

  const bass = r.score.parts.find((p) => p.id === BASS_PART_ID) as PartModel | undefined;
  if (!bass) {
    console.error('No bass part');
    process.exit(1);
  }

  const m1 = bass.measures.find((x) => x.index === BAR);
  if (!m1) {
    console.error(`No bass measure ${BAR}`);
    process.exit(1);
  }

  traceBassBar(m1, `Bass part, measure ${BAR} (internal model)`);

  console.log(`\n=== Attack positions only (note + rest onsets) ===`);
  console.log(JSON.stringify(attackPositions(m1)));

  const xmlFromResult = r.xml;
  let xml = xmlFromResult;
  if (!xml) {
    const exp = exportScoreModelToMusicXml(r.score, { minimizeNoteFragmentation: false });
    if (!exp.success || !exp.xml) {
      console.error('export failed', exp.errors);
      process.exit(1);
    }
    xml = exp.xml;
  }

  const mxBar = extractPartMeasureXml(xml, BASS_PART_ID, BAR);
  const durSumXml = sumDurationTagsInMeasureXml(mxBar);

  console.log(`\n=== Exact MusicXML for bass measure ${BAR} (full measure element) ===`);
  console.log(mxBar || '(empty extract — check part id / measure number)');

  console.log(`\n=== XML duration tag sum (all <duration> in this measure) ===`);
  console.log(`  ${durSumXml} (expected ${MEASURE_DIVISIONS} for full 4/4 bar)`);

  console.log(`\n=== Run manifest seed (this run) ===`);
  console.log(`  ${r.runManifest.seed}`);
}

main();
