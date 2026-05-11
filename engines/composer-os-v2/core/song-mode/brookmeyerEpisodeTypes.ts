/**
 * Bob Brookmeyer — episodic through-composition plan (`bobBrookmeyerSlice.ts`).
 */

export type BrookmeyerEpisodeType =
  | 'pitch_module_statement'
  | 'contrapuntal_development'
  | 'density_build'
  | 'chamber_reduction'
  | 'climax_shout';

export interface BrookmeyerEpisodeSpec {
  index: number;
  startBar: number;
  endBar: number;
  episodeType: BrookmeyerEpisodeType;
  /** Independent simultaneous strands targeted for contrapuntal episodes (2–4). */
  contrapuntalLineCount: number;
}

export interface BrookmeyerEpisodePlan {
  episodes: BrookmeyerEpisodeSpec[];
  /** Episodes that must complete before `soloPermitted` may become true. */
  soloGateThresholdEpisodes: number;
  /** True when the composed episode count exceeds the solo gate threshold. */
  soloPermitted: boolean;
}

function distributeEpisodeBarCounts(totalBars: number, k: number): number[] {
  const safeK = Math.max(1, k);
  const base = Math.floor(totalBars / safeK);
  const out = Array(safeK).fill(base) as number[];
  let rem = totalBars - base * safeK;
  for (let i = 0; i < rem; i++) {
    out[i % safeK] = (out[i % safeK] ?? 0) + 1;
  }
  return out;
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

const ROTATION_EARLY: BrookmeyerEpisodeType[] = [
  'pitch_module_statement',
  'density_build',
  'contrapuntal_development',
  'chamber_reduction',
  'density_build',
  'contrapuntal_development',
];

const ROTATION_LATE: BrookmeyerEpisodeType[] = [
  'pitch_module_statement',
  'contrapuntal_development',
  'density_build',
  'chamber_reduction',
  'contrapuntal_development',
  'density_build',
];

/**
 * Builds an asymmetric episode chain; **`climax_shout`** is assigned only to the final episode span.
 * Solo gate: **`soloPermitted`** stays false until **`episodes.length > soloGateThresholdEpisodes`**.
 */
export function buildBrookmeyerEpisodePlan(
  seed: number,
  totalBars: number,
  periodMode: 'early_brookmeyer' | 'late_brookmeyer'
): BrookmeyerEpisodePlan {
  const tb = Math.max(8, Math.floor(totalBars));
  const soloGateThresholdEpisodes = Math.max(3, Math.floor(tb / 8));
  let k = Math.min(8, Math.max(5, Math.floor(tb / 5)));
  if (k <= soloGateThresholdEpisodes) k = soloGateThresholdEpisodes + 1;

  const counts = distributeEpisodeBarCounts(tb, k);
  const rotation = periodMode === 'late_brookmeyer' ? ROTATION_LATE : ROTATION_EARLY;
  const episodes: BrookmeyerEpisodeSpec[] = [];
  let startBar = 1;
  for (let i = 0; i < k; i++) {
    const dur = Math.max(1, counts[i] ?? 1);
    const endBar = Math.min(tb, startBar + dur - 1);
    const isLast = i === k - 1;
    const episodeType: BrookmeyerEpisodeType = isLast
      ? 'climax_shout'
      : rotation[i % rotation.length]!;
    const u = seededUnit(seed, i, 772001);
    let contrapuntalLineCount = 2 + Math.floor(u * 3);
    if (episodeType === 'contrapuntal_development') contrapuntalLineCount = Math.max(3, contrapuntalLineCount);
    if (episodeType === 'chamber_reduction') contrapuntalLineCount = 2;
    episodes.push({
      index: i,
      startBar,
      endBar,
      episodeType,
      contrapuntalLineCount,
    });
    startBar = endBar + 1;
    if (startBar > tb) break;
  }

  const soloPermitted = episodes.length > soloGateThresholdEpisodes;
  return {
    episodes,
    soloGateThresholdEpisodes,
    soloPermitted,
  };
}

export function episodeForBrookmeyerBar(plan: BrookmeyerEpisodePlan, bar: number): BrookmeyerEpisodeSpec | undefined {
  return plan.episodes.find((e) => bar >= e.startBar && bar <= e.endBar);
}
