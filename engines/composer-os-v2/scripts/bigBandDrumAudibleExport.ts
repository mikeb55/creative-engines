/**
 * One-off: export Big Band scores + drum/bass stats for audible QA (run via ts-node).
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { bigBandDrumFeelClass } from '../core/big-band/bigBandScoreBuilder';
import { BB_PART_RHYTHM } from '../core/big-band/buildBigBandOrchestrationPlan';
import { writeScoreMidi } from '../core/export/midiScoreWriter';

const OUT_ROOT = path.join(
  'C:',
  'Users',
  'mike',
  'Documents',
  'Mike Composer Files',
  'BigBandDrumTest'
);

function drumSig(measure: ScoreModel['parts'][0]['measures'][0]): string {
  return measure.events
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .map((e) =>
      e.kind === 'note'
        ? `n${e.voice}:${e.pitch}:${e.startBeat}:${e.duration}${(e as { motifRef?: string }).motifRef ? '#' + (e as { motifRef?: string }).motifRef : ''}`
        : `r${e.voice}:${e.startBeat}:${e.duration}`
    )
    .join('|');
}

function bassRangeForBars(score: ScoreModel, startBar: number, endBar: number): { min: number; max: number; avg: number } {
  const part = score.parts.find((p) => p.id === BB_PART_RHYTHM);
  const pitches: number[] = [];
  if (!part) return { min: NaN, max: NaN, avg: NaN };
  for (let b = startBar; b <= endBar; b++) {
    const m = part.measures[b - 1];
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind === 'note' && Number.isFinite((e as { pitch?: number }).pitch)) {
        pitches.push((e as { pitch: number }).pitch);
      }
    }
  }
  if (pitches.length === 0) return { min: NaN, max: NaN, avg: NaN };
  const sum = pitches.reduce((a, x) => a + x, 0);
  return { min: Math.min(...pitches), max: Math.max(...pitches), avg: sum / pitches.length };
}

function main(): void {
  fs.mkdirSync(OUT_ROOT, { recursive: true });

  const seeds = [9001, 4242] as const;
  const rows: string[] = [];
  rows.push('Seed | Section | DrumFeel | Bass min | Bass max');
  rows.push('-----|-----------|----------|----------|----------');

  const written: { seed: number; dir: string; xml: string; mid?: string }[] = [];

  for (const seed of seeds) {
    const dir = path.join(OUT_ROOT, String(seed));
    fs.mkdirSync(dir, { recursive: true });

    const r = runBigBandRealisation({
      seed,
      totalBars: 16,
      title: `BigBand Drum Test ${seed}`,
      suppressWybleVoiceLayoutForTest: true,
    });

    if (!r.score || !r.exportPipeline.ok || !r.exportPipeline.xml) {
      throw new Error(`generation failed seed ${seed}: ${r.exportPipeline.errors?.join('; ')}`);
    }

    const base = `big_band_${seed}_16bars`;
    const xmlPath = path.join(dir, `${base}.musicxml`);
    fs.writeFileSync(xmlPath, r.exportPipeline.xml, 'utf8');
    const midPath = writeScoreMidi(r.score, dir, base, r.score.barMeterMap, r.score.tempo ?? 140);

    written.push({ seed, dir, xml: xmlPath, mid: midPath });

    const fp = r.planning.formPlan;
    const drums = r.score.parts.find((p) => p.id === 'bb_drums')!;

    console.log(`\n=== Seed ${seed} ===`);
    console.log(`MusicXML: ${xmlPath}`);
    console.log(`MIDI:     ${midPath ?? '(write failed)'}`);

    for (const sl of fp.slices) {
      const feel = bigBandDrumFeelClass(sl.phase, sl.index);
      const br = bassRangeForBars(r.score, sl.startBar, sl.endBar);
      const uniq = new Set<string>();
      for (let bar = sl.startBar; bar <= sl.endBar; bar++) {
        uniq.add(drumSig(drums.measures[bar - 1]!));
      }
      console.log(
        `  section ${sl.phase} [slice ${sl.index}] DrumFeel=${feel} bass min/max/avg=${br.min.toFixed(1)}/${br.max.toFixed(1)}/${br.avg.toFixed(1)} uniqueDrumSigs=${uniq.size}`
      );
      rows.push(
        `${seed} | ${sl.phase} | ${feel} | ${Number.isFinite(br.min) ? Math.round(br.min) : '—'} | ${Number.isFinite(br.max) ? Math.round(br.max) : '—'}`
      );
    }

    spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref();
  }

  console.log('\n=== Summary table ===\n');
  console.log(rows.join('\n'));
}

main();
