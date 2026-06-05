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

const weberDimensions: StyleDimensionDefinition[] = [
  {
    id: 'pedalPersistence',
    label: 'Pedal Persistence',
    weight: 0.22,
    featureKeys: ['harmonic.pedalSpanRate'],
  },
  {
    id: 'bassLedHarmony',
    label: 'Bass-Led Chord Identity',
    weight: 0.2,
    featureKeys: ['harmonic.upperBassIndependenceRate', 'harmonic.slashChordRate'],
  },
  {
    id: 'slowUpperRefresh',
    label: 'Slow Upper Refresh',
    weight: 0.18,
    featureKeys: ['harmonic.chordChangeRate'],
  },
  {
    id: 'phraseArcLength',
    label: 'Arching Phrase Span',
    weight: 0.16,
    featureKeys: ['melodic.meanPhraseLengthBars'],
  },
  {
    id: 'revoicingRelease',
    label: 'Revoicing Over Resolution',
    weight: 0.14,
    featureKeys: ['harmonic.functionalCloseRate'],
  },
  {
    id: 'resonantSpace',
    label: 'Resonant Structural Space',
    weight: 0.1,
    featureKeys: ['melodic.restOccupancyRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scorePedalPersistence(pedalSpanRate: number | null): number {
  if (pedalSpanRate == null) return 1;
  if (pedalSpanRate >= 0.7) return 10;
  if (pedalSpanRate >= 0.55) return 7;
  if (pedalSpanRate >= 0.4) return 4;
  return 1;
}

function scoreBassLedHarmony(slashRate: number | null, upperBassIndependence: number | null): number {
  const slash = slashRate ?? 0;
  const ind = upperBassIndependence ?? 0;
  if (slash >= 0.65 && ind >= 0.55 && ind <= 0.82) return 10;
  if (slash >= 0.5) return 7;
  if (slash >= 0.35) return 4;
  return 1;
}

function scoreSlowUpperRefresh(chordChangeRate: number | null): number {
  if (chordChangeRate == null) return 7;
  if (chordChangeRate <= 0.35) return 10;
  if (chordChangeRate <= 0.5) return 7;
  if (chordChangeRate <= 0.65) return 4;
  return 1;
}

function scorePhraseArcLength(meanPhraseLength: number | null): number {
  if (meanPhraseLength == null) return 1;
  if (meanPhraseLength >= 6) return 10;
  if (meanPhraseLength >= 5) return 7;
  if (meanPhraseLength >= 4.5) return 4;
  return 1;
}

function scoreRevoicingRelease(functionalCloseRate: number | null): number {
  if (functionalCloseRate == null) return 7;
  if (functionalCloseRate <= 0.12) return 10;
  if (functionalCloseRate <= 0.18) return 7;
  if (functionalCloseRate <= 0.25) return 4;
  return 1;
}

function scoreResonantSpace(restOccupancy: number | null): number {
  if (restOccupancy == null) return 1;
  if (restOccupancy >= 0.14) return 10;
  if (restOccupancy >= 0.1) return 7;
  if (restOccupancy >= 0.06) return 4;
  return 1;
}

export interface WeberHardFailReason {
  code: string;
  message: string;
}

export function evaluateWeberHardFails(features: ExtractedStyleFeatures): WeberHardFailReason[] {
  const fails: WeberHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const pedalSpanRate = num(harmonic.pedalSpanRate);
  if (pedalSpanRate != null && pedalSpanRate < 0.7) {
    fails.push({ code: 'pedal_persistence_low', message: 'Pedal persistence below 0.70 — bass axis not sustained.' });
  }

  const functionalCloseRate = num(harmonic.functionalCloseRate);
  if (functionalCloseRate != null && functionalCloseRate > 0.22) {
    fails.push({ code: 'functional_cadence_high', message: 'Functional cadence rate above 0.22 — too much ii–V–I closure.' });
  }

  const slashRate = num(harmonic.slashChordRate);
  const bassLed = num(harmonic.bassAsHarmonySourceRate);
  if ((slashRate != null && slashRate < 0.5) || (bassLed != null && bassLed < 0.78)) {
    fails.push({ code: 'bass_led_low', message: 'Bass-as-harmony-source below 0.78 — chord identity not bass-led.' });
  }

  const meanPhrase = num(melodic.meanPhraseLengthBars);
  if (meanPhrase != null && meanPhrase < 0.68 * 8) {
    if (meanPhrase < 5) {
      fails.push({ code: 'phrase_arc_short', message: 'Phrase arc length below 0.68 target — phrases too short for Weber.' });
    }
  }

  const revoicingRate = num(harmonic.revoicingReleaseRate);
  if (revoicingRate != null && revoicingRate < 0.58) {
    fails.push({ code: 'revoicing_low', message: 'Revoicing-instead-of-resolution below 0.58.' });
  }

  const modalSaxLead = num(orch.modalSaxArchetypeDominance);
  if (modalSaxLead != null && modalSaxLead > 0.55) {
    fails.push({ code: 'garbarek_bleed', message: 'Modal sax archetype dominant — Garbarek bleed, not Weber.' });
  }

  const polyaxisBrittle = num(melodic.brittleLeapChainRate);
  const polyaxisSlash = num(harmonic.upperBassIndependenceRate);
  if (polyaxisBrittle != null && polyaxisSlash != null && polyaxisBrittle > 0.45 && polyaxisSlash > 0.72) {
    fails.push({ code: 'wheeler_bleed', message: 'Slash polyaxis + brittle leap melody — Wheeler bleed, not Weber.' });
  }

  const swellRate = num(formal.orchestralSwellRate);
  if (swellRate != null && swellRate > 0.4) {
    fails.push({ code: 'schneider_bleed', message: 'Orchestral swell primary drama — Schneider bleed, not Weber.' });
  }

  return fails;
}

function evaluateWeberDiscrimination(input: StyleProfileEvaluationInput): WeberHardFailReason[] {
  const fails: WeberHardFailReason[] = [];
  const garbarek = garbarekStyleProfile.score(input);
  const wheeler = wheelerStyleProfile.score(input);
  const schneider = schneiderStyleProfile.score(input);
  if (garbarek.pass && garbarek.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_garbarek', message: 'Output passes Garbarek profile strongly — ritual modal sax detected.' });
  }
  if (wheeler.pass && wheeler.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_wheeler', message: 'Output passes Wheeler profile strongly — polyaxial slash-chord signature detected.' });
  }
  if (schneider.pass && schneider.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_schneider', message: 'Output passes Schneider profile strongly — orchestral swell narrative detected.' });
  }
  return fails;
}

function scoreWeber(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};

  const byId: Record<string, number> = {
    pedalPersistence: scorePedalPersistence(num(h.pedalSpanRate)),
    bassLedHarmony: scoreBassLedHarmony(num(h.slashChordRate), num(h.upperBassIndependenceRate)),
    slowUpperRefresh: scoreSlowUpperRefresh(num(h.chordChangeRate)),
    phraseArcLength: scorePhraseArcLength(num(m.meanPhraseLengthBars)),
    revoicingRelease: scoreRevoicingRelease(num(h.functionalCloseRate)),
    resonantSpace: scoreResonantSpace(num(m.restOccupancyRate)),
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

  const hardFails = [...evaluateWeberHardFails(input.features), ...evaluateWeberDiscrimination(input)];
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
    notes: hardFails.length ? hardFails.map((x) => x.message) : undefined,
  };
}

export const weberStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'weber',
  name: 'Eberhard Weber',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: weberDimensions,
  score: scoreWeber,
};
