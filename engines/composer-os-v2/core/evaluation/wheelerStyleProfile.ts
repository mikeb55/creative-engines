import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { schneiderStyleProfile } from './schneiderStyleProfile';

const wheelerDimensions: StyleDimensionDefinition[] = [
  {
    id: 'polyaxialHarmony',
    label: 'Polyaxial Harmony',
    weight: 0.22,
    featureKeys: ['harmonic.slashChordRate', 'harmonic.upperBassIndependenceRate'],
  },
  {
    id: 'tensionCarryForward',
    label: 'Tension Carry-Forward',
    weight: 0.18,
    featureKeys: ['harmonic.extensionPersistenceRate'],
  },
  {
    id: 'melodicDisjunction',
    label: 'Melodic Disjunction + Repair',
    weight: 0.18,
    featureKeys: ['melodic.wideLeapRate', 'melodic.stepRepairRate'],
  },
  {
    id: 'cadentialOpacity',
    label: 'Cadential Opacity',
    weight: 0.14,
    featureKeys: ['harmonic.tonicTriadCloseRate'],
  },
  {
    id: 'registerPorosity',
    label: 'Register Porosity',
    weight: 0.14,
    featureKeys: ['orchestration.registerGapScore'],
  },
  {
    id: 'voicingSpecificity',
    label: 'Voicing Specificity',
    weight: 0.14,
    featureKeys: ['harmonic.voicingSubstitutionRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scorePolyaxial(
  slashChordRate: number | null,
  upperBassIndependenceRate: number | null
): number {
  const slash = slashChordRate ?? 0;
  const indep = upperBassIndependenceRate ?? slash;
  const blend = slash * 0.55 + indep * 0.45;
  if (blend >= 0.55) return 10;
  if (blend >= 0.42) return 7;
  if (blend >= 0.28) return 4;
  return 1;
}

function scoreTensionCarry(extensionPersistenceRate: number | null): number {
  if (extensionPersistenceRate == null) return 1;
  if (extensionPersistenceRate >= 0.6) return 10;
  if (extensionPersistenceRate >= 0.48) return 7;
  if (extensionPersistenceRate >= 0.35) return 4;
  return 1;
}

function scoreMelodicDisjunction(wideLeapRate: number | null, stepRepairRate: number | null): number {
  const leaps = wideLeapRate ?? 0;
  const repair = stepRepairRate ?? 0;
  if (leaps >= 0.5 && repair >= 0.65) return 10;
  if (leaps >= 0.35 && repair >= 0.5) return 7;
  if (leaps >= 0.2) return 4;
  return 1;
}

function scoreCadentialOpacity(tonicTriadCloseRate: number | null): number {
  if (tonicTriadCloseRate == null) return 1;
  if (tonicTriadCloseRate <= 0.12) return 10;
  if (tonicTriadCloseRate <= 0.25) return 7;
  if (tonicTriadCloseRate <= 0.4) return 4;
  return 1;
}

function scoreRegisterPorosity(registerGapScore: number | null): number {
  if (registerGapScore == null) return 1;
  if (registerGapScore >= 0.55) return 10;
  if (registerGapScore >= 0.4) return 7;
  if (registerGapScore >= 0.28) return 4;
  return 1;
}

function scoreVoicingSpecificity(voicingSubstitutionRate: number | null): number {
  if (voicingSubstitutionRate == null) return 7;
  if (voicingSubstitutionRate <= 0.08) return 10;
  if (voicingSubstitutionRate <= 0.18) return 7;
  if (voicingSubstitutionRate <= 0.32) return 4;
  return 1;
}

export interface WheelerHardFailReason {
  code: string;
  message: string;
}

export function evaluateWheelerHardFails(features: ExtractedStyleFeatures): WheelerHardFailReason[] {
  const fails: WheelerHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const polyaxial = num(harmonic.upperBassIndependenceRate) ?? num(harmonic.slashChordRate);
  if (polyaxial != null && polyaxial < 0.55) {
    fails.push({ code: 'polyaxial_low', message: 'polyaxialHarmony below 0.55 floor' });
  }

  const tensionCarry = num(harmonic.extensionPersistenceRate);
  if (tensionCarry != null && tensionCarry < 0.6) {
    fails.push({ code: 'tension_carry_low', message: 'tensionCarryForward below 0.60 floor' });
  }

  const iiViRate = num(harmonic.explicitTwoFiveOneRate);
  if (iiViRate != null && iiViRate > 0.2) {
    fails.push({ code: 'ii_v_i_high', message: 'ii-V-I explicit closures above 0.20 ceiling' });
  }

  const wideLeaps = num(melodic.wideLeapRate);
  const stepRepair = num(melodic.stepRepairRate);
  if (wideLeaps != null && wideLeaps < 0.5) {
    fails.push({ code: 'leap_events_low', message: 'melodicLeapEvents below 1 per 2 bars proxy' });
  }
  if (stepRepair != null && stepRepair < 0.65) {
    fails.push({ code: 'step_repair_low', message: 'stepwise repair below 0.65 floor' });
  }

  const rootAccent = num(melodic.rootOnAccentedArrivalRate);
  if (rootAccent != null && rootAccent > 0.3) {
    fails.push({ code: 'root_accent_high', message: 'root-on-accented-arrival above 0.30 ceiling' });
  }

  const cadenceOpacity = num(harmonic.tonicTriadCloseRate);
  if (cadenceOpacity != null && 1 - cadenceOpacity < 0.75) {
    fails.push({ code: 'cadence_opaque_low', message: 'cadentialOpacity below 0.75 floor' });
  }

  const registerPorosity = num(orch.registerGapScore);
  if (registerPorosity != null && registerPorosity < 0.55) {
    fails.push({ code: 'register_porous_low', message: 'registerPorosity below 0.55 floor' });
  }

  const terminalTriad = num(harmonic.terminalRootTriadCloseRate);
  if (terminalTriad != null && terminalTriad > 0) {
    fails.push({ code: 'terminal_triad', message: 'terminalTriadPenalty — plain root-position tonic close' });
  }

  const voicingSub = num(harmonic.voicingSubstitutionRate);
  if (voicingSub != null && voicingSub > 0.18) {
    fails.push({ code: 'voicing_substitution', message: 'generic tertian replaced specific slash/6-9/#11 spelling' });
  }

  const sectionalHomogeneity = num(formal.sectionalHomogeneityBars);
  if (sectionalHomogeneity != null && sectionalHomogeneity > 8) {
    fails.push({ code: 'sectional_homogeneity', message: 'sectional homogeneity > 8 continuous bars' });
  }

  const bebopChain = num(melodic.diatonicSequentialRate);
  if (bebopChain != null && bebopChain > 0.2) {
    fails.push({ code: 'bebop_chain', message: 'scalar bebop chain above 0.20 MAX' });
  }

  const tuttiConfirm = num(orch.tuttiClimaxConfirmationRate);
  if (tuttiConfirm != null && tuttiConfirm > 0.35) {
    fails.push({ code: 'tutti_confirm', message: 'climax resolves into thick tutti confirmation' });
  }

  const functionalExt = num(harmonic.conventionalFunctionalExtensionRate);
  if (functionalExt != null && functionalExt > 0.55) {
    fails.push({
      code: 'functional_extensions',
      message: 'voicings interpretable as conventional functional extensions rather than upper-structure colour',
    });
  }

  return fails;
}

/** Fail Wheeler if output passes Schneider via luxuriant bloom / narrative arc / tutti confirmation. */
export function evaluateWheelerSchneiderDiscrimination(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): WheelerHardFailReason[] {
  const fails: WheelerHardFailReason[] = [];
  const schneiderResult = schneiderStyleProfile.score(input);
  if (!schneiderResult.pass) return fails;

  const formal = input.features.formal ?? {};
  const orch = input.features.orchestration ?? {};

  const luxuriantBloom = num(formal.luxuriantSectionalBloomBars);
  if (luxuriantBloom != null && luxuriantBloom > 4) {
    fails.push({ code: 'schneider_bloom', message: 'passes Schneider via luxuriant sectional bloom > 4 bars' });
  }

  const narrativeArc = num(formal.orchestralNarrativeArcScore);
  if (narrativeArc != null && narrativeArc > 0.65) {
    fails.push({ code: 'schneider_narrative', message: 'passes Schneider via overtly sculpted orchestral narrative arc' });
  }

  const tuttiConfirm = num(orch.tuttiClimaxConfirmationRate);
  if (tuttiConfirm != null && tuttiConfirm > 0.4) {
    fails.push({ code: 'schneider_tutti', message: 'passes Schneider via tutti climax with rhetorical confirmation' });
  }

  if (schneiderResult.pass && fails.length === 0) {
    fails.push({ code: 'schneider_pass', message: 'output passes Schneider profile — not Wheeler-identifiable' });
  }

  return fails;
}

function scoreWheeler(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const harmonic = input.features.harmonic ?? {};
  const melodic = input.features.melodic ?? {};
  const orch = input.features.orchestration ?? {};

  const slashChordRate = num(harmonic.slashChordRate);
  const upperBassIndependenceRate = num(harmonic.upperBassIndependenceRate);
  const extensionPersistenceRate = num(harmonic.extensionPersistenceRate);
  const wideLeapRate = num(melodic.wideLeapRate);
  const stepRepairRate = num(melodic.stepRepairRate);
  const tonicTriadCloseRate = num(harmonic.tonicTriadCloseRate);
  const registerGapScore = num(orch.registerGapScore);
  const voicingSubstitutionRate = num(harmonic.voicingSubstitutionRate);

  const byId: Record<string, number> = {
    polyaxialHarmony: scorePolyaxial(slashChordRate, upperBassIndependenceRate),
    tensionCarryForward: scoreTensionCarry(extensionPersistenceRate),
    melodicDisjunction: scoreMelodicDisjunction(wideLeapRate, stepRepairRate),
    cadentialOpacity: scoreCadentialOpacity(tonicTriadCloseRate),
    registerPorosity: scoreRegisterPorosity(registerGapScore),
    voicingSpecificity: scoreVoicingSpecificity(voicingSubstitutionRate),
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

  const hardFails = [
    ...evaluateWheelerHardFails(input.features),
    ...evaluateWheelerSchneiderDiscrimination(input),
  ];
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
    notes: hardFails.length ? hardFails.map((f) => f.message) : undefined,
  };
}

export const wheelerStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'wheeler',
  name: 'Kenny Wheeler',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: wheelerDimensions,
  score: scoreWheeler,
};

