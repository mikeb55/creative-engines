/**
 * Humanisation + density control metadata.
 */

import { densityControlToFeelHint } from '../core/performance-plus/densityControlAdapter';
import { humanisationOff, humanisationOn } from '../core/performance-plus/humanisationToggle';

export function runHumanisationToggleTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const off = humanisationOff();
  out.push({
    ok: !off.enabled && off.articulationBias === 0,
    name: 'humanisation off zeros metadata',
  });

  const on = humanisationOn('subtle');
  out.push({
    ok: on.enabled && on.rhythmicLooseness > 0 && on.sustainAttackBias > 0,
    name: 'humanisation on sets light biases',
  });

  const d = densityControlToFeelHint({ bias: 'dense' });
  out.push({
    ok: d.densityBias === 'dense' && d.curveWeight > 0.8,
    name: 'dense bias maps to feel hint',
  });

  return out;
}
