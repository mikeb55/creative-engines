/**
 * Phase 2 PoC — phrase category → CoreMotif seed for paired VRBs.
 *
 * Pairings (each flag default OFF):
 * - COMPOSER_OS_RIFF_SAX_MOTIF_SEED → weather_report ← sax_inspired
 * - COMPOSER_OS_RIFF_JAZZROCK_MOTIF_SEED → mahavishnu ← jazz_rock
 * - COMPOSER_OS_RIFF_DIM_MOTIF_SEED → fripp ← diminished_lines
 *
 * Motif seed only — no hook / loop / intervalWeights merge.
 */

import type { CoreMotif } from '../motif/motifEngineTypes';
import { generateRiffCoreMotif } from '../motif/songModeMotifEngine';
import { phraseEntryToCoreMotif } from './riffPhraseLibraryAdapters';
import { loadRiffPhraseCorpus } from './riffPhraseCorpusLoad';
import type { RiffPhraseCategory, RiffPhraseEntry } from './riffPhraseLibraryTypes';

export type RiffPhraseMotifSeedPairingId = 'sax' | 'jazz_rock' | 'diminished';

export type RiffPhraseMotifSeedPairing = {
  id: RiffPhraseMotifSeedPairingId;
  env: string;
  vrbId: string;
  category: RiffPhraseCategory;
};

export const RIFF_PHRASE_MOTIF_SEED_PAIRINGS: readonly RiffPhraseMotifSeedPairing[] = [
  {
    id: 'sax',
    env: 'COMPOSER_OS_RIFF_SAX_MOTIF_SEED',
    vrbId: 'weather_report',
    category: 'sax_inspired',
  },
  {
    id: 'jazz_rock',
    env: 'COMPOSER_OS_RIFF_JAZZROCK_MOTIF_SEED',
    vrbId: 'mahavishnu',
    category: 'jazz_rock',
  },
  {
    id: 'diminished',
    env: 'COMPOSER_OS_RIFF_DIM_MOTIF_SEED',
    vrbId: 'fripp',
    category: 'diminished_lines',
  },
] as const;

/** @deprecated use pairing env; kept for existing sax PoC imports */
export const RIFF_SAX_MOTIF_SEED_POC_ENV = 'COMPOSER_OS_RIFF_SAX_MOTIF_SEED';
export const RIFF_SAX_MOTIF_SEED_POC_VRB = 'weather_report' as const;
export const RIFF_SAX_MOTIF_SEED_POC_CATEGORY = 'sax_inspired' as const;

export const RIFF_JAZZROCK_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_JAZZROCK_MOTIF_SEED';
export const RIFF_JAZZROCK_MOTIF_SEED_VRB = 'mahavishnu' as const;
export const RIFF_JAZZROCK_MOTIF_SEED_CATEGORY = 'jazz_rock' as const;

export const RIFF_DIM_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_DIM_MOTIF_SEED';
export const RIFF_DIM_MOTIF_SEED_VRB = 'fripp' as const;
export const RIFF_DIM_MOTIF_SEED_CATEGORY = 'diminished_lines' as const;

/** undefined = not loaded; null = force empty (tests). Per category. */
const poolCache = new Map<RiffPhraseCategory, RiffPhraseEntry[] | null | undefined>();

function envEnabled(env: string): boolean {
  const v = process.env[env]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}

export function isRiffPhraseMotifSeedEnabled(pairing: RiffPhraseMotifSeedPairing): boolean {
  return envEnabled(pairing.env);
}

export function isRiffSaxMotifSeedPocEnabled(): boolean {
  return envEnabled(RIFF_SAX_MOTIF_SEED_POC_ENV);
}

export function isRiffJazzRockMotifSeedEnabled(): boolean {
  return envEnabled(RIFF_JAZZROCK_MOTIF_SEED_ENV);
}

export function isRiffDimMotifSeedEnabled(): boolean {
  return envEnabled(RIFF_DIM_MOTIF_SEED_ENV);
}

export function resetRiffPhraseMotifSeedCacheForTests(): void {
  poolCache.clear();
}

