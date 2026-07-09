import type {
  GceCategory,
  GceEvaluationInput,
  GceEvaluationResult,
  GceScoreMap,
  GceWeights,
} from './evaluationTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { resolveMelodicPartId } from '../gce/resolveMelodicPartId';
import { scoreModelToMelodicLine } from '../gce/scoreModelToMelodicLine';
import { buildFallbackChordsAndSectionsFromScore } from '../gce/gceGate';
import {
  applyGceScorerRoutingDiagnostics,
  GCE_EVAL_COMPOSITION_CONTEXT_KEY,
  resolveGceScorerRouting,
} from '../gce/resolveEffectiveGceStyle';
import type { CompositionContext } from '../compositionContext';
import {
  scoreCadentialClarity,
  scoreMelodicIdentity,
  scorePhraseGrammar,
  scoreHarmonyAndLanguage,
  scoreRhythmicIdentity,
  scoreStructureAndForm,
  scoreArrangementAndOrchestrationForEnsemble,
  scoreEconomyAndFocusForEnsemble,
  scoreTensionAndReleaseForEnsemble,
  scoreThematicRecallPotential,
} from '../gce/gceAutoScorers';

export const GCE_CATEGORY_ORDER: GceCategory[] = [
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

function isScoreModelOutput(output: unknown): output is ScoreModel {
  return output != null && typeof output === 'object' && Array.isArray((output as ScoreModel).parts);
}

/** Real `gceAutoScorers` pillar blend — same melodic extraction as {@link scoreResultForGce} (BB-aware part id). */
function evaluateGceFromScoreModel(
  score: ScoreModel,
  weights: GceWeights,
  songwriterId: string | undefined,
  threshold: number
): GceEvaluationResult {
  const { chords, sections } = buildFallbackChordsAndSectionsFromScore(score);
  const melodicPartId = resolveMelodicPartId(score);
  const melody = scoreModelToMelodicLine(score, melodicPartId);

  const raw: Record<GceCategory, number> = {
    cadentialClarity: scoreCadentialClarity(melody, chords, sections).score,
    melodicIdentity: scoreMelodicIdentity(melody, songwriterId).score,
    phraseGrammar: scorePhraseGrammar(melody).score,
    harmonyAndLanguage: scoreHarmonyAndLanguage(chords).score,
    rhythmicIdentity: scoreRhythmicIdentity(melody).score,
    structureAndForm: scoreStructureAndForm(score, chords, sections).score,
    arrangementAndOrchestration: scoreArrangementAndOrchestrationForEnsemble(score).score,
    economyAndFocus: scoreEconomyAndFocusForEnsemble(melody, sections, score).score,
    tensionAndRelease: scoreTensionAndReleaseForEnsemble(score, chords, melody).score,
    thematicRecallPotential: scoreThematicRecallPotential(melody, sections).score,
  };

  const categories = {} as GceScoreMap;
  let finalScore = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  let weakestCategory: GceCategory = GCE_CATEGORY_ORDER[0]!;
  let strongestCategory: GceCategory = GCE_CATEGORY_ORDER[0]!;

  for (const cat of GCE_CATEGORY_ORDER) {
    const scoreVal = raw[cat];
    const w = weights[cat];
    const weightedScore = scoreVal * w;
    categories[cat] = {
      category: cat,
      score: scoreVal,
      weight: w,
      weightedScore,
    };
    finalScore += weightedScore;
    if (scoreVal <= minScore) {
      minScore = scoreVal;
      weakestCategory = cat;
    }
    if (scoreVal >= maxScore) {
      maxScore = scoreVal;
      strongestCategory = cat;
    }
  }

  finalScore = Math.round(finalScore * 10) / 10;

  const result: GceEvaluationResult = {
    categories,
    finalScore,
    weakestCategory,
    strongestCategory,
    pass: finalScore >= threshold,
    threshold,
  };
  return result;
}

export function evaluateGce(input: GceEvaluationInput): GceEvaluationResult {
  const weights: GceWeights = {
    ...defaultGceWeights,
    ...input.weights,
  };

  const threshold = DEFAULT_GCE_PASS_THRESHOLD;

  if (isScoreModelOutput(input.output)) {
    const rawContext = input.metadata?.[GCE_EVAL_COMPOSITION_CONTEXT_KEY];
    const compositionContext =
      rawContext != null && typeof rawContext === 'object' && 'form' in (rawContext as object)
        ? (rawContext as CompositionContext)
        : undefined;

    let songwriterId: string | undefined;
    let mismatchNote: string | undefined;
    if (compositionContext) {
      const routing = resolveGceScorerRouting(compositionContext);
      applyGceScorerRoutingDiagnostics(compositionContext, routing);
      songwriterId = routing.effectiveStyleId;
      mismatchNote = routing.harmonicVoiceScorerMismatch;
    } else {
      songwriterId =
        typeof input.metadata?.songwriterStyleId === 'string' ? input.metadata.songwriterStyleId : undefined;
    }

    const result = evaluateGceFromScoreModel(input.output, weights, songwriterId, threshold);
    if (mismatchNote) {
      result.notes = [...(result.notes ?? []), mismatchNote];
    }
    return result;
  }

  const placeholderScore = 5.0;
  const categories = {} as GceScoreMap;
  let finalScore = 0;
  let weakestCategory: GceCategory = GCE_CATEGORY_ORDER[0]!;
  let strongestCategory: GceCategory = GCE_CATEGORY_ORDER[0]!;

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
  }

  return {
    categories,
    finalScore,
    weakestCategory,
    strongestCategory,
    pass: finalScore >= threshold,
    threshold,
  };
}
