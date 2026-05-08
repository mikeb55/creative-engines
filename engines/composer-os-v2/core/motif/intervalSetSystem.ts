/**
 * Henry Threadgill — interval-set grammar (additive architecture; pitch grammar not chord-symbol rows).
 */

export interface IntervalSet {
  id: string;
  /** Harmonic grammar pool — semitone steps allowed between chord tones (e.g. m2, m3, P4). */
  intervals: number[];
  seedCell: number[];
  closedFamily: number[][];
  registralBands: {
    low: [number, number];
    mid: [number, number];
    high: [number, number];
  };
  cadenceType: 'unison_convergence' | 'texture_shift' | 'octave_arrival';
  durationBars: number;
}

export interface ThreadgillSection {
  id: string;
  intervalSet: IntervalSet;
  orchestrationPattern: 'hocket' | 'concurrent_duet' | 'mosaic' | 'stratified';
  rhythmicRule: 'anti_metric' | 'polyrhythm_5_over_4' | 'independent_streams';
  densityLevel: number;
}

export interface ThreadgillForm {
  sections: ThreadgillSection[];
  allowPermutation: boolean;
  cadentialConvergenceRequired: boolean;
}

function seededUnit(seed: number, salt: number): number {
  let s = (seed * 7919 + salt * 104729) >>> 0;
  s = (s * 1103515245 + 12345) >>> 0;
  return s / 0xffffffff;
}

/** Sorted pitch-class triple → ascending pairwise intervals. */
export function adjacentIntervalsSortedTriad(chord: readonly number[]): [number, number] {
  const [a, b, c] = [...chord].sort((x, y) => x - y);
  return [b - a, c - b];
}

/** Both step sizes between the three voices are members of `pool` (exact semitones). */
export function triadAdjacentIntervalsInPool(chord: readonly number[], pool: readonly number[]): boolean {
  const [i1, i2] = adjacentIntervalsSortedTriad(chord);
  const ps = new Set(pool);
  return ps.has(i1) && ps.has(i2);
}

/**
 * Three-note seed + pool → six parallel transpositions of the same intervallic spine
 * (same pairwise gaps as sorted seed — preserves interval-pool grammar when the seed is built from the pool).
 */
export function buildThreadgillIntervalSet(seedPitches: [number, number, number], intervalPool: number[]): IntervalSet {
  const pool = intervalPool.length ? [...intervalPool] : [1, 3, 5];
  const sorted = [...seedPitches].sort((x, y) => x - y);
  const [v0, v1, v2] = sorted as [number, number, number];

  const shifts = [
    0,
    pool[0]!,
    pool[1 % pool.length]!,
    pool[2 % pool.length]!,
    pool[0]! + pool[1 % pool.length]!,
    pool[0]! + pool[2 % pool.length]!,
  ];

  const closedFamily = shifts.map((t) => [v0 + t, v1 + t, v2 + t]);

  const id = `ht_is_${v0}_${v1}_${v2}_${pool.join('_')}`;

  return {
    id,
    intervals: [...pool],
    seedCell: [v0, v1, v2],
    closedFamily,
    registralBands: {
      low: [36, 55],
      mid: [55, 72],
      high: [72, 88],
    },
    cadenceType: 'unison_convergence',
    durationBars: 4,
  };
}

const PERIOD_POOLS: ReadonlyArray<{ pool: readonly number[] }> = [
  { pool: [1, 2, 3, 5] },
  { pool: [1, 3, 6, 7] },
  { pool: [2, 3, 6, 10] },
  { pool: [1, 2, 3, 5, 7] },
];

const ORCH: ThreadgillSection['orchestrationPattern'][] = ['hocket', 'concurrent_duet', 'mosaic', 'stratified'];
const RHYTHM: ThreadgillSection['rhythmicRule'][] = ['anti_metric', 'polyrhythm_5_over_4', 'independent_streams'];
const CAD: IntervalSet['cadenceType'][] = ['unison_convergence', 'texture_shift', 'octave_arrival'];

function shuffleOrchestrationIndices(sectionCount: number, seed: number): number[] {
  const idx = [0, 1, 2, 3];
  for (let i = 4; i > 1; i--) {
    const j = Math.floor(seededUnit(seed, 880 + i) * i);
    const a = idx[i - 1]!;
    const b = idx[j]!;
    idx[i - 1] = b;
    idx[j] = a;
  }
  return idx.slice(0, sectionCount);
}

/**
 * Deterministic modular form: 2–4 sections, distinct orchestration where possible, period pools rotate.
 */
export function buildThreadgillForm(voiceId: string, seed: number, totalBars: number): ThreadgillForm {
  const sectionCount = 2 + Math.floor(seededUnit(seed, 1) * 3);
  const orchOrder = shuffleOrchestrationIndices(sectionCount, seed);
  const barsPer = Math.max(4, Math.floor(totalBars / sectionCount));

  const sections: ThreadgillSection[] = [];
  let allocated = 0;

  for (let i = 0; i < sectionCount; i++) {
    const period = PERIOD_POOLS[i % PERIOD_POOLS.length]!;
    const pool = [...period.pool];
    const basePc = (seed + i * 11) % 12;
    const base = 48 + basePc + Math.floor(seededUnit(seed, 200 + i) * 12);
    const i0 = pool[0]!;
    const i1 = pool[1 % pool.length]!;
    const seedPitches: [number, number, number] = [base, base + i0, base + i0 + i1];

    const intervalSet = buildThreadgillIntervalSet(seedPitches, pool);
    intervalSet.cadenceType = CAD[i % CAD.length]!;
    const dur =
      i === sectionCount - 1 ? Math.max(4, totalBars - allocated) : Math.min(barsPer, totalBars - allocated);
    intervalSet.durationBars = dur;
    allocated += dur;

    sections.push({
      id: `ht_${voiceId.replace(/\s+/g, '_')}_${seed}_sec_${i}`,
      intervalSet,
      orchestrationPattern: ORCH[orchOrder[i] ?? i % ORCH.length]!,
      rhythmicRule: RHYTHM[Math.floor(seededUnit(seed, 300 + i) * RHYTHM.length)]!,
      densityLevel: Math.round((0.35 + seededUnit(seed, 400 + i) * 0.45) * 1000) / 1000,
    });
  }

  return {
    sections,
    allowPermutation: seededUnit(seed, 500) > 0.5,
    cadentialConvergenceRequired: true,
  };
}
