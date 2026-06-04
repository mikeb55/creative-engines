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
/**
 * 12-bar blues *chart* layout for big band: Intro (2) + Head (12) + Solo (12) + Shout (12) + Rideout (4) = 42 bars.
 * Select via {@link planBigBandForm} with `formId` `big_band_blues12` (distinct from duo/song `blues12` = 12 bars).
 */
export function planBigBandBlues12Form(): BigBandFormPlan {
  const totalBars = 42;
  const slices: BigBandFormSlice[] = [
    { index: 0, phase: 'intro', startBar: 1, endBar: 2 },
    { index: 1, phase: 'melody_head', startBar: 3, endBar: 14 },
    { index: 2, phase: 'solo_section', startBar: 15, endBar: 26 },
    { index: 3, phase: 'shout_chorus', startBar: 27, endBar: 38 },
    { index: 4, phase: 'ending', startBar: 39, endBar: 42 },
  ];
  return { totalBars, slices };
}

/**
 * Orbit (Mike Bryant) — 32-bar jazz waltz: intro + A×2 + B + head out (no shout chorus).
 * Matches `projects/Orbit/orbit-structure.json`.
 */
export function planOrbitBigBandForm(): BigBandFormPlan {
  const totalBars = 32;
  const slices: BigBandFormSlice[] = [
    { index: 0, phase: 'intro', startBar: 1, endBar: 4 },
    { index: 1, phase: 'melody_head', startBar: 5, endBar: 12 },
    { index: 2, phase: 'background_figures', startBar: 13, endBar: 20 },
    { index: 3, phase: 'solo_section', startBar: 21, endBar: 28 },
    { index: 4, phase: 'ending', startBar: 29, endBar: 32 },
  ];
  return { totalBars, slices };
}

/**
 * Orbit BB V4 — 64-bar chart: 32-bar head + development/shout/coda.
 * Development vacuum + soli + transition → shout chorus → atmospheric ending.
 */
export function planOrbitBigBandForm64(): BigBandFormPlan {
  const totalBars = 64;
  const slices: BigBandFormSlice[] = [
    { index: 0, phase: 'intro', startBar: 1, endBar: 4 },
    { index: 1, phase: 'melody_head', startBar: 5, endBar: 32 },
    { index: 2, phase: 'solo_section', startBar: 33, endBar: 48 },
    { index: 3, phase: 'shout_chorus', startBar: 49, endBar: 60 },
    { index: 4, phase: 'ending', startBar: 61, endBar: 64 },
  ];
  return { totalBars, slices };
}

/**
 * Orbit BB 120-bar chart — 28-bar harmonic cycle × 4 + tag (4/4 @ 90 BPM in export script).
 * Intro → head → soli stack → shout → head out → coda.
 */
export function planOrbitBigBand28Form(): BigBandFormPlan {
  const totalBars = 120;
  const slices: BigBandFormSlice[] = [
    { index: 0, phase: 'intro', startBar: 1, endBar: 4 },
    { index: 1, phase: 'melody_head', startBar: 5, endBar: 32 },
    { index: 2, phase: 'solo_section', startBar: 33, endBar: 60 },
    { index: 3, phase: 'shout_chorus', startBar: 61, endBar: 88 },
    { index: 4, phase: 'head_out', startBar: 89, endBar: 116 },
    { index: 5, phase: 'ending', startBar: 117, endBar: 120 },
  ];
  const rehearsalMarkOverride: Record<number, string> = {
    1: 'A',
    5: 'B',
    33: 'C',
    41: 'D',
    49: 'E',
    57: 'F',
    61: 'G',
    89: 'H',
    117: 'I',
  };
  return { totalBars, slices, rehearsalMarkOverride };
}

/**
 * BB101 — 120-bar NOLA big-band arc (sketch → full chart).
 * Curiosity → momentum → confidence → reflection → anticipation → celebration.
 */
export function planBb101BigBandForm(): BigBandFormPlan {
  const totalBars = 120;
  const slices: BigBandFormSlice[] = [
    { index: 0, phase: 'intro', startBar: 1, endBar: 16 },
    { index: 1, phase: 'melody_head', startBar: 17, endBar: 40 },
    { index: 2, phase: 'solo_section', startBar: 41, endBar: 64 },
    { index: 3, phase: 'background_figures', startBar: 65, endBar: 80 },
    { index: 4, phase: 'head_out', startBar: 81, endBar: 104 },
    { index: 5, phase: 'shout_chorus', startBar: 105, endBar: 116 },
    { index: 6, phase: 'ending', startBar: 117, endBar: 120 },
  ];
  const rehearsalMarkOverride: Record<number, string> = {
    1: 'A',
    9: 'B',
    17: 'B',
    33: 'C',
    41: 'C',
    49: 'D',
    65: 'E',
    81: 'F',
    97: 'G',
    105: 'H',
    117: 'I',
  };
  return { totalBars, slices, rehearsalMarkOverride };
}

/** Resolve form plan from optional API/UI `formId`; defaults to weighted {@link planDefaultBigBandForm}. */
export function planBigBandForm(formId: string | undefined, seed: number, opts?: PlanBigBandFormOpts): BigBandFormPlan {
  const id = formId?.trim();
  if (id === 'big_band_blues12') {
    return planBigBandBlues12Form();
  }
  if (id === 'bb101_120' || id === 'bb101') {
    return planBb101BigBandForm();
  }
  if (id === 'orbit_bb' || id === 'orbit_32') {
    return planOrbitBigBandForm();
  }
  if (id === 'orbit_bb_64') {
    return planOrbitBigBandForm64();
  }
  if (id === 'orbit_28') {
    return planOrbitBigBand28Form();
  }
  return planDefaultBigBandForm(seed, opts);
}

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
  const soloIdx = base.findIndex((b) => b.phase === 'solo_section');
  if (soloIdx >= 0) {
    const nudge = (seed % 3) - 1;
    base[soloIdx].bars = Math.max(2, base[soloIdx].bars + nudge);
  }
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

  return { totalBars, slices };
}
