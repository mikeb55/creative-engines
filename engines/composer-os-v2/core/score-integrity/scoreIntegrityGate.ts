/**
 * Composer OS V2 — Score Integrity Gate
 * Release-blocking pre-export structural checks.
 */

import type { BarForValidation, ChordSymbolForValidation, RehearsalMarkForValidation } from './scoreIntegrityTypes';
import type { InstrumentProfile } from '../instrument-profiles/instrumentProfileTypes';
import { validateBarMath } from './barMathValidation';
import { validateRegister } from './registerValidation';
import { validateChordSymbols } from './chordSymbolValidation';
import { validateRehearsalMarks } from './rehearsalMarkValidation';

export interface ScoreIntegrityInput {
  bars: BarForValidation[];
  instruments: InstrumentProfile[];
  chordSymbols: ChordSymbolForValidation[];
  rehearsalMarks: RehearsalMarkForValidation[];
  chordSymbolsRequired?: boolean;
  rehearsalMarksRequired?: boolean;
  pitchByInstrument?: Array<{ instrument: string; pitches: number[] }>;
}

export interface ScoreIntegrityResult {
  passed: boolean;
  errors: string[];
}

/** Run score integrity gate. Release-blocking. */
export function runScoreIntegrityGate(input: ScoreIntegrityInput): ScoreIntegrityResult {
  const errors: string[] = [];

  const barResult = validateBarMath(input.bars);
  errors.push(...barResult.errors);

  if (input.pitchByInstrument && input.instruments.length > 0) {
    const regResult = validateRegister({
      instrumentProfiles: input.instruments,
      pitchByInstrument: input.pitchByInstrument,
    });
    errors.push(...regResult.errors);
  }

  const totalBars = input.bars.reduce((sum, b) => sum + b.duration, 0);
  const chordResult = validateChordSymbols(
    input.chordSymbols,
    input.bars.length
  );
  if (input.chordSymbolsRequired) {
    errors.push(...chordResult.errors);
  }

  const rehearsalResult = validateRehearsalMarks(
    input.rehearsalMarks,
    input.rehearsalMarksRequired ?? false
  );
  if (input.rehearsalMarksRequired) {
    errors.push(...rehearsalResult.errors);
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
