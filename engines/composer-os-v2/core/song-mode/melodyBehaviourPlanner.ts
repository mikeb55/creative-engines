/**
 * Melody behaviour metadata (repetition, intervals, asymmetry, cadences).
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';

export interface MelodyBehaviourPlan {
  repetitionVsVariationBias: number;
  intervalTendency: 'stepwise' | 'mixed' | 'angular';
  phraseAsymmetryTendency: number;
  cadenceFrequency: 'low' | 'medium' | 'high';
}

export function planMelodyBehaviour(seed: number, primaryStyle: SongwriterRuleId): MelodyBehaviourPlan {
  let intervalTendency: MelodyBehaviourPlan['intervalTendency'] = 'mixed';
  let phraseAsymmetryTendency = 0.45;
  let repetitionVsVariationBias = 0.55;
  let cadenceFrequency: MelodyBehaviourPlan['cadenceFrequency'] = 'medium';

  switch (primaryStyle) {
    case 'bacharach':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.85;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.5;
      break;
    case 'bob_dylan':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.55;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.35;
      break;
    case 'joni_mitchell':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.78;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.48;
      break;
    case 'max_martin':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.25;
      cadenceFrequency = 'high';
      repetitionVsVariationBias = 0.88;
      break;
    default:
      phraseAsymmetryTendency = 0.4 + (seed % 17) / 100;
      repetitionVsVariationBias = 0.5 + (seed % 20) / 100;
  }

  return {
    repetitionVsVariationBias: Math.max(0, Math.min(1, repetitionVsVariationBias)),
    intervalTendency,
    phraseAsymmetryTendency: Math.max(0, Math.min(1, phraseAsymmetryTendency)),
    cadenceFrequency,
  };
}
