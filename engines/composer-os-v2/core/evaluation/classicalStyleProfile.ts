import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const classicalDimensions: StyleDimensionDefinition[] = [
  {
    id: 'functionalModulation',
    label: 'Functional modulation',
    weight: 0.3,
    description:
      'harmonic.functionalRatio mid-high (tonality + secondary dominants / modulation pivots)',
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'orchestralBreadth',
    label: 'Orchestral breadth',
    weight: 0.3,
    description: 'orchestration.avgVoicingSize high (full orchestra families, tutti weight)',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'periodicPhrasing',
    label: 'Periodic phrasing',
    weight: 0.2,
    description: 'formal.riffRepetitionRatio moderate (periodic returns, homophony/polyphony alternation)',
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'metricDefinition',
    label: 'Metric definition',
    weight: 0.2,
    description:
      'rhythmic.swingGridAlignment mid-high (clear meter; dynamic curves pp–ff need dynamics channel — proxy)',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** Functional tonality with room for secondary dominants / pivots — not pure folk simplicity. */
function scoreFunctionalModulation(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio >= 0.52 && functionalRatio <= 0.82) return 10;
  if (functionalRatio >= 0.42 && functionalRatio <= 0.88) return 7;
  if (functionalRatio >= 0.32 && functionalRatio <= 0.92) return 4;
  return 1;
}

/** Full-orchestra concurrent weight — homophonic tuttis vs contrapuntal layers. */
function scoreOrchestralBreadth(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 1;
  if (avgVoicingSize >= 8) return 10;
  if (avgVoicingSize >= 6) return 7;
  if (avgVoicingSize >= 4.5) return 4;
  return 1;
}

/** Classical periodic form — balanced recurrence vs developmental stretch. */
function scorePeriodicPhrasing(riffRepetitionRatio: number | null): number {
  if (riffRepetitionRatio == null) return 1;
  if (riffRepetitionRatio >= 0.12 && riffRepetitionRatio <= 0.42) return 10;
  if (riffRepetitionRatio >= 0.06 && riffRepetitionRatio <= 0.55) return 7;
  if (riffRepetitionRatio >= 0.02 && riffRepetitionRatio <= 0.68) return 4;
  return 1;
}

/** Structural rhythmic clarity as proxy until dynamics variance is extracted (pp–ff arcs). */
function scoreMetricDefinition(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment >= 0.62 && swingGridAlignment <= 0.92) return 10;
  if (swingGridAlignment >= 0.52 && swingGridAlignment <= 0.96) return 7;
  if (swingGridAlignment >= 0.4) return 4;
  return 1;
}

function scoreClassical(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const harmonic = input.features.harmonic ?? {};
  const orch = input.features.orchestration ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    functionalModulation: scoreFunctionalModulation(num(harmonic.functionalRatio)),
    orchestralBreadth: scoreOrchestralBreadth(num(orch.avgVoicingSize)),
    periodicPhrasing: scorePeriodicPhrasing(num(formal.riffRepetitionRatio)),
    metricDefinition: scoreMetricDefinition(num(rhythmic.swingGridAlignment)),
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

export const classicalStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'classical',
  name: 'Classical (Light Touch)',
  family: 'classical',
  threshold: 7.0,
  dimensions: classicalDimensions,
  score: scoreClassical,
};
