import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const gilDimensions: StyleDimensionDefinition[] = [
  {
    id: 'colourWash',
    label: 'Colour wash',
    weight: 0.3,
    featureKeys: ['orchestration.pianoDensity'],
  },
  {
    id: 'modalOpenness',
    label: 'Modal openness',
    weight: 0.35,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'elasticPulse',
    label: 'Elastic pulse',
    weight: 0.25,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'horizonBlend',
    label: 'Horizon blend',
    weight: 0.1,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** Mid piano wash — not silent, not kick-dense. */
function scoreColourWash(pd: number | null): number {
  if (pd == null) return 1;
  if (pd >= 0.28 && pd <= 0.52) return 10;
  if (pd >= 0.18 && pd <= 0.62) return 7;
  if (pd >= 0.1 && pd <= 0.75) return 4;
  return 1;
}

/** Lower functional % aligns with colour-field / modal openness (research table). */
function scoreModalOpenness(fr: number | null): number {
  if (fr == null) return 1;
  if (fr <= 0.48) return 10;
  if (fr <= 0.62) return 7;
  if (fr <= 0.78) return 4;
  return 1;
}

/** Floating time — not locked-grid groove scoring. */
function scoreElasticPulse(sw: number | null): number {
  if (sw == null) return 1;
  if (sw <= 0.52) return 10;
  if (sw <= 0.68) return 7;
  if (sw <= 0.82) return 4;
  return 1;
}

function scoreHorizonBlend(avg: number | null): number {
  if (avg == null) return 1;
  if (avg >= 3 && avg <= 5) return 10;
  if (avg >= 2 && avg <= 6) return 7;
  if (avg >= 1 && avg <= 8) return 4;
  return 1;
}

function scoreGilEvans(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    colourWash: scoreColourWash(num(orch.pianoDensity)),
    modalOpenness: scoreModalOpenness(num(harmonic.functionalRatio)),
    elasticPulse: scoreElasticPulse(num(rhythmic.swingGridAlignment)),
    horizonBlend: scoreHorizonBlend(num(orch.avgVoicingSize)),
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

export const gilEvansStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'gil_evans',
  name: 'Gil Evans',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: gilDimensions,
  score: scoreGilEvans,
};
