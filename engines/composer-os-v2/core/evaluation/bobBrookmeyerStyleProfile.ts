import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const brookDimensions: StyleDimensionDefinition[] = [
  {
    id: 'linearCounterpoint',
    label: 'Linear counterpoint',
    weight: 0.35,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'quartalHarmonyField',
    label: 'Quartal harmony field',
    weight: 0.25,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'modernPocket',
    label: 'Modern pocket',
    weight: 0.25,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'sectionalVariety',
    label: 'Sectional variety',
    weight: 0.15,
    featureKeys: ['formal.riffRepetitionRatio'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreLinearCounterpoint(avg: number | null): number {
  if (avg == null) return 1;
  if (avg >= 4 && avg <= 6) return 10;
  if (avg >= 3 && avg <= 7) return 7;
  if (avg >= 2 && avg <= 8) return 4;
  return 1;
}

function scoreQuartalField(fr: number | null): number {
  if (fr == null) return 1;
  if (fr >= 0.45 && fr <= 0.68) return 10;
  if (fr >= 0.38 && fr <= 0.78) return 7;
  if (fr >= 0.3 && fr <= 0.85) return 4;
  return 1;
}

function scoreModernPocket(sw: number | null): number {
  if (sw == null) return 1;
  if (sw >= 0.62 && sw <= 0.82) return 10;
  if (sw >= 0.52 && sw <= 0.88) return 7;
  if (sw >= 0.42) return 4;
  return 1;
}

/** Through-composed tendency — avoid riff-loop saturation. */
function scoreSectionalVariety(riff: number | null): number {
  if (riff == null) return 1;
  if (riff <= 0.55 && riff >= 0.15) return 10;
  if (riff <= 0.7) return 7;
  if (riff <= 0.85) return 4;
  return 1;
}

function scoreBrookmeyer(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};
  const formal = input.features.formal ?? {};

  const byId: Record<string, number> = {
    linearCounterpoint: scoreLinearCounterpoint(num(orch.avgVoicingSize)),
    quartalHarmonyField: scoreQuartalField(num(harmonic.functionalRatio)),
    modernPocket: scoreModernPocket(num(rhythmic.swingGridAlignment)),
    sectionalVariety: scoreSectionalVariety(num(formal.riffRepetitionRatio)),
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

export const bobBrookmeyerStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'bob_brookmeyer',
  name: 'Bob Brookmeyer',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: brookDimensions,
  score: scoreBrookmeyer,
};
