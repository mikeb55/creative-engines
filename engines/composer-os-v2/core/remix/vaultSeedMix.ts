/** FNV-1a–style mixing for deterministic 32-bit seeds (vault / remix). */

/** Deterministic PRNG in [0, 1); same algorithm as {@link generationModeProfile}. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mixUint32(seed: number, parts: readonly string[]): number {
  let h = seed >>> 0 || 1;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i)!;
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h >>> 0 || 1;
}

/** Builds one RNG root from the user-visible base seed + generation knobs (drift, duo intent, …). */
export function deriveVaultRngRoot(
  baseSeed: number,
  options: {
    mode?: string;
    drift?: string;
    duoIntent?: string;
    riffStyle?: string;
    tuningId?: string;
    chorusCount?: number;
    songwriterStyleId?: string;
  }
): number {
  let h = baseSeed >>> 0 || 1;
  h = mixUint32(h, ['mode', options.mode ?? 'solo']);
  h = mixUint32(h, ['drift', options.drift ?? 'neutral']);
  if (options.duoIntent) h = mixUint32(h, ['duoIntent', options.duoIntent]);
  h = mixUint32(h, ['riff', options.riffStyle ?? '']);
  h = mixUint32(h, ['tuning', options.tuningId ?? 'standard']);
  h = mixUint32(h, ['chorus', String(options.chorusCount ?? 1)]);
  h = mixUint32(h, ['sy', options.songwriterStyleId ?? '']);
  return h >>> 0 || 1;
}

export type RemixVaultPatch = {
  drift?: string;
  duoIntent?: 'conversational' | 'supportive';
};

/** Optional entropy step when you want an explicit new base seed (variant ladder). */
export function remixVaultSeed(previousSeed: number, patch: RemixVaultPatch): number {
  let h = previousSeed >>> 0 || 1;
  if (patch.drift !== undefined) h = mixUint32(h, ['remix', 'drift', patch.drift]);
  if (patch.duoIntent !== undefined) h = mixUint32(h, ['remix', 'duoIntent', patch.duoIntent]);
  return h >>> 0 || 1;
}

/** Stable default base seed from chart identity when the caller wants determinism without an arbitrary pick. */
export function suggestVaultSeedFromChart(params: {
  title?: string | null;
  key?: string | null;
  measureCount: number;
}): number {
  const title = params.title?.trim() ?? '';
  const key = params.key?.trim() ?? '';
  let h = mixUint32(2166136261, ['vault-id', title, key, String(params.measureCount)]);
  return h >>> 0 || 1;
}
