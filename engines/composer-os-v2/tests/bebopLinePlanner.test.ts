/**
 * Bebop line behaviour metadata (Prompt 5.6/7).
 */

import { planBebopLineBehaviour } from '../core/big-band/bebopLinePlanner';

export function runBebopLinePlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const b = planBebopLineBehaviour('bebop', 1);
  out.push({
    ok:
      b !== null &&
      b.continuousLineMotion &&
      b.chromaticApproachToneTendency &&
      b.lineVsRiff === 'line_primary',
    name: 'bebop era produces line-based planning metadata',
  });

  out.push({
    ok: planBebopLineBehaviour('swing', 1) === null,
    name: 'non-bebop era returns null bebop metadata',
  });

  return out;
}
