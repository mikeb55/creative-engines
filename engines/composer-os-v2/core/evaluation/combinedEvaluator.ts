import { evaluateGce } from './gceEvaluator';
import { evaluateLock } from './lockGates';
import type {
  CombinedEvaluationInput,
  CombinedEvaluationResult,
  CombinedEvaluator,
  CombinedEvaluatorConfig,
  RefinementTarget,
} from './evaluationTypes';

const DEFAULT_COMBINED_CONFIG: CombinedEvaluatorConfig = {
  gceWeight: 0.6,
  styleWeight: 0.4,
  lockRequired: true,
  passThreshold: 7.0,
};

/**
 * Factory for a {@link CombinedEvaluator}: feature extract → GCE → style profile → LOCK → weighted score.
 */
export function createCombinedEvaluator(
  partial?: Partial<CombinedEvaluatorConfig>
): CombinedEvaluator<unknown> {
  const baseConfig: CombinedEvaluatorConfig = {
    ...DEFAULT_COMBINED_CONFIG,
    ...partial,
  };

  return {
    evaluate(input: CombinedEvaluationInput<unknown>): CombinedEvaluationResult {
      const cfg = { ...baseConfig, ...input.config };

      const features = input.featureExtractor.extract({
        output: input.output,
        sourceFormat: input.sourceFormat,
        styleId: input.styleProfile.id,
        metadata: input.metadata,
      });

      const gce = evaluateGce({
        output: input.output,
        features,
        weights: input.gceWeights,
      });

      const style = input.styleProfile.score({
        output: input.output,
        features,
        profile: input.styleProfile,
      });

      const lock = evaluateLock(input.output, features);

      const finalScore =
        cfg.gceWeight * gce.finalScore + cfg.styleWeight * style.finalStyleScore;

      let pass = finalScore >= cfg.passThreshold;
      if (cfg.lockRequired && lock.pass === false) {
        pass = false;
      }

      const gceWeakScore = gce.categories[gce.weakestCategory].score;
      const styleWeakDim = style.dimensions.find((d) => d.id === style.weakestDimensionId);
      const styleWeakScore = styleWeakDim?.score ?? 0;

      let weakestDimension: string;
      let refinementTarget: RefinementTarget | undefined;

      if (gceWeakScore <= styleWeakScore) {
        weakestDimension = gce.weakestCategory;
        refinementTarget = {
          dimensionId: gce.weakestCategory,
          dimensionType: 'gce',
          reason: 'Combined evaluator: lowest score in GCE weakest category vs style weakest dimension',
        };
      } else {
        weakestDimension = style.weakestDimensionId;
        refinementTarget = {
          dimensionId: style.weakestDimensionId,
          dimensionType: 'style',
          reason: 'Combined evaluator: lowest score in style weakest dimension vs GCE weakest category',
        };
      }

      const reasons: string[] = [
        `weighted: ${cfg.gceWeight}×GCE(${gce.finalScore.toFixed(2)}) + ${cfg.styleWeight}×Style(${style.finalStyleScore.toFixed(2)}) = ${finalScore.toFixed(2)}`,
      ];
      if (cfg.lockRequired && !lock.pass) {
        reasons.push('LOCK required but lock evaluation did not pass');
      }

      return {
        features,
        gce,
        style,
        lock,
        finalScore,
        weakestDimension,
        refinementTarget,
        pass,
        reasons,
      };
    },
  };
}
