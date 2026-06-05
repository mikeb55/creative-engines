/**
 * Bill Holman — chart-first linear episode plan (`billHolmanSlice.ts`).
 */

export type HolmanEpisodeType =
  | 'chart_head'
  | 'sax_soli_primary'
  | 'countermelody_development'
  | 'shout_chorus_spread'
  | 'ensemble_linear';

export interface HolmanEpisode {
  episodeType: HolmanEpisodeType;
  startBar: number;
  endBar: number;
  /** Five-voice sax soli when true. */
  saxSoliFiveVoice: boolean;
  /** Spread outer / close inner shout voicing. */
  shoutSpread: boolean;
}

export interface HolmanEpisodePlan {
  episodes: HolmanEpisode[];
  shoutStartBar: number;
}

function computeShoutStartBar(totalBars: number): number {
  if (totalBars >= 32) return totalBars - 7;
  if (totalBars >= 16) return totalBars - 3;
  return Math.max(4, totalBars - 1);
}

export function buildHolmanEpisodePlan(seed: number, totalBars: number, saxSoliDensity: number): HolmanEpisodePlan {
  const shoutStartBar = computeShoutStartBar(totalBars);
  const episodes: HolmanEpisode[] = [];
  const headEnd = Math.min(8, Math.max(4, Math.floor(totalBars * 0.25)));
  episodes.push({
    episodeType: 'chart_head',
    startBar: 1,
    endBar: headEnd,
    saxSoliFiveVoice: false,
    shoutSpread: false,
  });

  const soliStart = headEnd + 1;
  const soliEnd = Math.min(shoutStartBar - 2, soliStart + Math.max(7, Math.floor(totalBars * 0.35)));
  if (soliEnd >= soliStart) {
    episodes.push({
      episodeType: 'sax_soli_primary',
      startBar: soliStart,
      endBar: soliEnd,
      saxSoliFiveVoice: Math.abs(seed) % 100 < saxSoliDensity * 100,
      shoutSpread: false,
    });
  }

  const counterStart = soliEnd + 1;
  const counterEnd = Math.min(shoutStartBar - 1, counterStart + 4);
  if (counterEnd >= counterStart && counterEnd < shoutStartBar) {
    episodes.push({
      episodeType: 'countermelody_development',
      startBar: counterStart,
      endBar: counterEnd,
      saxSoliFiveVoice: false,
      shoutSpread: false,
    });
  }

  episodes.push({
    episodeType: 'shout_chorus_spread',
    startBar: shoutStartBar,
    endBar: totalBars,
    saxSoliFiveVoice: false,
    shoutSpread: true,
  });

  return { episodes, shoutStartBar };
}

export function episodeForHolmanBar(plan: HolmanEpisodePlan, bar: number): HolmanEpisode | undefined {
  return plan.episodes.find((e) => bar >= e.startBar && bar <= e.endBar);
}
