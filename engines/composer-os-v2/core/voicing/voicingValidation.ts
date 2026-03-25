/**
 * Validate ensemble voicing plans (impossible spreads / register ordering).
 */

import type { EnsembleVoicingPlan } from './voicingTypes';
import { BIG_BAND_MIDI_BOUNDS, QUARTET_MIDI_BOUNDS } from './voicingProfiles';

export function validateEnsembleVoicing(plan: EnsembleVoicingPlan): import('./voicingTypes').VoicingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bounds = plan.ensembleFamily === 'big_band' ? BIG_BAND_MIDI_BOUNDS : QUARTET_MIDI_BOUNDS;

  if (!plan.slices.length) errors.push('Voicing: no slices');

  for (const sl of plan.slices) {
    for (const row of sl.rows) {
      const [lo, hi] = bounds[row.partId] ?? [36, 96];
      if (row.registerCenterMidi < lo || row.registerCenterMidi > hi) {
        warnings.push(`Voicing: ${row.partId} center ${row.registerCenterMidi} outside typical [${lo},${hi}]`);
      }
    }
    const centers = sl.rows.map((r) => r.registerCenterMidi).sort((a, b) => a - b);
    if (plan.ensembleFamily === 'big_band' && centers.length >= 2) {
      const [lowest, highest] = [centers[0], centers[centers.length - 1]];
      if (highest - lowest > 40) {
        warnings.push('Voicing: very wide spread between outer parts');
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
