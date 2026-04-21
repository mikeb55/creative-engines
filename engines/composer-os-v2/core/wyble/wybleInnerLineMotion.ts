/**
 * Shared Wyble inner-line motion utility.
 * Keeps the same pitch class but chooses the nearest octave to prior inner voice,
 * reducing block-static jumps while preserving harmonic intent.
 */

export function nearestOctaveToPrevious(
  targetMidi: number,
  previousMidi: number | null | undefined,
  minMidi?: number,
  maxMidi?: number
): number {
  if (previousMidi == null || Number.isNaN(previousMidi)) return targetMidi;
  const candidates = [targetMidi - 24, targetMidi - 12, targetMidi, targetMidi + 12, targetMidi + 24];
  const bounded = candidates.filter((m) => {
    if (typeof minMidi === 'number' && m < minMidi) return false;
    if (typeof maxMidi === 'number' && m > maxMidi) return false;
    return true;
  });
  const pool = bounded.length > 0 ? bounded : candidates;
  return pool.reduce((best, m) =>
    Math.abs(m - previousMidi) < Math.abs(best - previousMidi) ? m : best
  );
}
