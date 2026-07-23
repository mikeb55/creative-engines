/**
 * Phase 2 — phrase category → CoreMotif seed for paired VRBs.
 *
 * Pairings (each env flag default OFF; request `phraseMotifSeed` also opts in per call):
 * - COMPOSER_OS_RIFF_SAX_MOTIF_SEED → weather_report ← sax_inspired
 * - COMPOSER_OS_RIFF_JAZZROCK_MOTIF_SEED → mahavishnu ← jazz_rock
 * - COMPOSER_OS_RIFF_DIM_MOTIF_SEED → fripp ← diminished_lines
 * - COMPOSER_OS_RIFF_WHITEROCK_MOTIF_SEED → iommi ← white_rock_funk
 * - COMPOSER_OS_RIFF_BLACKSOUL_MOTIF_SEED → nile_rodgers ← black_soul_funk
 * - COMPOSER_OS_RIFF_BEBOP_MOTIF_SEED → bill_evans_sax ← bebop_jazz_blues
 * - COMPOSER_OS_RIFF_BLUESROCK_MOTIF_SEED → hendrix ← blues_rock
 * - COMPOSER_OS_RIFF_SOUTHERNROCK_MOTIF_SEED → led_zeppelin ← southern_rock
 *
 * Motif seed only — no hook / loop / intervalWeights merge.
 */

import type { CoreMotif } from '../motif/motifEngineTypes';
import { generateRiffCoreMotif } from '../motif/songModeMotifEngine';
import { phraseEntryToCoreMotif } from './riffPhraseLibraryAdapters';
import { loadRiffPhraseCorpus } from './riffPhraseCorpusLoad';
import {
  RIFF_PHRASE_CATEGORY_LABELS,
  type RiffPhraseCategory,
  type RiffPhraseEntry,
} from './riffPhraseLibraryTypes';

export type RiffPhraseMotifSeedPairingId =
  | 'sax'
  | 'jazz_rock'
  | 'diminished'
  | 'white_rock_funk'
  | 'black_soul_funk'
  | 'bebop_jazz_blues'
  | 'blues_rock'
  | 'southern_rock';

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
  {
    id: 'white_rock_funk',
    env: 'COMPOSER_OS_RIFF_WHITEROCK_MOTIF_SEED',
    vrbId: 'iommi',
    category: 'white_rock_funk',
  },
  {
    id: 'black_soul_funk',
    env: 'COMPOSER_OS_RIFF_BLACKSOUL_MOTIF_SEED',
    vrbId: 'nile_rodgers',
    category: 'black_soul_funk',
  },
  {
    id: 'bebop_jazz_blues',
    env: 'COMPOSER_OS_RIFF_BEBOP_MOTIF_SEED',
    vrbId: 'bill_evans_sax',
    category: 'bebop_jazz_blues',
  },
  {
    id: 'blues_rock',
    env: 'COMPOSER_OS_RIFF_BLUESROCK_MOTIF_SEED',
    vrbId: 'hendrix',
    category: 'blues_rock',
  },
  {
    id: 'southern_rock',
    env: 'COMPOSER_OS_RIFF_SOUTHERNROCK_MOTIF_SEED',
    vrbId: 'led_zeppelin',
    category: 'southern_rock',
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

export const RIFF_WHITEROCK_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_WHITEROCK_MOTIF_SEED';
export const RIFF_WHITEROCK_MOTIF_SEED_VRB = 'iommi' as const;
export const RIFF_WHITEROCK_MOTIF_SEED_CATEGORY = 'white_rock_funk' as const;

export const RIFF_BLACKSOUL_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_BLACKSOUL_MOTIF_SEED';
export const RIFF_BLACKSOUL_MOTIF_SEED_VRB = 'nile_rodgers' as const;
export const RIFF_BLACKSOUL_MOTIF_SEED_CATEGORY = 'black_soul_funk' as const;

export const RIFF_BEBOP_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_BEBOP_MOTIF_SEED';
export const RIFF_BEBOP_MOTIF_SEED_VRB = 'bill_evans_sax' as const;
export const RIFF_BEBOP_MOTIF_SEED_CATEGORY = 'bebop_jazz_blues' as const;

export const RIFF_BLUESROCK_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_BLUESROCK_MOTIF_SEED';
export const RIFF_BLUESROCK_MOTIF_SEED_VRB = 'hendrix' as const;
export const RIFF_BLUESROCK_MOTIF_SEED_CATEGORY = 'blues_rock' as const;

export const RIFF_SOUTHERNROCK_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_SOUTHERNROCK_MOTIF_SEED';
export const RIFF_SOUTHERNROCK_MOTIF_SEED_VRB = 'led_zeppelin' as const;
export const RIFF_SOUTHERNROCK_MOTIF_SEED_CATEGORY = 'southern_rock' as const;

/** Short UI labels for checkbox copy (avoid jargon). */
const CATEGORY_LICK_LABEL: Partial<Record<RiffPhraseCategory, string>> = {
  sax_inspired: 'sax',
  jazz_rock: 'jazz-rock',
  diminished_lines: 'diminished',
  white_rock_funk: 'white rock funk',
  black_soul_funk: 'black soul funk',
  bebop_jazz_blues: 'bebop jazz blues',
  blues_rock: 'blues-rock',
  southern_rock: 'southern rock',
};

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

export function isRiffBebopMotifSeedEnabled(): boolean {
  return envEnabled(RIFF_BEBOP_MOTIF_SEED_ENV);
}

export function isRiffBluesRockMotifSeedEnabled(): boolean {
  return envEnabled(RIFF_BLUESROCK_MOTIF_SEED_ENV);
}

export function isRiffSouthernRockMotifSeedEnabled(): boolean {
  return envEnabled(RIFF_SOUTHERNROCK_MOTIF_SEED_ENV);
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

export function pickBebopPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_BEBOP_MOTIF_SEED_CATEGORY, seed);
}

