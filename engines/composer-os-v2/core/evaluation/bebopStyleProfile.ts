import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const bebopDimensions: StyleDimensionDefinition[] = [
  {
    id: 'extendedHarmony',
    label: 'Extended harmony',
    weight: 0.3,
    description: 'harmonic.functionalRatio mid-high (9ths/11ths/13ths / altered dominants language)',
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'sparseComping',
    label: 'Sparse comping',
    weight: 0.25,
    description: 'orchestration.pianoDensity low (single lead over thin cushion)',
    featureKeys: ['orchestration.pianoDensity'],
  },
  {
    id: 'syncopationDrive',
    label: 'Syncopation drive',
    weight: 0.25,
    description: 'rhythmic.swingGridAlignment mid band (heavy syncopation / displacement)',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'comboLinearWeight',
    label: 'Combo linear weight',
    weight: 0.2,
    description: 'orchestration.avgVoicingSize low–mid (small combo; intensity via line/register)',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** Post-bop harmonic richness — functional backbone with extensions / chromatic approach. */
function scoreExtendedHarmony(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio >= 0.56 && functionalRatio <= 0.82) return 10;
  if (functionalRatio >= 0.46 && functionalRatio <= 0.88) return 7;
  if (functionalRatio >= 0.36 && functionalRatio <= 0.92) return 4;
  return 1;
}

/** Sparse comp — rhythm section stays out of the solo lane; intensity not wash volume. */
function scoreSparseComping(pianoDensity: number | null): number {
  if (pianoDensity == null) return 1;
  if (pianoDensity <= 0.22) return 10;
  if (pianoDensity <= 0.38) return 7;
  if (pianoDensity <= 0.55) return 4;
  return 1;
}

/** Heavy syncopation — mid-range grid coupling (tempo not in scoreModel features). */
function scoreSyncopationDrive(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment >= 0.38 && swingGridAlignment <= 0.68) return 10;
  if (swingGridAlignment >= 0.28 && swingGridAlignment <= 0.78) return 7;
  if (swingGridAlignment >= 0.18 && swingGridAlignment <= 0.88) return 4;
  return 1;
}

/** Small combo vertical weight — hyperactive lead vs thin ensemble stack. */
function scoreComboLinearWeight(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 1;
  if (avgVoicingSize >= 2.5 && avgVoicingSize <= 5.5) return 10;
  if (avgVoicingSize >= 2 && avgVoicingSize <= 6.5) return 7;
  if (avgVoicingSize >= 1.5 && avgVoicingSize <= 7.5) return 4;
  return 1;
}

function scoreBebop(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const harmonic = input.features.harmonic ?? {};
  const orch = input.features.orchestration ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    extendedHarmony: scoreExtendedHarmony(num(harmonic.functionalRatio)),
    sparseComping: scoreSparseComping(num(orch.pianoDensity)),
    syncopationDrive: scoreSyncopationDrive(num(rhythmic.swingGridAlignment)),
    comboLinearWeight: scoreComboLinearWeight(num(orch.avgVoicingSize)),
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

export const bebopStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'bebop',
  name: 'Bebop (Light Touch)',
  family: 'jazz',
  threshold: 7.0,
  dimensions: bebopDimensions,
  score: scoreBebop,
  quadratonicAlignmentWeight: 0.25,
};
