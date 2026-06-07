/**
 * Allan Holdsworth — scale-derived fusion style profile (`AH:*` slice diagnostics).
 */

import type {
  ExtractedStyleFeatures,
  Score10,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const holdsworthDimensions: StyleDimensionDefinition[] = [
  {
    id: 'scaleMembershipPriority',
    label: 'Scale Membership',
    weight: 0.24,
    featureKeys: ['harmonic.scaleDerivedRate', 'harmonic.extensionDensity'],
  },
  {
    id: 'functionalRootAvoidance',
    label: 'Functional Root Avoidance',
    weight: 0.2,
    featureKeys: ['harmonic.functionalCadenceRate', 'harmonic.twoFiveOneRate'],
  },
  {
    id: 'chromaticVoiceLeadingRate',
    label: 'Chromatic Voice Leading',
    weight: 0.18,
    featureKeys: ['harmonic.chromaticMotionRate', 'melodic.leapRate'],
  },
  {
    id: 'intervalSubsetVoicingBias',
    label: 'Interval Subset Voicing',
    weight: 0.2,
    featureKeys: ['harmonic.alteredDominantRate', 'harmonic.add9SusRate'],
  },
  {
    id: 'scaleFamilyPersistence',
    label: 'Scale Family Persistence',
    weight: 0.18,
    featureKeys: ['formal.phraseHoldRate', 'harmonic.chordChangeRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreScaleMembership(scaleDerived: number | null, extension: number | null): number {
  const s = scaleDerived ?? extension ?? 0;
  if (s >= 0.62) return 10;
  if (s >= 0.52) return 7;
  if (s >= 0.42) return 4;
  return 1;
}

function scoreFunctionalAvoidance(cadence: number | null, twoFive: number | null): number {
  const c = cadence ?? twoFive ?? 0;
  if (c <= 0.08) return 10;
  if (c <= 0.15) return 7;
  if (c <= 0.25) return 4;
  return 1;
}

function scoreChromaticVl(chromatic: number | null, leap: number | null): number {
  const ch = chromatic ?? 0;
  const lp = leap ?? 0;
  if (ch >= 0.45 || lp >= 0.38) return 10;
  if (ch >= 0.35 || lp >= 0.28) return 7;
  if (ch >= 0.25) return 4;
  return 1;
}

function scoreIntervalSubset(altered: number | null, add9: number | null): number {
  const a = altered ?? add9 ?? 0;
  if (a >= 0.48) return 10;
  if (a >= 0.38) return 7;
  if (a >= 0.28) return 4;
  return 1;
}

function scoreScalePersistence(phraseHold: number | null, chordChange: number | null): number {
  const hold = phraseHold ?? 0;
  const slow = chordChange == null || chordChange <= 0.32;
  if (hold >= 0.58 && slow) return 10;
  if (hold >= 0.48 || slow) return 7;
  if (hold >= 0.38) return 4;
  return 1;
}

type HoldsworthDimensionScore = { dimensionId: string; score: Score10 };

function evaluateHoldsworthDimensions(features: ExtractedStyleFeatures): HoldsworthDimensionScore[] {
  const h = features.harmonic ?? {};
  const m = features.melodic ?? {};
  const f = features.formal ?? {};
  return [
    {
      dimensionId: 'scaleMembershipPriority',
      score: scoreScaleMembership(
        num(h.scaleDerivedRate),
        num(h.extensionDensity)
      ),
    },
    {
      dimensionId: 'functionalRootAvoidance',
      score: scoreFunctionalAvoidance(
        num(h.functionalCadenceRate),
        num(h.twoFiveOneRate)
      ),
    },
    {
      dimensionId: 'chromaticVoiceLeadingRate',
      score: scoreChromaticVl(num(h.chromaticMotionRate), num(m.leapRate)),
    },
    {
      dimensionId: 'intervalSubsetVoicingBias',
      score: scoreIntervalSubset(num(h.alteredDominantRate), num(h.add9SusRate)),
    },
    {
      dimensionId: 'scaleFamilyPersistence',
      score: scoreScalePersistence(num(f.phraseHoldRate), num(h.chordChangeRate)),
    },
  ];
}

export const holdsworthStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'allan_holdsworth',
  name: 'Allan Holdsworth — scale-derived fusion',
  label: 'Allan Holdsworth — scale-derived fusion',
  composerFamily: 'fusion',
  threshold: 7,
  dimensions: holdsworthDimensions,
  score(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
    const dimensionScores = evaluateHoldsworthDimensions(input.features);
    const weighted =
      dimensionScores.reduce((sum, d) => {
        const w = holdsworthDimensions.find((x) => x.id === d.dimensionId)?.weight ?? 0;
        return sum + d.score * w;
      }, 0) / holdsworthDimensions.reduce((s, d) => s + d.weight, 0);
    const hardFails: string[] = [];
    const cadence = num(input.features.harmonic?.functionalCadenceRate);
    const twoFive = num(input.features.harmonic?.twoFiveOneRate);
    if ((cadence ?? 0) > 0.28 || (twoFive ?? 0) > 0.22) {
      hardFails.push('functional_cadence_bleed');
    }
    const triadRate = num(input.features.harmonic?.triadRate);
    if ((triadRate ?? 0) > 0.35) {
      hardFails.push('plain_triad_bleed');
    }
    const dimensions: StyleDimensionScore[] = dimensionScores.map((d) => {
      const dimId = d.dimensionId ?? 'unknown';
      const dimDef = holdsworthDimensions.find((x) => x.id === dimId);
      const weight = dimDef?.weight ?? 0;
      return {
        id: dimId,
        label: dimDef?.label ?? dimId,
        score: d.score,
        weight,
        weightedScore: d.score * weight,
      };
    });
    const weakestDimensionId =
      dimensions.reduce((min, d) => (d.score < min.score ? d : min), dimensions[0]!).id ?? '';
    const strongestDimensionId =
      dimensions.reduce((max, d) => (d.score > max.score ? d : max), dimensions[0]!).id ?? '';
    return {
      styleId: 'allan_holdsworth',
      styleName: 'Allan Holdsworth — scale-derived fusion',
      composerId: 'allan_holdsworth',
      overallScore: weighted,
      dimensions,
      finalStyleScore: weighted,
      weakestDimensionId,
      strongestDimensionId,
      pass: weighted >= 7 && hardFails.length === 0,
      threshold: 7,
      hardFails: hardFails.length ? hardFails : undefined,
      notes: hardFails.length
        ? ['Holdsworth negative discriminators triggered — check functional / triad bleed.']
        : undefined,
    };
  },
};
