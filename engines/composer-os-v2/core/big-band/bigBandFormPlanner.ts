/**
 * Big Band form planning — bar map only (Prompt 5/7).
 */

import type { BigBandFormPhase, BigBandFormPlan, BigBandFormSlice } from './bigBandPlanTypes';

/** All supported phases (use a subset via `planDefaultBigBandForm`). */
export const BIG_BAND_FORM_PHASES: readonly BigBandFormPhase[] = [
  'intro',
  'melody_head',
  'background_figures',
  'solo_section',
  'shout_chorus',
  'ending',
];

export interface PlanBigBandFormOpts {
  totalBars?: number;
  /** When set, includes background_figures between melody_head and solo_section. */
  includeBackgroundFigures?: boolean;
}

/**
 * Default test form: intro → melody_head → solo_section → shout_chorus → ending.
 * Optional background_figures when includeBackgroundFigures is true.
 */
export function planDefaultBigBandForm(seed: number, opts?: PlanBigBandFormOpts): BigBandFormPlan {
  const totalBars = opts?.totalBars ?? 32;
  const includeBg = opts?.includeBackgroundFigures === true;

  const template = includeBg
    ? [
        { phase: 'intro' as const, weight: 4 },
        { phase: 'melody_head' as const, weight: 6 },
        { phase: 'background_figures' as const, weight: 6 },
        { phase: 'solo_section' as const, weight: 8 },
        { phase: 'shout_chorus' as const, weight: 4 },
        { phase: 'ending' as const, weight: 4 },
      ]
    : [
        { phase: 'intro' as const, weight: 4 },
        { phase: 'melody_head' as const, weight: 8 },
        { phase: 'solo_section' as const, weight: 8 },
        { phase: 'shout_chorus' as const, weight: 6 },
        { phase: 'ending' as const, weight: 6 },
      ];

  const wsum = template.reduce((a, t) => a + t.weight, 0);
  const base: Array<{ phase: BigBandFormPhase; bars: number }> = template.map((t) => ({
    phase: t.phase,
    bars: Math.max(1, Math.floor((t.weight / wsum) * totalBars)),
  }));
  let sum = base.reduce((a, b) => a + b.bars, 0);
  if (sum < totalBars) {
    base[base.length - 1].bars += totalBars - sum;
  } else if (sum > totalBars) {
    let over = sum - totalBars;
    for (let j = base.length - 1; j >= 0 && over > 0; j--) {
      const take = Math.min(over, base[j].bars - 1);
      base[j].bars -= take;
      over -= take;
    }
  }

  const slices: BigBandFormSlice[] = [];
  let bar = 1;
  for (let i = 0; i < base.length; i++) {
    const row = base[i];
    const b = row.bars;
    const start = bar;
    const end = bar + b - 1;
    slices.push({ index: i, phase: row.phase, startBar: start, endBar: end });
    bar = end + 1;
  }

  void seed;
  return { totalBars, slices };
}
