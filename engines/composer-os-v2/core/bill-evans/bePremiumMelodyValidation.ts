/**
 * Bill Evans premium-melody conformance thresholds (V87 Commit 2c — FROZEN).
 * Calibrated on native lyrical benchmark BE_Benchmark_LyricalBallad.musicxml seed 90301.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';
import type {
  PremiumMelodyPitchSlotList,
  PremiumMelodyPitchTraceEvent,
} from '../premium-melody/premiumMelodyPitchProfile';

export const BE_OFFBEAT_RATIO_MIN = 0.2;
export const BE_OFFBEAT_RATIO_MAX = 0.4;
export const BE_IOI_ENTROPY_MIN = 1.0;
export const BE_IOI_ENTROPY_MAX = 2.4;
export const BE_VELOCITY_SPREAD_MIN = 4;
export const BE_VELOCITY_SPREAD_MAX = 10;

export const BE_PITCH_DIFFER_RATE_MIN = 0.6;
export const BE_STEPWISE_MOTION_MIN = 0.53;
export const BE_LARGE_LEAP_MAX = 0.31;

/** 2c FROZEN — Gaussian sigma for guide-tone proximity validation. */
export const BE_GUIDE_TONE_PROXIMITY_SIGMA = 1.5;
/** 2c FROZEN — mean guide-tone Gaussian proximity band (sigma 1.5). */
export const BE_GUIDE_TONE_PROXIMITY_MIN = 0.55;
export const BE_GUIDE_TONE_PROXIMITY_MAX = 1.0;
/** 2c FROZEN — phrase-level exact primary guide-tone hit rate (60–70% of eligible notes). */
export const BE_GUIDE_TONE_EXACT_HIT_RATE_MIN = 0.6;
export const BE_GUIDE_TONE_EXACT_HIT_RATE_MAX = 0.7;
/** 2c FROZEN — per-bar floor on 2-note bars (≥1 guide-tone hit). */
export const BE_GUIDE_TONE_EXACT_HIT_RATE_PER_BAR_MIN = 0.5;
/** 2c FROZEN — approach windows at >=50% of chord-boundary slots. */
export const BE_APPROACH_BOUNDARY_RATE_MIN = 0.5;

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

export interface BePremiumMelodyPitchV2Result {
  pass: boolean;
  climaxPass: boolean;
  guideToneProximityAvg: number;
  guideToneProximityPass: boolean;
  guideToneExactHitRateAvg: number;
  guideToneExactHitRatePass: boolean;
  chordBoundaryCount: number;
  approachBoundaryRate: number;
  approachBoundaryPass: boolean;
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
  pitchV2?: BePremiumMelodyPitchV2Result;
  details: string[];
}

function canonicalMelodySort(notes: readonly ImportMelodyNote[]): ImportMelodyNote[] {
  return [...notes].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
}

