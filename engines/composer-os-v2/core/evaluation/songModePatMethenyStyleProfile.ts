/**
 * Evaluation StyleProfile — Pat Metheny (lyrical ECM-era jazz guitar lineage).
 * Dimensions proxy: open concurrent texture, phrase variation vs looped riff cells, relaxed swing-grid lock (floating pulse).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const patMethenyDimensions: StyleDimensionDefinition[] = [
  {
    id: 'openConcurrentTexture',
    label: 'Open concurrent texture',
    weight: 0.34,
    description: 'Moderate avg simultaneous pitches — Metheny open voicings, not dense block stacks',
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'phraseVariationVsRiffLoop',
    label: 'Phrase variation vs riff loop',
    weight: 0.33,
    description: 'Lower bar-to-bar rhythm fingerprint repetition — singing line, not hook grid lock',
    featureKeys: ['formal.riffRepetitionRatio'],
  },
  {
    id: 'floatingPulseAlignment',
    label: 'Floating pulse (non–big-band swing lock)',
    weight: 0.33,
    description: 'Moderate swing-grid hit rate — lyrical rubato-friendly, not Basie pocket',
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** Prefer ~3–5 concurrent melodic–harmonic voices across the band. */
function scoreOpenTexture(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 6;
  const x = avgVoicingSize;
  if (x >= 2.8 && x <= 5.2) return 10;
  if (x >= 2.2 && x <= 6.2) return 8;
  if (x >= 1.8 && x <= 7.0) return 6;
  return 4;
}

/** Lower riff repetition ratio scores higher (through-composed lyricism). */
function scorePhraseVariation(riffRepetitionRatio: number | null): number {
  if (riffRepetitionRatio == null) return 6;
  const r = riffRepetitionRatio;
  if (r <= 0.22) return 10;
  if (r <= 0.38) return 8;
  if (r <= 0.52) return 6;
  return 4;
}

/** Mid-band swing alignment — not hyper-syncopated funk, not dead straight. */
function scoreFloatingPulse(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 6;
  const g = swingGridAlignment;
  const mid = Math.abs(g - 0.52);
  if (mid <= 0.18) return 10;
  if (mid <= 0.28) return 8;
  if (mid <= 0.38) return 6;
  return 5;
}

function scorePatMetheny(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const formal = input.features.formal ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const avgVoicingSize = num(orch.avgVoicingSize);
  const riffRepetitionRatio = num(formal.riffRepetitionRatio);
  const swingGridAlignment = num(rhythmic.swingGridAlignment);

  const byId: Record<string, number> = {
    openConcurrentTexture: scoreOpenTexture(avgVoicingSize),
    phraseVariationVsRiffLoop: scorePhraseVariation(riffRepetitionRatio),
    floatingPulseAlignment: scoreFloatingPulse(swingGridAlignment),
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

export const songModePatMethenyStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'song_mode_pat_metheny',
  name: 'Pat Metheny (Song Mode)',
  family: 'songwriter',
  referenceArtists: ['Pat Metheny'],
  threshold: 6.5,
  dimensions: patMethenyDimensions,
  score: scorePatMetheny,
  quadratonicAlignmentWeight: 0.14,
};

