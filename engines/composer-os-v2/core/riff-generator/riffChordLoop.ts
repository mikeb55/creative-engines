/**
 * Parse chord loop for riff (1–4 symbols). Falls back to Am7 vamp.
 */

import { normalizeChordProgressionSeparators } from '../harmony/chordProgressionParser';

const DEFAULT_VAMP = ['Am7'];

export function normalizeChordLoop(input: string | undefined, barCount: number): string[] {
  const raw = normalizeChordProgressionSeparators((input ?? '').trim());
  if (!raw) {
    return Array(barCount).fill(DEFAULT_VAMP[0]);
  }
  const parts = raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return Array(barCount).fill(DEFAULT_VAMP[0]);
  }
  const loop = parts.slice(0, 4);
  const out: string[] = [];
  for (let i = 0; i < barCount; i++) {
    out.push(loop[i % loop.length]!);
  }
  return out;
}
