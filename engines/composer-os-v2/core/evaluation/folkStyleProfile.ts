import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const folkDimensions: StyleDimensionDefinition[] = [
  {
    id: 'functionalSimplicity',
    label: 'Functional simplicity',
    weight: 0.25,
    description: 'harmonic.functionalRatio high (I–IV–V tonal clarity)',
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'chordSparsity',
    label: 'Chord sparsity',
    weight: 0.25,
    description: 'orchestration.pianoDensity low',
    featureKeys: ['orchestration.pianoDensity'],
  },
  {
    id: 'steadyPulse',
    label: 'Steady pulse',
    weight: 0.25,
    description: 'rhythmic.swingGridAlignment high (steady duple/triple grid)',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'intimateEnsemble',
    label: 'Intimate ensemble',
    weight: 0.25,
    description: 'orchestration.avgVoicingSize low (small group / narrow weight)',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** Simple diatonic harmony — reward strong functional cadential clarity. */
function scoreFunctionalSimplicity(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio >= 0.82) return 10;
  if (functionalRatio >= 0.68) return 7;
  if (functionalRatio >= 0.52) return 4;
  return 1;
}

/** Low chord density — melody-forward, drone/chordal support stays thin. */
function scoreChordSparsity(pianoDensity: number | null): number {
  if (pianoDensity == null) return 1;
  if (pianoDensity <= 0.18) return 10;
  if (pianoDensity <= 0.32) return 7;
  if (pianoDensity <= 0.48) return 4;
  return 1;
}

/** Minimal syncopation vs grid — high alignment to predictable subdivisions. */
function scoreSteadyPulse(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment >= 0.82) return 10;
  if (swingGridAlignment >= 0.68) return 7;
  if (swingGridAlignment >= 0.52) return 4;
  return 1;
}

/** Small ensemble concurrent weight — narrow scoring implied by thin stacks. */
function scoreIntimateEnsemble(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 1;
  if (avgVoicingSize <= 3.5) return 10;
  if (avgVoicingSize <= 5) return 7;
  if (avgVoicingSize <= 6.5) return 4;
  return 1;
}

function scoreFolk(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const harmonic = input.features.harmonic ?? {};
  const orch = input.features.orchestration ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    functionalSimplicity: scoreFunctionalSimplicity(num(harmonic.functionalRatio)),
    chordSparsity: scoreChordSparsity(num(orch.pianoDensity)),
    steadyPulse: scoreSteadyPulse(num(rhythmic.swingGridAlignment)),
    intimateEnsemble: scoreIntimateEnsemble(num(orch.avgVoicingSize)),
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

export const folkStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'folk',
  name: 'Folk (Light Touch)',
  family: 'custom',
  threshold: 7.0,
  dimensions: folkDimensions,
  score: scoreFolk,
  quadratonicAlignmentWeight: 0.05,
};
