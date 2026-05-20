/**
 * Parse chord loop for riff — full progression length (no 4-chord cap). Falls back to Am7 vamp when empty.
 */

import {
  parseChordsFromPipeDelimited,
  type ParsedChordProgressionEntry,
} from '../harmony/chordProgressionParser';

const DEFAULT_VAMP = ['Am7'];

export function normalizeChordLoop(input: string | undefined, barCount: number): string[] {
  const trimmed = (input ?? '').trim();
  if (!trimmed) {
    return Array(barCount).fill(DEFAULT_VAMP[0]);
  }

  const parsed = parseChordsFromPipeDelimited(trimmed);
  if (parsed.length === 0) {
    return Array(barCount).fill(DEFAULT_VAMP[0]);
  }

  const loop = parsed.map((entry, i) => {
    if (entry != null) return entry.symbol;
    console.warn(
      `[riff-chord] bar slot ${i + 1}: parse returned null — using default ${DEFAULT_VAMP[0]} for pitch field`
    );
    return DEFAULT_VAMP[0]!;
  });

  const out: string[] = [];
  for (let i = 0; i < barCount; i++) {
    out.push(loop[i % loop.length]!);
  }
  return out;
}

/** Expose parsed progression entries for tests / diagnostics. */
export function parseRiffChordProgression(input: string): (ParsedChordProgressionEntry | null)[] {
  return parseChordsFromPipeDelimited(input);
}
