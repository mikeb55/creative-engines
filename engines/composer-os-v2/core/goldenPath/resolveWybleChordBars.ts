/**
 * Wyble etude — chord input resolution uses the same parsing layer as `runGoldenPath` for custom harmony:
 * `normalizeChordProgressionSeparators` + flexible bar tokenisation (`parseChordProgressionInputFlexible`).
 * Wyble does not call `buildGoldenPathContext` (different score model than duo Song Mode); harmony list length
 * still equals generated bars and drives `harmonicContext.chords` + MusicXML `<harmony>` only.
 */

import { parseChordProgressionInputFlexible } from '../harmony/chordProgressionParser';

export type WybleChordSource = 'parsedChordBars' | 'chordProgressionText';

export type ResolveWybleChordBarsResult =
  | { ok: true; bars: string[]; source: WybleChordSource }
  | { ok: false; error: string };

/**
 * Prefer `parsedChordBars` when non-empty (re-validated via the same flexible parse as text).
 * Otherwise require non-empty `chordProgressionText`. No built-in or fallback progression.
 */
export function resolveWybleChordBarsFromRequest(
  parsedChordBars: unknown,
  chordProgressionText: unknown
): ResolveWybleChordBarsResult {
  const hasBars = Array.isArray(parsedChordBars) && parsedChordBars.length > 0;
  const text = typeof chordProgressionText === 'string' ? chordProgressionText.trim() : '';

  if (hasBars) {
    const arr = (parsedChordBars as string[]).map((s) => String(s).trim()).filter(Boolean);
    if (arr.length === 0) {
      return { ok: false, error: 'Wyble: parsedChordBars was empty after trimming.' };
    }
    const joined = arr.join(' | ');
    const p = parseChordProgressionInputFlexible(joined);
    if (!p.ok) {
      return { ok: false, error: `Wyble: invalid parsedChordBars — ${p.error}` };
    }
    if (p.bars.length !== arr.length) {
      return {
        ok: false,
        error: `Wyble: parsedChordBars count (${arr.length}) does not match parse result (${p.bars.length}).`,
      };
    }
    return { ok: true, bars: p.bars, source: 'parsedChordBars' };
  }

  if (text) {
    const p = parseChordProgressionInputFlexible(text);
    if (!p.ok) {
      return { ok: false, error: p.error };
    }
    return { ok: true, bars: p.bars, source: 'chordProgressionText' };
  }

  return {
    ok: false,
    error:
      'Wyble requires a chord progression. Enter chordProgressionText (bar-separated chords) or parsedChordBars.',
  };
}
