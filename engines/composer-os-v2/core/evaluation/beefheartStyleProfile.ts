/**
 * Captain Beefheart — composed blues-fragment polyphony style profile (`cbf:*` slice diagnostics).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const beefheartDimensions: StyleDimensionDefinition[] = [
  {
    id: 'bluesTransformation',
    label: 'Blues Transformation',
    weight: 0.18,
    featureKeys: ['harmonic.bluesRate', 'harmonic.chordChangeRate'],
  },
  {
    id: 'independentPartPeriodicity',
    label: 'Independent Part Periodicity',
    weight: 0.18,
    featureKeys: ['rhythmic.polyrhythmRate', 'rhythmic.syncopationRate'],
  },
  {
    id: 'wrongNoteRecurrence',
    label: 'Wrong Note Recurrence',
    weight: 0.2,
    featureKeys: ['harmonic.chromaticMotionRate', 'melodic.recurrenceRate'],
  },
  {
    id: 'asymmetricPhraseModule',
    label: 'Asymmetric Phrase Module',
    weight: 0.14,
    featureKeys: ['formal.phraseHoldRate', 'formal.sectionContrastRate'],
  },
  {
    id: 'resolutionSuppression',
    label: 'Resolution Suppression',
    weight: 0.16,
    featureKeys: ['harmonic.twoFiveOneRate', 'harmonic.cadenceRate'],
  },
  {
    id: 'denseSeparatedTexture',
    label: 'Dense Separated Texture',
    weight: 0.14,
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

export interface BeefheartMetricRates {
  bluesTransformation?: number;
  independentPartPeriodicity?: number;
  wrongNoteRecurrence?: number;
  asymmetricPhraseModule?: number;
  resolutionSuppression?: number;
  denseSeparatedTexture?: number;
}

export function evaluateBeefheartHardFails(
  features: ExtractedStyleFeatures,
  rates?: BeefheartMetricRates
): string[] {
  const fails: string[] = [];
  const h = features.harmonic ?? {};
  const r = features.rhythmic ?? {};

  const twoFive = num(h.twoFiveOneRate);
  const blues = num(h.bluesRate);
  if ((twoFive ?? 0) > 0.18 && (blues ?? 0) > 0.55 && (rates?.resolutionSuppression ?? 1) < 0.75) {
    fails.push('delta_blues_bleed');
  }

  const sync = num(r.swingRate);
  if ((sync ?? 0) > 0.45 && (rates?.independentPartPeriodicity ?? 1) < 0.65) {
    fails.push('conventional_rock_bleed');
  }

  if ((rates?.wrongNoteRecurrence ?? 1) < 0.55) {
    fails.push('random_noise_fail');
  }

  const swing = num(r.swingRate);
  if ((swing ?? 0) > 0.42 && (rates?.independentPartPeriodicity ?? 1) < 0.7) {
    fails.push('ornette_bleed');
  }

  const sectionContrast = num(features.formal?.sectionContrastRate);
  if ((sectionContrast ?? 0) > 0.62 && (rates?.asymmetricPhraseModule ?? 1) < 0.55) {
    fails.push('zappa_bleed');
  }

  const sustain = num(features.melodic?.sustainRate);
  if ((sustain ?? 0) > 0.58 && (rates?.wrongNoteRecurrence ?? 1) < 0.6) {
    fails.push('ayler_bleed');
  }

  if ((blues ?? 0) < 0.25 && (rates?.bluesTransformation ?? 1) < 0.6) {
    fails.push('pere_ubu_bleed');
  }

  return fails;
}

function twoFiveInverted(v: number | null): number | undefined {
  if (v == null) return undefined;
  return 1 - v;
}

function scoreBeefheart(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const r = f.rhythmic ?? {};
  const formal = f.formal ?? {};
  const m = f.melodic ?? {};

  const rates: BeefheartMetricRates = {
    bluesTransformation: num(h.bluesRate) ?? undefined,
    independentPartPeriodicity: num(r.polyrhythmRate) ?? undefined,
    wrongNoteRecurrence: num(m.recurrenceRate) ?? undefined,
    asymmetricPhraseModule: num(formal.phraseHoldRate) ?? undefined,
    resolutionSuppression: twoFiveInverted(num(h.twoFiveOneRate)),
    denseSeparatedTexture: num(m.attackDensity) ?? undefined,
  };

  const byId: Record<string, number> = {
    bluesTransformation: scoreFromRate(rates.bluesTransformation, 0.75, 0.6, 0.45),
    independentPartPeriodicity: scoreFromRate(rates.independentPartPeriodicity, 0.78, 0.65, 0.5),
    wrongNoteRecurrence: scoreFromRate(rates.wrongNoteRecurrence, 0.72, 0.58, 0.42),
    asymmetricPhraseModule: scoreFromRate(rates.asymmetricPhraseModule, 0.7, 0.55, 0.4),
    resolutionSuppression: scoreFromRate(rates.resolutionSuppression, 0.8, 0.65, 0.5),
    denseSeparatedTexture: scoreFromRate(rates.denseSeparatedTexture, 0.68, 0.55, 0.4),
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

  const hardFails = evaluateBeefheartHardFails(input.features, rates);
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
    notes: hardFails.length ? hardFails : undefined,
  };
}

export const beefheartStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'beefheart',
  name: 'Captain Beefheart — blues-fragment polyphony',
  family: 'experimental',
  threshold: 7.0,
  dimensions: beefheartDimensions,
  score: scoreBeefheart,
};

