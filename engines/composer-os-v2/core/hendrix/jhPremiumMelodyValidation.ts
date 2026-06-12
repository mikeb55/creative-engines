/**
 * Jimi Hendrix premium-melody conformance thresholds (V89 Commit 2a/2b — PROVISIONAL).
 * Separate from BH thresholds — no phrase-density arc check (BH-specific).
 * Tune in 2c; freeze after native benchmark calibration.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';
import type {
  PremiumMelodyPitchSlotList,
  PremiumMelodyPitchTraceEvent,
} from '../premium-melody/premiumMelodyPitchProfile';

export const JH_OFFBEAT_RATIO_MIN = 0.28;
export const JH_OFFBEAT_RATIO_MAX = 0.58;
export const JH_IOI_ENTROPY_MIN = 1.4;
export const JH_VELOCITY_SPREAD_MIN = 4;
export const JH_VELOCITY_SPREAD_MAX = 12;

/** PROVISIONAL — minor-pentatonic + blues anchor hit rate on pitch output. */
export const JH_PENTATONIC_ANCHOR_HIT_RATE_MIN = 0.35;
/** PROVISIONAL — at least one b3/b5/b7 inflection note per phrase-scale output. */
export const JH_BLUES_INFLECTION_NOTE_MIN = 1;
/** PROVISIONAL — riff cell assigned on at least one slot per output. */
export const JH_RIFF_CELL_SLOT_MIN = 4;
/** PROVISIONAL — response-bar import DNA similarity (BH isolation observes ~0.125; tightens at 2c). */
export const JH_CALL_RESPONSE_SIMILARITY_MIN = 0.08;
export const JH_CALL_RESPONSE_SIMILARITY_MAX = 0.25;
export const JH_CALL_RESPONSE_SIMILARITY_TARGET = 0.55;

export interface JhPremiumMelodyPitchMechanismResult {
  pass: boolean;
  pentatonicAnchorHitRate: number;
  pentatonicAnchorHitRateMin: number;
  pentatonicAnchorPass: boolean;
  bluesInflectionNoteCount: number;
  bluesInflectionNoteMin: number;
  bluesInflectionPass: boolean;
  riffCellSlotCount: number;
  riffCellSlotMin: number;
  riffCellRecallPass: boolean;
  callResponseSimilarityAvg: number;
  callResponseSimilarityTarget: number;
  callResponseSimilarityMin: number;
  callResponseSimilarityMax: number;
  callResponseSimilarityPass: boolean;
  responseSlotCount: number;
  details: string[];
}

export interface JhPremiumMelodyConformanceResult {
  pass: boolean;
  offbeatRatio: number;
  offbeatRatioMin: number;
  offbeatRatioMax: number;
  offbeatRatioPass: boolean;
  ioiEntropy: number;
  ioiEntropyMin: number;
  ioiEntropyPass: boolean;
  velocityMin: number;
  velocityMax: number;
  velocitySpread: number;
  velocitySpreadMin: number;
  velocitySpreadMax: number;
  velocitySpreadPass: boolean;
  pitchMechanisms?: JhPremiumMelodyPitchMechanismResult;
  details: string[];
}

function pitchMidiAtSlotIndex(
  pitchMelody: readonly ImportMelodyNote[],
  slotIndex: number
): number | undefined {
  return pitchMelody[slotIndex]?.midiPitch;
}

function isBluesInflectionRelativePc(rel: number): boolean {
  return rel === 3 || rel === 6 || rel === 10;
}

function isPentatonicAnchorRelativePc(rel: number): boolean {
  return rel === 0 || rel === 3 || rel === 5 || rel === 7 || rel === 10;
}

