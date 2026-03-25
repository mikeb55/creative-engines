/**
 * String quartet form / texture / density planning (Prompt 6/7).
 */

import { assembleQuartetOrchestrationPlan } from '../core/string-quartet/buildQuartetOrchestrationPlan';
import { planQuartetDensity } from '../core/string-quartet/quartetDensityPlanner';
import { planDefaultQuartetForm, QUARTET_FORM_PHASES } from '../core/string-quartet/quartetFormPlanner';
import { planQuartetTexture } from '../core/string-quartet/quartetTexturePlanner';
import { validateOrchestrationPlan } from '../core/orchestration/orchestrationValidation';
import { getEnsembleFamilyProfile } from '../core/orchestration/ensembleFamilyProfiles';

export function runStringQuartetPlanningTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const form = planDefaultQuartetForm(42_001, { totalBars: 24 });
  out.push({
    ok:
      form.slices.length === 5 &&
      QUARTET_FORM_PHASES.every((ph) => form.slices.some((s) => s.phase === ph)) &&
      form.slices.some((s) => s.phase === 'coda'),
    name: 'default quartet form has five phases including coda',
  });

  const density = planQuartetDensity(form);
  const st = density.slices.find((d) => d.phase === 'statement');
  const ct = density.slices.find((d) => d.phase === 'contrast');
  out.push({
    ok: Boolean(st && ct && st.density !== ct.density),
    name: 'statement and contrast differ in density',
  });

  const texture = planQuartetTexture(form, 42_001);
  const orch = assembleQuartetOrchestrationPlan({ formPlan: form, texturePlan: texture, densityPlan: density });
  const profile = getEnsembleFamilyProfile('string_quartet');
  const v = validateOrchestrationPlan(orch, profile);
  out.push({
    ok: v.ok && orch.presetId === 'string_quartet' && orch.ensembleFamily === 'string_quartet',
    name: 'assembleQuartetOrchestrationPlan validates against string_quartet profile',
  });

  const celloAnchors = texture.slices.filter((s) => s.rolesByInstrument.cello === 'bass_anchor').length;
  out.push({
    ok: celloAnchors >= 1,
    name: 'texture plan assigns cello as bass_anchor in at least one slice',
  });

  return out;
}
