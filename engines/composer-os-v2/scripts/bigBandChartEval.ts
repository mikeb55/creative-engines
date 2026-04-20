/**
 * Minimal Big Band chart metrics (fixed seeds) — instrumentation only, not a GCE slice.
 */
import { BB_V1_5_SOLI_MOTIF, blendSoliMotifWithHeadTheme, generateBrassPunches, generateShoutChorus } from '../core/arranging/bigBandPatterns';
import { computeBigBandHeadLeadOffsets } from '../core/big-band/bigBandScoreBuilder';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import { chordSymbolRootPc } from '../core/voicing/ensembleHarmonyUtils';

const SEEDS = [50021, 50041, 50061];
const TOTAL_BARS = 32;

function main(): void {
  const rows: Array<Record<string, unknown>> = [];

  for (const seed of SEEDS) {
    const result = runBigBandRealisation({ seed, totalBars: TOTAL_BARS });
    if (!result.score) {
      rows.push({ seed, error: 'no_score' });
      continue;
    }

    const alto = result.score.parts.find((p) => p.id === 'bb_alto_sax');
    const drums = result.score.parts.find((p) => p.id === 'bb_drums');
    const chords = alto?.measures.map((m) => (typeof m.chord === 'string' ? m.chord : 'Cmaj7')) ?? [];

    const head =
      chords.length >= 8
        ? computeBigBandHeadLeadOffsets({
            chordSequence: chords,
            formPlan: result.planning.formPlan,
            wybleVoiceLayout: result.planning.orchestrationPlan.wybleVoiceLayout,
          })
        : [];

    const headRoots = chords.slice(0, 8).map((s) => chordSymbolRootPc(s) ?? 0);
    const blended =
      head.length === 8 ? blendSoliMotifWithHeadTheme(BB_V1_5_SOLI_MOTIF, head, headRoots) : [...BB_V1_5_SOLI_MOTIF];

    const brassMap = generateBrassPunches(chords, [0, 2]);
    const shoutMap = generateShoutChorus(chords);

    let hitBars = 0;
    let hitBarsWithDrumBs = 0;
    let drumNotesNonHit = 0;
    let nonHitBars = 0;

    for (let b = 1; b <= TOTAL_BARS; b++) {
      const ensembleHit =
        (brassMap.get(b)?.length ?? 0) > 0 || (shoutMap.get(b)?.length ?? 0) > 0;
      const dm = drums?.measures[b - 1];
      const notes = dm?.events.filter((e) => e.kind === 'note').length ?? 0;
      const bs =
        dm?.events.filter((e) => e.kind === 'note' && 'motifRef' in e && e.motifRef === 'bb_drum_bs').length ?? 0;

      if (ensembleHit) {
        hitBars += 1;
        if (bs >= 2) hitBarsWithDrumBs += 1;
      } else {
        nonHitBars += 1;
        drumNotesNonHit += notes;
      }
    }

    rows.push({
      seed,
      totalBars: TOTAL_BARS,
      headLeadMean: head.length === 8 ? head.reduce((a, x) => a + x, 0) / 8 : null,
      soliMotifDistinctFromBase:
        blended.length === BB_V1_5_SOLI_MOTIF.length &&
        blended.some((v, i) => v !== BB_V1_5_SOLI_MOTIF[i]),
      ensembleHitBars: hitBars,
      hitBarsWithBbDrumChord: hitBarsWithDrumBs,
      avgDrumNotesNonHitBar: nonHitBars > 0 ? drumNotesNonHit / nonHitBars : null,
    });
  }

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), samples: rows }, null, 2));
}

main();