export function validateJhPremiumMelodyPitchMechanisms(
  pitchMelody: readonly ImportMelodyNote[],
  slotList: PremiumMelodyPitchSlotList
): JhPremiumMelodyPitchMechanismResult {
  const details: string[] = [];

  let anchorEligible = 0;
  let anchorHits = 0;
  let bluesInflectionNoteCount = 0;

  for (const slot of slotList) {
    if (slot.noteRole === 'rest_placeholder') continue;
    const midi = pitchMidiAtSlotIndex(pitchMelody, slot.slotIndex);
    if (midi == null) continue;
    const rootPc = slot.harmonyRootPc % 12;
    const rel = (midi - rootPc + 120) % 12;
    anchorEligible++;
    if (isPentatonicAnchorRelativePc(rel)) anchorHits++;
    if (isBluesInflectionRelativePc(rel)) bluesInflectionNoteCount++;
  }

  const pentatonicAnchorHitRate = anchorEligible > 0 ? anchorHits / anchorEligible : 0;
  const pentatonicAnchorPass = pentatonicAnchorHitRate >= JH_PENTATONIC_ANCHOR_HIT_RATE_MIN;
  if (!pentatonicAnchorPass) {
    details.push(
      'pentatonicAnchorHitRate ' +
        pentatonicAnchorHitRate.toFixed(3) +
        ' < ' +
        JH_PENTATONIC_ANCHOR_HIT_RATE_MIN
    );
  }

  const bluesInflectionPass = bluesInflectionNoteCount >= JH_BLUES_INFLECTION_NOTE_MIN;
  if (!bluesInflectionPass) {
    details.push(
      'bluesInflectionNoteCount ' +
        bluesInflectionNoteCount +
        ' < ' +
        JH_BLUES_INFLECTION_NOTE_MIN
    );
  }

  const riffCellSlotCount = slotList.filter(
    (s) => s.riffCellIntervals != null && s.riffCellIntervals.length > 0
  ).length;
  const riffCellRecallPass = riffCellSlotCount >= JH_RIFF_CELL_SLOT_MIN;
  if (!riffCellRecallPass) {
    details.push('riffCellSlotCount ' + riffCellSlotCount + ' < ' + JH_RIFF_CELL_SLOT_MIN);
  }

  const responseSimilarities: number[] = [];
  for (const slot of slotList) {
    if (slot.callResponseRole !== 'response') continue;
    if (slot.callResponseSimilarity == null) continue;
    responseSimilarities.push(slot.callResponseSimilarity);
  }
  const callResponseSimilarityAvg =
    responseSimilarities.length > 0
      ? responseSimilarities.reduce((a, b) => a + b, 0) / responseSimilarities.length
      : 0;
  const callResponseSimilarityPass =
    responseSimilarities.length > 0 &&
    callResponseSimilarityAvg >= JH_CALL_RESPONSE_SIMILARITY_MIN &&
    callResponseSimilarityAvg <= JH_CALL_RESPONSE_SIMILARITY_MAX;
  if (!callResponseSimilarityPass) {
    details.push(
      'callResponseSimilarityAvg ' +
        callResponseSimilarityAvg.toFixed(3) +
        ' outside [' +
        JH_CALL_RESPONSE_SIMILARITY_MIN +
        ', ' +
        JH_CALL_RESPONSE_SIMILARITY_MAX +
        '] (target ' +
        JH_CALL_RESPONSE_SIMILARITY_TARGET +
        ', ' +
        responseSimilarities.length +
        ' response slots)'
    );
  }

  const pass =
    pentatonicAnchorPass && bluesInflectionPass && riffCellRecallPass && callResponseSimilarityPass;

  return {
    pass,
    pentatonicAnchorHitRate,
    pentatonicAnchorHitRateMin: JH_PENTATONIC_ANCHOR_HIT_RATE_MIN,
    pentatonicAnchorPass,
    bluesInflectionNoteCount,
    bluesInflectionNoteMin: JH_BLUES_INFLECTION_NOTE_MIN,
    bluesInflectionPass,
    riffCellSlotCount,
    riffCellSlotMin: JH_RIFF_CELL_SLOT_MIN,
    riffCellRecallPass,
    callResponseSimilarityAvg,
    callResponseSimilarityTarget: JH_CALL_RESPONSE_SIMILARITY_TARGET,
    callResponseSimilarityMin: JH_CALL_RESPONSE_SIMILARITY_MIN,
    callResponseSimilarityMax: JH_CALL_RESPONSE_SIMILARITY_MAX,
    callResponseSimilarityPass,
    responseSlotCount: responseSimilarities.length,
    details,
  };
}

