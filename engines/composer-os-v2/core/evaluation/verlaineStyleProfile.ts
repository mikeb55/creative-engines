import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { townerStyleProfile } from './townerStyleProfile';
import { weberStyleProfile } from './weberStyleProfile';

const verlaineDimensions: StyleDimensionDefinition[] = [
  {
    id: 'modalFieldPersistence',
    label: 'Modal Field Persistence',
    weight: 0.22,
    featureKeys: ['formal.phraseHoldRate', 'harmonic.chordChangeRate'],
  },
  {
    id: 'extensionRetentionRate',
    label: 'Extension Retention',
    weight: 0.18,
    featureKeys: ['harmonic.commonToneRate', 'harmonic.add9SusRate'],
  },
  {
    id: 'chordSurfaceBias',
    label: 'Suspended Chord Surface',
    weight: 0.2,
    featureKeys: ['harmonic.susAddRate', 'harmonic.alteredDominantRate'],
  },
  {
    id: 'bassDisplacementRate',
    label: 'Bass Displacement',
    weight: 0.2,
    featureKeys: ['harmonic.slashChordRate', 'melodic.bassIndependenceRate'],
  },
  {
    id: 'progressionAvoidance',
    label: 'Progression Avoidance',
    weight: 0.2,
    featureKeys: ['harmonic.functionalCadenceRate', 'harmonic.twoFiveOneRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreModalField(chordChange: number | null, phraseHold: number | null): number {
  const slow = chordChange == null || chordChange <= 0.28;
  const hold = phraseHold == null || phraseHold >= 0.62;
  if (slow && hold) return 10;
  if (slow || hold) return 7;
  if (chordChange != null && chordChange <= 0.38) return 4;
  return 1;
}

function scoreExtensionRetention(commonTone: number | null, add9Sus: number | null): number {
  const ct = commonTone ?? add9Sus ?? 0;
  if (ct >= 0.58) return 10;
  if (ct >= 0.48) return 7;
  if (ct >= 0.38) return 4;
  return 1;
}

function scoreChordSurface(susAdd: number | null, altered: number | null): number {
  const sus = susAdd ?? 0;
  const alt = altered ?? 0;
  if (sus >= 0.55 && alt <= 0.12) return 10;
  if (sus >= 0.45 || alt <= 0.15) return 7;
  if (sus >= 0.35) return 4;
  return 1;
}

function scoreBassDisplacement(slash: number | null, bassIndep: number | null): number {
  const s = slash ?? 0;
  const b = bassIndep ?? 0;
  if (s >= 0.42 && b >= 0.38) return 10;
  if (s >= 0.32 || b >= 0.32) return 7;
  if (s >= 0.22) return 4;
  return 1;
}

function scoreProgressionAvoidance(functional: number | null, twoFiveOne: number | null): number {
  const fn = functional ?? twoFiveOne ?? 0;
  if (fn <= 0.08) return 10;
  if (fn <= 0.15) return 7;
  if (fn <= 0.22) return 4;
  return 1;
}

export interface VerlaineHardFailReason {
  code: string;
  message: string;
}

export function evaluateVerlaineHardFails(features: ExtractedStyleFeatures): VerlaineHardFailReason[] {
  const fails: VerlaineHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const formal = features.formal ?? {};

  const chordChange = num(harmonic.chordChangeRate);
  const phraseHold = num(formal.phraseHoldRate);
  if (chordChange != null && chordChange > 0.42 && (phraseHold == null || phraseHold < 0.5)) {
    fails.push({ code: 'field_persistence_low', message: 'modalFieldPersistence below 0.78 — harmonic center changes too frequently.' });
  }

  const susAdd = num(harmonic.susAddRate) ?? num(harmonic.add9Maj9Rate);
  if ((susAdd ?? 0) < 0.42) {
    fails.push({ code: 'suspended_surface_low', message: 'chordSurfaceBias below 0.78 — insufficient sus/add/slash surface.' });
  }

  const slash = num(harmonic.slashChordRate);
  if ((slash ?? 0) < 0.28) {
    fails.push({ code: 'bass_displacement_low', message: 'bassDisplacementRate below 0.65 — guitar/bass root reinterpretation too rare.' });
  }

  const twoFiveOne = num(harmonic.twoFiveOneRate);
  if (twoFiveOne != null && twoFiveOne > 0.05) {
    fails.push({ code: 'progression_bleed', message: 'progressionAvoidance violated — ii–V–I or functional cadence detected.' });
  }

  const altered = num(harmonic.alteredDominantRate);
  if (altered != null && altered > 0.15) {
    fails.push({ code: 'jazz_bleed', message: 'Altered-dominant jazz-lush density — not Verlaine suspended field.' });
  }

  const processLoop = num(formal.exactLoopPersistence);
  if (processLoop != null && processLoop > 0.72) {
    fails.push({ code: 'fripp_bleed', message: 'Exact-loop process cells dominate — Fripp bleed, not Verlaine.' });
  }

  return fails;
}

function evaluateVerlaineDiscrimination(input: StyleProfileEvaluationInput): VerlaineHardFailReason[] {
  const fails: VerlaineHardFailReason[] = [];
  const towner = townerStyleProfile.score(input);
  const weber = weberStyleProfile.score(input);
  if (towner.pass && towner.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_towner', message: 'Output passes Towner profile strongly — ECM guitar pastoral detected.' });
  }
  if (weber.pass && weber.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_weber', message: 'Output passes Weber profile strongly — bass pedal field detected.' });
  }
  return fails;
}

function scoreVerlaine(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const formal = f.formal ?? {};

  const byId: Record<string, number> = {
    modalFieldPersistence: scoreModalField(num(h.chordChangeRate), num(formal.phraseHoldRate)),
    extensionRetentionRate: scoreExtensionRetention(num(h.commonToneRate), num(h.add9Maj9Rate)),
    chordSurfaceBias: scoreChordSurface(num(h.susAddRate) ?? num(h.add9Maj9Rate), num(h.alteredDominantRate)),
    bassDisplacementRate: scoreBassDisplacement(num(h.slashChordRate), num(f.melodic?.bassIndependenceRate)),
    progressionAvoidance: scoreProgressionAvoidance(num(h.functionalCadenceRate), num(h.twoFiveOneRate)),
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

  const hardFails = [...evaluateVerlaineHardFails(input.features), ...evaluateVerlaineDiscrimination(input)];
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

export const verlaineStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'verlaine',
  name: 'Tom Verlaine',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: verlaineDimensions,
  score: scoreVerlaine,
};

