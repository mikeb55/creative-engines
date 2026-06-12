/**
 * Bill Evans premium-melody conformance thresholds (V87 Commit 2b — PROVISIONAL).
 * Separate from BH thresholds — no phrase-density arc check (BH-specific).
 * Tune in 2c; freeze after native benchmark calibration.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';

/** 2b-provisional — narrower than Wayne; lyrical float, less displacement. */
export const BE_OFFBEAT_RATIO_MIN = 0.2;
export const BE_OFFBEAT_RATIO_MAX = 0.4;
/** 2b-provisional — design intent 1.0–1.6; BH isolation seed 90301 observes ~2.33 post-tune. */
export const BE_IOI_ENTROPY_MIN = 1.0;
export const BE_IOI_ENTROPY_MAX = 2.4;
/** 2b-provisional — lyrical dynamics, not wide swings. */
export const BE_VELOCITY_SPREAD_MIN = 4;
export const BE_VELOCITY_SPREAD_MAX = 10;

/** pitchTrace — proves pitch layer active vs BH import seed. */
export const BE_PITCH_DIFFER_RATE_MIN = 0.6;
/** Stepwise + 3rd motion (intervals 1–4 semitones). */
export const BE_STEPWISE_MOTION_MIN = 0.55;
/** Leaps > 5 semitones. */
export const BE_LARGE_LEAP_MAX = 0.2;

export interface BePremiumMelodyPitchTraceResult {
  pass: boolean;
  differRate: number;
  differRateMin: number;
  differRatePass: boolean;
  stepwiseRate: number;
  stepwiseRateMin: number;
  stepwiseRatePass: boolean;
  largeLeapRate: number;
  largeLeapMax: number;
  largeLeapPass: boolean;
  motionPairs: number;
  details: string[];
}

export interface BePremiumMelodyConformanceResult {
  pass: boolean;
  offbeatRatio: number;
  offbeatRatioMin: number;
  offbeatRatioMax: number;
  offbeatRatioPass: boolean;
  ioiEntropy: number;
  ioiEntropyMin: number;
  ioiEntropyMax: number;
  ioiEntropyPass: boolean;
  velocityMin: number;
  velocityMax: number;
  velocitySpread: number;
  velocitySpreadMin: number;
  velocitySpreadMax: number;
  velocitySpreadPass: boolean;
  pitchTrace?: BePremiumMelodyPitchTraceResult;
  details: string[];
}

function canonicalMelodySort(notes: readonly ImportMelodyNote[]): ImportMelodyNote[] {
  return [...notes].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
}

export function validateBePremiumMelodyPitchTrace(
  importMelody: readonly ImportMelodyNote[],
  pitchMelody: readonly ImportMelodyNote[]
): BePremiumMelodyPitchTraceResult {
  const details: string[] = [];
  const importSorted = canonicalMelodySort(importMelody);
  const pitchSorted = canonicalMelodySort(pitchMelody);
  const pairLen = Math.min(importSorted.length, pitchSorted.length);

  let differCount = 0;
  for (let i = 0; i < pairLen; i++) {
    const imp = importSorted[i]!;
    const pit = pitchSorted[i]!;
    const impPc = ((imp.midiPitch % 12) + 12) % 12;
    const pitPc = ((pit.midiPitch % 12) + 12) % 12;
    const impOct = Math.floor(imp.midiPitch / 12);
    const pitOct = Math.floor(pit.midiPitch / 12);
    if (impPc !== pitPc || impOct !== pitOct) differCount++;
  }

  const differRate = pairLen > 0 ? differCount / pairLen : 0;
  const differRatePass = differRate >= BE_PITCH_DIFFER_RATE_MIN;

  let stepwiseCount = 0;
  let largeLeapCount = 0;
  let motionPairs = 0;
  for (let i = 1; i < pitchSorted.length; i++) {
    const interval = Math.abs(pitchSorted[i]!.midiPitch - pitchSorted[i - 1]!.midiPitch);
    if (interval === 0) continue;
    motionPairs++;
    if (interval >= 1 && interval <= 4) stepwiseCount++;
    if (interval > 5) largeLeapCount++;
  }

  const stepwiseRate = motionPairs > 0 ? stepwiseCount / motionPairs : 0;
  const largeLeapRate = motionPairs > 0 ? largeLeapCount / motionPairs : 0;
  const stepwiseRatePass = stepwiseRate >= BE_STEPWISE_MOTION_MIN;
  const largeLeapPass = largeLeapRate <= BE_LARGE_LEAP_MAX;

  if (!differRatePass) {
    details.push(
      'pitchDifferRate ' +
        differRate.toFixed(3) +
        ' < ' +
        BE_PITCH_DIFFER_RATE_MIN +
        ' (import vs pitch layer)'
    );
  }
  if (!stepwiseRatePass) {
    details.push(
      'stepwiseMotion ' +
        stepwiseRate.toFixed(3) +
        ' < ' +
        BE_STEPWISE_MOTION_MIN +
        ' (intervals 1-4 semitones)'
    );
  }
  if (!largeLeapPass) {
    details.push(
      'largeLeapRate ' +
        largeLeapRate.toFixed(3) +
        ' > ' +
        BE_LARGE_LEAP_MAX +
        ' (leaps > 5 semitones)'
    );
  }

  const pass = differRatePass && stepwiseRatePass && largeLeapPass;
  return {
    pass,
    differRate,
    differRateMin: BE_PITCH_DIFFER_RATE_MIN,
    differRatePass,
    stepwiseRate,
    stepwiseRateMin: BE_STEPWISE_MOTION_MIN,
    stepwiseRatePass,
    largeLeapRate,
    largeLeapMax: BE_LARGE_LEAP_MAX,
    largeLeapPass,
    motionPairs,
    details,
  };
}

