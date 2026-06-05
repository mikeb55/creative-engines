/**
 * Carla Bley — formal-irony episode plan (`carlaBleySlice.ts`).
 */

export type BleyStyleTopic = 'hymn' | 'march' | 'cabaret' | 'ballad' | 'chamber_dance';

export type BleyIronyPhase =
  | 'topic_staging'
  | 'motif_contamination'
  | 'climax_deflation'
  | 'reprise_altered'
  | 'quotation_window';

/** Seven Carla Bley slice parameters (0–1). */
export interface CarlaBleySliceParams {
  formalIronyIndex: number;
  deadpanPresentation: number;
  tonicLegibility: number;
  cadenceDeflection: number;
  motifContamination: number;
  climaxDeflation: number;
  repriseDefamiliarization: number;
}

export const DEFAULT_CARLA_BLEY_SLICE_PARAMS: CarlaBleySliceParams = {
  formalIronyIndex: 0.7,
  deadpanPresentation: 0.75,
  tonicLegibility: 0.65,
  cadenceDeflection: 0.6,
  motifContamination: 0.55,
  climaxDeflation: 0.55,
  repriseDefamiliarization: 0.65,
};

export interface BleyIronyEpisodeSpec {
  index: number;
  startBar: number;
  endBar: number;
  topic: BleyStyleTopic;
  phase: BleyIronyPhase;
  choirSwap: boolean;
}

export interface CarlaBleyEpisodePlan {
  episodes: readonly BleyIronyEpisodeSpec[];
  sliceParams: CarlaBleySliceParams;
  deflationPivotBar: number;
  openingTopic: BleyStyleTopic;
}

const TOPICS: BleyStyleTopic[] = ['hymn', 'march', 'cabaret', 'ballad', 'chamber_dance'];

function seededUnit(seed: number, salt: number): number {
  let s = (seed ^ salt * 1103515245) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function ironyPhraseLength(seed: number, phraseIndex: number, asymmetry: number): number {
  const u = seededUnit(seed, phraseIndex + 892100);
  if (asymmetry >= 0.65) {
    if (u < 0.18) return 3;
    if (u < 0.36) return 5;
    if (u < 0.54) return 7;
    if (u < 0.72) return 4;
    if (u < 0.88) return 6;
    return 8;
  }
  if (u < 0.35) return 4;
  if (u < 0.65) return 6;
  return 8;
}

function distributeBleyEpisodeBarCounts(
  totalBars: number,
  seed: number,
  formalIronyIndex: number
): number[] {
  const tb = Math.max(8, Math.floor(totalBars));
  const minEpisodes = Math.max(4, Math.min(7, Math.floor(3 + formalIronyIndex * 4)));
  const counts: number[] = [];
  let remaining = tb;
  let phraseIdx = 0;
  while (remaining > 0 && counts.length < minEpisodes) {
    let len = ironyPhraseLength(seed, phraseIdx, formalIronyIndex);
    if (counts.length === minEpisodes - 1 || remaining <= len + 1) {
      len = remaining;
    } else {
      len = Math.min(remaining, Math.max(2, len));
    }
    counts.push(len);
    remaining -= len;
    phraseIdx++;
  }
  if (remaining > 0 && counts.length) {
    counts[counts.length - 1] = (counts[counts.length - 1] ?? 0) + remaining;
  }
  return counts;
}

function phaseForEpisodeIndex(
  index: number,
  totalEpisodes: number,
  isQuotation: boolean
): BleyIronyPhase {
  if (isQuotation) return 'quotation_window';
  if (index === 0) return 'topic_staging';
  if (index === totalEpisodes - 1) return 'reprise_altered';
  if (index === Math.floor(totalEpisodes * 0.55)) return 'climax_deflation';
  return 'motif_contamination';
}

export function buildCarlaBleyEpisodePlan(
  seed: number,
  totalBars: number,
  params: CarlaBleySliceParams = DEFAULT_CARLA_BLEY_SLICE_PARAMS
): CarlaBleyEpisodePlan {
  const counts = distributeBleyEpisodeBarCounts(totalBars, seed, params.formalIronyIndex);
  const episodes: BleyIronyEpisodeSpec[] = [];
  let startBar = 1;
  const openingTopic = TOPICS[Math.abs(seed) % TOPICS.length]!;
  const topicSeen = new Map<BleyStyleTopic, number>();

  for (let i = 0; i < counts.length; i++) {
    const dur = Math.max(1, counts[i] ?? 1);
    const endBar = Math.min(totalBars, startBar + dur - 1);
    const u = seededUnit(seed, i + 892200);
    const isQuotation = u < 0.12 && params.formalIronyIndex >= 0.55;
    let topic: BleyStyleTopic;
    if (i === 0) {
      topic = openingTopic;
    } else if (isQuotation) {
      topic = TOPICS[Math.floor(seededUnit(seed, i + 892300) * TOPICS.length) % TOPICS.length]!;
    } else {
      topic = TOPICS[(Math.abs(seed) + i * 2) % TOPICS.length]!;
    }
    const prevCount = topicSeen.get(topic) ?? 0;
    topicSeen.set(topic, prevCount + 1);
    const phase = phaseForEpisodeIndex(i, counts.length, isQuotation);
    const choirSwap =
      phase === 'reprise_altered' &&
      seededUnit(seed, i + 892400) < params.repriseDefamiliarization;

    episodes.push({
      index: i,
      startBar,
      endBar,
      topic,
      phase,
      choirSwap,
    });
    startBar = endBar + 1;
    if (startBar > totalBars) break;
  }

  const deflationEp = episodes.find((e) => e.phase === 'climax_deflation');
  const deflationPivotBar = deflationEp?.startBar ?? Math.max(8, Math.floor(totalBars * 0.55));

  return { episodes, sliceParams: params, deflationPivotBar, openingTopic };
}

export function bleyEpisodeForBar(plan: CarlaBleyEpisodePlan, bar: number): BleyIronyEpisodeSpec | undefined {
  return plan.episodes.find((e) => bar >= e.startBar && bar <= e.endBar);
}
