import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { ogermanStyleProfile } from './ogermanStyleProfile';
import { quincyStyleProfile } from './quincyStyleProfile';
import { sebeskyStyleProfile } from './sebeskyStyleProfile';
import { oliverNelsonStyleProfile } from './oliverNelsonStyleProfile';

const mandelDimensions: StyleDimensionDefinition[] = [
  {
    id: 'melodyForward',
    label: 'Melody Forward',
    weight: 0.22,
    featureKeys: ['melodic.extensionLandingRate', 'melodic.meanPhraseLengthBars'],
  },
  {
    id: 'mechanicalWarmth',
    label: 'Mechanical Warmth',
    weight: 0.2,
    featureKeys: ['harmonic.innerVoiceMotionRate', 'harmonic.commonToneRetentionRate'],
  },
  {
    id: 'songHarmony',
    label: 'Song Harmony',
    weight: 0.2,
    featureKeys: ['harmonic.add9Maj9Rate', 'harmonic.borrowedMinorRate'],
  },
  {
    id: 'orchestralFraming',
    label: 'Orchestral Framing',
    weight: 0.18,
    featureKeys: ['orchestration.brassCushionRate', 'orchestration.soloistFrameRate'],
  },
  {
    id: 'softenedCadence',
    label: 'Softened Cadence',
    weight: 0.2,
    featureKeys: ['harmonic.extendedTonicArrivalRate'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreMelodyForward(extLanding: number | null, phraseLen: number | null): number {
  const e = extLanding ?? 0;
  const p = phraseLen ?? 0;
  if (e >= 0.65 && p >= 4 && p <= 8) return 10;
  if (e >= 0.55 && p >= 3.5) return 7;
  if (e >= 0.45) return 4;
  return 1;
}

function scoreMechanicalWarmth(motion: number | null, commonTone: number | null): number {
  const m = motion ?? 0;
  const c = commonTone ?? 0;
  if (m >= 0.62 && c >= 0.55) return 10;
  if (m >= 0.52 || c >= 0.48) return 7;
  if (m >= 0.42) return 4;
  return 1;
}

function scoreSongHarmony(extRate: number | null, borrowed: number | null): number {
  const e = extRate ?? 0;
  const b = borrowed ?? 0;
  if (e >= 0.55 && b >= 0.08) return 10;
  if (e >= 0.45) return 7;
  if (e >= 0.35) return 4;
  return 1;
}

function scoreOrchestralFraming(brass: number | null, frame: number | null): number {
  const b = brass ?? 0;
  const f = frame ?? 0;
  if (b >= 0.55 && f >= 0.52) return 10;
  if (b >= 0.45 || f >= 0.42) return 7;
  if (b >= 0.35) return 4;
  return 1;
}

function scoreSoftenedCadence(extTonic: number | null): number {
  if (extTonic == null) return 1;
  if (extTonic >= 0.62) return 10;
  if (extTonic >= 0.52) return 7;
  if (extTonic >= 0.42) return 4;
  return 1;
}

export interface MandelHardFailReason {
  code: string;
  message: string;
}

export function evaluateMandelHardFails(features: ExtractedStyleFeatures): MandelHardFailReason[] {
  const fails: MandelHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const melodic = features.melodic ?? {};
  const orch = features.orchestration ?? {};

  const extLanding = num(melodic.extensionLandingRate);
  if (extLanding != null && extLanding < 0.55) {
    fails.push({ code: 'melody_forward_low', message: 'melodyForward below 0.70 — melody not landing on extensions.' });
  }

  const innerMotion = num(harmonic.innerVoiceMotionRate);
  if (innerMotion != null && innerMotion < 0.52) {
    fails.push({ code: 'mechanical_warmth_low', message: 'mechanicalWarmth below 0.68 — insufficient inner-voice semitone motion.' });
  }

  const extRate = num(harmonic.add9Maj9Rate);
  if (extRate != null && extRate < 0.42) {
    fails.push({ code: 'song_harmony_low', message: 'songHarmony below 0.65 — insufficient song-book extensions.' });
  }

  const brassCushion = num(orch.brassCushionRate);
  const soloFrame = num(orch.soloistFrameRate);
  if ((brassCushion ?? 0) < 0.45 && (soloFrame ?? 0) < 0.4) {
    fails.push({ code: 'orchestral_framing_low', message: 'orchestralFraming below 0.62 — orchestra not framing soloist.' });
  }

  const extTonic = num(harmonic.extendedTonicArrivalRate);
  if (extTonic != null && extTonic < 0.48) {
    fails.push({ code: 'softened_cadence_low', message: 'softenedCadence absent — plain triad arrival detected.' });
  }

  const plainTriad = num(harmonic.plainTriadCadenceRate);
  if (plainTriad != null && plainTriad > 0.35) {
    fails.push({ code: 'plain_triad_cadence', message: 'Plain triad cadential arrival — not Mandel.' });
  }

  const suspension = num(harmonic.extensionPersistenceRate);
  const functionalClose = num(harmonic.functionalCloseRate);
  if (suspension != null && functionalClose != null && suspension > 0.72 && functionalClose < 0.18) {
    fails.push({ code: 'ogerman_bleed', message: 'Suspended orchestral drift — Ogerman bleed, not Mandel.' });
  }

  const punchBrass = num(orch.brassPunchRate);
  if (punchBrass != null && punchBrass > 0.55) {
    fails.push({ code: 'quincy_bleed', message: 'Punchy groove-forward brass — Quincy bleed, not Mandel.' });
  }

  const grooveBed = num(orch.grooveBedDominance);
  if (grooveBed != null && grooveBed > 0.65) {
    fails.push({ code: 'sebesky_bleed', message: 'CTI fusion groove bed — Sebesky bleed, not Mandel.' });
  }

  const bluesRiff = num(melodic.bluesRiffDominance);
  if (bluesRiff != null && bluesRiff > 0.55) {
    fails.push({ code: 'nelson_bleed', message: 'Blues-modal riff dominant — Nelson bleed, not Mandel.' });
  }

  return fails;
}

function evaluateMandelDiscrimination(input: StyleProfileEvaluationInput): MandelHardFailReason[] {
  const fails: MandelHardFailReason[] = [];
  const ogerman = ogermanStyleProfile.score(input);
  const quincy = quincyStyleProfile.score(input);
  const sebesky = sebeskyStyleProfile.score(input);
  const nelson = oliverNelsonStyleProfile.score(input);
  if (ogerman.pass && ogerman.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_ogerman', message: 'Output passes Ogerman profile strongly — suspended continuum detected.' });
  }
  if (quincy.pass && quincy.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_quincy', message: 'Output passes Quincy profile strongly — punchy functional drive detected.' });
  }
  if (sebesky.pass && sebesky.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_sebesky', message: 'Output passes Sebesky profile strongly — CTI groove bed detected.' });
  }
  if (nelson.pass && nelson.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_nelson', message: 'Output passes Nelson profile strongly — blues-modal riff detected.' });
  }
  return fails;
}

function scoreMandel(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const m = f.melodic ?? {};
  const o = f.orchestration ?? {};

  const byId: Record<string, number> = {
    melodyForward: scoreMelodyForward(num(m.extensionLandingRate), num(m.meanPhraseLengthBars)),
    mechanicalWarmth: scoreMechanicalWarmth(num(h.innerVoiceMotionRate), num(h.commonToneRetentionRate)),
    songHarmony: scoreSongHarmony(num(h.add9Maj9Rate), num(h.borrowedMinorRate)),
    orchestralFraming: scoreOrchestralFraming(num(o.brassCushionRate), num(o.soloistFrameRate)),
    softenedCadence: scoreSoftenedCadence(num(h.extendedTonicArrivalRate)),
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

  const hardFails = [...evaluateMandelHardFails(input.features), ...evaluateMandelDiscrimination(input)];
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

export const mandelStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'mandel',
  name: 'Johnny Mandel',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: mandelDimensions,
  score: scoreMandel,
};
