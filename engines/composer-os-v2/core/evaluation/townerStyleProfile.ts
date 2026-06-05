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
import { surmanStyleProfile } from './surmanStyleProfile';
import { weberStyleProfile } from './weberStyleProfile';
import { wheelerStyleProfile } from './wheelerStyleProfile';

const townerDimensions: StyleDimensionDefinition[] = [
  {
    id: 'guitarBornVoicing',
    label: 'Guitar-Born Voicing',
    weight: 0.22,
    featureKeys: ['harmonic.add9Maj9Rate', 'harmonic.slashChordRate'],
  },
  {
    id: 'melodyFromVoicing',
    label: 'Melody From Voicing',
    weight: 0.2,
    featureKeys: ['melodic.arpeggioDerivedRate', 'melodic.chordShapeContourRate'],
  },
  {
    id: 'resonanceAndSilence',
    label: 'Resonance and Silence',
    weight: 0.18,
    featureKeys: ['harmonic.commonToneRate', 'melodic.restOccupancyRate'],
  },
  {
    id: 'slowHarmonicRhythm',
    label: 'Slow Harmonic Field',
    weight: 0.2,
    featureKeys: ['harmonic.chordChangeRate', 'formal.phraseHoldRate'],
  },
  {
    id: 'classicalCounterpoint',
    label: 'Classical Counterpoint',
    weight: 0.2,
    featureKeys: ['melodic.bassIndependenceRate', 'melodic.registerSeparationRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreGuitarBornVoicing(add9Maj9: number | null, slashRate: number | null): number {
  const ext = add9Maj9 ?? 0;
  const slash = slashRate ?? 0;
  if (ext >= 0.55 && slash >= 0.35) return 10;
  if (ext >= 0.45 || slash >= 0.28) return 7;
  if (ext >= 0.35) return 4;
  return 1;
}

function scoreMelodyFromVoicing(arpeggioRate: number | null, chordShape: number | null): number {
  const arp = arpeggioRate ?? chordShape ?? 0;
  if (arp >= 0.58) return 10;
  if (arp >= 0.48) return 7;
  if (arp >= 0.38) return 4;
  return 1;
}

function scoreResonanceAndSilence(commonTone: number | null, restOcc: number | null): number {
  const ct = commonTone ?? 0;
  const rest = restOcc ?? 0;
  if (ct >= 0.5 && rest >= 0.1) return 10;
  if (ct >= 0.42 || rest >= 0.08) return 7;
  if (ct >= 0.32) return 4;
  return 1;
}

function scoreSlowHarmonicRhythm(chordChange: number | null, phraseHold: number | null): number {
  const slow = chordChange == null || chordChange <= 0.32;
  const hold = phraseHold == null || phraseHold >= 0.55;
  if (slow && hold) return 10;
  if (slow || hold) return 7;
  if (chordChange != null && chordChange <= 0.45) return 4;
  return 1;
}

function scoreClassicalCounterpoint(bassIndep: number | null, regSep: number | null): number {
  const bass = bassIndep ?? 0;
  const sep = regSep ?? 0;
  if (bass >= 0.52 && sep >= 0.45) return 10;
  if (bass >= 0.42 || sep >= 0.38) return 7;
  if (bass >= 0.32) return 4;
  return 1;
}

export interface TownerHardFailReason {
  code: string;
  message: string;
}

export function evaluateTownerHardFails(features: ExtractedStyleFeatures): TownerHardFailReason[] {
  const fails: TownerHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const add9Maj9 = num(harmonic.add9Maj9Rate);
  const slashRate = num(harmonic.slashChordRate);
  if ((add9Maj9 ?? 0) < 0.45 && (slashRate ?? 0) < 0.28) {
    fails.push({ code: 'guitar_voicing_low', message: 'guitarBornVoicing below 0.70 — not enough fingerstyle voicing surface.' });
  }

  const arpeggio = num(melodic.arpeggioDerivedRate) ?? num(melodic.chordShapeContourRate);
  if (arpeggio != null && arpeggio < 0.48) {
    fails.push({ code: 'melody_from_voicing_low', message: 'melodyFromVoicing below 0.65 — melody not derived from voicing/arpeggio.' });
  }

  const commonTone = num(harmonic.commonToneRate);
  const restOcc = num(melodic.restOccupancyRate);
  if ((commonTone ?? 0) < 0.38 && (restOcc ?? 0) < 0.08) {
    fails.push({ code: 'resonance_silence_low', message: 'resonanceAndSilence below 0.62 — insufficient sustain/decay space.' });
  }

  const chordChange = num(harmonic.chordChangeRate);
  const phraseHold = num(formal.phraseHoldRate);
  if (chordChange != null && chordChange > 0.48 && (phraseHold == null || phraseHold < 0.45)) {
    fails.push({ code: 'slow_harmonic_low', message: 'slowHarmonicRhythm below 0.65 — harmonic change too fast for Towner field.' });
  }

  const bassIndep = num(melodic.bassIndependenceRate);
  if (bassIndep != null && bassIndep < 0.38) {
    fails.push({ code: 'counterpoint_low', message: 'classicalCounterpoint below 0.60 — bass not independent from upper melody.' });
  }

  const alteredRate = num(harmonic.alteredDominantRate);
  if (alteredRate != null && alteredRate > 0.12) {
    fails.push({ code: 'jazz_bleed', message: 'Dense bebop alteration dominant — jazz bleed, not Towner.' });
  }

  const modalSax = num(orch.modalSaxArchetypeDominance);
  if (modalSax != null && modalSax > 0.55) {
    fails.push({ code: 'garbarek_bleed', message: 'Sax modal archetype dominant — Garbarek bleed, not Towner.' });
  }

  const brittleLeap = num(melodic.brittleLeapChainRate);
  if (brittleLeap != null && brittleLeap > 0.45 && (slashRate ?? 0) > 0.5) {
    fails.push({ code: 'wheeler_bleed', message: 'Polyaxial horn lyricism dominant — Wheeler bleed, not Towner.' });
  }

  const pedalSpan = num(harmonic.pedalSpanRate);
  const bassLed = num(harmonic.bassAsHarmonySourceRate);
  if (pedalSpan != null && bassLed != null && pedalSpan > 0.75 && bassLed > 0.8) {
    fails.push({ code: 'weber_bleed', message: 'Bass pedal field dominant — Weber bleed, not Towner.' });
  }

  const folkModal = num(harmonic.modalFitRate);
  const ostinato = num(formal.ostinatoSpanRate);
  if (folkModal != null && ostinato != null && folkModal > 0.72 && ostinato > 0.65) {
    fails.push({ code: 'surman_bleed', message: 'Dark reed Dorian ostinato dominant — Surman bleed, not Towner.' });
  }

  const tremolo = num(melodic.tremoloShowpieceRate);
  if (tremolo != null && tremolo > 0.45) {
    fails.push({ code: 'generic_guitar', message: 'Andalusian/tremolo classical clichés — generic guitar, not Towner.' });
  }

  return fails;
}

function evaluateTownerDiscrimination(input: StyleProfileEvaluationInput): TownerHardFailReason[] {
  const fails: TownerHardFailReason[] = [];
  const garbarek = garbarekStyleProfile.score(input);
  const wheeler = wheelerStyleProfile.score(input);
  const weber = weberStyleProfile.score(input);
  const surman = surmanStyleProfile.score(input);
  const bley = bleyStyleProfile.score(input);
  if (garbarek.pass && garbarek.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_garbarek', message: 'Output passes Garbarek profile strongly — Nordic ritual sax detected.' });
  }
  if (wheeler.pass && wheeler.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_wheeler', message: 'Output passes Wheeler profile strongly — polyaxial horn lyricism detected.' });
  }
  if (weber.pass && weber.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_weber', message: 'Output passes Weber profile strongly — bass-led pedal field detected.' });
  }
  if (surman.pass && surman.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_surman', message: 'Output passes Surman profile strongly — dark folk-minimal reed ostinato detected.' });
  }
  if (bley.pass && bley.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_bley', message: 'Output passes Bley profile strongly — irony collage detected.' });
  }
  return fails;
}

function scoreTowner(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};
  const formal = f.formal ?? {};

  const byId: Record<string, number> = {
    guitarBornVoicing: scoreGuitarBornVoicing(num(h.add9Maj9Rate), num(h.slashChordRate)),
    melodyFromVoicing: scoreMelodyFromVoicing(num(m.arpeggioDerivedRate), num(m.chordShapeContourRate)),
    resonanceAndSilence: scoreResonanceAndSilence(num(h.commonToneRate), num(m.restOccupancyRate)),
    slowHarmonicRhythm: scoreSlowHarmonicRhythm(num(h.chordChangeRate), num(formal.phraseHoldRate)),
    classicalCounterpoint: scoreClassicalCounterpoint(num(m.bassIndependenceRate), num(m.registerSeparationRate)),
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

  const hardFails = [...evaluateTownerHardFails(input.features), ...evaluateTownerDiscrimination(input)];
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

export const townerStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'towner',
  name: 'Ralph Towner',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: townerDimensions,
  score: scoreTowner,
};