/** Alias for sax PoC tests. */
export function resetRiffSaxMotifSeedPocCacheForTests(): void {
  resetRiffPhraseMotifSeedCacheForTests();
}

/** Inject pool for unit tests (null = empty; skips disk). Category-scoped. */
export function setRiffPhraseMotifSeedPoolForTests(
  category: RiffPhraseCategory,
  pool: RiffPhraseEntry[] | null
): void {
  poolCache.set(category, pool);
}

/** Sax PoC test helper — injects into sax_inspired pool. */
export function setRiffSaxMotifSeedPocPoolForTests(pool: RiffPhraseEntry[] | null): void {
  setRiffPhraseMotifSeedPoolForTests(RIFF_SAX_MOTIF_SEED_POC_CATEGORY, pool);
}

function loadCategoryPool(category: RiffPhraseCategory): RiffPhraseEntry[] {
  if (poolCache.has(category)) {
    const cached = poolCache.get(category);
    return cached ?? [];
  }
  const corpus = loadRiffPhraseCorpus();
  if (!corpus.ok) {
    poolCache.set(category, []);
    return [];
  }
  const pool = corpus.phrases.filter((p) => p.category === category);
  poolCache.set(category, pool);
  return pool;
}

/**
 * Deterministic pick from category pool (seed -> index).
 * Returns undefined when pool empty.
 */
export function pickPhraseForSeed(
  category: RiffPhraseCategory,
  seed: number
): RiffPhraseEntry | undefined {
  const pool = loadCategoryPool(category);
  if (pool.length === 0) return undefined;
  const idx = (seed >>> 0) % pool.length;
  return pool[idx];
}

export function pickSaxInspiredPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_SAX_MOTIF_SEED_POC_CATEGORY, seed);
}

export function pickJazzRockPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_JAZZROCK_MOTIF_SEED_CATEGORY, seed);
}

export function pickDiminishedPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_DIM_MOTIF_SEED_CATEGORY, seed);
}

export function pairingForVrb(vrbId: string | undefined): RiffPhraseMotifSeedPairing | undefined {
  if (!vrbId) return undefined;
  return RIFF_PHRASE_MOTIF_SEED_PAIRINGS.find((p) => p.vrbId === vrbId);
}

/**
 * Resolve CoreMotif for riff build.
 * Flag OFF or non-paired VRB -> generateRiffCoreMotif (byte-identical path).
 * Flag ON + paired VRB -> phraseEntryToCoreMotif from category (fallback procedural if empty).
 */
export function resolveRiffCoreMotif(seed: number, vrbId?: string): CoreMotif {
  const pairing = pairingForVrb(vrbId);
  if (pairing && isRiffPhraseMotifSeedEnabled(pairing)) {
    const phrase = pickPhraseForSeed(pairing.category, seed);
    if (phrase) return phraseEntryToCoreMotif(phrase);
  }
  return generateRiffCoreMotif(seed);
}

/**
 * Find seeds whose category pick has intervalSequence.length >= minIntervals.
 * Prefers distinct phrases. Used by export/compare (avoid 1–2 iv degenerate phrases).
 */
export function findSeedsWithMinPhraseIntervals(
  category: RiffPhraseCategory,
  count: number,
  minIntervals = 10,
  startSeed = 1
): number[] {
  const pool = loadCategoryPool(category);
  if (pool.length === 0) return [];
  const out: number[] = [];
  const usedPhrase = new Set<string>();
  for (let s = startSeed; s < startSeed + 200000 && out.length < count; s++) {
    const phrase = pool[(s >>> 0) % pool.length]!;
    if (phrase.intervalSequence.length < minIntervals) continue;
    if (usedPhrase.has(phrase.id)) continue;
    usedPhrase.add(phrase.id);
    out.push(s);
  }
  // If distinct phrases exhausted, allow repeats to fill count
  if (out.length < count) {
    for (let s = startSeed; s < startSeed + 200000 && out.length < count; s++) {
      const phrase = pool[(s >>> 0) % pool.length]!;
      if (phrase.intervalSequence.length < minIntervals) continue;
      if (out.includes(s)) continue;
      out.push(s);
    }
  }
  return out;
}