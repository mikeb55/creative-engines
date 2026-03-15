/**
 * Ellington Orchestration Engine — Main entry
 * Converts chord progressions into sectional orchestration plans.
 */

import type { ChordSegment, OrchestrationPlan, EllingtonParameters } from './ellingtonTypes';
import { generateOrchestrationPlan } from './ellingtonGenerator';

export * from './ellingtonTypes';
export { generateOrchestrationPlan } from './ellingtonGenerator';

export interface EllingtonInput {
  progression: ChordSegment[];
  parameters?: Partial<EllingtonParameters>;
  seed?: number;
}

export function runEllingtonEngine(input: EllingtonInput): OrchestrationPlan {
  const { progression, parameters, seed } = input;
  const totalBars = progression.reduce((sum, seg) => sum + seg.bars, 0);
  return generateOrchestrationPlan(progression, parameters, seed ?? Date.now());
}
