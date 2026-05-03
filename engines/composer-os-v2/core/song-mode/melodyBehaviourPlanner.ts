/**
 * Melody behaviour metadata (repetition, intervals, asymmetry, cadences, rhythmic subdivision).
 */

import type { SongwriterRuleId } from './songwritingResearchTypes';

/** Vocal planning rhythm density — drives quarter vs eighth patterns in {@link planLeadMelody}. */
export type MelodyRhythmicSubdivision =
  | 'whole_bar'
  | 'half_quarter'
  | 'eighth_patterns'
  | 'mixed';

export interface MelodyBehaviourPlan {
  repetitionVsVariationBias: number;
  intervalTendency: 'stepwise' | 'mixed' | 'angular';
  phraseAsymmetryTendency: number;
  cadenceFrequency: 'low' | 'medium' | 'high';
  rhythmicSubdivision: MelodyRhythmicSubdivision;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Style-specific melodic behaviour for Song Mode lead melody planning.
 * Shipped writers each get a distinct profile; unlisted ids fall through to seed-tinted defaults.
 */
export function planMelodyBehaviour(seed: number, primaryStyle: SongwriterRuleId): MelodyBehaviourPlan {
  let intervalTendency: MelodyBehaviourPlan['intervalTendency'] = 'mixed';
  let phraseAsymmetryTendency = 0.45;
  let repetitionVsVariationBias = 0.55;
  let cadenceFrequency: MelodyBehaviourPlan['cadenceFrequency'] = 'medium';
  let rhythmicSubdivision: MelodyRhythmicSubdivision = 'mixed';

  switch (primaryStyle) {
    case 'brian_wilson':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.72;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.74;
      rhythmicSubdivision = 'half_quarter';
      break;
    case 'stevie_wonder':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.48;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.7;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'radiohead':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.68;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.38;
      rhythmicSubdivision = 'mixed';
      break;
    case 'james_brown':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.35;
      cadenceFrequency = 'high';
      repetitionVsVariationBias = 0.82;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'sonic_youth':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.81;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.42;
      rhythmicSubdivision = 'mixed';
      break;
    case 'pat_metheny':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.52;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.58;
      rhythmicSubdivision = 'half_quarter';
      break;
    case 'wayne_shorter':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.62;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.44;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'barry_harris':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.41;
      cadenceFrequency = 'high';
      repetitionVsVariationBias = 0.52;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'stephen_sondheim':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.88;
      cadenceFrequency = 'high';
      repetitionVsVariationBias = 0.56;
      rhythmicSubdivision = 'mixed';
      break;
    case 'kate_bush':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.76;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.46;
      rhythmicSubdivision = 'mixed';
      break;
    case 'thelonious_monk':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.69;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.48;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'dave_brubeck':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.58;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.5;
      rhythmicSubdivision = 'mixed';
      break;
    case 'andrew_hill':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.74;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.36;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'charlie_parker':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.44;
      cadenceFrequency = 'high';
      repetitionVsVariationBias = 0.54;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'bill_evans':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.5;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.51;
      rhythmicSubdivision = 'half_quarter';
      break;
    case 'bacharach':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.85;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.5;
      rhythmicSubdivision = 'half_quarter';
      break;
    case 'donald_fagen':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.56;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.49;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'frank_zappa':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.77;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.47;
      rhythmicSubdivision = 'mixed';
      break;
    case 'joni_mitchell':
      intervalTendency = 'angular';
      phraseAsymmetryTendency = 0.78;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.48;
      rhythmicSubdivision = 'mixed';
      break;
    case 'antonio_carlos_jobim':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.46;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.63;
      rhythmicSubdivision = 'half_quarter';
      break;
    case 'herbie_hancock':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.49;
      cadenceFrequency = 'medium';
      repetitionVsVariationBias = 0.53;
      rhythmicSubdivision = 'eighth_patterns';
      break;
    case 'bob_dylan':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.55;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.35;
      rhythmicSubdivision = 'whole_bar';
      break;
    case 'max_martin':
      intervalTendency = 'mixed';
      phraseAsymmetryTendency = 0.25;
      cadenceFrequency = 'high';
      repetitionVsVariationBias = 0.88;
      rhythmicSubdivision = 'half_quarter';
      break;
    case 'ecm_chamber':
      intervalTendency = 'stepwise';
      phraseAsymmetryTendency = 0.67;
      cadenceFrequency = 'low';
      repetitionVsVariationBias = 0.34;
      rhythmicSubdivision = 'whole_bar';
      break;
    default:
      phraseAsymmetryTendency = 0.4 + (seed % 17) / 100;
      repetitionVsVariationBias = 0.5 + (seed % 20) / 100;
      rhythmicSubdivision = (['whole_bar', 'half_quarter', 'eighth_patterns', 'mixed'] as const)[seed % 4]!;
  }

  return {
    repetitionVsVariationBias: clamp01(repetitionVsVariationBias),
    intervalTendency,
    phraseAsymmetryTendency: clamp01(phraseAsymmetryTendency),
    cadenceFrequency,
    rhythmicSubdivision,
  };
}
