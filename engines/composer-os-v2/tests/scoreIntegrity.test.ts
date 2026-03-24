/**
 * Composer OS V2 — Score integrity tests
 */

import { runScoreIntegrityGate } from '../core/score-integrity/scoreIntegrityGate';
import { validateBarMath } from '../core/score-integrity/barMathValidation';
import { validateChordSymbols } from '../core/score-integrity/chordSymbolValidation';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';

function testBarMathValidPasses(): boolean {
  const r = validateBarMath([
    { index: 0, duration: 4 },
    { index: 1, duration: 4 },
  ]);
  return r.valid;
}

function testBarMathInvalidFails(): boolean {
  const r = validateBarMath([
    { index: 0, duration: 3 },
    { index: 1, duration: 4 },
  ]);
  return !r.valid;
}

function testScoreIntegrityGateEmptyBars(): boolean {
  const r = runScoreIntegrityGate({
    bars: [],
    instruments: [],
    chordSymbols: [],
    rehearsalMarks: [],
  });
  return r.passed;
}

function testScoreIntegrityGateValidBars(): boolean {
  const r = runScoreIntegrityGate({
    bars: [{ index: 0, duration: 4 }],
    instruments: [CLEAN_ELECTRIC_GUITAR],
    chordSymbols: [{ bar: 1, chord: 'Cmaj7' }],
    rehearsalMarks: [],
  });
  return r.passed;
}

function testChordSymbolValidationEmptyFailsWhenRequired(): boolean {
  const r = validateChordSymbols([], 4);
  return !r.valid;
}

function testChordSymbolValidationValidPasses(): boolean {
  const r = validateChordSymbols([{ bar: 1, chord: 'Cm7' }], 4);
  return r.valid;
}

export function runScoreIntegrityTests(): { name: string; ok: boolean }[] {
  return [
    ['Bar math valid passes', testBarMathValidPasses],
    ['Bar math invalid fails', testBarMathInvalidFails],
    ['Integrity gate empty bars passes', testScoreIntegrityGateEmptyBars],
    ['Integrity gate valid bars passes', testScoreIntegrityGateValidBars],
    ['Chord symbols empty fails when required', testChordSymbolValidationEmptyFailsWhenRequired],
    ['Chord symbols valid passes', testChordSymbolValidationValidPasses],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
