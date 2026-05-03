import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const basieDimensions: StyleDimensionDefinition[] = [
  {
    id: 'densityScore',
    label: 'Voicing Density',
    weight: 0.25,
    description: 'avgVoicingSize < 5 notes',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'riffRepetitionScore',
    label: 'Riff Repetition',
    weight: 0.25,
    description: 'riffRepetition > 0.6',
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'swingClarityScore',
    label: 'Swing Clarity',
    weight: 0.25,
    description: 'syncopation matches swing grid',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'compSparsityScore',
    label: 'Comp Sparsity',
    weight: 0.25,
    description: 'pianoDensity low',
    featureKeys: ['orchestration.pianoDensity'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreDensity(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 1;
  if (avgVoicingSize <= 3) return 10;
  if (avgVoicingSize <= 5) return 7;
  if (avgVoicingSize <= 7) return 4;
  return 1;
}

function scoreRiff(riffRepetitionRatio: number | null): number {
  if (riffRepetitionRatio == null) return 1;
  if (riffRepetitionRatio >= 0.7) return 10;
  if (riffRepetitionRatio >= 0.5) return 7;
  if (riffRepetitionRatio >= 0.3) return 4;
  return 1;
}

function scoreSwing(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment >= 0.8) return 10;
  if (swingGridAlignment >= 0.6) return 7;
  if (swingGridAlignment >= 0.4) return 4;
  return 1;
}

function scoreComp(pianoDensity: number | null): number {
  if (pianoDensity == null) return 1;
  if (pianoDensity <= 0.2) return 10;
  if (pianoDensity <= 0.4) return 7;
  if (pianoDensity <= 0.6) return 4;
  return 1;
}

function scoreBasie(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const avgVoicingSize = num(orch.avgVoicingSize);
  const pianoDensity = num(orch.pianoDensity);
  const riffRepetitionRatio = num(formal.riffRepetitionRatio);
  const swingGridAlignment = num(rhythmic.swingGridAlignment);

  const byId: Record<string, number> = {
    densityScore: scoreDensity(avgVoicingSize),
    riffRepetitionScore: scoreRiff(riffRepetitionRatio),
    swingClarityScore: scoreSwing(swingGridAlignment),
    compSparsityScore: scoreComp(pianoDensity),
  };

  const dimensions: StyleDimensionScore[] = input.profile.dimensions.map((d) => {
    const s = byId[d.id] ?? 1;
    return {
      id: d.id,
      label: d.label,
      score: s,
      weight: d.weight,
      weightedScore: s * d.weight,
      targetDescription: d.description,
    };
  });

  const finalStyleScore = dimensions.reduce((acc, d) => acc + d.weightedScore, 0);

  let weakestDimensionId = dimensions[0]?.id ?? '';
  let strongestDimensionId = dimensions[0]?.id ?? '';
  let minS = Infinity;
  let maxS = -Infinity;
  for (const d of dimensions) {
    if (d.score < minS) {
      minS = d.score;
      weakestDimensionId = d.id;
    }
    if (d.score > maxS) {
      maxS = d.score;
      strongestDimensionId = d.id;
    }
  }

  return {
    styleId: input.profile.id,
    styleName: input.profile.name,
    dimensions,
    finalStyleScore,
    weakestDimensionId,
    strongestDimensionId,
    pass: finalStyleScore >= input.profile.threshold,
    threshold: input.profile.threshold,
  };
}

export const basieStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'basie',
  name: 'Count Basie',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: basieDimensions,
  score: scoreBasie,
};
