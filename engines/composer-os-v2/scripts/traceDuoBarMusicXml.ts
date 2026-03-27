/**
 * One-shot deterministic trace: one bar from guitar_bass_duo golden path → internal model → tick math → XML slice.
 * Run: npx ts-node --project ../../tsconfig.json scripts/traceDuoBarMusicXml.ts
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { DIVISIONS, MEASURE_DIVISIONS, type MeasureModel, type PartModel } from '../core/score-model/scoreModelTypes';
import {
  beatSpanToTicks,
  decomposeTicksToStandardParts,
  decomposeTicksToMinimalParts,
  tickSpecForLength,
} from '../core/export/musicXmlTickEncoding';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';

const BAR = 1; // 1-based measure index in score model
const PART_ID = 'guitar';

function snapEighthBeat(b: number): number {
  return Math.round(b * 2) / 2;
}

function tracePartMeasure(part: PartModel, measureIndex: number, label: string): void {
  const m = part.measures.find((x) => x.index === measureIndex);
  if (!m) {
    console.log(`No measure ${measureIndex} on ${label}`);
    return;
  }
  console.log(`\n=== ${label} measure ${measureIndex} (model index) ===`);
  const evs = [...m.events].filter((e) => e.kind === 'note' || e.kind === 'rest').sort((a, b) => a.startBeat - b.startBeat);
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    const sb = e.startBeat;
    const eb = sb + e.duration;
    const { start: startDiv, end: endDiv } = beatSpanToTicks(sb, eb);
    const durDiv = endDiv - Math.max(startDiv, 0);
    const std = decomposeTicksToStandardParts(durDiv);
    const min = decomposeTicksToMinimalParts(durDiv);
    const kind = e.kind === 'note' ? `note pitch=${(e as { pitch: number }).pitch}` : 'rest';
    console.log(`  [${i}] ${kind}`);
    console.log(`      beats: start=${sb} end=${eb} dur=${e.duration}`);
    console.log(`      ticks: startDiv=${startDiv} endDiv=${endDiv} durDiv=${durDiv} (divisions=${DIVISIONS})`);
    console.log(`      decompose(standard)=${std.join('+')} (${std.reduce((a, b) => a + b, 0)})`);
    console.log(`      decompose(minimal)=${min.join('+')} (${min.reduce((a, b) => a + b, 0)})`);
    for (const t of std.length ? std : min) {
      const spec = tickSpecForLength(t);
      console.log(`        part ticks=${t} → type=${spec.type} dots=${spec.dots}`);
    }
    const sb8 = snapEighthBeat(sb);
    const eb8 = snapEighthBeat(eb);
    console.log(`      eighth-snap: ${sb}→${sb8}, ${eb}→${eb8} (would change span if applied to export)`);
  }
}

function extractMeasureXml(xml: string, partId: string, measureNumber: number): string {
  const partOpen = `<part id="${partId}">`;
  const i0 = xml.indexOf(partOpen);
  if (i0 < 0) return '';
  const sub = xml.slice(i0);
  const re = new RegExp(`<measure number="${measureNumber}"[\\s\\S]*?</measure>`, 'm');
  const m = sub.match(re);
  return m ? m[0] : '';
}

function main(): void {
  const seed = 12345;
  const r = runGoldenPath(seed, {
    presetId: 'guitar_bass_duo',
    totalBars: 8,
    harmonyMode: 'builtin',
  });
  if (!r.success || !r.score) {
    console.error('runGoldenPath failed', r);
    process.exit(1);
  }
  const guitar = r.score.parts.find((p) => p.id === PART_ID);
  const bass = r.score.parts.find((p) => p.id === 'bass');
  if (!guitar || !bass) {
    console.error('missing parts');
    process.exit(1);
  }

  console.log(`Trace: seed=${seed} preset=guitar_bass_duo BAR=${BAR} divisions=${DIVISIONS} measureDivisions=${MEASURE_DIVISIONS}`);

  tracePartMeasure(guitar, BAR, 'guitar (internal)');
  tracePartMeasure(bass, BAR, 'bass (internal)');

  const exp = exportScoreModelToMusicXml(r.score, { minimizeNoteFragmentation: false });
  if (!exp.success || !exp.xml) {
    console.error('export failed', exp.errors);
    process.exit(1);
  }
  const mxG = extractMeasureXml(exp.xml, 'guitar', BAR);
  const mxB = extractMeasureXml(exp.xml, 'bass', BAR);
  console.log(`\n=== exported XML snippet guitar measure ${BAR} (full) ===\n${mxG}`);
  console.log(`\n=== exported XML snippet bass measure ${BAR} (full) ===\n${mxB}`);

  console.log('\n=== Notation-safe target (eighth-beat attack grid) ===');
  console.log('Attacks on beats 0, 0.5, 1, …, 3.5 only → tick positions multiples of 240 @ divisions=480.');
  console.log('Sum of all <duration> in one voice must equal ' + MEASURE_DIVISIONS + '.');
}

main();