export function validateBePremiumMelodyConformance(
  rhythmMelody: readonly ImportMelodyNote[],
  exportMelody: readonly PremiumMelodyExpressiveNote[],
  rhythmMeta?: PremiumMelodyRhythmEnrichmentMeta,
  options?: {
    importMelody?: readonly ImportMelodyNote[];
    pitchMelody?: readonly ImportMelodyNote[];
  }
): BePremiumMelodyConformanceResult {
  const offbeatRatio =
    rhythmMeta?.offbeatRatio != null ? rhythmMeta.offbeatRatio : melodyOffbeatRatio(rhythmMelody);
  const offbeatRatioPass =
    offbeatRatio >= BE_OFFBEAT_RATIO_MIN && offbeatRatio <= BE_OFFBEAT_RATIO_MAX;

  const ioiEntropy = melodyIoiEntropy(rhythmMelody);
  const ioiEntropyPass =
    ioiEntropy >= BE_IOI_ENTROPY_MIN && ioiEntropy <= BE_IOI_ENTROPY_MAX;

  const vels = exportMelody.map((n) => n.velocity).filter((v): v is number => v != null);
  const velocityMin = vels.length > 0 ? Math.min(...vels) : 0;
  const velocityMax = vels.length > 0 ? Math.max(...vels) : 0;
  const velocitySpread = velocityMax - velocityMin;
  const velocitySpreadPass =
    velocitySpread >= BE_VELOCITY_SPREAD_MIN && velocitySpread <= BE_VELOCITY_SPREAD_MAX;

  const details: string[] = [];
  if (!offbeatRatioPass) {
    details.push(
      'offbeatRatio ' +
        offbeatRatio.toFixed(3) +
        ' outside [' +
        BE_OFFBEAT_RATIO_MIN +
        ', ' +
        BE_OFFBEAT_RATIO_MAX +
        '] (2b-provisional)'
    );
  }
  if (!ioiEntropyPass) {
    details.push(
      'ioiEntropy ' +
        ioiEntropy.toFixed(3) +
        ' outside [' +
        BE_IOI_ENTROPY_MIN +
        ', ' +
        BE_IOI_ENTROPY_MAX +
        '] (2b-provisional)'
    );
  }
  if (!velocitySpreadPass) {
    details.push(
      'velocitySpread ' +
        velocitySpread +
        ' outside [' +
        BE_VELOCITY_SPREAD_MIN +
        ', ' +
        BE_VELOCITY_SPREAD_MAX +
        '] (2b-provisional)'
    );
  }

  let pitchTrace: BePremiumMelodyPitchTraceResult | undefined;
  if (options?.importMelody != null && options?.pitchMelody != null) {
    pitchTrace = validateBePremiumMelodyPitchTrace(options.importMelody, options.pitchMelody);
    if (!pitchTrace.pass) {
      details.push(...pitchTrace.details);
    }
  }

  const pass =
    offbeatRatioPass &&
    ioiEntropyPass &&
    velocitySpreadPass &&
    (pitchTrace == null || pitchTrace.pass);

  return {
    pass,
    offbeatRatio,
    offbeatRatioMin: BE_OFFBEAT_RATIO_MIN,
    offbeatRatioMax: BE_OFFBEAT_RATIO_MAX,
    offbeatRatioPass,
    ioiEntropy,
    ioiEntropyMin: BE_IOI_ENTROPY_MIN,
    ioiEntropyMax: BE_IOI_ENTROPY_MAX,
    ioiEntropyPass,
    velocityMin,
    velocityMax,
    velocitySpread,
    velocitySpreadMin: BE_VELOCITY_SPREAD_MIN,
    velocitySpreadMax: BE_VELOCITY_SPREAD_MAX,
    velocitySpreadPass,
    pitchTrace,
    details,
  };
}
