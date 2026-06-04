import type {
  ExtractedStyleFeatures,
  StyleDimensionDefinition,
  StyleDimensionScore,
  StyleProfile,
  StyleProfileEvaluationInput,
  StyleProfileEvaluationResult,
} from './evaluationTypes';
import { ellingtonStyleProfile } from './ellingtonStyleProfile';

const strayhornDimensions: StyleDimensionDefinition[] = [
  {
    id: 'extensionOccupancy',
    label: 'Extension Occupancy',
    weight: 0.22,
    description: 'accented melody extensions maj7/9/11/13 ≥55%',
    featureKeys: ['melodic.extensionOnAccentedBeatRate'],
  },
  {
    id: 'phraseContinuity',
    label: 'Phrase Continuity',
    weight: 0.18,
    description: '≥6 beats uninterrupted in ballad mode',
    featureKeys: ['melodic.uninterruptedPhraseBeatSpan'],
  },
  {
    id: 'chromaticArchitecture',
    label: 'Chromatic Architecture',
    weight: 0.2,
    description: '≥2 of tritone sub / enharmonic pivot / minor-third shift / dom chain in 32 bars',
    featureKeys: ['harmonic.chromaticArchitectureScore'],
  },
  {
    id: 'parallelColorMotion',
    label: 'Parallel Color Motion',
    weight: 0.14,
    description: '≥1 phrase with non-functional planed sonorities',
    featureKeys: ['harmonic.parallelPlaningPhraseCount'],
  },
  {
    id: 'innerVoiceMotion',
    label: 'Inner Voice Motion',
    weight: 0.14,
    description: 'inner-voice motion density ≥45%',
    featureKeys: ['harmonic.innerVoiceMotionRate'],
  },
  {
    id: 'closedBlockSustain',
    label: 'Closed Block Sustain',
    weight: 0.12,
    description: 'block voicing persists ≥2 bars when used',
    featureKeys: ['orchestration.closedBlockDurationBars'],
  },
];

function num(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function scoreExtensionOccupancy(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.55) return 10;
  if (rate >= 0.48) return 7;
  if (rate >= 0.4) return 4;
  return 1;
}

function scorePhraseContinuity(beats: number | null): number {
  if (beats == null) return 1;
  if (beats >= 10) return 10;
  if (beats >= 6) return 7;
  if (beats >= 4) return 4;
  return 1;
}

function scoreChromaticArchitecture(score: number | null): number {
  if (score == null) return 1;
  if (score >= 3) return 10;
  if (score >= 2) return 7;
  if (score >= 1) return 4;
  return 1;
}

function scoreParallelColor(count: number | null): number {
  if (count == null) return 1;
  if (count >= 2) return 10;
  if (count >= 1) return 7;
  return 1;
}

function scoreInnerVoiceMotion(rate: number | null): number {
  if (rate == null) return 1;
  if (rate >= 0.55) return 10;
  if (rate >= 0.45) return 7;
  if (rate >= 0.35) return 4;
  return 1;
}

function scoreClosedBlock(duration: number | null): number {
  if (duration == null) return 1;
  if (duration >= 3) return 10;
  if (duration >= 2) return 7;
  if (duration >= 1) return 4;
  return 1;
}

export interface StrayhornHardFailReason {
  code: string;
  message: string;
}

export function evaluateStrayhornHardFails(features: ExtractedStyleFeatures): StrayhornHardFailReason[] {
  const fails: StrayhornHardFailReason[] = [];
  const melodic = features.melodic ?? {};
  const harmonic = features.harmonic ?? {};
  const formal = features.formal ?? {};
  const orch = features.orchestration ?? {};

  const extOcc = num(melodic.extensionOnAccentedBeatRate);
  if (extOcc != null && extOcc < 0.4) {
    fails.push({ code: 'extension_low', message: 'extension occupancy below 0.40 floor' });
  }

  const phraseSpan = num(melodic.uninterruptedPhraseBeatSpan);
  if (phraseSpan != null && phraseSpan < 3) {
    fails.push({ code: 'phrase_fragment', message: 'Ellington dramatic-stop fragmentation — phrase span < 3 beats repeatedly' });
  }

  const riffDominance = num(formal.riffMotivicRepetitionRate);
  if (riffDominance != null && riffDominance > 0.45) {
    fails.push({ code: 'blues_riff', message: 'blues-riff functional writing dominant' });
  }

  const sectionalContrast = num(formal.hardSectionalContrastBars);
  if (sectionalContrast != null && sectionalContrast > 4) {
    fails.push({ code: 'sectional_contrast', message: 'repeated hard sectional character contrast' });
  }

  const innerMotion = num(harmonic.innerVoiceMotionRate);
  if (innerMotion != null && innerMotion < 0.45) {
    fails.push({ code: 'static_pads', message: 'static block pads with no inner motion' });
  }

  const tuttiConfirm = num(orch.tuttiClimaxConfirmationRate);
  if (tuttiConfirm != null && tuttiConfirm > 0.35) {
    fails.push({ code: 'tutti_confirm', message: 'climax resolves into thick tutti rhetorical confirmation' });
  }

  const plainTonic = num(harmonic.plainTonicTriadCloseRate);
  if (plainTonic != null && plainTonic > 0.25) {
    fails.push({ code: 'tonic_opaque', message: 'plain tonic triad arrival > 25% of ballad endings' });
  }

  return fails;
}

