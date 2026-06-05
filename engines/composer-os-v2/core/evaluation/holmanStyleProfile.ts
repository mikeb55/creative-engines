import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { bobBrookmeyerStyleProfile } from './bobBrookmeyerStyleProfile';

const holmanDimensions: StyleDimensionDefinition[] = [
  {
    id: 'lineIndependence',
    label: 'Line independence',
    weight: 0.22,
    featureKeys: ['orchestration.independentInnerLineRate'],
  },
  {
    id: 'voiceLeadingScore',
    label: 'Voice leading quality',
    weight: 0.22,
    featureKeys: ['harmonic.parallelMotionRate'],
  },
  {
    id: 'approachNotePresence',
    label: 'Approach note presence',
    weight: 0.16,
    featureKeys: ['melodic.chromaticApproachRate'],
  },
  {
    id: 'countermelodyPresence',
    label: 'Countermelody presence',
    weight: 0.14,
    featureKeys: ['melodic.counterLineRate'],
  },
  {
    id: 'saxSoliQuality',
    label: 'Sax soli quality',
    weight: 0.14,
    featureKeys: ['orchestration.saxSoliSingabilityRate'],
  },
  {
    id: 'linearHarmonyLogic',
    label: 'Linear harmonic logic',
    weight: 0.12,
    featureKeys: ['harmonic.functionalRatio'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreLineIndependence(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.78) return 10;
  if (rate >= 0.7) return 7;
  if (rate >= 0.55) return 4;
  return 1;
}

function scoreVoiceLeading(parallelRate: number | null): number {
  if (parallelRate == null) return 7;
  if (parallelRate <= 0.05) return 10;
  if (parallelRate <= 0.12) return 7;
  if (parallelRate <= 0.2) return 4;
  return 1;
}

function scoreApproachNotes(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.65) return 10;
  if (rate >= 0.6) return 7;
  if (rate >= 0.45) return 4;
  return 1;
}

function scoreCountermelody(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.62) return 10;
  if (rate >= 0.55) return 7;
  if (rate >= 0.4) return 4;
  return 1;
}

function scoreSaxSoli(rate: number | null): number {
  if (rate == null) return 7;
  if (rate >= 0.7) return 10;
  if (rate >= 0.55) return 7;
  if (rate >= 0.4) return 4;
  return 1;
}

function scoreLinearHarmony(functionalRatio: number | null): number {
  if (functionalRatio == null) return 7;
  if (functionalRatio >= 0.35 && functionalRatio <= 0.62) return 10;
  if (functionalRatio >= 0.28 && functionalRatio <= 0.72) return 7;
  if (functionalRatio >= 0.2) return 4;
  return 1;
}

export interface HolmanHardFailReason {
  code: string;
  message: string;
}

export function evaluateHolmanHardFails(features: ExtractedStyleFeatures): HolmanHardFailReason[] {
  const fails: HolmanHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const orch = features.orchestration ?? {};

  const innerLineRate = num(orch.independentInnerLineRate);
  if (innerLineRate != null && innerLineRate < 0.7) {
    fails.push({
      code: 'line_independence_low',
      message: 'Inner voices lack distinct melodic contour — chord-tone arpeggio filler detected.',
    });
  }

  const parallelRate = num(harmonic.parallelMotionRate);
  if (parallelRate != null && parallelRate > 0.08) {
    fails.push({
      code: 'parallel_motion',
      message: 'Parallel 5ths or 8ths in voice pairs — hard fail.',
    });
  }

  const pitchModuleDominance = num(orch.pitchModuleDominanceRate);
  if (pitchModuleDominance != null && pitchModuleDominance > 0.45) {
    fails.push({
      code: 'brookmeyer_pitch_module',
      message: 'Pitch-module harmonic argument dominates over chart-first line logic.',
    });
  }

  const chromaticFillRate = num(orch.chromaticInnerFillRate);
  if (chromaticFillRate != null && chromaticFillRate > 0.55 && (innerLineRate ?? 1) < 0.65) {
    fails.push({
      code: 'thad_chromatic_fill',
      message: 'Thad Jones-style dense chromatic inner color without independent contour.',
    });
  }

  const bluesSectionRate = num(harmonic.bluesSectionDominanceRate);
  if (bluesSectionRate != null && bluesSectionRate > 0.6) {
    fails.push({
      code: 'nelson_sectional_blues',
      message: 'Sectional blues-rooted Nelson form dominates — not Holman linear contrapuntal chart.',
    });
  }

  const closeBlockShout = num(orch.closePositionShoutRate);
  if (closeBlockShout != null && closeBlockShout > 0.7) {
    fails.push({
      code: 'close_block_shout',
      message: 'Shout chorus in pure close-position block without spread outer voices.',
    });
  }

  const approachRate = num(melodic.chromaticApproachRate);
  if (approachRate != null && approachRate < 0.6) {
    fails.push({
      code: 'approach_note_low',
      message: 'Approach-note presence below 60% at phrase arrivals.',
    });
  }

  const counterRate = num(melodic.counterLineRate);
  if (counterRate != null && counterRate < 0.55) {
    fails.push({
      code: 'countermelody_low',
      message: 'Lead sections lack independently singable counter-line.',
    });
  }

  return fails;
}

function scoreHolman(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const melodic = input.features.melodic ?? {};

  const byId: Record<string, number> = {
    lineIndependence: scoreLineIndependence(num(orch.independentInnerLineRate)),
    voiceLeadingScore: scoreVoiceLeading(num(harmonic.parallelMotionRate)),
    approachNotePresence: scoreApproachNotes(num(melodic.chromaticApproachRate)),
    countermelodyPresence: scoreCountermelody(num(melodic.counterLineRate)),
    saxSoliQuality: scoreSaxSoli(num(orch.saxSoliSingabilityRate)),
    linearHarmonyLogic: scoreLinearHarmony(num(harmonic.functionalRatio)),
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

  const hardFails = [
    ...evaluateHolmanHardFails(input.features),
    ...(bobBrookmeyerStyleProfile.score(input).pass && bobBrookmeyerStyleProfile.score(input).finalStyleScore >= 8.5
      ? [{ code: 'discrim_brookmeyer', message: 'Output passes Brookmeyer profile strongly — pitch-module logic detected.' }]
      : []),
  ];

  let finalStyleScore = dimensions.reduce((acc, d) => acc + d.weightedScore, 0);
  if (hardFails.length > 0) finalStyleScore = Math.min(finalStyleScore, 4.0);

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

  const pass =
    hardFails.length === 0 &&
    finalStyleScore >= input.profile.threshold &&
    (num(orch.independentInnerLineRate) ?? 0) >= 0.7 &&
    scoreVoiceLeading(num(harmonic.parallelMotionRate)) >= 7;

  return {
    styleId: input.profile.id,
    styleName: input.profile.name,
    dimensions,
    finalStyleScore,
    weakestDimensionId,
    strongestDimensionId,
    pass,
    threshold: input.profile.threshold,
    notes: hardFails.length ? hardFails.map((x) => x.message) : undefined,
  };
}

export const holmanStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'bill_holman',
  name: 'Bill Holman',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: holmanDimensions,
  score: scoreHolman,
};