export function pickBluesRockPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_BLUESROCK_MOTIF_SEED_CATEGORY, seed);
}

export function pickSouthernRockPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_SOUTHERNROCK_MOTIF_SEED_CATEGORY, seed);
}

export function pairingForVrb(vrbId: string | undefined): RiffPhraseMotifSeedPairing | undefined {
  if (!vrbId) return undefined;
  return RIFF_PHRASE_MOTIF_SEED_PAIRINGS.find((p) => p.vrbId === vrbId);
}

/** True when VRB has a shipped phrase-seed pairing (UI shows toggle). */
export function vrbHasPhraseMotifSeedPairing(vrbId: string | undefined): boolean {
  return pairingForVrb(vrbId) != null;
}

/**
 * Musician-facing checkbox label for a paired VRB, or null when no pairing.
 * e.g. "Seed motif from real sax licks"
 */
export function phraseMotifSeedCheckboxLabel(vrbId: string | undefined): string | null {
  const pairing = pairingForVrb(vrbId);
  if (!pairing) return null;
  const short =
    CATEGORY_LICK_LABEL[pairing.category] ??
    RIFF_PHRASE_CATEGORY_LABELS[pairing.category]?.toLowerCase() ??
    pairing.category.replace(/_/g, ' ');
  return 'Seed motif from real ' + short + ' licks';
}

export type ResolveRiffCoreMotifOpts = {
  /**
   * Per-generate-call opt-in (API `riffPhraseMotifSeed`).
   * When true and VRB is paired, seeds from phrase corpus (env not required).
   */
  phraseMotifSeed?: boolean;
};

/**
 * Resolve CoreMotif for riff build.
 * OFF unless env flag for that pairing OR request `phraseMotifSeed` — then phraseEntryToCoreMotif.
 * Non-paired VRB / empty pool → generateRiffCoreMotif (byte-identical procedural path).
 */
export function resolveRiffCoreMotif(
  seed: number,
  vrbId?: string,
  opts?: ResolveRiffCoreMotifOpts
): CoreMotif {
  const pairing = pairingForVrb(vrbId);
  if (pairing) {
    const on = opts?.phraseMotifSeed === true || isRiffPhraseMotifSeedEnabled(pairing);
    if (on) {
      const phrase = pickPhraseForSeed(pairing.category, seed);
      if (phrase) return phraseEntryToCoreMotif(phrase);
    }
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