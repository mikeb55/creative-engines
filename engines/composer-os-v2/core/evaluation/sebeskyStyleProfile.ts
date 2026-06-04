import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { gilEvansStyleProfile } from './gilEvansStyleProfile';
import { schneiderStyleProfile } from './schneiderStyleProfile';

const sebeskyDimensions: StyleDimensionDefinition[] = [
  {
    id: 'ctiGroove',
    label: 'CTI Groove',
    weight: 0.3,
    featureKeys: ['rhythmic.swingGridAlignment'],
  },
  {
    id: 'productionLushness',
    label: 'Production Lushness',
    weight: 0.25,
    featureKeys: ['orchestration.avgVoicingSize'],
  },
  {
    id: 'functionalTrackability',
    label: 'Functional Trackability',
    weight: 0.25,
    featureKeys: ['harmonic.functionalRatio'],
  },
  {
    id: 'centerFill',
    label: 'Center Fill',
    weight: 0.2,
    featureKeys: ['orchestration.registerGapScore'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** High grid lock — ECM floating time fails. */
function scoreCtiGroove(swingGridAlignment: number | null): number {
  if (swingGridAlignment == null) return 1;
  if (swingGridAlignment >= 0.75) return 10;
  if (swingGridAlignment >= 0.65) return 7;
  if (swingGridAlignment >= 0.5) return 4;
  return 1;
}

function scoreProductionLushness(avgVoicingSize: number | null): number {
  if (avgVoicingSize == null) return 4;
  if (avgVoicingSize >= 5 && avgVoicingSize <= 8) return 10;
  if (avgVoicingSize >= 4 && avgVoicingSize <= 9) return 7;
  return 4;
}

function scoreFunctionalTrackability(functionalRatio: number | null): number {
  if (functionalRatio == null) return 1;
  if (functionalRatio >= 0.72) return 10;
  if (functionalRatio >= 0.6) return 7;
  if (functionalRatio >= 0.48) return 4;
  return 1;
}

/** Low register gap = filled center (inverse of ECM porosity). */
function scoreCenterFill(registerGapScore: number | null): number {
  if (registerGapScore == null) return 4;
  if (registerGapScore <= 0.28) return 10;
  if (registerGapScore <= 0.4) return 7;
  if (registerGapScore <= 0.55) return 4;
  return 1;
}

export interface SebeskyHardFailReason {
  code: string;
  message: string;
}

export function evaluateSebeskyHardFails(features: ExtractedStyleFeatures): SebeskyHardFailReason[] {
  const fails: SebeskyHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const rhythmic = features.rhythmic ?? {};
  const orch = features.orchestration ?? {};
  const formal = features.formal ?? {};

  const swing = num(rhythmic.swingGridAlignment);
  if (swing != null && swing < 0.5) {
    fails.push({ code: 'floating_time', message: 'floating time in >50% of bars (ECM fail)' });
  }

  const stringPad = num(orch.stringSectionActiveRate);
  if (stringPad != null && stringPad < 0.45) {
    fails.push({ code: 'strings_absent', message: 'strings/harp absent from arrangement' });
  }

  const functionalRatio = num(harmonic.functionalRatio);
  if (functionalRatio != null && functionalRatio < 0.6) {
    fails.push({ code: 'modal_ambiguity', message: 'highly suspended modal ambiguity dominant' });
  }

  const liftEvents = num(formal.orchestralLiftEventCount);
  if (liftEvents != null && liftEvents < 2) {
    fails.push({ code: 'lift_events_low', message: 'fewer than 2 discrete orchestral lift events' });
  }

  const melodyAbstract = num(melodic.melodyAbstractedIntoOrchestralProcess);
  if (melodyAbstract != null && melodyAbstract > 0.35) {
    fails.push({ code: 'melody_abstracted', message: 'melody abstracted into orchestral process' });
  }

  const registerGap = num(orch.registerGapScore);
  if (registerGap != null && registerGap >= 0.55) {
    fails.push({ code: 'ecm_porosity', message: 'ECM registral porosity at tutti' });
  }

  const luxuriantBloom = num(formal.luxuriantSectionalBloomBars);
  if (luxuriantBloom != null && luxuriantBloom > 6) {
    fails.push({
      code: 'schneider_swell',
      message: 'continuous Schneider-style atmospheric swell without discrete production hits',
    });
  }

  const tuttiConfirm = num(orch.tuttiClimaxConfirmationRate);
  if (tuttiConfirm != null && tuttiConfirm < 0.2 && (swing ?? 0) < 0.55) {
    fails.push({ code: 'rhythm_dissolves', message: 'rhythm section dissolves or floats' });
  }

  return fails;
}

export function evaluateSebeskyEcmDiscrimination(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): SebeskyHardFailReason[] {
  const fails: SebeskyHardFailReason[] = [];
  const schneider = schneiderStyleProfile.score(input);
  const evans = gilEvansStyleProfile.score(input);
  const harmonic = input.features.harmonic ?? {};
  const orch = input.features.orchestration ?? {};

  if (schneider.pass) {
    fails.push({ code: 'schneider_pass', message: 'passes Schneider — not CTI Sebesky' });
  }
  if (evans.pass && (num(orch.registerGapScore) ?? 0) >= 0.45) {
    fails.push({ code: 'evans_pass', message: 'passes Evans colour-field with porous mid-register' });
  }

  const terminalSuspended = num(harmonic.unresolvedTerminalHarmonyRate);
  if (terminalSuspended != null && terminalSuspended > 0.55) {
    fails.push({
      code: 'suspended_terminal',
      message: 'suspended unresolved terminal harmony as primary language',
    });
  }

  const chamberTransparency = num(orch.chamberTransparencyScore);
  if (chamberTransparency != null && chamberTransparency > 0.65) {
    fails.push({ code: 'chamber_transparency', message: 'chamber transparency dominant' });
  }

  return fails;
}

function scoreSebesky(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const orch = input.features.orchestration ?? {};
  const harmonic = input.features.harmonic ?? {};
  const rhythmic = input.features.rhythmic ?? {};

  const byId: Record<string, number> = {
    ctiGroove: scoreCtiGroove(num(rhythmic.swingGridAlignment)),
    productionLushness: scoreProductionLushness(num(orch.avgVoicingSize)),
    functionalTrackability: scoreFunctionalTrackability(num(harmonic.functionalRatio)),
    centerFill: scoreCenterFill(num(orch.registerGapScore)),
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
  const hardFails = [...evaluateSebeskyHardFails(input.features), ...evaluateSebeskyEcmDiscrimination(input)];

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
    pass: finalStyleScore >= input.profile.threshold && hardFails.length === 0,
    threshold: input.profile.threshold,
    notes: hardFails.length ? hardFails.map((f) => f.message) : undefined,
  };
}

export const sebeskyStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'sebesky',
  name: 'Don Sebesky',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: sebeskyDimensions,
  score: scoreSebesky,
};
