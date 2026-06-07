import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const fischerDimensions: StyleDimensionDefinition[] = [
  {
    id: 'harmonicMass',
    label: 'Harmonic mass',
    weight: 0.35,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'chromaticLattice',
    label: 'Chromatic lattice',
    weight: 0.3,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'grooveLattice',
    label: 'Groove lattice',
    weight: 0.2,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'pianoColour',
    label: 'Piano colour',
    weight: 0.15,
    featureKeys: ['orchestration.pianoDensity'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreHarmonicMass(avg: number | null): number {
  if (avg == null) return 1;
  if (avg >= 5) return 10;
  if (avg >= 4) return 7;
  if (avg >= 3) return 4;
  return 1;
}

/** Dense harmony — moderate functional mix (research: chromatic voicing). */
function scoreChromaticLattice(fr: number | null): number {
  if (fr == null) return 1;
  if (fr >= 0.42 && fr <= 0.62) return 10;
  if (fr >= 0.35 && fr <= 0.72) return 7;
  if (fr >= 0.28 && fr <= 0.8) return 4;
  return 1;
}

function scoreGrooveLattice(sw: number | null): number {
  if (sw == null) return 1;
  if (sw >= 0.58) return 10;
  if (sw >= 0.45) return 7;
  if (sw >= 0.32) return 4;
  return 1;
}

function scorePianoColour(pd: number | null): number {
  if (pd == null) return 1;
  if (pd >= 0.45) return 10;
  if (pd >= 0.3) return 7;
  if (pd >= 0.18) return 4;
  return 1;
}

function scoreFischer(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    harmonicMass: scoreHarmonicMass(num(orch.avgVoicingSize)),
    chromaticLattice: scoreChromaticLattice(num(harmonic.functionalRatio)),
    grooveLattice: scoreGrooveLattice(num(rhythmic.swingGridAlignment)),
    pianoColour: scorePianoColour(num(orch.pianoDensity)),
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

export const clareFischerStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'clare_fischer',
  name: 'Clare Fischer',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: fischerDimensions,
  score: scoreFischer,
};

