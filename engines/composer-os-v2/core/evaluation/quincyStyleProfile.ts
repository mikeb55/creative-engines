import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const quincyDimensions: StyleDimensionDefinition[] = [
  {
    id: 'grooveStrength',
    label: 'Groove Strength',
    weight: 0.35,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'cinematicDensity',
    label: 'Cinematic Density',
    weight: 0.25,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'functionalHarmony',
    label: 'Functional Harmony',
    weight: 0.25,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'rhythmLeads',
    label: 'Rhythm Leads',
    weight: 0.15,
    featureKeys: ['orchestration.pianoDensity'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreGrooveStrength(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment >= 0.8) return 10;
  if (swingGridAlignment >= 0.65) return 7;
  if (swingGridAlignment >= 0.5) return 4;
  return 1;
}

function scoreCinematicDensity(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 4;
  if (avgVoicingSize >= 4 && avgVoicingSize <= 6) return 10;
  if (avgVoicingSize >= 3 && avgVoicingSize <= 7) return 7;
  return 4;
}

function scoreFunctionalHarmony(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio >= 0.75) return 10;
  if (functionalRatio >= 0.6) return 7;
  if (functionalRatio >= 0.45) return 4;
  return 1;
}

function scoreRhythmLeads(pianoDensity: number | null): number {
  if (pianoDensity == null) return 1;
  if (pianoDensity >= 0.6) return 10;
  if (pianoDensity >= 0.4) return 7;
  if (pianoDensity >= 0.2) return 4;
  return 1;
}

function scoreQuincy(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const swingGridAlignment = num(rhythmic.swingGridAlignment);
  const avgVoicingSize = num(orch.avgVoicingSize);
  const functionalRatio = num(harmonic.functionalRatio);
  const pianoDensity = num(orch.pianoDensity);

  const byId: Record<string, number> = {
    grooveStrength: scoreGrooveStrength(swingGridAlignment),
    cinematicDensity: scoreCinematicDensity(avgVoicingSize),
    functionalHarmony: scoreFunctionalHarmony(functionalRatio),
    rhythmLeads: scoreRhythmLeads(pianoDensity),
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

export const quincyStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'quincy_jones',
  name: 'Quincy Jones',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: quincyDimensions,
  score: scoreQuincy,
};
