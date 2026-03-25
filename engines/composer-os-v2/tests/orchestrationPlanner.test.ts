/**
 * Orchestration planners — duo/chamber builders + register crowding (Prompt 4/7).
 */

import { buildChamberOrchestrationPlan } from '../core/orchestration/buildChamberOrchestrationPlan';
import { buildDuoOrchestrationPlan } from '../core/orchestration/buildDuoOrchestrationPlan';
import { planOrchestration } from '../core/orchestration/orchestrationPlanner';
import { validateRegisterOwnershipNoCrowding } from '../core/orchestration/orchestrationValidation';

export function runOrchestrationPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const duo = buildDuoOrchestrationPlan();
  out.push({
    ok: duo.totalBars === 8 && duo.sections.length === 2 && duo.sectionRoleMatrix.length === 2,
    name: 'duo orchestration plan builds correctly',
  });

  const chamber = buildChamberOrchestrationPlan({ seed: 42_001, mode: 'ECM_METHENY_QUARTET' });
  out.push({
    ok: chamber.presetId === 'ecm_chamber' && chamber.sections.length === 3 && chamber.totalBars >= 24,
    name: 'chamber orchestration plan builds correctly',
  });

  const viaFacade = planOrchestration({ kind: 'duo', totalBars: 8 });
  out.push({
    ok: viaFacade.ensembleFamily === 'duo',
    name: 'planOrchestration duo facade',
  });

  const reg = validateRegisterOwnershipNoCrowding(duo);
  out.push({
    ok: reg.ok,
    name: 'register ownership: duo has no crowding violations',
  });

  return out;
}
