export type GCEGenerationTarget = {
  minScore: number;
  maxRefinementPasses: number;
  weights: {
    gce: number;
    style: number;
    quadratonicAlignment: number;
  };
};

export const DEFAULT_GCE_TARGET: GCEGenerationTarget = {
  minScore: 8.5,
  maxRefinementPasses: 1,
  weights: { gce: 0.5, style: 0.3, quadratonicAlignment: 0.2 },
};

export type GCEGenerationResult = {
  output: unknown;
  finalScore: number;
  passedTarget: boolean;
  refinementPasses: number;
  evaluationBreakdown: { gce: number; style: number; quadratonicAlignment: number };
};

function weightedScore(
  breakdown: { gce: number; style: number; quadratonicAlignment: number },
  weights: GCEGenerationTarget['weights']
): number {
  return (
    weights.gce * breakdown.gce +
    weights.style * breakdown.style +
    weights.quadratonicAlignment * breakdown.quadratonicAlignment
  );
}

/**
 * One-shot generation with optional refinement capped by `maxRefinementPasses` (DCR: at most one pass when default **1**).
 */
export function runWithGCETarget<T>(
  generate: () => T,
  evaluate: (output: T) => { gce: number; style: number; quadratonicAlignment: number },
  refine: (output: T, breakdown: { gce: number; style: number; quadratonicAlignment: number }) => T,
  target: GCEGenerationTarget
): GCEGenerationResult {
  let output: T = generate();
  let breakdown = evaluate(output);
  let refinementPasses = 0;
  let finalScore = weightedScore(breakdown, target.weights);

  while (finalScore < target.minScore && refinementPasses < target.maxRefinementPasses) {
    output = refine(output, breakdown);
    refinementPasses += 1;
    breakdown = evaluate(output);
    finalScore = weightedScore(breakdown, target.weights);
  }

  return {
    output,
    finalScore,
    passedTarget: finalScore >= target.minScore,
    refinementPasses,
    evaluationBreakdown: breakdown,
  };
}
