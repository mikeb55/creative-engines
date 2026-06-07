import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const nelsonDimensions: StyleDimensionDefinition[] = [
  {
    id: 'bluesFunctional',
    label: 'Blues-functional clarity',
    weight: 0.35,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'sectionalContrast',
    label: 'Sectional contrast',
    weight: 0.3,
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'swingAuthority',
    label: 'Swing authority',
    weight: 0.2,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'chartOrchestration',
    label: 'Chart orchestration',
    weight: 0.15,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreBluesFunctional(fr: number | null): number {
  if (fr == null) return 1;
  if (fr >= 0.78) return 10;
  if (fr >= 0.65) return 7;
  if (fr >= 0.52) return 4;
  return 1;
}

function scoreSectionalContrast(riff: number | null): number {
  if (riff == null) return 1;
  if (riff >= 0.35 && riff <= 0.62) return 10;
  if (riff >= 0.25 && riff <= 0.72) return 7;
  if (riff >= 0.15 && riff <= 0.82) return 4;
  return 1;
}

function scoreSwingAuthority(sw: number | null): number {
  if (sw == null) return 1;
  if (sw >= 0.72) return 10;
  if (sw >= 0.58) return 7;
  if (sw >= 0.45) return 4;
  return 1;
}

function scoreChartOrch(avg: number | null): number {
  if (avg == null) return 1;
  if (avg >= 3 && avg <= 5) return 10;
  if (avg >= 2 && avg <= 6) return 7;
  if (avg >= 1 && avg <= 7) return 4;
  return 1;
}

function scoreNelson(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const harmonic = input.features.harmonic ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};
  const orch = input.features.orchestration ?? {};

  const byId: Record<string, number> = {
    bluesFunctional: scoreBluesFunctional(num(harmonic.functionalRatio)),
    sectionalContrast: scoreSectionalContrast(num(formal.riffRepetitionRatio)),
    swingAuthority: scoreSwingAuthority(num(rhythmic.swingGridAlignment)),
    chartOrchestration: scoreChartOrch(num(orch.avgVoicingSize)),
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

export const oliverNelsonStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'oliver_nelson',
  name: 'Oliver Nelson',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: nelsonDimensions,
  score: scoreNelson,
};

