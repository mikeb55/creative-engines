/**
 * Wyble etude — chord input resolution: {@link parseBarStringsToCanonicalChords} / {@link parseChordProgressionTextToCanonicalChords}
 * (`engines/composer-os-v2/core/harmony/chordPipeline.ts`). No lossy join/split for `parsedChordBars`.
 */

import {
  parseBarStringsToCanonicalChords,
  parseChordProgressionTextToCanonicalChords,
} from '../harmony/chordPipeline';
import type { CanonicalChord } from '../../../core/canonicalChord';

export type WybleChordSource = 'parsedChordBars' | 'chordProgressionText';

export type ResolveWybleChordBarsResult =
  | { ok: true; bars: string[]; canonicalChords: CanonicalChord[]; source: WybleChordSource }
  | { ok: false; error: string };

/**
 * Prefer `parsedChordBars` when non-empty (direct per-bar parse — same canonical mapping as text).
 * Otherwise require non-empty `chordProgressionText`. No built-in or fallback progression.
 */
export function resolveWybleChordBarsFromRequest(
  parsedChordBars: unknown,
  chordProgressionText: unknown
): ResolveWybleChordBarsResult {
  const hasBars = Array.isArray(parsedChordBars) && parsedChordBars.length > 0;
  const text = typeof chordProgressionText === 'string' ? chordProgressionText.trim() : '';

  if (hasBars) {
    const arr = (parsedChordBars as unknown[]).map((s) => String(s).trim());
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i]) {
        return {
          ok: false,
          error: `Wyble: empty chord at bar ${i + 1} in parsedChordBars (use a chord symbol in every bar).`,
        };
      }
    }
    try {
      const canonicalChords = parseBarStringsToCanonicalChords(arr);
      return { ok: true, bars: arr, canonicalChords, source: 'parsedChordBars' };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (text) {
    const p = parseChordProgressionTextToCanonicalChords(text);
    if (!p.ok) {
      return { ok: false, error: p.error };
    }
    return { ok: true, bars: p.bars, canonicalChords: p.canonicalChords, source: 'chordProgressionText' };
  }

  return {
    ok: false,
    error:
      'Wyble requires a chord progression. Enter chordProgressionText (bar-separated chords) or parsedChordBars.',
  };
}
