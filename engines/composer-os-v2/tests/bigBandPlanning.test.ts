/**
 * Big Band planning — form, sections, density, orchestration (Prompt 5/7).
 */

import { assembleBigBandOrchestrationPlan, buildBigBandOrchestrationPlan } from '../core/big-band/buildBigBandOrchestrationPlan';
import { planBigBandDensity } from '../core/big-band/bigBandDensityPlanner';
import { planDefaultBigBandForm } from '../core/big-band/bigBandFormPlanner';
import { planBigBandSections } from '../core/big-band/bigBandSectionPlanner';

export function runBigBandPlanningTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const form = planDefaultBigBandForm(12_345, { totalBars: 32 });
  const sections = planBigBandSections(form, 12_345);
  const density = planBigBandDensity(form);
  out.push({
    ok: form.totalBars === 32 && form.slices.some((s) => s.phase === 'shout_chorus'),
    name: 'default big-band form is valid (32 bars, shout_chorus)',
  });

  out.push({
    ok: sections.slices.every((s) => s.rolesBySection.rhythm_section !== 'silence'),
    name: 'rhythm section present in every slice',
  });

  out.push({
    ok: sections.slices.every((s) => Object.values(s.rolesBySection).some((r) => r === 'bass_anchor')),
    name: 'bass anchor present in every slice',
  });

  const orch = buildBigBandOrchestrationPlan({ formPlan: form, sectionPlan: sections, densityPlan: density });
  out.push({
    ok: orch.presetId === 'big_band' && orch.ensembleFamily === 'big_band',
    name: 'orchestration plan builds correctly',
  });

  const assembled = assembleBigBandOrchestrationPlan({ formPlan: form, sectionPlan: sections, densityPlan: density });
  out.push({
    ok: assembled.sectionRoleMatrix.length === form.slices.length,
    name: 'assembleBigBandOrchestrationPlan matches form slices',
  });

  return out;
}
