import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const ellingtonDimensions: StyleDimensionDefinition[] = [
  {
    id: 'voicingUniqueness',
    label: 'Voicing Uniqueness',
    weight: 0.3,
    description: 'unusual note combinations; avgVoicingSize >= 4',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'harmonicDensity',
    label: 'Harmonic Density',
    weight: 0.3,
    description: 'chord density 4/5; non-functional 40%+',
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'textureFluidity',
    label: 'Texture Fluidity',
    weight: 0.2,
    description: 'elastic/floating time feel; swingGridAlignment not locked',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'orchestrationColor',
    label: 'Orchestration Color',
    weight: 0.2,
    description: 'unusual section blending; high pianoDensity',
    featureKeys: ['orchestration.pianoDensity'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreVoicingUniqueness(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 1;
  if (avgVoicingSize >= 6) return 10;
  if (avgVoicingSize >= 4) return 7;
  if (avgVoicingSize >= 2) return 4;
  return 1;
}

function scoreHarmonicDensity(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio <= 0.5) return 10;
  if (functionalRatio <= 0.65) return 7;
  if (functionalRatio <= 0.8) return 4;
  return 1;
}

function scoreTextureFluidity(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment <= 0.5) return 10;
  if (swingGridAlignment <= 0.7) return 7;
  if (swingGridAlignment <= 0.85) return 4;
  return 1;
}

function scoreOrchestrationColor(pianoDensity: number | null): number {
  if (pianoDensity == null) return 1;
  if (pianoDensity >= 0.7) return 10;
  if (pianoDensity >= 0.5) return 7;
  if (pianoDensity >= 0.3) return 4;
  return 1;
}

function scoreEllington(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const avgVoicingSize = num(orch.avgVoicingSize);
  const functionalRatio = num(harmonic.functionalRatio);
  const swingGridAlignment = num(rhythmic.swingGridAlignment);
  const pianoDensity = num(orch.pianoDensity);

  const byId: Record<string, number> = {
    voicingUniqueness: scoreVoicingUniqueness(avgVoicingSize),
    harmonicDensity: scoreHarmonicDensity(functionalRatio),
    textureFluidity: scoreTextureFluidity(swingGridAlignment),
    orchestrationColor: scoreOrchestrationColor(pianoDensity),
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

export const ellingtonStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'ellington',
  name: 'Duke Ellington',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: ellingtonDimensions,
  score: scoreEllington,
};

