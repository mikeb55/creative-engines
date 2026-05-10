/**
 * Section regen — fragment barMeterMap remap (odd meter / Orbit-style 3/4).
 */

import { fragmentBarMeterMapFromFull } from '../core/regeneration/barMeterMapFragment';
import type { BarMeterMap } from '../core/rhythm/barMeterTypes';

export function runSectionRegenerationBarMeterTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const orbitStyle: BarMeterMap = {
    1: { numerator: 3, denominator: 4 },
    2: { numerator: 3, denominator: 4 },
    3: { numerator: 3, denominator: 4 },
    4: { numerator: 3, denominator: 4 },
  };
  const frag12 = fragmentBarMeterMapFromFull(orbitStyle, 2, 2);
  out.push({
    ok:
      frag12?.[1]?.numerator === 3 &&
      frag12?.[1]?.denominator === 4 &&
      frag12?.[2]?.numerator === 3 &&
      frag12?.[2]?.denominator === 4,
    name: 'fragment map Orbit-style 3/4 bars 2-3 → fragment 1-2',
  });

  const sparse: BarMeterMap = { 1: { numerator: 5, denominator: 4 } };
  const fragSparse = fragmentBarMeterMapFromFull(sparse, 1, 2);
  out.push({
    ok:
      fragSparse?.[1]?.numerator === 5 &&
      fragSparse?.[1]?.denominator === 4 &&
      fragSparse?.[2]?.numerator === 4 &&
      fragSparse?.[2]?.denominator === 4,
    name: 'sparse map: bar2 defaults to 4/4 when key missing',
  });

  out.push({
    ok: fragmentBarMeterMapFromFull(undefined, 1, 4) === undefined,
    name: 'undefined full map → undefined fragment map',
  });

  return out;
}
