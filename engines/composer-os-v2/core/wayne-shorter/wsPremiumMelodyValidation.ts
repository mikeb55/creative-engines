/**
 * Wayne Shorter premium-melody conformance thresholds (V86 Commit 2c - FROZEN).
 * Calibrated on native modal benchmark WS_Benchmark_ModalMelody.musicxml seed 90217.
 * Separate from BH thresholds - no phrase-density arc check (BH-specific).
 * BH uniform-float isolation (BH_Benchmark_JazzMelody) sits at IOI-entropy floor edge.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';

/** Modal benchmark seed 90217: ~0.571. BH isolation uniform-float: ~0.500 (lower band). */
export const WS_OFFBEAT_RATIO_MIN = 0.28;
export const WS_OFFBEAT_RATIO_MAX = 0.58;
/** Modal benchmark: ~3.35. BH isolation uniform-float: ~1.84 (edge pass). */
export const WS_IOI_ENTROPY_MIN = 1.83;
/** Both benchmarks land ~11 on seed 90217; max 12 keeps headroom. */
export const WS_VELOCITY_SPREAD_MIN = 4;
export const WS_VELOCITY_SPREAD_MAX = 12;

export interface WsPremiumMelodyConformanceResult {
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
  details: string[];
}

export function validateWsPremiumMelodyConformance(
  rhythmMelody: readonly ImportMelodyNote[],
  exportMelody: readonly PremiumMelodyExpressiveNote[],
  rhythmMeta?: PremiumMelodyRhythmEnrichmentMeta
): WsPremiumMelodyConformanceResult {
  const offbeatRatio =
    rhythmMeta?.offbeatRatio != null ? rhythmMeta.offbeatRatio : melodyOffbeatRatio(rhythmMelody);
  const offbeatRatioPass =
    offbeatRatio >= WS_OFFBEAT_RATIO_MIN && offbeatRatio <= WS_OFFBEAT_RATIO_MAX;

  const ioiEntropy = melodyIoiEntropy(rhythmMelody);
  const ioiEntropyPass = ioiEntropy >= WS_IOI_ENTROPY_MIN;

  const vels = exportMelody.map((n) => n.velocity).filter((v): v is number => v != null);
  const velocityMin = vels.length > 0 ? Math.min(...vels) : 0;
  const velocityMax = vels.length > 0 ? Math.max(...vels) : 0;
  const velocitySpread = velocityMax - velocityMin;
  const velocitySpreadPass =
    velocitySpread >= WS_VELOCITY_SPREAD_MIN && velocitySpread <= WS_VELOCITY_SPREAD_MAX;

  const details: string[] = [];
  if (!offbeatRatioPass) {
    details.push(
      'offbeatRatio ' +
        offbeatRatio.toFixed(3) +
        ' outside [' +
        WS_OFFBEAT_RATIO_MIN +
        ', ' +
        WS_OFFBEAT_RATIO_MAX +
        ']'
    );
  }
  if (!ioiEntropyPass) {
    details.push('ioiEntropy ' + ioiEntropy.toFixed(3) + ' < ' + WS_IOI_ENTROPY_MIN);
  }
  if (!velocitySpreadPass) {
    details.push(
      'velocitySpread ' +
        velocitySpread +
        ' outside [' +
        WS_VELOCITY_SPREAD_MIN +
        ', ' +
        WS_VELOCITY_SPREAD_MAX +
        ']'
    );
  }

  const pass = offbeatRatioPass && ioiEntropyPass && velocitySpreadPass;
  return {
    pass,
    offbeatRatio,
    offbeatRatioMin: WS_OFFBEAT_RATIO_MIN,
    offbeatRatioMax: WS_OFFBEAT_RATIO_MAX,
    offbeatRatioPass,
    ioiEntropy,
    ioiEntropyMin: WS_IOI_ENTROPY_MIN,
    ioiEntropyPass,
    velocityMin,
    velocityMax,
    velocitySpread,
    velocitySpreadMin: WS_VELOCITY_SPREAD_MIN,
    velocitySpreadMax: WS_VELOCITY_SPREAD_MAX,
    velocitySpreadPass,
    details,
  };
}