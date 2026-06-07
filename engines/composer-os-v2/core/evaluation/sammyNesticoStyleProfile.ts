import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const nesticoDimensions: StyleDimensionDefinition[] = [
  {
    id: 'punchEconomy',
    label: 'Punch economy',
    weight: 0.3,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'riffHits',
    label: 'Riff hits',
    weight: 0.3,
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'lockedGroove',
    label: 'Locked groove',
    weight: 0.25,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'kickAlignment',
    label: 'Kick alignment',
    weight: 0.15,
    featureKeys: ['orchestration.pianoDensity'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scorePunchEconomy(avg: number | null): number {
  if (avg == null) return 1;
  if (avg <= 3) return 10;
  if (avg <= 5) return 7;
  if (avg <= 7) return 4;
  return 1;
}

function scoreRiffHits(riff: number | null): number {
  if (riff == null) return 1;
  if (riff >= 0.62) return 10;
  if (riff >= 0.45) return 7;
  if (riff >= 0.28) return 4;
  return 1;
}

function scoreLockedGroove(sw: number | null): number {
  if (sw == null) return 1;
  if (sw >= 0.78) return 10;
  if (sw >= 0.62) return 7;
  if (sw >= 0.48) return 4;
  return 1;
}

function scoreKickAlignment(pd: number | null): number {
  if (pd == null) return 1;
  if (pd >= 0.38 && pd <= 0.72) return 10;
  if (pd >= 0.28 && pd <= 0.82) return 7;
  if (pd >= 0.18) return 4;
  return 1;
}

function scoreNestico(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    punchEconomy: scorePunchEconomy(num(orch.avgVoicingSize)),
    riffHits: scoreRiffHits(num(formal.riffRepetitionRatio)),
    lockedGroove: scoreLockedGroove(num(rhythmic.swingGridAlignment)),
    kickAlignment: scoreKickAlignment(num(orch.pianoDensity)),
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

export const sammyNesticoStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'sammy_nestico',
  name: 'Sammy Nestico',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: nesticoDimensions,
  score: scoreNestico,
};

