/**
 * Oliver Nelson — blues–modal episode plan (`oliverNelsonSlice.ts`).
 */

export type NelsonEpisodeType =
  | 'modal_head'
  | 'minor_blues_solo'
  | 'pedal_field'
  | 'orchestral_build'
  | 'turnaround';

export interface NelsonEpisodeSpec {
  startBar: number;
  endBar: number;
  episodeType: NelsonEpisodeType;
}

export interface NelsonEpisodePlan {
  episodes: NelsonEpisodeSpec[];
}

/**
 * Long-form (≥32 bars): 4 pedal · modal head · optional orchestral wedge (late) · 3-bar turnaround · 12-bar minor blues solo layer.
 * Shorter scores stack the same ingredients without forcing empty spans.
 */
export function buildNelsonEpisodePlan(totalBars: number, periodIsLate: boolean): NelsonEpisodePlan {
  const tb = Math.max(1, Math.floor(totalBars));
  const episodes: NelsonEpisodeSpec[] = [];

  if (tb >= 32) {
    episodes.push({ startBar: 1, endBar: 4, episodeType: 'pedal_field' });
    if (periodIsLate) {
      episodes.push({ startBar: 5, endBar: 10, episodeType: 'orchestral_build' });
      episodes.push({ startBar: 11, endBar: 17, episodeType: 'modal_head' });
    } else {
      episodes.push({ startBar: 5, endBar: 17, episodeType: 'modal_head' });
    }
    episodes.push({ startBar: 18, endBar: 20, episodeType: 'turnaround' });
    episodes.push({ startBar: 21, endBar: tb, episodeType: 'minor_blues_solo' });
    return { episodes };
  }

  if (tb <= 8) {
    episodes.push({ startBar: 1, endBar: tb, episodeType: 'modal_head' });
    return { episodes };
  }

  const introLen = Math.min(4, tb);
  episodes.push({ startBar: 1, endBar: introLen, episodeType: 'pedal_field' });
  let b = introLen + 1;
  if (b > tb) return { episodes };
  episodes.push({ startBar: b, endBar: tb, episodeType: 'minor_blues_solo' });
  return { episodes };
}

export function episodeForNelsonBar(plan: NelsonEpisodePlan, bar: number): NelsonEpisodeSpec | undefined {
  return plan.episodes.find((e) => bar >= e.startBar && bar <= e.endBar);
}
