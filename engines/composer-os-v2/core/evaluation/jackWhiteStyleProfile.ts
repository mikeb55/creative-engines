/**
 * Jack White — drone-centered riff style profile (`jw:*` slice diagnostics).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const jackWhiteDimensions: StyleDimensionDefinition[] = [
  {
    id: 'tonicPersistence',
    label: 'Tonic Persistence',
    weight: 0.2,
    featureKeys: ['harmonic.commonToneRate', 'formal.phraseHoldRate'],
  },
  {
    id: 'droneLogic',
    label: 'Drone Logic',
    weight: 0.18,
    featureKeys: ['harmonic.pedalRate', 'harmonic.slashChordRate'],
  },
  {
    id: 'harmonyByImplication',
    label: 'Harmony By Implication',
    weight: 0.2,
    featureKeys: ['harmonic.triadRate', 'harmonic.susAddRate'],
  },
  {
    id: 'riffCellEconomy',
    label: 'Riff Cell Economy',
    weight: 0.16,
    featureKeys: ['formal.phraseHoldRate', 'harmonic.chordChangeRate'],
  },
  {
    id: 'controlledIncompleteness',
    label: 'Controlled Incompleteness',
    weight: 0.14,
    featureKeys: ['melodic.leapRate', 'harmonic.alteredDominantRate'],
  },
  {
    id: 'leadRhythmFusion',
    label: 'Lead Rhythm Fusion',
    weight: 0.12,
    featureKeys: ['melodic.attackDensity', 'rhythmic.syncopationRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreTonicPersistence(commonTone: number | null, phraseHold: number | null): number {
  const ct = commonTone ?? phraseHold ?? 0;
  if (ct >= 0.75) return 10;
  if (ct >= 0.65) return 7;
  if (ct >= 0.55) return 4;
  return 1;
}

function scoreDroneLogic(pedal: number | null, slash: number | null): number {
  const p = pedal ?? slash ?? 0;
  if (p >= 0.7) return 10;
  if (p >= 0.58) return 7;
  if (p >= 0.48) return 4;
  return 1;
}

function scoreHarmonyByImplication(triad: number | null, susAdd: number | null): number {
  const t = triad ?? 1;
  const sus = susAdd ?? 0;
  if (t <= 0.22 && sus >= 0.42) return 10;
  if (t <= 0.32 || sus >= 0.35) return 7;
  if (t <= 0.42) return 4;
  return 1;
}

function scoreRiffCellEconomy(phraseHold: number | null, chordChange: number | null): number {
  const hold = phraseHold ?? 0;
  const slow = chordChange == null || chordChange <= 0.35;
  if (hold >= 0.58 && slow) return 10;
  if (hold >= 0.48 || slow) return 7;
  if (hold >= 0.38) return 4;
  return 1;
}

function scoreControlledIncompleteness(leap: number | null, altered: number | null): number {
  const lp = leap ?? 0;
  const alt = altered ?? 0;
  if (lp >= 0.28 && alt <= 0.18) return 10;
  if (lp >= 0.22 || alt <= 0.22) return 7;
  if (lp >= 0.15) return 4;
  return 1;
}

function scoreLeadRhythmFusion(attack: number | null, syncopation: number | null): number {
  const a = attack ?? syncopation ?? 0;
  if (a >= 0.62) return 10;
  if (a >= 0.52) return 7;
  if (a >= 0.42) return 4;
  return 1;
}

export interface JackWhiteMetricRates {
  tonicPersistence?: number;
  droneLogic?: number;
  harmonyByImplication?: number;
  riffCellEconomy?: number;
  controlledIncompleteness?: number;
  leadRhythmFusion?: number;
}

export function evaluateJackWhiteHardFails(
  features: ExtractedStyleFeatures,
  rates?: JackWhiteMetricRates
): string[] {
  const fails: string[] = [];
  const h = features.harmonic ?? {};
  const m = features.melodic ?? {};

  const altered = num(h.alteredDominantRate);
  const extension = num(h.extensionDensity);
  if ((altered ?? 0) > 0.28 || (extension ?? 0) > 0.35) {
    fails.push('hendrix_bleed');
  }

  const chromatic = num(h.chromaticMotionRate);
  if ((chromatic ?? 0) > 0.42 && (rates?.droneLogic ?? 0) < 0.5) {
    fails.push('iommi_bleed');
  }

  const twoFive = num(h.twoFiveOneRate);
  const sectionContrast = num(features.formal?.sectionContrastRate);
  if ((twoFive ?? 0) > 0.12 && (sectionContrast ?? 0) > 0.55) {
    fails.push('page_zeppelin_bleed');
  }

  const sustain = num(m.sustainRate);
  const legato = num(m.legatoRate);
  if ((sustain ?? 0) > 0.55 || (legato ?? 0) > 0.52) {
    fails.push('gilmour_bleed');
  }

  const slash = num(h.slashChordRate);
  const commonTone = num(h.commonToneRate);
  if ((slash ?? 0) < 0.12 && (commonTone ?? 1) < 0.55 && (rates?.tonicPersistence ?? 0) < 0.6) {
    fails.push('verlaine_bleed');
  }

  const triad = num(h.triadRate);
  if ((triad ?? 0) > 0.45 && (rates?.droneLogic ?? 0) < 0.55) {
    fails.push('black_keys_bleed');
  }

  if ((rates?.tonicPersistence ?? 1) < 0.5) {
    fails.push('generic_garage_fail');
  }

  return fails;
}

function scoreJackWhite(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};
  const formal = f.formal ?? {};
  const r = f.rhythmic ?? {};

  const byId: Record<string, number> = {
    tonicPersistence: scoreTonicPersistence(num(h.commonToneRate), num(formal.phraseHoldRate)),
    droneLogic: scoreDroneLogic(num(h.pedalRate), num(h.slashChordRate)),
    harmonyByImplication: scoreHarmonyByImplication(num(h.triadRate), num(h.susAddRate)),
    riffCellEconomy: scoreRiffCellEconomy(num(formal.phraseHoldRate), num(h.chordChangeRate)),
    controlledIncompleteness: scoreControlledIncompleteness(num(m.leapRate), num(h.alteredDominantRate)),
    leadRhythmFusion: scoreLeadRhythmFusion(num(m.attackDensity), num(r.syncopationRate)),
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

  const hardFails = evaluateJackWhiteHardFails(input.features);
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

export const jackWhiteStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'jack_white',
  name: 'Jack White — drone-centered riff',
  family: 'rock',
  threshold: 7.0,
  dimensions: jackWhiteDimensions,
  score: scoreJackWhite,
};

