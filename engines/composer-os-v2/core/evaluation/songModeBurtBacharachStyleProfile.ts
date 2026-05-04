/**
 * Evaluation StyleProfile — Burt Bacharach (sophisticated American pop: chromatic voice-leading,
 * deceptive cadences, syncopated horn-like hooks).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const bacharachDimensions: StyleDimensionDefinition[] = [
  {
    id: 'harmonicWeightAndColour',
    label: 'Harmonic weight / colour',
    weight: 0.34,
    description: 'Richer concurrent pitch layers — Bacharach brass-pad and altered colour without minimal trio sparsity',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'hookMotifRecurrence',
    label: 'Hook motif recurrence',
    weight: 0.33,
    description: 'Moderate bar fingerprint repetition — memorable returns with variation',
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'syncopatedGrooveClarity',
    label: 'Syncopated groove clarity',
    weight: 0.33,
    description: 'Strong swing / subdivision grid alignment — Bacharach pocket and pushed hits',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreHarmonicWeight(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 6;
  const x = avgVoicingSize;
  if (x >= 3.5 && x <= 6.5) return 10;
  if (x >= 2.8 && x <= 7.2) return 8;
  if (x >= 2.2) return 6;
  return 4;
}

function scoreHookRecurrence(riffRepetitionRatio: number | null): number {
  if (riffRepetitionRatio == null) return 6;
  const r = riffRepetitionRatio;
  if (r >= 0.28 && r <= 0.62) return 10;
  if (r >= 0.18 && r <= 0.72) return 8;
  if (r >= 0.12) return 6;
  return 5;
}

function scoreSyncopatedGroove(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 6;
  const g = swingGridAlignment;
  if (g >= 0.72) return 10;
  if (g >= 0.58) return 8;
  if (g >= 0.45) return 6;
  return 4;
}

function scoreBacharach(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const avgVoicingSize = num(orch.avgVoicingSize);
  const riffRepetitionRatio = num(formal.riffRepetitionRatio);
  const swingGridAlignment = num(rhythmic.swingGridAlignment);

  const byId: Record<string, number> = {
    harmonicWeightAndColour: scoreHarmonicWeight(avgVoicingSize),
    hookMotifRecurrence: scoreHookRecurrence(riffRepetitionRatio),
    syncopatedGrooveClarity: scoreSyncopatedGroove(swingGridAlignment),
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

export const songModeBurtBacharachStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'song_mode_burt_bacharach',
  name: 'Burt Bacharach (Song Mode)',
  family: 'songwriter',
  referenceArtists: ['Burt Bacharach'],
  threshold: 6.5,
  dimensions: bacharachDimensions,
  score: scoreBacharach,
  quadratonicAlignmentWeight: 0.12,
};
