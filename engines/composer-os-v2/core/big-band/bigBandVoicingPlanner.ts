/**
 * Big Band voicing plan from orchestration (Prompt C/3).
 */

import type { OrchestrationPlan } from '../orchestration/orchestrationPlanTypes';
import { planEnsembleVoicing } from '../voicing/voicingPlanner';
import type { EnsembleVoicingPlan } from '../voicing/voicingTypes';

export function planBigBandVoicing(orchestrationPlan: OrchestrationPlan): EnsembleVoicingPlan {
  return planEnsembleVoicing(orchestrationPlan, 'big_band');
}
