import { BB_V1_5_SOLI_MOTIF, blendSoliMotifWithHeadTheme, generateBrassPunches, generateShoutChorus } from '../core/arranging/bigBandPatterns';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import type { NoteEvent } from '../core/score-model/scoreModelTypes';

/** Seeds must all show full 8-bar designated sax soli (bars 17–24) and tacet brass there. */
const SEEDS = [50021, 50031, 50041, 50051, 50061];
const TOTAL_BARS = 32;

function eventCountInRange(
  measures: Array<{ events: Array<{ kind: string }> }>,
  startBar: number,
  endBar: number
): number {
  let count = 0;
  for (let b = startBar; b <= endBar; b++) {
    const m = measures[b - 1];
    if (!m) continue;
    count += m.events.filter((e) => e.kind === 'note').length;
  }
  return count;
}

function contiguousSoundingBars(
  measures: Array<{ events: Array<{ kind: string }> }>,
  startBar: number,
  endBar: number
): number {
  let run = 0;
  let best = 0;
  for (let b = startBar; b <= endBar; b++) {
    const m = measures[b - 1];
    const sounding = Boolean(m && m.events.some((e) => e.kind === 'note'));
    if (sounding) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function getPart(result: ReturnType<typeof runBigBandRealisation>, id: string) {
  const part = result.score?.parts.find((p) => p.id === id);
  if (!part) throw new Error(`Missing part: ${id}`);
  return part;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function chordSequenceFromScore(measures: Array<{ chord?: string }>, fallback: string): string[] {
  return measures.map((m) => (typeof m.chord === 'string' && m.chord.length > 0 ? m.chord : fallback));
}

function drumNoteCount(measure: { events: Array<{ kind: string }> }): number {
  return measure.events.filter((e) => e.kind === 'note').length;
}

function drumBsMotifCount(measure: { events: Array<{ kind: string; motifRef?: string }> }): number {
  return measure.events.filter((e) => e.kind === 'note' && (e as NoteEvent).motifRef === 'bb_drum_bs').length;
}

function serialiseSoliWindowAlto(altoMeasures: Array<{ events: Array<{ kind: string; pitch?: number }> }>): string {
  const parts: string[] = [];
  for (let b = 17; b <= 24; b++) {
    const m = altoMeasures[b - 1];
    if (!m) continue;
    const pitches = m.events.filter((e) => e.kind === 'note').map((e) => e.pitch ?? 0);
    parts.push(pitches.join(','));
  }
  return parts.join('|');
}

function main(): void {
  const soliStart = 17;
  const soliEnd = 24;

  const blendProbe = blendSoliMotifWithHeadTheme(BB_V1_5_SOLI_MOTIF, [3, -2, 1, 4, 2, 0, -1, 2], [0, 2, 5, 5, 0, 9, 2, 7]);
  assert(
    blendProbe.some((v, i) => v !== BB_V1_5_SOLI_MOTIF[i]),
    'V2 blend: expected head offsets to perturb the soli motif (unit check)'
  );

  for (const seed of SEEDS) {
    const result = runBigBandRealisation({ seed, totalBars: TOTAL_BARS });
    assert(Boolean(result.score), `Score was not generated (seed=${seed})`);
    assert(result.planning.validation.ok, `Planning invalid (seed=${seed}): ${result.planning.validation.errors.join('; ')}`);

    const alto = getPart(result, 'bb_alto_sax');
    const tenor = getPart(result, 'bb_tenor_sax');
    const trumpets = getPart(result, 'bb_trumpets');
    const trombones = getPart(result, 'bb_trombones');

    assert(alto.measures.length === TOTAL_BARS, `[${seed}] Expected ${TOTAL_BARS} bars, got ${alto.measures.length}`);

    const altoRun = contiguousSoundingBars(alto.measures, soliStart, soliEnd);
    const tenorRun = contiguousSoundingBars(tenor.measures, soliStart, soliEnd);
    assert(altoRun === 8, `[${seed}] Expected alto contiguous soli run 8 in 17–24, got ${altoRun}`);
    assert(tenorRun === 8, `[${seed}] Expected tenor contiguous soli run 8 in 17–24, got ${tenorRun}`);

    const brassSoliWindowNotes =
      eventCountInRange(trumpets.measures, soliStart, soliEnd) +
      eventCountInRange(trombones.measures, soliStart, soliEnd);
    assert(brassSoliWindowNotes === 0, `[${seed}] Expected brass tacet in 17–24, got ${brassSoliWindowNotes} notes`);

    const brassPunchNotes =
      eventCountInRange(trumpets.measures, 1, TOTAL_BARS) + eventCountInRange(trombones.measures, 1, TOTAL_BARS);
    const brassEndWindowNotes =
      eventCountInRange(trumpets.measures, 25, TOTAL_BARS) + eventCountInRange(trombones.measures, 25, TOTAL_BARS);

    assert(brassPunchNotes >= 40, `[${seed}] Expected non-trivial brass activity, got ${brassPunchNotes} notes`);
    assert(brassEndWindowNotes >= 20, `[${seed}] Expected shout/punch fragment near end, got ${brassEndWindowNotes} notes`);

    const formBars = result.planning.formPlan.totalBars;
    assert(formBars === TOTAL_BARS, `[${seed}] Form changed unexpectedly: ${formBars} bars`);

    const seq = chordSequenceFromScore(alto.measures, 'Cmaj7');
    const brassMap = generateBrassPunches(seq, [0, 2]);
    const shoutMap = generateShoutChorus(seq);
    const drums = getPart(result, 'bb_drums');
    let sumHitNotes = 0;
    let hitBars = 0;
    let sumNonHitNotes = 0;
    let nonHitBars = 0;
    let hitBarsWithBs = 0;
    for (let b = 1; b <= TOTAL_BARS; b++) {
      const m = drums.measures[b - 1];
      if (!m) continue;
      const ensembleHit =
        (brassMap.get(b)?.length ?? 0) > 0 || (shoutMap.get(b)?.length ?? 0) > 0;
      const n = drumNoteCount(m);
      const bs = drumBsMotifCount(m);
      if (ensembleHit) {
        hitBars += 1;
        sumHitNotes += n;
        if (bs >= 2) hitBarsWithBs += 1;
      } else {
        nonHitBars += 1;
        sumNonHitNotes += n;
        assert(bs === 0, `[${seed}] bar ${b}: expected no bb_drum_bs on non-ensemble-hit bars, got ${bs}`);
      }
    }
    assert(hitBars > 0 && nonHitBars > 0, `[${seed}] expected mix of hit and non-hit drum bars`);
    assert(
      hitBarsWithBs >= Math.floor(hitBars * 0.25),
      `[${seed}] expected drum composite kicks on a substantial share of ensemble-hit bars (got ${hitBarsWithBs}/${hitBars})`
    );
    assert(
      sumHitNotes / hitBars >= sumNonHitNotes / nonHitBars + 1.5,
      `[${seed}] drum density on ensemble-hit bars should exceed non-hit bars (hitAvg=${(sumHitNotes / hitBars).toFixed(
        2
      )} nonHitAvg=${(sumNonHitNotes / nonHitBars).toFixed(2)})`
    );

    const soliSig = serialiseSoliWindowAlto(alto.measures);
    const repeat = runBigBandRealisation({ seed, totalBars: TOTAL_BARS });
    const alto2 = getPart(repeat, 'bb_alto_sax');
    assert(
      serialiseSoliWindowAlto(alto2.measures) === soliSig,
      `[${seed}] soli window alto pitches should be deterministic across builds`
    );

    console.log(`[test:big-band-arranging] seed=${seed} OK — altoRun=8 tenorRun=8 brassSoli=0`);
  }

  console.log('[test:big-band-arranging] PASS (all seeds)');
  console.log(`- seeds checked: ${SEEDS.join(', ')}`);
  console.log(`- sax soli window: bars ${soliStart}-${soliEnd} (full 8 bars each part)`);
  console.log(`- bar count invariant: ${TOTAL_BARS}`);
}

main();
