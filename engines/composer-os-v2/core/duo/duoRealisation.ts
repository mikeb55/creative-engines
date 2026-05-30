/**
 * Duo MusicContext realisation — lower guitar role plan + diagnostics (V105p4).
 */

import type { DuoExportTruth, DuoPreset, DuoRealisationDiagnostics } from './duoTypes';
import {
  countParallelMotionWithBass,
  countRegistralCollisions,
  lowerGuitarRoleDistribution,
  resolveLowerGuitarRoles,
} from './duoLowerGuitarRoleResolver';

export function realiseDuoLowerGuitar(
  truth: DuoExportTruth,
  preset: DuoPreset,
): { bars: ReturnType<typeof resolveLowerGuitarRoles>; diagnostics: DuoRealisationDiagnostics } {
  const lowerGuitarEnabled = preset.instrumentTopology !== 'guitar_bass';
  const bars = lowerGuitarEnabled
    ? resolveLowerGuitarRoles({
        upperBars: truth.upperBars,
        bassBars: truth.lowerBars,
        topology: preset.instrumentTopology,
        intent: preset.duoIntent,
        seed: preset.seed,
      })
    : [];

  const diagnostics: DuoRealisationDiagnostics = {
    instrumentTopology: preset.instrumentTopology,
    duoIntent: preset.duoIntent,
    lowerGuitarRoleDistribution: lowerGuitarEnabled
      ? lowerGuitarRoleDistribution(bars)
      : {
          guide_tone_lane: 0,
          counterline: 0,
          pedal: 0,
          sparse_comp_answer: 0,
          rest: truth.upperBars.length,
        },
    registralCollisionCount: lowerGuitarEnabled ? countRegistralCollisions(bars) : 0,
    parallelMotionCount: lowerGuitarEnabled ? countParallelMotionWithBass(bars) : 0,
    barCount: truth.upperBars.length,
    lowerGuitarEnabled,
  };

  return { bars, diagnostics };
}
