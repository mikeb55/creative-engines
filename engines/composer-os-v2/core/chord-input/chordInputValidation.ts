/**
 * Validate chord input before adapters run.
 */

import { isRecognizedChordToken, parseChordInputBlocks, parsePipeChordLine } from './chordInputParser';

export function validateChordInputText(text: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    errors.push('Chord input is empty.');
    return { ok: false, errors };
  }
  const plan = parseChordInputBlocks(trimmed);
  const bars = plan.allBars.length > 0 ? plan.allBars : parsePipeChordLine(trimmed);
  if (bars.length === 0) {
    errors.push('No chord symbols parsed from input.');
    return { ok: false, errors };
  }
  for (const b of bars) {
    if (!isRecognizedChordToken(b)) {
      errors.push(`Unrecognized chord symbol: "${b}"`);
      break;
    }
  }
  return { ok: errors.length === 0, errors };
}