function nearestMidiToGuidePc(midi: number, guidePc: number, minMidi: number, maxMidi: number): number {
  const octave = Math.floor(midi / 12);
  let best = midi;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let o = octave - 2; o <= octave + 2; o++) {
    const candidate = o * 12 + guidePc;
    if (candidate < minMidi || candidate > maxMidi) continue;
    const dist = Math.abs(candidate - midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function pitchMidiAtSlotIndex(
  pitchMelody: readonly ImportMelodyNote[],
  slotIndex: number
): number | undefined {
  return pitchMelody[slotIndex]?.midiPitch;
}

export function validateBePremiumMelodyPitchV2(
  pitchMelody: readonly ImportMelodyNote[],
  slotList: PremiumMelodyPitchSlotList,
  pitchTrace?: readonly PremiumMelodyPitchTraceEvent[]
): BePremiumMelodyPitchV2Result {
  const details: string[] = [];

  let climaxPass = true;
  const climaxSlots = slotList.filter((s) => s.climaxSlotIndex === s.slotIndex);
  for (const climax of climaxSlots) {
    const idx = climax.slotIndex;
    const midi = pitchMidiAtSlotIndex(pitchMelody, idx);
    if (midi == null) continue;
    const phraseMidis = slotList
      .filter(
        (s) =>
          s.climaxSlotIndex === climax.climaxSlotIndex &&
          s.slotIndex !== idx &&
          s.noteRole !== 'rest_placeholder'
      )
      .map((s) => pitchMidiAtSlotIndex(pitchMelody, s.slotIndex))
      .filter((m): m is number => m != null);
    if (phraseMidis.length === 0) continue;
    const phraseMean = phraseMidis.reduce((a, b) => a + b, 0) / phraseMidis.length;
    const phraseMin = Math.min(...phraseMidis);
    if (midi < phraseMean + 6 || midi < phraseMin + 9) {
      climaxPass = false;
      details.push(
        `climax slot ${idx} midi ${midi} below mean+6 (${phraseMean + 6}) or min+9 (${phraseMin + 9})`
      );
    }
    for (const neighbor of [idx - 1, idx + 1]) {
      if (neighbor < 0 || neighbor >= slotList.length) continue;
      const nSlot = slotList[neighbor];
      if (nSlot == null || nSlot.climaxSlotIndex !== climax.climaxSlotIndex) continue;
      if (nSlot.approachWindowRole === 'intermediate') continue;
      const nMidi = pitchMidiAtSlotIndex(pitchMelody, neighbor);
      if (nMidi == null) continue;
      if (nMidi >= midi - 2) {
        climaxPass = false;
        details.push(`climax neighbor ${neighbor} midi ${nMidi} not >=2 below climax ${midi}`);
      }
    }
  }
  if (climaxSlots.length === 0) {
    climaxPass = false;
    details.push('no climax slots marked in pitch layer');
  }

  let proxSum = 0;
  let proxCount = 0;
  for (const slot of slotList) {
    if (slot.guideTonePc == null || slot.noteRole === 'rest_placeholder') continue;
    const midi = pitchMidiAtSlotIndex(pitchMelody, slot.slotIndex);
    if (midi == null) continue;
    const guideMidi = nearestMidiToGuidePc(
      midi,
      slot.guideTonePc,
      slot.registerBandMinMidi,
      slot.registerBandMaxMidi
    );
    proxSum += Math.exp(-Math.pow(midi - guideMidi, 2) / (2 * BE_GUIDE_TONE_PROXIMITY_SIGMA * BE_GUIDE_TONE_PROXIMITY_SIGMA));
    proxCount++;
  }
  const guideToneProximityAvg = proxCount > 0 ? proxSum / proxCount : 0;
  const guideToneProximityPass =
    guideToneProximityAvg >= BE_GUIDE_TONE_PROXIMITY_MIN &&
    guideToneProximityAvg <= BE_GUIDE_TONE_PROXIMITY_MAX;
  if (!guideToneProximityPass) {
    details.push(
      `guideToneProximityAvg ${guideToneProximityAvg.toFixed(3)} outside [${BE_GUIDE_TONE_PROXIMITY_MIN}, ${BE_GUIDE_TONE_PROXIMITY_MAX}]`
    );
  }

  const barExactHits = new Map<number, { hits: number; total: number }>();
  for (const slot of slotList) {
    if (slot.guideTonePc == null || slot.noteRole === 'rest_placeholder') continue;
    const midi = pitchMidiAtSlotIndex(pitchMelody, slot.slotIndex);
    if (midi == null) continue;
    const entry = barExactHits.get(slot.bar) ?? { hits: 0, total: 0 };
    entry.total++;
    const pc = ((midi % 12) + 12) % 12;
    if (pc === slot.guideTonePc) entry.hits++;
    barExactHits.set(slot.bar, entry);
  }
  let guideToneEligibleNotes = 0;
  let guideToneExactHits = 0;
  const barRates: number[] = [];
  for (const entry of barExactHits.values()) {
    if (entry.total <= 0) continue;
    guideToneEligibleNotes += entry.total;
    guideToneExactHits += entry.hits;
    barRates.push(entry.hits / entry.total);
  }
  const guideToneExactHitRateAvg =
    guideToneEligibleNotes > 0 ? guideToneExactHits / guideToneEligibleNotes : 0;
  const perBarFloorPass = barRates.every((r) => r >= BE_GUIDE_TONE_EXACT_HIT_RATE_PER_BAR_MIN);
  const guideToneExactHitRatePass =
    perBarFloorPass &&
    guideToneExactHitRateAvg >= BE_GUIDE_TONE_EXACT_HIT_RATE_MIN &&
    guideToneExactHitRateAvg <= BE_GUIDE_TONE_EXACT_HIT_RATE_MAX;
  if (!guideToneExactHitRatePass) {
    if (!perBarFloorPass) {
      details.push(
        `guideTone per-bar floor: each bar needs >= ${BE_GUIDE_TONE_EXACT_HIT_RATE_PER_BAR_MIN} exact-hit rate (2-note bars: at least one primary guide tone)`
      );
    }
    details.push(
      `guideToneExactHitRateAvg ${guideToneExactHitRateAvg.toFixed(3)} outside [${BE_GUIDE_TONE_EXACT_HIT_RATE_MIN}, ${BE_GUIDE_TONE_EXACT_HIT_RATE_MAX}] (phrase-level)`
    );
  }

  const boundarySlots = slotList.filter((s) => s.isChordBoundary);
  const chordBoundaryCount = boundarySlots.length;
  let approachHits = 0;
  for (const slot of boundarySlots) {
    const traced = pitchTrace?.[slot.slotIndex];
    const hasApproach =
      slot.approachWindowRole === 'target' ||
      slot.isApproachTarget === true ||
      traced?.phrasePlanRef.includes(':approach:') === true;
    if (hasApproach) approachHits++;
  }
  const approachBoundaryRate = chordBoundaryCount > 0 ? approachHits / chordBoundaryCount : 0;
  const approachBoundaryPass = approachBoundaryRate >= BE_APPROACH_BOUNDARY_RATE_MIN;
  if (!approachBoundaryPass) {
    details.push(
      `approachBoundaryRate ${approachBoundaryRate.toFixed(3)} < ${BE_APPROACH_BOUNDARY_RATE_MIN} (${approachHits}/${chordBoundaryCount} boundaries)`
    );
  }

  const pass =
    climaxPass &&
    guideToneProximityPass &&
    guideToneExactHitRatePass &&
    approachBoundaryPass;
  return {
    pass,
    climaxPass,
    guideToneProximityAvg,
    guideToneProximityPass,
    guideToneExactHitRateAvg,
    guideToneExactHitRatePass,
    chordBoundaryCount,
    approachBoundaryRate,
    approachBoundaryPass,
    details,
  };
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
    slotList?: PremiumMelodyPitchSlotList;
    pitchTrace?: readonly PremiumMelodyPitchTraceEvent[];
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
        '] (2c FROZEN)'
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
        '] (2c FROZEN)'
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
        '] (2c FROZEN)'
    );
  }

  let pitchTrace: BePremiumMelodyPitchTraceResult | undefined;
  if (options?.importMelody != null && options?.pitchMelody != null) {
    pitchTrace = validateBePremiumMelodyPitchTrace(options.importMelody, options.pitchMelody);
    if (!pitchTrace.pass) {
      details.push(...pitchTrace.details);
    }
  }

  let pitchV2: BePremiumMelodyPitchV2Result | undefined;
  if (options?.pitchMelody != null && options?.slotList != null) {
    pitchV2 = validateBePremiumMelodyPitchV2(
      options.pitchMelody,
      options.slotList,
      options.pitchTrace
    );
    if (!pitchV2.pass) {
      details.push(...pitchV2.details);
    }
  }

  const pass =
    offbeatRatioPass &&
    ioiEntropyPass &&
    velocitySpreadPass &&
    (pitchTrace == null || pitchTrace.pass) &&
    (pitchV2 == null || pitchV2.pass);

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
    pitchV2,
    details,
  };
}
