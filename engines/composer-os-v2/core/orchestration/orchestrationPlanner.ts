/**
 * Orchestration planner facade — selects duo vs chamber builders (Prompt 4/7).
 */

import type { EcmChamberMode } from '../ecm/ecmChamberTypes';
import type { OrchestrationPlan } from './orchestrationPlanTypes';
import { buildChamberOrchestrationPlan, type BuildChamberOrchestrationPlanInput } from './buildChamberOrchestrationPlan';
import { buildDuoOrchestrationPlan, type BuildDuoOrchestrationPlanInput } from './buildDuoOrchestrationPlan';

export type OrchestrationPlannerInput =
  | ({ kind: 'duo' } & BuildDuoOrchestrationPlanInput)
  | ({ kind: 'chamber' } & BuildChamberOrchestrationPlanInput);

export function planOrchestration(input: OrchestrationPlannerInput): OrchestrationPlan {
  if (input.kind === 'duo') {
    const { kind: _k, ...rest } = input;
    return buildDuoOrchestrationPlan(rest);
  }
  const { kind: _k, ...rest } = input;
  return buildChamberOrchestrationPlan(rest as BuildChamberOrchestrationPlanInput);
}

export type { EcmChamberMode };
