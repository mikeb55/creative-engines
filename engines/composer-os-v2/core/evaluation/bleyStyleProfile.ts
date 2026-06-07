import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { garbarekStyleProfile } from './garbarekStyleProfile';
import { schneiderStyleProfile } from './schneiderStyleProfile';
import { wheelerStyleProfile } from './wheelerStyleProfile';

const bleyDimensions: StyleDimensionDefinition[] = [
  {
    id: 'sectionalIrony',
    label: 'Sectional irony',
    weight: 0.2,
    featureKeys: ['formal.sectionPivotRate'],
  },
  {
    id: 'cadentialDryness',
    label: 'Cadential dryness',
    weight: 0.18,
    featureKeys: ['harmonic.functionalCloseRate'],
  },
  {
    id: 'tonalLegibilityDerailment',
    label: 'Tonal legibility with derailment',
    weight: 0.18,
    featureKeys: ['harmonic.modalFitRate', 'harmonic.chromaticSideStepRate'],
  },
  {
    id: 'formalDeflation',
    label: 'Formal deflation',
    weight: 0.16,
    featureKeys: ['formal.densityDropRate'],
  },
  {
    id: 'motivicContamination',
    label: 'Motivic contamination',
    weight: 0.14,
    featureKeys: ['melodic.motifVariationRate'],
  },
  {
    id: 'orchestrationDryness',
    label: 'Orchestration dryness',
    weight: 0.14,
    featureKeys: ['orchestration.sustainedPadSpanBars'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreSectionalIrony(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.6) return 10;
  if (rate >= 0.5) return 7;
  if (rate >= 0.38) return 4;
  return 1;
}

function scoreCadentialDryness(functionalCloseRate: number | null): number {
  if (functionalCloseRate == null) return 7;
  if (functionalCloseRate <= 0.25) return 10;
  if (functionalCloseRate <= 0.35) return 7;
  if (functionalCloseRate <= 0.45) return 4;
  return 1;
}

function scoreTonalLegibilityDerailment(modalFit: number | null, sideStep: number | null): number {
  const m = modalFit ?? 0;
  const s = sideStep ?? 0;
  if (m >= 0.65 && s >= 0.15) return 10;
  if (m >= 0.55 && s >= 0.1) return 7;
  if (m >= 0.45) return 4;
  return 1;
}

function scoreFormalDeflation(dropRate: number | null): number {
  if (dropRate == null) return 1;
  if (dropRate >= 0.45) return 10;
  if (dropRate >= 0.35) return 7;
  if (dropRate >= 0.22) return 4;
  return 1;
}

function scoreMotivicContamination(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.5) return 10;
  if (rate >= 0.42) return 7;
  if (rate >= 0.3) return 4;
  return 1;
}

function scoreOrchestrationDryness(padSpanBars: number | null): number {
  if (padSpanBars == null) return 7;
  if (padSpanBars <= 6) return 10;
  if (padSpanBars <= 8) return 7;
  if (padSpanBars <= 10) return 4;
  return 1;
}

export interface BleyHardFailReason {
  code: string;
  message: string;
}

export function evaluateBleyHardFails(features: ExtractedStyleFeatures): BleyHardFailReason[] {
  const fails: BleyHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const formal = features.formal ?? {};
  const melodic = features.melodic ?? {};
  const orch = features.orchestration ?? {};

  const slashIndependence = num(harmonic.upperBassIndependenceRate);
  if (slashIndependence != null && slashIndependence > 0.25) {
    fails.push({ code: 'wheeler_like_slash', message: 'Slash-chord independence above 25% — too Wheeler-like.' });
  }

  const swellRate = num(formal.orchestralSwellRate);
  if (swellRate != null && swellRate > 0.4) {
    fails.push({ code: 'schneider_like_swell', message: 'Long orchestral swell-to-climax dominant — too Schneider-like.' });
  }

  const pedalSpan = num(harmonic.pedalSpanRate);
  if (pedalSpan != null && pedalSpan > 0.3) {
    fails.push({ code: 'garbarek_like_drone', message: 'Drone-field austerity above 30% — too Garbarek-like.' });
  }

  const antiMetric = num(formal.antiMetricInterruptionRate);
  const sectionPivot = num(formal.sectionPivotRate);
  if (antiMetric != null && antiMetric > 0.35 && (sectionPivot ?? 0) < 0.45) {
    fails.push({
      code: 'threadgill_like_cells',
      message: 'High interval-cell fragmentation without ironic topic play — too Threadgill-like.',
    });
  }

  const longTone = num(melodic.longToneRate);
  const modalFit = num(harmonic.modalFitRate);
  if (longTone != null && modalFit != null && longTone >= 0.45 && modalFit >= 0.78 && (sectionPivot ?? 0) < 0.5) {
    fails.push({ code: 'garbarek_like_ritual', message: 'Ritual repetition and static modal center — too Garbarek-like.' });
  }

  const functionalClose = num(harmonic.functionalCloseRate);
  if (functionalClose != null && functionalClose > 0.45) {
    fails.push({ code: 'cadence_too_affirmative', message: 'Functional cadence completion above 45% — fails deadpan Bley profile.' });
  }

  const padSpan = num(orch.sustainedPadSpanBars);
  if (padSpan != null && padSpan > 8) {
    fails.push({ code: 'orchestration_too_lush', message: 'Sustained pad/bloom texture exceeds 8 consecutive bars — too Schneider-like.' });
  }

  return fails;
}

function evaluateBleyDiscrimination(input: StyleProfileEvaluationInput): BleyHardFailReason[] {
  const fails: BleyHardFailReason[] = [];
  const garbarek = garbarekStyleProfile.score(input);
  const wheeler = wheelerStyleProfile.score(input);
  const schneider = schneiderStyleProfile.score(input);
  if (garbarek.pass && garbarek.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_garbarek', message: 'Output passes Garbarek profile strongly — ritual modal field detected.' });
  }
  if (wheeler.pass && wheeler.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_wheeler', message: 'Output passes Wheeler profile strongly — polyaxial chamber detected.' });
  }
  if (schneider.pass && schneider.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_schneider', message: 'Output passes Schneider profile strongly — narrative orchestral swell detected.' });
  }
  return fails;
}

function scoreBley(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const formal = f.formal ?? {};
  const m = f.melodic ?? {};
  const orch = f.orchestration ?? {};

  const hardFails = [...evaluateBleyHardFails(f), ...evaluateBleyDiscrimination(input)];

  const byId: Record<string, number> = {
    sectionalIrony: scoreSectionalIrony(num(formal.sectionPivotRate)),
    cadentialDryness: scoreCadentialDryness(num(h.functionalCloseRate)),
    tonalLegibilityDerailment: scoreTonalLegibilityDerailment(
      num(h.modalFitRate),
      num(h.chromaticSideStepRate)
    ),
    formalDeflation: scoreFormalDeflation(num(formal.densityDropRate)),
    motivicContamination: scoreMotivicContamination(num(m.motifVariationRate)),
    orchestrationDryness: scoreOrchestrationDryness(num(orch.sustainedPadSpanBars)),
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

  const pass =
    hardFails.length === 0 &&
    finalStyleScore >= input.profile.threshold &&
    (num(formal.sectionPivotRate) ?? 0) >= 0.6 &&
    scoreCadentialDryness(num(h.functionalCloseRate)) >= 7;

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

export const bleyStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'carla_bley',
  name: 'Carla Bley',
  family: 'ecmChamber',
  threshold: 7.0,
  dimensions: bleyDimensions,
  score: scoreBley,
};

