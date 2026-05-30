/**
 * SY tuning MusicContext realisation (V106p3).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { generateSYShapeHarmony } from './syTuningShapeHarmony';
import {
  resolveSYTuningLowerGuitarRoles,
  syLowerGuitarRoleDistribution,
} from './syTuningLowerGuitar';
import { computeSYVoiceLeadingMetrics } from './syTuningVoiceLeading';
import type { SYTuningPreset, SYTuningRealisationResult } from './syTuningTypes';

export function realiseSYTuningMusicContext(preset: SYTuningPreset): SYTuningRealisationResult {
  const seed = preset.seed ?? 0;
  const { plans, harmonyBars, guitar1, guitar2 } = generateSYShapeHarmony({
    tuningId: preset.tuningId,
    archetype: preset.archetype,
    seed,
    totalBars: preset.totalBars,
    wybleAnchorBars: preset.wybleAnchorBars,
  });

  const normalised = harmonyBars.map(normalizeChordSymbol);
  const harmonyChecksum = computeMusicContextChecksum(normalised);

  const lowerGuitarBars = resolveSYTuningLowerGuitarRoles({
    shapePlans: plans,
    tuningId: preset.tuningId,
    guitar1,
    seed,
  });

  const metrics = computeSYVoiceLeadingMetrics(plans, guitar1, guitar2);

  return {
    harmonyBars: normalised,
    shapePlans: plans,
    lowerGuitarBars,
    guitar1Tuning: guitar1,
    guitar2Tuning: guitar2,
    receipt: {
      ...metrics,
      tuningId: preset.tuningId,
      archetype: preset.archetype,
      guitar1TuningId: guitar1.id,
      guitar2TuningId: guitar2.id,
      barCount: normalised.length,
      harmonyChecksum,
      lowerGuitarRoleDistribution: syLowerGuitarRoleDistribution(lowerGuitarBars),
    },
  };
}
