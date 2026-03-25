/**
 * Voicing planner (Prompt C/3).
 */

import { assembleBigBandOrchestrationPlan } from '../core/big-band/buildBigBandOrchestrationPlan';
import { planBigBandDensity } from '../core/big-band/bigBandDensityPlanner';
import { planDefaultBigBandForm } from '../core/big-band/bigBandFormPlanner';
import { planBigBandSections } from '../core/big-band/bigBandSectionPlanner';
import { planEnsembleVoicing } from '../core/voicing/voicingPlanner';
import { validateEnsembleVoicing } from '../core/voicing/voicingValidation';

export function runVoicingPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const formPlan = planDefaultBigBandForm(1, { totalBars: 32 });
  const sectionPlan = planBigBandSections(formPlan, 1);
  const densityPlan = planBigBandDensity(formPlan);
  const orch = assembleBigBandOrchestrationPlan({ formPlan, sectionPlan, densityPlan });
  const v = planEnsembleVoicing(orch, 'big_band');
  const val = validateEnsembleVoicing(v);

  out.push({
    ok: v.slices.length === formPlan.slices.length && v.totalBars === 32 && val.ok,
    name: 'planEnsembleVoicing produces slices for big band orchestration',
  });

  out.push({
    ok: v.slices.length > 0 && v.slices[0].rows.every((r) => r.partId.length > 0),
    name: 'voicing rows have part ids',
  });

  return out;
}
