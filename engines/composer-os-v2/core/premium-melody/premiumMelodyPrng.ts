/** mulberry32 seeded PRNG - returns 0..1 floats. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic per-note seed derived from generation seed and note index. */
export function deriveMelodyRhythmSeed(
  baseSeed: number,
  noteIndex: number,
  rhythmSeedSalt = 0
): number {
  return ((baseSeed ^ (noteIndex * 2654435761) ^ rhythmSeedSalt) >>> 0);
}
