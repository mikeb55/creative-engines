/**
 * Ellington Orchestration Engine — Main entry
 * Converts chord progressions into sectional orchestration plans and voicings.
 */

import type { ChordSegment, OrchestrationPlan, EllingtonParameters } from './ellingtonTypes';
import { generateOrchestrationPlan } from './ellingtonGenerator';
import { parseProgression } from './ellingtonProgressions';
import { generateSectionVoicings, type SectionVoicing } from './ellingtonVoicings';

export * from './ellingtonTypes';
export * from './ellingtonProgressions';
export * from './ellingtonVoicings';
export { generateOrchestrationPlan } from './ellingtonGenerator';

export interface EllingtonInput {
  progression: ChordSegment[];
  parameters?: Partial<EllingtonParameters>;
  seed?: number;
}

export interface EllingtonOrchestration {
  trumpets: SectionVoicing[];
  trombones: SectionVoicing[];
  saxes: SectionVoicing[];
  rhythm: SectionVoicing[];
  progression: ChordSegment[];
  totalBars: number;
}

export function runEllingtonEngine(input: EllingtonInput): OrchestrationPlan {
  const { progression, parameters, seed } = input;
  return generateOrchestrationPlan(progression, parameters, seed ?? Date.now());
}

/**
 * Generate full orchestration with voicings for trumpets, trombones, saxes, rhythm.
 * Accepts chord progression as string (e.g. "Dm7 G7 Cmaj7") or ChordSegment[].
 */
export function generateEllingtonOrchestration(
  progression: string | ChordSegment[],
  seed: number = Date.now()
): EllingtonOrchestration {
  const segments = parseProgression(progression);
  const totalBars = segments.reduce((sum, s) => sum + s.bars, 0);

  return {
    trumpets: generateSectionVoicings(segments, 'trumpets', seed),
    trombones: generateSectionVoicings(segments, 'trombones', seed + 1),
    saxes: generateSectionVoicings(segments, 'saxes', seed + 2),
    rhythm: generateSectionVoicings(segments, 'rhythm', seed + 3),
    progression: segments,
    totalBars,
  };
}
