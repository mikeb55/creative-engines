/**
 * Rule application layer (Prompt 5.6/7).
 */

import { applyBigBandRules } from '../core/big-band/applyBigBandRules';
import { planBigBandDensity } from '../core/big-band/bigBandDensityPlanner';
import { resolveBigBandEraRules } from '../core/big-band/bigBandEraResolver';
import { planDefaultBigBandForm } from '../core/big-band/bigBandFormPlanner';
import { planBebopLineBehaviour } from '../core/big-band/bebopLinePlanner';

export function runBigBandRuleApplicationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const form = planDefaultBigBandForm(9, { totalBars: 32 });
  const density = planBigBandDensity(form);
  const resolved = resolveBigBandEraRules('swing', null, true, []);
  const enhanced = applyBigBandRules({
    formPlan: form,
    densityPlan: density,
    resolved,
    bebopLine: null,
    seed: 9,
  });
  out.push({
    ok: enhanced.behaviourSlices.length === form.slices.length,
    name: 'applyBigBandRules emits one behaviour slice per form slice',
  });

  const resolvedBebop = resolveBigBandEraRules('bebop', null, true, []);
  const bbMeta = planBebopLineBehaviour('bebop', 1);
  const enhBebop = applyBigBandRules({
    formPlan: form,
    densityPlan: density,
    resolved: resolvedBebop,
    bebopLine: bbMeta,
    seed: 9,
  });
  const lineSlices = enhBebop.behaviourSlices.filter((s) => s.linePrimary);
  out.push({
    ok: lineSlices.length >= 2,
    name: 'bebop application marks multiple line-primary slices',
  });

  return out;
}
