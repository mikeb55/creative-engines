import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { schneiderStyleProfile } from './schneiderStyleProfile';
import { wheelerStyleProfile } from './wheelerStyleProfile';

const garbarekDimensions: StyleDimensionDefinition[] = [
  {
    id: 'melodicSustain',
    label: 'Melodic Sustain',
    weight: 0.2,
    featureKeys: ['melodic.longToneRate'],
  },
  {
    id: 'pedalStability',
    label: 'Pedal / Drone Stability',
    weight: 0.18,
    featureKeys: ['harmonic.pedalSpanRate'],
  },
  {
    id: 'harmonicSlowness',
    label: 'Slow Harmonic Rhythm',
    weight: 0.18,
    featureKeys: ['harmonic.chordChangeRate'],
  },
  {
    id: 'modalIdentity',
    label: 'Modal Identity',
    weight: 0.16,
    featureKeys: ['harmonic.modalFitRate'],
  },
  {
    id: 'phraseBreath',
    label: 'Phrase Breath',
    weight: 0.14,
    featureKeys: ['melodic.restOccupancyRate'],
  },
  {
    id: 'cadentialOpenness',
    label: 'Cadential Openness',
    weight: 0.14,
    featureKeys: ['harmonic.functionalCloseRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreMelodicSustain(longToneRate: number | null): number {
  if (longToneRate == null) return 1;
  if (longToneRate >= 0.45) return 10;
  if (longToneRate >= 0.3) return 7;
  if (longToneRate >= 0.2) return 4;
  return 1;
}

function scorePedalStability(pedalSpanRate: number | null): number {
  if (pedalSpanRate == null) return 1;
  if (pedalSpanRate >= 0.55) return 10;
  if (pedalSpanRate >= 0.4) return 7;
  if (pedalSpanRate >= 0.28) return 4;
  return 1;
}

function scoreHarmonicSlowness(chordChangeRate: number | null): number {
  if (chordChangeRate == null) return 7;
  if (chordChangeRate <= 0.35) return 10;
  if (chordChangeRate <= 0.5) return 7;
  if (chordChangeRate <= 0.65) return 4;
  return 1;
}

function scoreModalIdentity(modalFitRate: number | null): number {
  if (modalFitRate == null) return 1;
  if (modalFitRate >= 0.78) return 10;
  if (modalFitRate >= 0.7) return 7;
  if (modalFitRate >= 0.55) return 4;
  return 1;
}

function scorePhraseBreath(restOccupancyRate: number | null): number {
  if (restOccupancyRate == null) return 1;
  if (restOccupancyRate >= 0.18) return 10;
  if (restOccupancyRate >= 0.12) return 7;
  if (restOccupancyRate >= 0.08) return 4;
  return 1;
}

function scoreCadentialOpenness(functionalCloseRate: number | null): number {
  if (functionalCloseRate == null) return 7;
  if (functionalCloseRate <= 0.08) return 10;
  if (functionalCloseRate <= 0.15) return 7;
  if (functionalCloseRate <= 0.25) return 4;
  return 1;
}

export interface GarbarekHardFailReason {
  code: string;
  message: string;
}

export function evaluateGarbarekHardFails(features: ExtractedStyleFeatures): GarbarekHardFailReason[] {
  const fails: GarbarekHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const longToneRate = num(melodic.longToneRate);
  if (longToneRate != null && longToneRate < 0.3) {
    fails.push({ code: 'melodic_sustain_low', message: 'Melodic sustain index below 0.30 — too much note turnover for Garbarek.' });
  }

  const pedalSpanRate = num(harmonic.pedalSpanRate);
  if (pedalSpanRate != null && pedalSpanRate < 0.4) {
    fails.push({ code: 'pedal_stability_low', message: 'Pedal stability below 0.40 — insufficient drone architecture.' });
  }

  const chordChangeRate = num(harmonic.chordChangeRate);
  if (chordChangeRate != null && chordChangeRate > 0.5) {
    fails.push({ code: 'harmonic_too_fast', message: 'Harmonic event rate above 0.50 — lyric sections change faster than 1 per 2 bars.' });
  }

  const innerVoiceCount = num(orch.maxSimultaneousInnerLines);
  if (innerVoiceCount != null && innerVoiceCount > 2) {
    fails.push({ code: 'inner_voice_busy', message: 'More than 2 independent inner lines during exposed melody — hard fail.' });
  }

  const modalFitRate = num(harmonic.modalFitRate);
  if (modalFitRate != null && modalFitRate < 0.7) {
    fails.push({ code: 'modal_identity_low', message: 'Modal identity below 0.70 — melody does not stay in one governing collection.' });
  }

  const restOccupancy = num(melodic.restOccupancyRate);
  if (restOccupancy != null && restOccupancy < 0.12) {
    fails.push({ code: 'phrase_breath_low', message: 'Inter-phrase silence below 12% of phrase timeline.' });
  }

  const functionalCloseRate = num(harmonic.functionalCloseRate);
  if (functionalCloseRate != null && functionalCloseRate > 0.15) {
    fails.push({ code: 'functional_close_high', message: 'Explicit ii–V–I closures exceed 15% — too functional for Garbarek.' });
  }

  const upperBassIndependence = num(harmonic.upperBassIndependenceRate);
  if (upperBassIndependence != null && upperBassIndependence > 0.3) {
    fails.push({ code: 'wheeler_like_polyaxial', message: 'Upper-structure/bass independence above 0.30 — too Wheeler-like.' });
  }

  const swellToClimaxRate = num(formal.orchestralSwellRate);
  if (swellToClimaxRate != null && swellToClimaxRate > 0.35) {
    fails.push({ code: 'schneider_like_swell', message: 'Long orchestral swell-to-climax exceeds 35% — too Schneider-like.' });
  }

  const antiMetricDensity = num(formal.antiMetricInterruptionRate);
  if (antiMetricDensity != null && antiMetricDensity > 0.25) {
    fails.push({ code: 'threadgill_like_anti_metric', message: 'Anti-metric interruption density high — too Threadgill-like.' });
  }

  const walkingBassRate = num(harmonic.walkingBassRate);
  if (walkingBassRate != null && walkingBassRate > 0.05) {
    fails.push({ code: 'walking_bass_present', message: 'Walking bass detected — hard fail for Garbarek.' });
  }

  return fails;
}

function evaluateGarbarekDiscrimination(input: StyleProfileEvaluationInput): GarbarekHardFailReason[] {
  const fails: GarbarekHardFailReason[] = [];
  const wheeler = wheelerStyleProfile.score(input);
  const schneider = schneiderStyleProfile.score(input);
  if (wheeler.pass && wheeler.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_wheeler', message: 'Output passes Wheeler profile strongly — polyaxial signature detected.' });
  }
  if (schneider.pass && schneider.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_schneider', message: 'Output passes Schneider profile strongly — orchestral narrative arc detected.' });
  }
  return fails;
}

function scoreGarbarek(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};

  const byId: Record<string, number> = {
    melodicSustain: scoreMelodicSustain(num(m.longToneRate)),
    pedalStability: scorePedalStability(num(h.pedalSpanRate)),
    harmonicSlowness: scoreHarmonicSlowness(num(h.chordChangeRate)),
    modalIdentity: scoreModalIdentity(num(h.modalFitRate)),
    phraseBreath: scorePhraseBreath(num(m.restOccupancyRate)),
    cadentialOpenness: scoreCadentialOpenness(num(h.functionalCloseRate)),
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

  const hardFails = [...evaluateGarbarekHardFails(input.features), ...evaluateGarbarekDiscrimination(input)];
  const pass = finalStyleScore >= input.profile.threshold && hardFails.length === 0;

  return {
    styleId: input.profile.id,
    styleName: input.profile.name ?? input.profile.label ?? input.profile.id,
    dimensions,
    finalStyleScore,
    weakestDimensionId,
    strongestDimensionId,
    pass,
    threshold: input.profile.threshold,
    notes: hardFails.length ? hardFails.map((x) => x.message) : undefined,
  };
}

export const garbarekStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'garbarek',
  name: 'Jan Garbarek',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: garbarekDimensions,
  score: scoreGarbarek,
};

