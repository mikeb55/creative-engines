import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { quincyStyleProfile } from './quincyStyleProfile';
import { sebeskyStyleProfile } from './sebeskyStyleProfile';

const ogermanDimensions: StyleDimensionDefinition[] = [
  {
    id: 'harmonicSuspension',
    label: 'Harmonic Suspension',
    weight: 0.22,
    featureKeys: ['harmonic.extensionPersistenceRate'],
  },
  {
    id: 'innerVoiceActivity',
    label: 'Inner Voice Counterpoint',
    weight: 0.2,
    featureKeys: ['harmonic.innerVoiceMotionRate', 'harmonic.commonToneRetentionRate'],
  },
  {
    id: 'resolutionByTexture',
    label: 'Resolution By Texture',
    weight: 0.18,
    featureKeys: ['harmonic.functionalCloseRate', 'harmonic.textureReleaseRate'],
  },
  {
    id: 'stringContinuum',
    label: 'String Layered Sustain',
    weight: 0.2,
    featureKeys: ['orchestration.stringLayerCount', 'orchestration.avgVoicingSize'],
  },
  {
    id: 'orchestralRotation',
    label: 'Orchestral Rotation',
    weight: 0.2,
    featureKeys: ['orchestration.modeRotationPresent'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreHarmonicSuspension(rate: number | null): number {
  if (rate == null) return 4;
  if (rate >= 0.75) return 10;
  if (rate >= 0.68) return 7;
  if (rate >= 0.55) return 4;
  return 1;
}

function scoreInnerVoiceActivity(motion: number | null, commonTone: number | null): number {
  const m = motion ?? 0;
  const c = commonTone ?? 0;
  if (m >= 0.7 && c >= 0.6 && c <= 0.78) return 10;
  if (m >= 0.62) return 7;
  if (m >= 0.5) return 4;
  return 1;
}

function scoreResolutionByTexture(functionalClose: number | null, textureRelease: number | null): number {
  const f = functionalClose ?? 1;
  const t = textureRelease ?? 0;
  if (f <= 0.15 && t >= 0.72) return 10;
  if (f <= 0.22 && t >= 0.65) return 7;
  if (f <= 0.3) return 4;
  return 1;
}

function scoreStringContinuum(layerCount: number | null, voicingSize: number | null): number {
  const layers = layerCount ?? 0;
  const size = voicingSize ?? 0;
  if (layers >= 4 && size >= 6 && size <= 8) return 10;
  if (layers >= 4) return 7;
  if (layers >= 3) return 4;
  return 1;
}

function scoreOrchestralRotation(present: number | null): number {
  if (present == null) return 1;
  if (present >= 1) return 10;
  return 1;
}

export interface OgermanHardFailReason {
  code: string;
  message: string;
}

export function evaluateOgermanHardFails(features: ExtractedStyleFeatures): OgermanHardFailReason[] {
  const fails: OgermanHardFailReason[] = [];
  const harmonic = features.harmonic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const suspension = num(harmonic.extensionPersistenceRate);
  if (suspension != null && suspension < 0.68) {
    fails.push({ code: 'harmonic_suspension_low', message: 'Harmonic suspension below 0.68 — upper extensions not structural.' });
  }

  const innerMotion = num(harmonic.innerVoiceMotionRate);
  if (innerMotion != null && innerMotion < 0.62) {
    fails.push({ code: 'inner_voice_low', message: 'Inner voice activity below 0.62 — block pad unanimity detected.' });
  }

  const textureRelease = num(harmonic.textureReleaseRate);
  const functionalClose = num(harmonic.functionalCloseRate);
  if (textureRelease != null && textureRelease < 0.65) {
    fails.push({ code: 'texture_resolution_low', message: 'Resolution by texture below 0.65 — too much functional cadence.' });
  }
  if (functionalClose != null && functionalClose > 0.28) {
    fails.push({ code: 'functional_cadence_high', message: 'Functional close rate too high — V–I cadence chains not Ogerman.' });
  }

  const stringLayers = num(orch.stringLayerCount);
  if (stringLayers != null && stringLayers < 0.7) {
    fails.push({ code: 'string_continuum_low', message: 'String continuum below 0.70 — layered sustain missing.' });
  }

  const modeRotation = num(orch.modeRotationPresent);
  if (modeRotation != null && modeRotation < 1) {
    fails.push({ code: 'orchestral_rotation_missing', message: 'Orchestral veil/echo/commentary rotation not present.' });
  }

  const brassPunch = num(orch.brassPunchDominance);
  if (brassPunch != null && brassPunch > 0.55) {
    fails.push({ code: 'quincy_bleed', message: 'Brass punches dominant — Quincy bleed, not Ogerman.' });
  }

  const saxSoli = num(formal.saxSoliRhetoricRate);
  if (saxSoli != null && saxSoli > 0.5) {
    fails.push({ code: 'sebesky_bleed', message: 'Sax soli / jazz tutti rhetoric — Sebesky bleed, not Ogerman.' });
  }

  const homophony = num(orch.sentimentalHomophonyRate);
  if (homophony != null && homophony > 0.45) {
    fails.push({ code: 'jenkins_riddle_bleed', message: 'Sentimental string homophony + cadential swoops — Jenkins/Riddle bleed.' });
  }

  const riffLogic = num(formal.twoBarRiffGeneratorRate);
  if (riffLogic != null && riffLogic > 0.5) {
    fails.push({ code: 'riff_logic_fail', message: 'Short 2-bar riff logic as main generator — not Ogerman span thinking.' });
  }

  return fails;
}

function evaluateOgermanDiscrimination(input: StyleProfileEvaluationInput): OgermanHardFailReason[] {
  const fails: OgermanHardFailReason[] = [];
  const quincy = quincyStyleProfile.score(input);
  const sebesky = sebeskyStyleProfile.score(input);
  if (quincy.pass && quincy.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_quincy', message: 'Output passes Quincy profile strongly — brass punch crossover detected.' });
  }
  if (sebesky.pass && sebesky.finalStyleScore >= 8.5) {
    fails.push({ code: 'discrim_sebesky', message: 'Output passes Sebesky profile strongly — CTI groove-orchestra detected.' });
  }
  return fails;
}

function scoreOgerman(input: StyleProfileEvaluationInput): StyleProfileEvaluationResult {
  const f = input.features;
  const h = f.harmonic ?? {};
  const o = f.orchestration ?? {};

  const byId: Record<string, number> = {
    harmonicSuspension: scoreHarmonicSuspension(num(h.extensionPersistenceRate)),
    innerVoiceActivity: scoreInnerVoiceActivity(num(h.innerVoiceMotionRate), num(h.commonToneRetentionRate)),
    resolutionByTexture: scoreResolutionByTexture(num(h.functionalCloseRate), num(h.textureReleaseRate)),
    stringContinuum: scoreStringContinuum(num(o.stringLayerCount), num(o.avgVoicingSize)),
    orchestralRotation: scoreOrchestralRotation(num(o.modeRotationPresent)),
  };

  const dimensions: StyleDimensionScore[] = ogermanDimensions.map((d) => ({
    id: d.id,
    label: d.label,
    weight: d.weight,
    score: byId[d.id] ?? 1,
  }));

  const weighted = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0);
  const hardFails = [...evaluateOgermanHardFails(f), ...evaluateOgermanDiscrimination(input)];
  const pass = weighted >= 7.0 && hardFails.length === 0;

  return {
    pass,
    finalStyleScore: weighted,
    dimensions,
    hardFails: hardFails.length ? hardFails : undefined,
  };
}

export const ogermanStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'ogerman',
  label: 'Claus Ogerman — Orchestral Continuum',
  threshold: 7.0,
  dimensions: ogermanDimensions,
  score: scoreOgerman,
};
