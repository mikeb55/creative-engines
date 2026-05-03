import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const thadDimensions: StyleDimensionDefinition[] = [
  {
    id: 'waveDensity',
    label: 'Wave density',
    weight: 0.3,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'polyHarmonicMotion',
    label: 'Poly-harmonic motion',
    weight: 0.3,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'swingDrive',
    label: 'Swing drive',
    weight: 0.25,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'extendedFormLine',
    label: 'Extended-form line',
    weight: 0.15,
    featureKeys: ['formal.riffRepetitionRatio'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreWaveDensity(avg: number | null): number {
  if (avg == null) return 1;
  if (avg >= 6) return 10;
  if (avg >= 4) return 7;
  if (avg >= 2) return 4;
  return 1;
}

/** Post-bop richness: functional core with colour — mid-high ratios score best. */
function scorePolyHarmonic(fr: number | null): number {
  if (fr == null) return 1;
  if (fr >= 0.58 && fr <= 0.78) return 10;
  if (fr >= 0.48 && fr <= 0.85) return 7;
  if (fr >= 0.35 && fr <= 0.92) return 4;
  return 1;
}

function scoreSwingDrive(sw: number | null): number {
  if (sw == null) return 1;
  if (sw >= 0.72) return 10;
  if (sw >= 0.58) return 7;
  if (sw >= 0.45) return 4;
  return 1;
}

/** Extended forms favour moderate riff-looping, not endless ostinato. */
function scoreExtendedForm(riff: number | null): number {
  if (riff == null) return 1;
  if (riff <= 0.35) return 10;
  if (riff <= 0.55) return 7;
  if (riff <= 0.75) return 4;
  return 1;
}

function scoreThad(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};
  const formal = input.features.formal ?? {};

  const byId: Record<string, number> = {
    waveDensity: scoreWaveDensity(num(orch.avgVoicingSize)),
    polyHarmonicMotion: scorePolyHarmonic(num(harmonic.functionalRatio)),
    swingDrive: scoreSwingDrive(num(rhythmic.swingGridAlignment)),
    extendedFormLine: scoreExtendedForm(num(formal.riffRepetitionRatio)),
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

export const thadJonesStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'thad',
  name: 'Thad Jones',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: thadDimensions,
  score: scoreThad,
};
