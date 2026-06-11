/**
 * Wayne Shorter premium-melody conformance thresholds (V86 Commit 2b).
 * Separate from BH thresholds -- Wayne uses modal float (float_preserve, modal_lyric).
 * NO phrase-density arc check (BH-specific).
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { PremiumMelodyExpressiveNote } from '../premium-melody/enrichMelodyExpression';
import type { PremiumMelodyRhythmEnrichmentMeta } from '../premium-melody/premiumMelodyCellLibrary';
import { melodyOffbeatRatio, melodyIoiEntropy } from '../premium-melody/premiumMelodyMetrics';

const WS_OFFBEAT_RATIO_MIN = 0.28;
const WS_OFFBEAT_RATIO_MAX = 0.52;
const WS_IOI_ENTROPY_MIN = 1.4;
const WS_VELOCITY_SPREAD_MIN = 4;
const WS_VELOCITY_SPREAD_MAX = 12;

export interface WsPremiumMelodyConformanceResult {
  pass: boolean;
  offbeatRatio: number;
  offbeatRatioPass: boolean;
  ioiEntropy: number;
  ioiEntropyPass: boolean;
  velocityMin: number;
  velocityMax: number;
  velocitySpread: number;
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
    details.push('offbeatRatio ' + offbeatRatio.toFixed(3) + ' outside [' + WS_OFFBEAT_RATIO_MIN + ', ' + WS_OFFBEAT_RATIO_MAX + ']');
  }
  if (!ioiEntropyPass) {
    details.push('ioiEntropy ' + ioiEntropy.toFixed(3) + ' < ' + WS_IOI_ENTROPY_MIN);
  }
  if (!velocitySpreadPass) {
    details.push('velocitySpread ' + velocitySpread + ' outside [' + WS_VELOCITY_SPREAD_MIN + ', ' + WS_VELOCITY_SPREAD_MAX + ']');
  }

  const pass = offbeatRatioPass && ioiEntropyPass && velocitySpreadPass;
  return {
    pass,
    offbeatRatio,
    offbeatRatioPass,
    ioiEntropy,
    ioiEntropyPass,
    velocityMin,
    velocityMax,
    velocitySpread,
    velocitySpreadPass,
    details,
  };
}
