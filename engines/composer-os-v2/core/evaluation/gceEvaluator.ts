import type {
  GceCategory,
  GceEvaluationInput,
  GceEvaluationResult,
  GceScoreMap,
  GceWeights,
} from './evaluationTypes';

const GCE_CATEGORY_ORDER: GceCategory[] = [
  'cadentialClarity',
  'melodicIdentity',
  'phraseGrammar',
  'harmonyAndLanguage',
  'rhythmicIdentity',
  'structureAndForm',
  'arrangementAndOrchestration',
  'economyAndFocus',
  'tensionAndRelease',
  'thematicRecallPotential',
];

const DEFAULT_GCE_PASS_THRESHOLD = 9.0;

export const defaultGceWeights: GceWeights = {
  cadentialClarity: 0.1,
  melodicIdentity: 0.12,
  phraseGrammar: 0.1,
  harmonyAndLanguage: 0.12,
  rhythmicIdentity: 0.12,
  structureAndForm: 0.1,
  arrangementAndOrchestration: 0.1,
  economyAndFocus: 0.08,
  tensionAndRelease: 0.08,
  thematicRecallPotential: 0.08,
};

export function evaluateGce(input: GceEvaluationInput): GceEvaluationResult {
  const weights: GceWeights = {
    ...defaultGceWeights,
    ...input.weights,
  };

  const placeholderScore = 5.0;
  const categories = {} as GceScoreMap;
  let finalScore = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  let weakestCategory: GceCategory = GCE_CATEGORY_ORDER[0];
  let strongestCategory: GceCategory = GCE_CATEGORY_ORDER[0];

  for (const category of GCE_CATEGORY_ORDER) {
    const w = weights[category];
    const weightedScore = placeholderScore * w;
    categories[category] = {
      category,
      score: placeholderScore,
      weight: w,
      weightedScore,
    };
    finalScore += weightedScore;

    if (placeholderScore < minScore) {
      minScore = placeholderScore;
      weakestCategory = category;
    }
    if (placeholderScore > maxScore) {
      maxScore = placeholderScore;
      strongestCategory = category;
    }
  }

  const threshold = DEFAULT_GCE_PASS_THRESHOLD;

  return {
    categories,
    finalScore,
    weakestCategory,
    strongestCategory,
    pass: finalScore >= threshold,
    threshold,
  };
}
