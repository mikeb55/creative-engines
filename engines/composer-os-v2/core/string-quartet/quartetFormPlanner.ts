/**
 * String quartet form planning (Prompt 6/7).
 */

import type { QuartetFormPhase, QuartetFormPlan, QuartetFormSlice } from './quartetPlanTypes';

export const QUARTET_FORM_PHASES: readonly QuartetFormPhase[] = [
  'statement',
  'development',
  'contrast',
  'return',
  'coda',
];

export interface PlanQuartetFormOpts {
  totalBars?: number;
}

/**
 * Default: statement → development → contrast → return → coda.
 */
export function planDefaultQuartetForm(seed: number, opts?: PlanQuartetFormOpts): QuartetFormPlan {
  const totalBars = Math.max(16, opts?.totalBars ?? 24);
  const template = [
    { phase: 'statement' as const, weight: 5 },
    { phase: 'development' as const, weight: 4 },
    { phase: 'contrast' as const, weight: 5 },
    { phase: 'return' as const, weight: 4 },
    { phase: 'coda' as const, weight: 4 },
  ];
  const wsum = template.reduce((a, t) => a + t.weight, 0);
  const base = template.map((t) => ({
    phase: t.phase,
    bars: Math.max(1, Math.floor((t.weight / wsum) * totalBars)),
  }));
  let sum = base.reduce((a, b) => a + b.bars, 0);
  if (sum < totalBars) base[base.length - 1].bars += totalBars - sum;
  else if (sum > totalBars) {
    let over = sum - totalBars;
    for (let j = base.length - 1; j >= 0 && over > 0; j--) {
      const take = Math.min(over, base[j].bars - 1);
      base[j].bars -= take;
      over -= take;
    }
  }

  const slices: QuartetFormSlice[] = [];
  let bar = 1;
  for (let i = 0; i < base.length; i++) {
    const row = base[i];
    const start = bar;
    const end = bar + row.bars - 1;
    slices.push({ index: i, phase: row.phase, startBar: start, endBar: end });
    bar = end + 1;
  }

  void seed;
  return { totalBars, slices };
}
