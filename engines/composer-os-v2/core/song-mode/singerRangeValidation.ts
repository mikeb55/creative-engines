/**
 * Ensure planned melody sits in plausible singer range.
 */

import type { LeadMelodyPlan } from './leadMelodyTypes';
import type { SingerRangeProfile, SingerRangeValidationResult } from './singerRangeTypes';

export function validateMelodyAgainstSingerRange(
  plan: LeadMelodyPlan,
  profile: SingerRangeProfile
): SingerRangeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (plan.notes.length === 0) {
    return { ok: false, errors: ['Singer range: no melody notes'], warnings: [], peakMidi: 60, lowMidi: 60 };
  }
  const midis = plan.notes.map((n) => n.midi);
  const peakMidi = Math.max(...midis);
  const lowMidi = Math.min(...midis);
  const [absLo, absHi] = profile.absoluteRangeMidi;
  const [coLo, coHi] = profile.comfortRangeMidi;

  for (const n of plan.notes) {
    if (n.midi < absLo || n.midi > absHi) {
      errors.push(`Singer range: pitch ${n.midi} outside absolute range [${absLo},${absHi}]`);
    }
  }

  if (peakMidi > coHi + 2) {
    warnings.push('Phrase peak above comfort zone — consider register adjustment');
  }
  if (lowMidi < coLo - 2) {
    warnings.push('Low phrase below comfort zone — consider register adjustment');
  }

  return { ok: errors.length === 0, errors, warnings, peakMidi, lowMidi };
}
