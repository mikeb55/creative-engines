/**
 * Bill Evans premium-melody conformance thresholds (V87 Commit 2a — PLACEHOLDER).
 * Separate from BH thresholds — no phrase-density arc check (BH-specific).
 * Tune in 2b/2c; freeze after native benchmark calibration.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';

export const BE_OFFBEAT_RATIO_MIN = 0.28;
export const BE_OFFBEAT_RATIO_MAX = 0.52;
export const BE_IOI_ENTROPY_MIN = 1.4;
export const BE_VELOCITY_SPREAD_MIN = 4;
export const BE_VELOCITY_SPREAD_MAX = 12;

export interface BePremiumMelodyConformanceResult {
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

export function validateBePremiumMelodyConformance(
  rhythmMelody: readonly ImportMelodyNote[],
  exportMelody: readonly PremiumMelodyExpressiveNote[],
  rhythmMeta?: PremiumMelodyRhythmEnrichmentMeta
): BePremiumMelodyConformanceResult {
  const offbeatRatio =
    rhythmMeta?.offbeatRatio != null ? rhythmMeta.offbeatRatio : melodyOffbeatRatio(rhythmMelody);
  const offbeatRatioPass =
    offbeatRatio >= BE_OFFBEAT_RATIO_MIN && offbeatRatio <= BE_OFFBEAT_RATIO_MAX;

  const ioiEntropy = melodyIoiEntropy(rhythmMelody);
  const ioiEntropyPass = ioiEntropy >= BE_IOI_ENTROPY_MIN;

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
        ']'
    );
  }
  if (!ioiEntropyPass) {
    details.push('ioiEntropy ' + ioiEntropy.toFixed(3) + ' < ' + BE_IOI_ENTROPY_MIN);
  }
  if (!velocitySpreadPass) {
    details.push(
      'velocitySpread ' +
        velocitySpread +
        ' outside [' +
        BE_VELOCITY_SPREAD_MIN +
        ', ' +
        BE_VELOCITY_SPREAD_MAX +
        ']'
    );
  }

  const pass = offbeatRatioPass && ioiEntropyPass && velocitySpreadPass;
  return {
    pass,
    offbeatRatio,
    offbeatRatioMin: BE_OFFBEAT_RATIO_MIN,
    offbeatRatioMax: BE_OFFBEAT_RATIO_MAX,
    offbeatRatioPass,
    ioiEntropy,
    ioiEntropyMin: BE_IOI_ENTROPY_MIN,
    ioiEntropyPass,
    velocityMin,
    velocityMax,
    velocitySpread,
    velocitySpreadMin: BE_VELOCITY_SPREAD_MIN,
    velocitySpreadMax: BE_VELOCITY_SPREAD_MAX,
    velocitySpreadPass,
    details,
  };
}
