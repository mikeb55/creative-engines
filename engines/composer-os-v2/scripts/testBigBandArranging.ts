import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';

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

function main(): void {
  const soliStart = 17;
  const soliEnd = 24;

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

    console.log(`[test:big-band-arranging] seed=${seed} OK — altoRun=8 tenorRun=8 brassSoli=0`);
  }

  console.log('[test:big-band-arranging] PASS (all seeds)');
  console.log(`- seeds checked: ${SEEDS.join(', ')}`);
  console.log(`- sax soli window: bars ${soliStart}-${soliEnd} (full 8 bars each part)`);
  console.log(`- bar count invariant: ${TOTAL_BARS}`);
}

main();