/** Fail Strayhorn if output passes Ellington profile via timbral/riff signatures. */
export function evaluateStrayhornEllingtonDiscrimination(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StrayhornHardFailReason[] {
  const fails: StrayhornHardFailReason[] = [];
  const ellingtonResult = ellingtonStyleProfile.score(input);
  if (!ellingtonResult.pass) return fails;

  const formal = input.features.formal ?? {};
  const orch = input.features.orchestration ?? {};

  const sectionalContrast = num(formal.hardSectionalContrastBars);
  if (sectionalContrast != null && sectionalContrast > 4) {
    fails.push({ code: 'ellington_sectional', message: 'hard sectional contrast > 4 bars — Ellington trigger' });
  }

  const riffDominance = num(formal.riffMotivicRepetitionRate);
  if (riffDominance != null && riffDominance > 0.5) {
    fails.push({ code: 'ellington_riff', message: 'riff-based motivic repetition dominant — Ellington trigger' });
  }

  const phraseSpan = num(input.features.melodic?.uninterruptedPhraseBeatSpan);
  if (phraseSpan != null && phraseSpan < 3) {
    fails.push({ code: 'ellington_stop_start', message: 'dramatic stop/start phrase fragmentation — Ellington trigger' });
  }

  const blockSpotOnly = num(orch.closedBlockSpotEffectOnlyRate);
  if (blockSpotOnly != null && blockSpotOnly > 0.55) {
    fails.push({
      code: 'ellington_block_spot',
      message: 'block voicing used as spot effect only, not sustained structural texture',
    });
  }

  if (ellingtonResult.pass && fails.length === 0 && ellingtonResult.finalStyleScore >= 8) {
    fails.push({ code: 'ellington_profile_pass', message: 'output passes Ellington profile — not Strayhorn identity' });
  }

  return fails;
}

function scoreStrayhorn(
  input: StyleProfileEvaluationInput<unknown, ExtractedStyleFeatures>
): StyleProfileEvaluationResult {
  const melodic = input.features.melodic ?? {};
  const harmonic = input.features.harmonic ?? {};
  const orch = input.features.orchestration ?? {};

  const byId: Record<string, number> = {
    extensionOccupancy: scoreExtensionOccupancy(num(melodic.extensionOnAccentedBeatRate)),
    phraseContinuity: scorePhraseContinuity(num(melodic.uninterruptedPhraseBeatSpan)),
    chromaticArchitecture: scoreChromaticArchitecture(num(harmonic.chromaticArchitectureScore)),
    parallelColorMotion: scoreParallelColor(num(harmonic.parallelPlaningPhraseCount)),
    innerVoiceMotion: scoreInnerVoiceMotion(num(harmonic.innerVoiceMotionRate)),
    closedBlockSustain: scoreClosedBlock(num(orch.closedBlockDurationBars)),
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

  const hardFails = [
    ...evaluateStrayhornHardFails(input.features),
    ...evaluateStrayhornEllingtonDiscrimination(input),
  ];

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

export const strayhornStyleProfile: StyleProfile<unknown, ExtractedStyleFeatures> = {
  id: 'strayhorn',
  name: 'Billy Strayhorn',
  family: 'bigBand',
  threshold: 7.0,
  dimensions: strayhornDimensions,
  score: scoreStrayhorn,
};
