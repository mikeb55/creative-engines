/**
 * Remap full-score {@link BarMeterMap} (1-based global bars) to a fragment run (bars 1..span).
 */

import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { sanitizeBarMeterMap } from '../rhythm/barMeterTypes';
import { resolveMeterForBar } from '../rhythm/oddMeterQuantiser';

/**
 * For each fragment bar index `i` (1..span), sets meter to the effective meter at global bar
 * `startBar + i - 1` using the same {@link resolveMeterForBar} rules as the full chart.
 */
export function fragmentBarMeterMapFromFull(
  fullMap: BarMeterMap | undefined,
  startBar: number,
  span: number
): BarMeterMap | undefined {
  if (!fullMap || span < 1 || startBar < 1) return undefined;
  const out: BarMeterMap = {};
  for (let i = 1; i <= span; i++) {
    const globalBar = startBar + i - 1;
    const sig = resolveMeterForBar(globalBar, fullMap);
    out[i] = { numerator: sig.numerator, denominator: sig.denominator };
  }
  return sanitizeBarMeterMap(out);
}
