/**
 * Robert Fripp — era-dependent process systems style profile (`rf:*` slice diagnostics).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import type { FrippEraSystemMode } from '../song-mode/frippSystemsSlice';

const frippDimensions: StyleDimensionDefinition[] = [
  {
    id: 'intervalFieldHarmony',
    label: 'Interval Field Harmony',
    weight: 0.18,
    featureKeys: ['harmonic.chordChangeRate', 'harmonic.twoFiveOneRate'],
  },
  {
    id: 'interlockPattern',
    label: 'Interlock Pattern',
    weight: 0.16,
    featureKeys: ['rhythmic.polyrhythmRate', 'rhythmic.syncopationRate'],
  },
  {
    id: 'dissonanceManagement',
    label: 'Dissonance Management',
    weight: 0.14,
    featureKeys: ['harmonic.chromaticMotionRate', 'harmonic.clusterRate'],
  },
  {
    id: 'melodicIntervalCell',
    label: 'Melodic Interval Cell',
    weight: 0.14,
    featureKeys: ['melodic.recurrenceRate', 'melodic.leapRate'],
  },
  {
    id: 'asymmetricGrouping',
    label: 'Asymmetric Grouping',
    weight: 0.14,
    featureKeys: ['formal.phraseHoldRate', 'rhythmic.syncopationRate'],
  },
  {
    id: 'processAudibility',
    label: 'Process Audibility',
    weight: 0.14,
    featureKeys: ['formal.sectionContrastRate', 'melodic.recurrenceRate'],
  },
  {
    id: 'texturalDensityControl',
    label: 'Textural Density Control',
    weight: 0.1,
    featureKeys: ['melodic.attackDensity', 'harmonic.clusterRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreFromRate(rate: number | undefined, pass: number, mid: number, low: number): number {
  const r = rate ?? 0;
  if (r >= pass) return 10;
  if (r >= mid) return 7;
  if (r >= low) return 4;
  return 1;
}

export interface FrippMetricRates {
  intervalFieldHarmony?: number;
  interlockPattern?: number;
  dissonanceManagement?: number;
  melodicIntervalCell?: number;
  asymmetricGrouping?: number;
  processAudibility?: number;
  texturalDensityControl?: number;
  tritoneRetention?: number;
  compositePulse?: number;
  layerTransparency?: number;
  eraMode?: FrippEraSystemMode;
}

export function evaluateFrippHardFails(
  features: ExtractedStyleFeatures,
  rates?: FrippMetricRates
): string[] {
  const fails: string[] = [];
  const m = features.melodic ?? {};
  const h = features.harmonic ?? {};

  const sustain = num(m.sustainRate);
  const leap = num(m.leapRate);
  const recurrence = num(m.recurrenceRate);
  if (
    (sustain ?? 0) > 0.62 &&
    (leap ?? 0) > 0.55 &&
    (recurrence ?? 1) < 0.45 &&
    (rates?.melodicIntervalCell ?? 1) < 0.6
  ) {
    fails.push('holdsworth_bleed');
  }

  const sectionContrast = num(features.formal?.sectionContrastRate);
  if ((sectionContrast ?? 0) > 0.58 && (rates?.intervalFieldHarmony ?? 1) < 0.65) {
    fails.push('verlaine_bleed');
  }

  const cluster = num(h.clusterRate);
  if ((cluster ?? 0) < 0.12 && (rates?.melodicIntervalCell ?? 1) < 0.55 && (sustain ?? 0) > 0.5) {
    fails.push('marr_bleed');
  }

  const chromatic = num(h.chromaticMotionRate);
  if ((chromatic ?? 0) > 0.55 && (rates?.processAudibility ?? 1) < 0.55) {
    fails.push('sonic_youth_bleed');
  }

  if ((rates?.processAudibility ?? 1) < 0.5 && (sustain ?? 0) > 0.65 && (chromatic ?? 0) < 0.2) {
    fails.push('eno_bleed');
  }

  const twoFive = num(h.twoFiveOneRate);
  if ((twoFive ?? 0) > 0.22 && (rates?.intervalFieldHarmony ?? 1) < 0.7) {
    fails.push('generic_prog_bleed');
  }

  if ((twoFive ?? 0) > 0.28) {
    fails.push('functional_harmony_bleed');
  }

  return fails;
}

function scoreFripp(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const r = f.rhythmic ?? {};
  const formal = f.formal ?? {};
  const m = f.melodic ?? {};

  const rates: FrippMetricRates = {
    intervalFieldHarmony: 1 - (num(h.twoFiveOneRate) ?? 0.3),
    interlockPattern: num(r.polyrhythmRate) ?? undefined,
    dissonanceManagement: num(h.chromaticMotionRate) ?? undefined,
    melodicIntervalCell: num(m.recurrenceRate) ?? undefined,
    asymmetricGrouping: num(formal.phraseHoldRate) ?? undefined,
    processAudibility: num(m.recurrenceRate) ?? undefined,
    texturalDensityControl: 1 - (num(m.attackDensity) ?? 0.5) * 0.5,
  };

  const byId: Record<string, number> = {
    intervalFieldHarmony: scoreFromRate(rates.intervalFieldHarmony, 0.75, 0.62, 0.48),
    interlockPattern: scoreFromRate(rates.interlockPattern, 0.72, 0.58, 0.42),
    dissonanceManagement: scoreFromRate(rates.dissonanceManagement, 0.7, 0.55, 0.4),
    melodicIntervalCell: scoreFromRate(rates.melodicIntervalCell, 0.68, 0.55, 0.4),
    asymmetricGrouping: scoreFromRate(rates.asymmetricGrouping, 0.65, 0.52, 0.38),
    processAudibility: scoreFromRate(rates.processAudibility, 0.68, 0.55, 0.4),
    texturalDensityControl: scoreFromRate(rates.texturalDensityControl, 0.7, 0.55, 0.4),
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

  const hardFails = evaluateFrippHardFails(input.features, rates);
  const pass = finalStyleScore >= input.profile.threshold && hardFails.length === 0;

  return {
    styleId: input.profile.id,
    styleName: input.profile.name,
    dimensions,
    finalStyleScore,
    weakestDimensionId,
    strongestDimensionId,
    pass,
    threshold: input.profile.threshold,
    notes: hardFails.length ? hardFails : undefined,
  };
}

export const frippStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'fripp',
  name: 'Robert Fripp — era-dependent process systems',
  family: 'rock',
  threshold: 7.0,
  dimensions: frippDimensions,
  score: scoreFripp,
};