export function validateJhPremiumMelodyConformance(
  rhythmMelody: readonly ImportMelodyNote[],
  exportMelody: readonly PremiumMelodyExpressiveNote[],
  rhythmMeta?: PremiumMelodyRhythmEnrichmentMeta,
  options?: {
    pitchMelody?: readonly ImportMelodyNote[];
    slotList?: PremiumMelodyPitchSlotList;
    pitchTrace?: readonly PremiumMelodyPitchTraceEvent[];
  }
): JhPremiumMelodyConformanceResult {
  const offbeatRatio =
    rhythmMeta?.offbeatRatio != null ? rhythmMeta.offbeatRatio : melodyOffbeatRatio(rhythmMelody);
  const offbeatRatioPass =
    offbeatRatio >= JH_OFFBEAT_RATIO_MIN && offbeatRatio <= JH_OFFBEAT_RATIO_MAX;

  const ioiEntropy = melodyIoiEntropy(rhythmMelody);
  const ioiEntropyPass = ioiEntropy >= JH_IOI_ENTROPY_MIN;

  const vels = exportMelody.map((n) => n.velocity).filter((v): v is number => v != null);
  const velocityMin = vels.length > 0 ? Math.min(...vels) : 0;
  const velocityMax = vels.length > 0 ? Math.max(...vels) : 0;
  const velocitySpread = velocityMax - velocityMin;
  const velocitySpreadPass =
    velocitySpread >= JH_VELOCITY_SPREAD_MIN && velocitySpread <= JH_VELOCITY_SPREAD_MAX;

  const details: string[] = [];
  if (!offbeatRatioPass) {
    details.push(
      'offbeatRatio ' +
        offbeatRatio.toFixed(3) +
        ' outside [' +
        JH_OFFBEAT_RATIO_MIN +
        ', ' +
        JH_OFFBEAT_RATIO_MAX +
        ']'
    );
  }
  if (!ioiEntropyPass) {
    details.push('ioiEntropy ' + ioiEntropy.toFixed(3) + ' < ' + JH_IOI_ENTROPY_MIN);
  }
  if (!velocitySpreadPass) {
    details.push(
      'velocitySpread ' +
        velocitySpread +
        ' outside [' +
        JH_VELOCITY_SPREAD_MIN +
        ', ' +
        JH_VELOCITY_SPREAD_MAX +
        ']'
    );
  }

  let pitchMechanisms: JhPremiumMelodyPitchMechanismResult | undefined;
  if (options?.pitchMelody != null && options?.slotList != null) {
    pitchMechanisms = validateJhPremiumMelodyPitchMechanisms(options.pitchMelody, options.slotList);
    if (!pitchMechanisms.pass) {
      details.push(...pitchMechanisms.details);
    }
  }

  const pass =
    offbeatRatioPass &&
    ioiEntropyPass &&
    velocitySpreadPass &&
    (pitchMechanisms == null || pitchMechanisms.pass);

  return {
    pass,
    offbeatRatio,
    offbeatRatioMin: JH_OFFBEAT_RATIO_MIN,
    offbeatRatioMax: JH_OFFBEAT_RATIO_MAX,
    offbeatRatioPass,
    ioiEntropy,
    ioiEntropyMin: JH_IOI_ENTROPY_MIN,
    ioiEntropyPass,
    velocityMin,
    velocityMax,
    velocitySpread,
    velocitySpreadMin: JH_VELOCITY_SPREAD_MIN,
    velocitySpreadMax: JH_VELOCITY_SPREAD_MAX,
    velocitySpreadPass,
    pitchMechanisms,
    details,
  };
}
