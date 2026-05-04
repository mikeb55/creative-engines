import { evaluateGce } from './gceEvaluator';
import { evaluateLock } from './lockGates';
import {
  evaluateQuadratonicAlignmentScore,
  resolveQuadratonicAlignmentWeight,
} from './quadratonicAlignmentEvaluator';
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

      const wqRaw =
        typeof cfg.quadratonicAlignmentWeight === 'number' && Number.isFinite(cfg.quadratonicAlignmentWeight)
          ? cfg.quadratonicAlignmentWeight
          : resolveQuadratonicAlignmentWeight(input.styleProfile, input.metadata);
      const wq = Math.max(0, Math.min(1, wqRaw));

      const quadScore = evaluateQuadratonicAlignmentScore(input.output);
      const baseBlend = cfg.gceWeight * gce.finalScore + cfg.styleWeight * style.finalStyleScore;
      const finalScore = (1 - wq) * baseBlend + wq * quadScore;

      let pass = finalScore >= cfg.passThreshold;
      if (cfg.lockRequired && lock.pass === false) {
        pass = false;
      }

      const gceWeakScore = gce.categories[gce.weakestCategory].score;
      const styleWeakDim = style.dimensions.find((d) => d.id === style.weakestDimensionId);
      const styleWeakScore = styleWeakDim?.score ?? 0;

      const triple: Array<{
        id: string;
        type: RefinementTarget['dimensionType'];
        score: number;
        reason: string;
      }> = [
        {
          id: gce.weakestCategory,
          type: 'gce',
          score: gceWeakScore,
          reason: 'Combined evaluator: GCE weakest category',
        },
        {
          id: style.weakestDimensionId,
          type: 'style',
          score: styleWeakScore,
          reason: 'Combined evaluator: style weakest dimension',
        },
        {
          id: 'quadratonicAlignment',
          type: 'quadratonic',
          score: quadScore,
          reason: 'Combined evaluator: quadratonic melody vs chord alignment',
        },
      ];

      let pick = triple[0]!;
      for (const t of triple.slice(1)) {
        if (t.score < pick.score) pick = t;
      }

      const weakestDimension = pick.id;
      const refinementTarget: RefinementTarget | undefined = {
        dimensionId: pick.id,
        dimensionType: pick.type,
        reason: pick.reason,
      };

      const reasons: string[] = [
        `weighted: (1−${wq.toFixed(2)})×(${cfg.gceWeight}×GCE(${gce.finalScore.toFixed(2)})+${cfg.styleWeight}×Style(${style.finalStyleScore.toFixed(2)})) + ${wq.toFixed(2)}×Quadratonic(${quadScore.toFixed(2)}) = ${finalScore.toFixed(2)}`,
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
        quadratonicAlignment: { score: quadScore, weight: wq },
      };
    },
  };
}
