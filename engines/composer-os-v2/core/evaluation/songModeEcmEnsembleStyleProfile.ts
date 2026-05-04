/**
 * Evaluation StyleProfile — ECM ensemble chamber jazz (sparse textures, slow harmonic drift,
 * floating ensemble time feel vs swing-era pocket).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const ecmEnsembleDimensions: StyleDimensionDefinition[] = [
  {
    id: 'sparseConcurrentTexture',
    label: 'Sparse concurrent texture',
    weight: 0.34,
    description: 'Lower average simultaneous pitches — chamber clarity, air between voices',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'hypnoticCellRepetition',
    label: 'Hypnotic cell repetition tolerance',
    weight: 0.33,
    description: 'Moderate fingerprint repetition — ostinato drift without pop hook grind',
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'floatingEnsemblePulse',
    label: 'Floating ensemble pulse',
    weight: 0.33,
    description: 'Weaker strict swing-grid lock — rubato-friendly ensemble layer',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreSparseTexture(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 6;
  const x = avgVoicingSize;
  if (x <= 3.4) return 10;
  if (x <= 4.6) return 8;
  if (x <= 5.8) return 6;
  return 4;
}

function scoreHypnoticCells(riffRepetitionRatio: number | null): number {
  if (riffRepetitionRatio == null) return 6;
  const r = riffRepetitionRatio;
  if (r >= 0.18 && r <= 0.55) return 10;
  if (r >= 0.12 && r <= 0.65) return 8;
  if (r <= 0.72) return 6;
  return 5;
}

/** Prefer lower swing-grid alignment than swing big band — “floating” ensemble time. */
function scoreFloatingPulse(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 6;
  const g = swingGridAlignment;
  if (g <= 0.62) return 10;
  if (g <= 0.74) return 8;
  if (g <= 0.85) return 6;
  return 5;
}

function scoreEcmEnsemble(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const avgVoicingSize = num(orch.avgVoicingSize);
  const riffRepetitionRatio = num(formal.riffRepetitionRatio);
  const swingGridAlignment = num(rhythmic.swingGridAlignment);

  const byId: Record<string, number> = {
    sparseConcurrentTexture: scoreSparseTexture(avgVoicingSize),
    hypnoticCellRepetition: scoreHypnoticCells(riffRepetitionRatio),
    floatingEnsemblePulse: scoreFloatingPulse(swingGridAlignment),
  };

  const dimensions: StyleDimensionScore[] = input.profile.dimensions.map((d) => {
    const s = byId[d.id] ?? 5;
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

export const songModeEcmEnsembleStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'song_mode_ecm_ensemble',
  name: 'ECM ensemble (Song Mode)',
  family: 'chamber',
  referenceArtists: ['ECM Records aesthetic'],
  threshold: 6.5,
  dimensions: ecmEnsembleDimensions,
  score: scoreEcmEnsemble,
  quadratonicAlignmentWeight: 0.12,
};
