/**
 * Sweep seeds × drum intensities — logs phase texture, mean drum velocity, fill-hit tally.
 */
import type { BigBandFormPlan } from '../core/big-band/bigBandPlanTypes';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import {
  getDrumPolicy,
  mapBigBandFormPhaseToPolicyPhase,
  type DrumIntensity,
} from '../core/big-band/bigBandDrumIntensity';

const seeds = [9001, 4242, 77777] as const;
const intensities: DrumIntensity[] = ['sparse', 'standard', 'driving'];

function phaseAtBar(fp: BigBandFormPlan, bar: number): string | undefined {
  return fp.slices.find((s) => bar >= s.startBar && bar <= s.endBar)?.phase;
}

function main(): void {
  const rows: string[] = [];
  rows.push('Seed | Intensity | Phase | timeTexture | avgVel | fillHits');

  for (const seed of seeds) {
    for (const intensity of intensities) {
      const r = runBigBandRealisation({
        seed,
        drumIntensity: intensity,
        totalBars: 32,
        suppressWybleVoiceLayoutForTest: true,
        title: `BB intensity ${seed} ${intensity}`,
      });
      if (!r.score) throw new Error('no score');
      const fp = r.planning.formPlan;
      const drums = r.score.parts.find((p) => p.id === 'bb_drums');
      if (!drums) throw new Error('no drums');

      let fillHits = 0;
      for (let bar = 1; bar <= fp.totalBars; bar++) {
        const m = drums.measures[bar - 1]!;
        const span = m.measureBeatSpanQuarters ?? 4;
        const half = span / 2;
        for (const e of m.events) {
          if (e.kind !== 'note') continue;
          const n = e as { motifRef?: string; startBeat?: number };
          if (n.motifRef === 'bb_drum_bs' && typeof n.startBeat === 'number' && n.startBeat >= half - 1e-6) {
            fillHits++;
          }
        }
      }

      const velByPhase = new Map<string, number[]>();
      for (let bar = 1; bar <= fp.totalBars; bar++) {
        const ph = phaseAtBar(fp, bar);
        if (!ph) continue;
        const m = drums.measures[bar - 1]!;
        for (const e of m.events) {
          if (e.kind !== 'note') continue;
          const n = e as { velocity?: number };
          if (n.velocity == null || !Number.isFinite(n.velocity)) continue;
          if (!velByPhase.has(ph)) velByPhase.set(ph, []);
          velByPhase.get(ph)!.push(n.velocity);
        }
      }

      for (const sl of fp.slices) {
        const pol = getDrumPolicy(mapBigBandFormPhaseToPolicyPhase(sl.phase), intensity);
        const vs = velByPhase.get(sl.phase) ?? [];
        const avg = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
        rows.push(
          `${seed} | ${intensity} | ${sl.phase} | ${pol.timeTexture} | ${avg.toFixed(1)} | ${fillHits}`
        );
      }
    }
  }

  console.log(rows.join('\n'));
}

main();
