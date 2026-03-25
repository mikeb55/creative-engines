/**
 * Big band ensemble selection (Prompt 2/2).
 */

import { assembleBigBandOrchestrationPlan } from '../core/big-band/buildBigBandOrchestrationPlan';
import { applyBigBandEnsembleMask, resolveEnsembleMaskForConfig } from '../core/big-band/bigBandEnsembleApply';
import { planBigBandDensity } from '../core/big-band/bigBandDensityPlanner';
import { planDefaultBigBandForm } from '../core/big-band/bigBandFormPlanner';
import { planBigBandSections } from '../core/big-band/bigBandSectionPlanner';

export function runBigBandEnsembleConfigTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const mask = resolveEnsembleMaskForConfig('medium_band', null);
  out.push({
    ok: mask.saxes && mask.trumpets && !mask.trombones && mask.rhythm_section,
    name: 'medium_band mask drops trombones, keeps rhythm',
  });

  const form = planDefaultBigBandForm(3, { totalBars: 32 });
  let section = planBigBandSections(form, 3);
  section = applyBigBandEnsembleMask(section, mask);
  const density = planBigBandDensity(form);
  const orch = assembleBigBandOrchestrationPlan({ formPlan: form, sectionPlan: section, densityPlan: density, ensembleMask: mask });
  const rowCounts = orch.sectionRoleMatrix.map((m) => m.rows.length);
  out.push({
    ok: rowCounts.every((n) => n === 3),
    name: 'orchestration rows match active sections (3 parts)',
  });

  const bassOk = section.slices.every((sl) => sl.rolesBySection.rhythm_section === 'bass_anchor');
  out.push({
    ok: bassOk,
    name: 'bass_anchor preserved on rhythm after ensemble mask',
  });

  return out;
}
