/**
 * Unified chord semantics: user tokens → {@link CanonicalChord} per bar (no dedupe, no skip).
 * Single path for Wyble + any mode that needs bar-for-bar harmony truth.
 */

import { parseChordProgressionInputFlexible } from './chordProgressionParser';
import {
  parseLeadSheetChordToCanonical,
  validateWybleCanonicalChordList,
  type CanonicalChord,
} from '../../../core/canonicalChord';

export type { CanonicalChord };

/**
 * Strict: one non-empty token per bar; parses each with {@link parseLeadSheetChordToCanonical} (no join/split round-trip).
 */
export function parseBarStringsToCanonicalChords(rawBars: string[]): CanonicalChord[] {
  if (rawBars.length === 0) {
    throw new Error('parseBarStringsToCanonicalChords: expected at least one bar.');
  }
  const canonicalChords: CanonicalChord[] = [];
  for (let i = 0; i < rawBars.length; i++) {
    const t = String(rawBars[i] ?? '').trim();
    if (!t) {
      throw new Error(`parseBarStringsToCanonicalChords: empty chord at bar ${i + 1}.`);
    }
    canonicalChords.push(parseLeadSheetChordToCanonical(t));
  }
  validateWybleCanonicalChordList(canonicalChords, rawBars.length);
  return canonicalChords;
}

export function parseChordProgressionTextToCanonicalChords(
  input: string
): { ok: true; bars: string[]; canonicalChords: CanonicalChord[] } | { ok: false; error: string } {
  const p = parseChordProgressionInputFlexible(input);
  if (!p.ok) return p;
  try {
    const canonicalChords = parseBarStringsToCanonicalChords(p.bars);
    return { ok: true, bars: p.bars, canonicalChords };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
