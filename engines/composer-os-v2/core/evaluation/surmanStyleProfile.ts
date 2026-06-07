import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { bleyStyleProfile } from './bleyStyleProfile';
import { garbarekStyleProfile } from './garbarekStyleProfile';
import { weberStyleProfile } from './weberStyleProfile';
import { wheelerStyleProfile } from './wheelerStyleProfile';

const surmanDimensions: StyleDimensionDefinition[] = [
  {
    id: 'folkModalCenter',
    label: 'Folk Modal Center',
    weight: 0.22,
    featureKeys: ['harmonic.modalFitRate'],
  },
  {
    id: 'minimalistRepetition',
    label: 'Minimalist Repetition',
    weight: 0.2,
    featureKeys: ['harmonic.chordChangeRate', 'formal.ostinatoSpanRate'],
  },
  {
    id: 'darkReedRegister',
    label: 'Dark Reed Register',
    weight: 0.18,
    featureKeys: ['melodic.meanRegisterMidi'],
  },
  {
    id: 'spaceAndSilence',
    label: 'Space and Silence',
    weight: 0.18,
    featureKeys: ['melodic.restOccupancyRate'],
  },
  {
    id: 'folkMelodyContour',
    label: 'Folk Melody Contour',
    weight: 0.22,
    featureKeys: ['melodic.stepwiseRate', 'melodic.meanPhraseLengthBars'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreFolkModalCenter(modalFitRate: number | null): number {
  if (modalFitRate == null) return 1;
  if (modalFitRate >= 0.72) return 10;
  if (modalFitRate >= 0.65) return 7;
  if (modalFitRate >= 0.55) return 4;
  return 1;
}

function scoreMinimalistRepetition(chordChangeRate: number | null, ostinatoSpan: number | null): number {
  const slow = chordChangeRate == null || chordChangeRate <= 0.35;
  const ost = ostinatoSpan == null || ostinatoSpan >= 0.55;
  if (slow && ost) return 10;
  if (slow || ost) return 7;
  if (chordChangeRate != null && chordChangeRate <= 0.5) return 4;
  return 1;
}

function scoreDarkReedRegister(meanRegisterMidi: number | null): number {
  if (meanRegisterMidi == null) return 1;
  if (meanRegisterMidi <= 58) return 10;
  if (meanRegisterMidi <= 62) return 7;
  if (meanRegisterMidi <= 66) return 4;
  return 1;
}

function scoreSpaceAndSilence(restOccupancy: number | null): number {
  if (restOccupancy == null) return 1;
  if (restOccupancy >= 0.14) return 10;
  if (restOccupancy >= 0.1) return 7;
  if (restOccupancy >= 0.06) return 4;
  return 1;
}

function scoreFolkMelodyContour(stepwiseRate: number | null, meanPhrase: number | null): number {
  const step = stepwiseRate ?? 0;
  const phrase = meanPhrase ?? 0;
  if (step >= 0.63 && phrase >= 4 && phrase <= 8) return 10;
  if (step >= 0.55 && phrase >= 3.5) return 7;
  if (step >= 0.45) return 4;
  return 1;
}

export interface SurmanHardFailReason {
  code: string;
  message: string;
}

export function evaluateSurmanHardFails(features: ExtractedStyleFeatures): SurmanHardFailReason[] {
  const fails: SurmanHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const modalFit = num(harmonic.modalFitRate);
  if (modalFit != null && modalFit < 0.72) {
    fails.push({ code: 'folk_modal_low', message: 'folkModalCenter below 0.72 — harmony not folk-modal primary.' });
  }

  const chordChange = num(harmonic.chordChangeRate);
  const ostinato = num(formal.ostinatoSpanRate);
  if (chordChange != null && chordChange > 0.5 && (ostinato == null || ostinato < 0.5)) {
    fails.push({ code: 'minimalist_repetition_low', message: 'minimalistRepetition below 0.65 — too much harmonic variety.' });
  }

  const meanReg = num(melodic.meanRegisterMidi);
  if (meanReg != null && meanReg > 66) {
    fails.push({ code: 'dark_reed_low', message: 'darkReedRegister below 0.68 — melody too bright for Surman.' });
  }

  const restOcc = num(melodic.restOccupancyRate);
  if (restOcc != null && restOcc < 0.1) {
    fails.push({ code: 'space_silence_low', message: 'spaceAndSilence below 0.60 — insufficient structural silence.' });
  }

  const stepwise = num(melodic.stepwiseRate);
  const meanPhrase = num(melodic.meanPhraseLengthBars);
  if ((stepwise != null && stepwise < 0.55) || (meanPhrase != null && meanPhrase < 3.5)) {
    fails.push({ code: 'folk_contour_low', message: 'folkMelodyContour below 0.63 — not enough stepwise folk arc.' });
  }

  const alteredRate = num(harmonic.alteredDominantRate);
  if (alteredRate != null && alteredRate > 0.08) {
    fails.push({ code: 'jazz_bleed', message: 'Altered dominants present — jazz bleed, not Surman.' });
  }

  const modalSax = num(orch.modalSaxArchetypeDominance);
  if (modalSax != null && modalSax > 0.55) {
    fails.push({ code: 'garbarek_bleed', message: 'Bright upper sax archetype — Garbarek bleed, not Surman.' });
  }

  const brittleLeap = num(melodic.brittleLeapChainRate);
  const slashRate = num(harmonic.slashChordRate);
  if (brittleLeap != null && slashRate != null && brittleLeap > 0.4 && slashRate > 0.55) {
    fails.push({ code: 'wheeler_bleed', message: 'Polyaxial harmony + angular leaps — Wheeler bleed, not Surman.' });
  }

  const pedalSpan = num(harmonic.pedalSpanRate);
  const bassLed = num(harmonic.bassAsHarmonySourceRate);
  if (pedalSpan != null && bassLed != null && pedalSpan > 0.72 && bassLed > 0.78) {
    fails.push({ code: 'weber_bleed', message: 'Bass pedal field dominant — Weber bleed, not Surman.' });
  }

  const tuttiRate = num(orch.tuttiSaturationRate);
  if (tuttiRate != null && tuttiRate > 0.45) {
    fails.push({ code: 'high_density_tutti', message: 'High density tutti texture — not Surman.' });
  }

  return fails;
}

function evaluateSurmanDiscrimination(input: StyleProfileEvaluationInput): SurmanHardFailReason[] {
  const fails: SurmanHardFailReason[] = [];
  const garbarek = garbarekStyleProfile.score(input);
  const wheeler = wheelerStyleProfile.score(input);
  const weber = weberStyleProfile.score(input);
  const bley = bleyStyleProfile.score(input);
  if (garbarek.pass && garbarek.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_garbarek', message: 'Output passes Garbarek profile strongly — Nordic ritual sax detected.' });
  }
  if (wheeler.pass && wheeler.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_wheeler', message: 'Output passes Wheeler profile strongly — polyaxial slash-chord signature detected.' });
  }
  if (weber.pass && weber.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_weber', message: 'Output passes Weber profile strongly — bass-led pedal field detected.' });
  }
  if (bley.pass && bley.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_bley', message: 'Output passes Bley profile strongly — episodic irony collage detected.' });
  }
  return fails;
}

function scoreSurman(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};
  const formal = f.formal ?? {};

  const byId: Record<string, number> = {
    folkModalCenter: scoreFolkModalCenter(num(h.modalFitRate)),
    minimalistRepetition: scoreMinimalistRepetition(num(h.chordChangeRate), num(formal.ostinatoSpanRate)),
    darkReedRegister: scoreDarkReedRegister(num(m.meanRegisterMidi)),
    spaceAndSilence: scoreSpaceAndSilence(num(m.restOccupancyRate)),
    folkMelodyContour: scoreFolkMelodyContour(num(m.stepwiseRate), num(m.meanPhraseLengthBars)),
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

  const hardFails = [...evaluateSurmanHardFails(input.features), ...evaluateSurmanDiscrimination(input)];
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

export const surmanStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'surman',
  name: 'John Surman',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: surmanDimensions,
  score: scoreSurman,
};

