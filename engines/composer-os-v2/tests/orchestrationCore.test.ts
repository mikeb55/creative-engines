/**
 * Shared orchestration layer — core types and validation (Prompt 4/7).
 */

import { buildDuoOrchestrationPlan } from '../core/orchestration/buildDuoOrchestrationPlan';
import { getEnsembleFamilyProfile, listEnsembleFamilies } from '../core/orchestration/ensembleFamilyProfiles';
import type { OrchestrationPlan } from '../core/orchestration/orchestrationPlanTypes';
import {
  buildConflictingLeadRegisterExample,
  mergeOrchestrationValidation,
  validateDensityNoOverload,
  validateOrchestrationPlan,
  validateOrchestrationPlanCompleteness,
} from '../core/orchestration/orchestrationValidation';
import type { DensityOwnershipPlan } from '../core/orchestration/densityOwnershipPlanner';
import type { OrchestrationRoleLabel } from '../core/orchestration/orchestrationRoleTypes';

function densityOverloadPlan(): OrchestrationPlan {
  const p = buildDuoOrchestrationPlan();
  const heavy: DensityOwnershipPlan = {
    ...p.densityOwnership,
    entries: p.densityOwnership.entries.map((e) => ({ ...e, weight: e.weight * 2.2 })),
  };
  return { ...p, densityOwnership: heavy };
}

export function runOrchestrationCoreTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const duo = buildDuoOrchestrationPlan();
  const profile = getEnsembleFamilyProfile('duo');
  const v = validateOrchestrationPlan(duo, profile);

  const labels: OrchestrationRoleLabel[] = [
    'lead',
    'support',
    'pad',
    'counterline',
    'bass_anchor',
    'inner_motion',
    'silence',
  ];
  out.push({
    ok: labels.length === 7 && duo.sectionRoleMatrix.every((b) => b.rows.length === 2),
    name: 'orchestration roles/types are valid (duo matrix)',
  });

  out.push({
    ok: v.ok && duo.presetId === 'guitar_bass_duo' && duo.ensembleFamily === 'duo',
    name: 'duo plan validates against family profile',
  });

  out.push({
    ok: listEnsembleFamilies().includes('big_band') && listEnsembleFamilies().includes('string_quartet'),
    name: 'ensemble family list includes big_band and string_quartet',
  });

  const bad = buildConflictingLeadRegisterExample('p1', 'p2');
  const badV = mergeOrchestrationValidation(
    validateOrchestrationPlanCompleteness(bad),
    validateOrchestrationPlan(bad, profile)
  );
  out.push({
    ok: !badV.ok,
    name: 'negative: conflicting lead/register assignment must fail',
  });

  const overload = densityOverloadPlan();
  const d = validateDensityNoOverload(overload);
  out.push({
    ok: !d.ok,
    name: 'density ownership catches overload',
  });

  return out;
}
