import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const schneiderDimensions: StyleDimensionDefinition[] = [
  {
    id: 'harmonicComplexity',
    label: 'Harmonic Complexity',
    weight: 0.35,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'textureMosaic',
    label: 'Texture Mosaic',
    weight: 0.3,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'narrativeArc',
    label: 'Narrative Arc',
    weight: 0.2,
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'rhythmicFloat',
    label: 'Rhythmic Float',
    weight: 0.15,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreHarmonicComplexity(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio <= 0.35) return 10;
  if (functionalRatio <= 0.5) return 7;
  if (functionalRatio <= 0.65) return 4;
  return 1;
}

function scoreTextureMosaic(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 1;
  if (avgVoicingSize >= 7) return 10;
  if (avgVoicingSize >= 5) return 7;
  if (avgVoicingSize >= 3) return 4;
  return 1;
}

function scoreNarrativeArc(riffRepetitionRatio: number | null): number {
  if (riffRepetitionRatio == null) return 1;
  if (riffRepetitionRatio <= 0.2) return 10;
  if (riffRepetitionRatio <= 0.4) return 7;
  if (riffRepetitionRatio <= 0.6) return 4;
  return 1;
}

function scoreRhythmicFloat(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment <= 0.4) return 10;
  if (swingGridAlignment <= 0.6) return 7;
  if (swingGridAlignment <= 0.75) return 4;
  return 1;
}

function scoreSchneider(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const functionalRatio = num(harmonic.functionalRatio);
  const avgVoicingSize = num(orch.avgVoicingSize);
  const riffRepetitionRatio = num(formal.riffRepetitionRatio);
  const swingGridAlignment = num(rhythmic.swingGridAlignment);

  const byId: Record<string, number> = {
    harmonicComplexity: scoreHarmonicComplexity(functionalRatio),
    textureMosaic: scoreTextureMosaic(avgVoicingSize),
    narrativeArc: scoreNarrativeArc(riffRepetitionRatio),
    rhythmicFloat: scoreRhythmicFloat(swingGridAlignment),
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

  const finalStyleScore = dimensions.reduce((acc, d) => acc + (d.weightedScore ?? d.score * d.weight), 0);

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
    styleName: input.profile.name ?? input.profile.label ?? input.profile.id,
    dimensions,
    finalStyleScore,
    weakestDimensionId,
    strongestDimensionId,
    pass: finalStyleScore >= input.profile.threshold,
    threshold: input.profile.threshold,
  };
}

export const schneiderStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'schneider',
  name: 'Maria Schneider',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: schneiderDimensions,
  score: scoreSchneider,
};

