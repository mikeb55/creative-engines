import { basieStyleProfile } from './basieStyleProfile';
import { defaultGceWeights } from './gceEvaluator';
import { defaultLockGates } from './lockGates';
import { scoreModelFeatureExtractor } from './featureExtractor';
import type {
  CandidateScore,
  CombinedEvaluationInput,
  CombinedEvaluationResult,
  DcrProtocolConfig,
  DcrProtocolInput,
  DcrProtocolResult,
  ExtractedStyleFeatures,
  GeneratedCandidate,
  LockGate,
  RefinementTarget,
  StyleProfile,
} from './evaluationTypes';

function toCandidateScore(
  candidateId: string,
  result: CombinedEvaluationResult
): CandidateScore {
  return {
    candidateId,
    gce: result.gce,
    style: result.style,
    lock: result.lock,
    combinedScore: result.finalScore,
    pass: result.pass,
    weakestDimension: result.weakestDimension,
    refinementTarget: result.refinementTarget,
  };
}

function buildCombinedEvaluationInput<T>(
  candidate: GeneratedCandidate<T>,
  dcrConfig: DcrProtocolConfig
): CombinedEvaluationInput<T> {
  return {
    output: candidate.output,
    sourceFormat: 'custom',
    styleProfile: basieStyleProfile as StyleProfile<T>,
    featureExtractor: scoreModelFeatureExtractor as CombinedEvaluationInput<T>['featureExtractor'],
    gceWeights: defaultGceWeights,
    lockGates: defaultLockGates as LockGate<T, ExtractedStyleFeatures>[],
    config: {
      gceWeight: 0.5,
      styleWeight: 0.5,
      lockRequired: dcrConfig.requireLockPass,
      passThreshold: dcrConfig.targetScore,
    },
    metadata: { candidateId: candidate.id },
  };
}

/**
 * DCR (Design → Commit → Refine). Hard rules:
 * - Maximum one refinement pass ever (single refiner.refine call when COMMIT allows REFINE).
 * - Never regenerate all candidates after refine (only the selected candidate is refined).
 * - Never loop on refinement (no second pass; no retry loop).
 * - Preserve the selected candidate's identity for comparison; pick refined vs original only by combinedScore.
 */
export function runDcrProtocol<T>(
  input: DcrProtocolInput<T>
): DcrProtocolResult<T> {
  const { generator, evaluator, refiner, config, generationInput } = input;

  // DESIGN — generate candidateCount candidates using input.generator
  const generated = generator.generate(generationInput);
  const candidates = generated.slice(0, config.candidateCount);
  if (candidates.length === 0) {
    throw new Error('runDcrProtocol: generator produced zero candidates');
  }

  // DESIGN — score each candidate using input.evaluator
  const initialScores: CandidateScore[] = candidates.map((c) =>
    toCandidateScore(c.id, evaluator.evaluate(buildCombinedEvaluationInput(c, config)))
  );

  // DESIGN — select highest combinedScore candidate
  let bestIdx = 0;
  for (let i = 1; i < initialScores.length; i++) {
    if (initialScores[i].combinedScore > initialScores[bestIdx].combinedScore) {
      bestIdx = i;
    }
  }

  const selectedCandidateBeforeRefinement = candidates[bestIdx];
  const selectedScoreBeforeRefinement = initialScores[bestIdx];

  // COMMIT — if highest score >= targetScore: skip refinement, output immediately
  if (selectedScoreBeforeRefinement.combinedScore >= config.targetScore) {
    return {
      initialCandidates: candidates,
      initialScores,
      selectedCandidateBeforeRefinement,
      selectedScoreBeforeRefinement,
      refinedCandidate: undefined,
      refinedScore: undefined,
      finalCandidate: selectedCandidateBeforeRefinement,
      finalScore: selectedScoreBeforeRefinement,
      refinementApplied: false,
      pass: selectedScoreBeforeRefinement.pass,
    };
  }

  // COMMIT — below target and refinement disabled
  if (!config.allowSingleRefinementPass) {
    return {
      initialCandidates: candidates,
      initialScores,
      selectedCandidateBeforeRefinement,
      selectedScoreBeforeRefinement,
      refinedCandidate: undefined,
      refinedScore: undefined,
      finalCandidate: selectedCandidateBeforeRefinement,
      finalScore: selectedScoreBeforeRefinement,
      refinementApplied: false,
      pass: selectedScoreBeforeRefinement.pass,
    };
  }

  // REFINE — one pass only: identify weakest dimension from selected score; refine once; re-score
  const refinementTarget: RefinementTarget = {
    dimensionId: selectedScoreBeforeRefinement.weakestDimension,
    dimensionType: 'combined',
    reason: 'DCR single-pass refinement toward weakest dimension',
  };

  const refinedCandidate = refiner.refine(
    selectedCandidateBeforeRefinement,
    refinementTarget
  );

  const refinedEval = evaluator.evaluate(
    buildCombinedEvaluationInput(refinedCandidate, config)
  );
  const refinedScore = toCandidateScore(refinedCandidate.id, refinedEval);

  let finalCandidate: GeneratedCandidate<T>;
  let finalScore: CandidateScore;
  if (refinedScore.combinedScore > selectedScoreBeforeRefinement.combinedScore) {
    finalCandidate = refinedCandidate;
    finalScore = refinedScore;
  } else {
    finalCandidate = selectedCandidateBeforeRefinement;
    finalScore = selectedScoreBeforeRefinement;
  }

  return {
    initialCandidates: candidates,
    initialScores,
    selectedCandidateBeforeRefinement,
    selectedScoreBeforeRefinement,
    refinedCandidate,
    refinedScore,
    finalCandidate,
    finalScore,
    refinementApplied: true,
    pass: finalScore.pass,
  };
}
