/**
 * Composer OS V2 — Chord symbol validation
 * Chord symbol completeness.
 */

import type { ChordSymbolForValidation } from './scoreIntegrityTypes';

export interface ChordSymbolValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate chord symbols cover the score. */
export function validateChordSymbols(
  chords: ChordSymbolForValidation[],
  totalBars: number
): ChordSymbolValidationResult {
  const errors: string[] = [];

  if (totalBars > 0 && chords.length === 0) {
    errors.push('Chord symbols required but none provided');
  }

  for (const c of chords) {
    if (!c.chord || c.chord.trim() === '') {
      errors.push(`Empty chord symbol at bar ${c.bar}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
