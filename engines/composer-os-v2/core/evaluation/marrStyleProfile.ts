/**
 * Johnny Marr — melodic rhythm guitar style profile (`jma:*` slice diagnostics).
 */

import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';

const marrDimensions: StyleDimensionDefinition[] = [
  {
    id: 'partialVoicingRate',
    label: 'Partial Voicing',
    weight: 0.2,
    featureKeys: ['harmonic.triadRate', 'harmonic.susAddRate'],
  },
  {
    id: 'topNoteMelody',
    label: 'Top-Note Melody',
    weight: 0.2,
    featureKeys: ['melodic.contourClarity', 'melodic.attackDensity'],
  },
  {
    id: 'openStringResonance',
    label: 'Open-String Resonance',
    weight: 0.16,
    featureKeys: ['harmonic.pedalRate', 'harmonic.commonToneRate'],
  },
  {
    id: 'addNoteHarmony',
    label: 'Add-Note Harmony',
    weight: 0.18,
    featureKeys: ['harmonic.add9Maj9Rate', 'harmonic.extensionDensity'],
  },
  {
    id: 'pendulumSubdivision',
    label: 'Pendulum Subdivision',
    weight: 0.14,
    featureKeys: ['rhythmic.syncopationRate', 'rhythmic.subdivisionDensity'],
  },
  {
    id: 'modalAmbiguity',
    label: 'Modal Ambiguity',
    weight: 0.12,
    featureKeys: ['harmonic.modalMixRate', 'harmonic.susAddRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scorePartialVoicing(triad: number | null, susAdd: number | null): number {
  const t = triad ?? 1;
  const sus = susAdd ?? 0;
  if (t <= 0.25 && sus >= 0.45) return 10;
  if (t <= 0.35 || sus >= 0.38) return 7;
  if (t <= 0.45) return 4;
  return 1;
}

function scoreTopNoteMelody(contour: number | null, attack: number | null): number {
  const c = contour ?? attack ?? 0;
  if (c >= 0.72) return 10;
  if (c >= 0.62) return 7;
  if (c >= 0.52) return 4;
  return 1;
}

function scoreOpenStringResonance(pedal: number | null, commonTone: number | null): number {
  const p = pedal ?? commonTone ?? 0;
  if (p >= 0.68) return 10;
  if (p >= 0.58) return 7;
  if (p >= 0.48) return 4;
  return 1;
}

function scoreAddNoteHarmony(add9: number | null, extension: number | null): number {
  const a = add9 ?? extension ?? 0;
  if (a >= 0.7) return 10;
  if (a >= 0.58) return 7;
  if (a >= 0.48) return 4;
  return 1;
}

function scorePendulumSubdivision(syncopation: number | null, subdivision: number | null): number {
  const s = syncopation ?? subdivision ?? 0;
  if (s >= 0.65) return 10;
  if (s >= 0.55) return 7;
  if (s >= 0.45) return 4;
  return 1;
}

function scoreModalAmbiguity(modalMix: number | null, susAdd: number | null): number {
  const m = modalMix ?? susAdd ?? 0;
  if (m >= 0.62) return 10;
  if (m >= 0.52) return 7;
  if (m >= 0.42) return 4;
  return 1;
}

export interface MarrMetricRates {
  partialVoicingRate?: number;
  topNoteMelody?: number;
  openStringResonance?: number;
  addNoteHarmony?: number;
  pendulumSubdivision?: number;
  modalAmbiguity?: number;
}

export function evaluateMarrHardFails(
  features: ExtractedStyleFeatures,
  rates?: MarrMetricRates
): string[] {
  const fails: string[] = [];
  const h = features.harmonic ?? {};
  const m = features.melodic ?? {};
  const r = features.rhythmic ?? {};

  if ((rates?.partialVoicingRate ?? 1) < 0.75) {
    fails.push('partial_voicing_fail');
  }
  if ((rates?.topNoteMelody ?? 1) < 0.72) {
    fails.push('top_note_melody_fail');
  }
  if ((rates?.openStringResonance ?? 1) < 0.68) {
    fails.push('open_string_fail');
  }
  if ((rates?.addNoteHarmony ?? 1) < 0.7) {
    fails.push('add_note_harmony_fail');
  }
  if ((rates?.pendulumSubdivision ?? 1) < 0.65) {
    fails.push('pendulum_subdivision_fail');
  }
  if ((rates?.modalAmbiguity ?? 1) < 0.62) {
    fails.push('modal_ambiguity_fail');
  }

  const triad = num(h.triadRate);
  const susAdd = num(h.susAddRate);
  if ((triad ?? 0) > 0.42 && (susAdd ?? 0) < 0.35) {
    fails.push('mcguinn_bleed');
  }

  const sustain = num(m.sustainRate);
  const delayGrid = num(r.dottedEchoRate);
  if ((delayGrid ?? 0) > 0.55 || ((sustain ?? 0) > 0.62 && (rates?.pendulumSubdivision ?? 0) < 0.5)) {
    fails.push('edge_bleed');
  }

  const altered = num(h.alteredDominantRate);
  const jazzStab = num(h.isolatedColorStabRate);
  if ((altered ?? 0) > 0.22 || (jazzStab ?? 0) > 0.35) {
    fails.push('summers_bleed');
  }

  const romanticMass = num(h.chordMassRate);
  if ((romanticMass ?? 0) > 0.48) {
    fails.push('butler_bleed');
  }

  const bluesBend = num(m.bendRate);
  const legato = num(m.legatoRate);
  if ((bluesBend ?? 0) > 0.42 || (legato ?? 0) > 0.55) {
    fails.push('generic_rock_bleed');
  }

  const barreBlock = num(h.barreBlockRate);
  if ((barreBlock ?? 0) > 0.38 && (rates?.partialVoicingRate ?? 0) < 0.7) {
    fails.push('conventional_rock_bleed');
  }

  return fails;
}

function scoreMarr(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};
  const r = f.rhythmic ?? {};

  const byId: Record<string, number> = {
    partialVoicingRate: scorePartialVoicing(num(h.triadRate), num(h.susAddRate)),
    topNoteMelody: scoreTopNoteMelody(num(m.contourClarity), num(m.attackDensity)),
    openStringResonance: scoreOpenStringResonance(num(h.pedalRate), num(h.commonToneRate)),
    addNoteHarmony: scoreAddNoteHarmony(num(h.add9Maj9Rate), num(h.extensionDensity)),
    pendulumSubdivision: scorePendulumSubdivision(num(r.syncopationRate), num(r.subdivisionDensity)),
    modalAmbiguity: scoreModalAmbiguity(num(h.modalMixRate), num(h.susAddRate)),
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

  const hardFails = evaluateMarrHardFails(input.features);
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
    notes: hardFails.length ? hardFails : undefined,
  };
}

export const marrStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'marr',
  name: 'Johnny Marr — melodic rhythm guitar',
  family: 'rock',
  threshold: 7.0,
  dimensions: marrDimensions,
  score: scoreMarr,
};
