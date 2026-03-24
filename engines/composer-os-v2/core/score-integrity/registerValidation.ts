/**
 * Composer OS V2 — Register validation
 * Pitch range correctness per instrument.
 */

import type { InstrumentProfile } from '../instrument-profiles/instrumentProfileTypes';

export interface RegisterValidationInput {
  instrumentProfiles: InstrumentProfile[];
  pitchByInstrument: Array<{ instrument: string; pitches: number[] }>;
}

export interface RegisterValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate pitches stay within instrument hard ranges. */
export function validateRegister(input: RegisterValidationInput): RegisterValidationResult {
  const errors: string[] = [];
  const profileMap = new Map<string, InstrumentProfile>(
    input.instrumentProfiles.map((p) => [p.instrumentIdentity, p])
  );

  for (const { instrument, pitches } of input.pitchByInstrument) {
    const profile = profileMap.get(instrument);
    if (!profile) continue;

    const [low, high] = profile.hardRange;
    for (const p of pitches) {
      if (p < low || p > high) {
        errors.push(`${instrument}: pitch ${p} outside hard range [${low}, ${high}]`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
