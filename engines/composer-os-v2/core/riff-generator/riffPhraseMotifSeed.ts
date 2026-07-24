/**
 * Phrase category → CoreMotif seed via many-to-many STYLE_PAIRINGS registry.
 *
 * Resolution: selected profile → exactly one enabled StylePairing edge → phrase pool.
 * No multi-VRB blend. Flags default OFF (env + PairingFlags + request phraseMotifSeed).
 *
 * @see riffStylePairings.ts
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
import {
  STYLE_PAIRINGS,
  getPairing,
  getPairingsForProfile,
  isPairingEnabled,
  pairingEnvKey,
  resolvePairingForProfile,
  type PairingFlags,
  type StylePairing,
} from './riffStylePairings';

export {
  STYLE_PAIRINGS,
  LEGACY_PAIRING_ENV_ALIASES,
  makePairingId,
  pairingFlagKey,
  pairingEnvKey,
  pairingById,
  pairingsByCategory,
  pairingsByProfile,
  getPairingsForProfile,
  getPairingsForCategory,
  getPairing,
  getEnabledPairings,
  isPairingEnabled,
  isPairingEnvEnabled,
  resolvePairingForProfile,
  type PairingId,
  type PairingFlags,
  type StylePairing,
  type StyleProfileId,
} from './riffStylePairings';

/** @deprecated use StylePairing — kept for gradual migration of external scripts */
export type RiffPhraseMotifSeedPairing = StylePairing & {
  /** @deprecated use categoryId */
  category: RiffPhraseCategory;
  /** @deprecated use profileId */
  vrbId: string;
  /** @deprecated use pairingEnvKey(pairing) */
  env: string;
};

function asLegacy(p: StylePairing): RiffPhraseMotifSeedPairing {
  return { ...p, category: p.categoryId, vrbId: p.profileId, env: pairingEnvKey(p) };
}

/** @deprecated use STYLE_PAIRINGS — shim with legacy field aliases */
export const RIFF_PHRASE_MOTIF_SEED_PAIRINGS: readonly RiffPhraseMotifSeedPairing[] =
  STYLE_PAIRINGS.map(asLegacy);

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

/** Derived env for blues_rock::led_zeppelin (no legacy alias). */
export const RIFF_BLUESROCK_ZEP_MOTIF_SEED_ENV = pairingEnvKey(
  getPairing('blues_rock', 'led_zeppelin')!
);
export const RIFF_BLUESROCK_ZEP_MOTIF_SEED_VRB = 'led_zeppelin' as const;

export const RIFF_PROGBLUES_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_PROGBLUES_MOTIF_SEED';
export const RIFF_PROGBLUES_MOTIF_SEED_VRB = 'david_gilmour' as const;
export const RIFF_PROGBLUES_MOTIF_SEED_CATEGORY = 'progressive_blues' as const;

export const RIFF_MODERNROCK_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_MODERNROCK_MOTIF_SEED';
export const RIFF_MODERNROCK_MOTIF_SEED_VRB = 'morello' as const;
export const RIFF_MODERNROCK_MOTIF_SEED_CATEGORY = 'modern_rock' as const;

export const RIFF_VIRTUOSO_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_VIRTUOSO_MOTIF_SEED';
export const RIFF_VIRTUOSO_MOTIF_SEED_VRB = 'eddie_van_halen' as const;
export const RIFF_VIRTUOSO_MOTIF_SEED_CATEGORY = 'virtuoso_technique' as const;

export const RIFF_SOUTHERNROCK_MOTIF_SEED_ENV = 'COMPOSER_OS_RIFF_SOUTHERNROCK_MOTIF_SEED';
export const RIFF_SOUTHERNROCK_MOTIF_SEED_VRB = 'jimmy_herring' as const;
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
  modern_rock: 'modern rock',
  progressive_blues: 'progressive blues',
  virtuoso_technique: 'virtuoso technique',
};

/** undefined = not loaded; null = force empty (tests). Per category. */
const poolCache = new Map<RiffPhraseCategory, RiffPhraseEntry[] | null | undefined>();

export function isRiffPhraseMotifSeedEnabled(pairing: StylePairing, flags?: PairingFlags): boolean {
  return isPairingEnabled(pairing, flags);
}

export function isRiffSaxMotifSeedPocEnabled(): boolean {
  const p = getPairing('sax_inspired', 'weather_report');
  return !!p && isPairingEnabled(p);
}

export function isRiffJazzRockMotifSeedEnabled(): boolean {
  const p = getPairing('jazz_rock', 'mahavishnu');
  return !!p && isPairingEnabled(p);
}

export function isRiffDimMotifSeedEnabled(): boolean {
  const p = getPairing('diminished_lines', 'fripp');
  return !!p && isPairingEnabled(p);
}

export function isRiffBebopMotifSeedEnabled(): boolean {
  const p = getPairing('bebop_jazz_blues', 'bill_evans_sax');
  return !!p && isPairingEnabled(p);
}

export function isRiffBluesRockMotifSeedEnabled(): boolean {
  const p = getPairing('blues_rock', 'hendrix');
  return !!p && isPairingEnabled(p);
}

export function isRiffBluesRockZepMotifSeedEnabled(): boolean {
  const p = getPairing('blues_rock', 'led_zeppelin');
  return !!p && isPairingEnabled(p);
}

export function isRiffProgBluesMotifSeedEnabled(): boolean {
  const p = getPairing('progressive_blues', 'david_gilmour');
  return !!p && isPairingEnabled(p);
}

export function isRiffModernRockMotifSeedEnabled(): boolean {
  const p = getPairing('modern_rock', 'morello');
  return !!p && isPairingEnabled(p);
}

export function isRiffVirtuosoMotifSeedEnabled(): boolean {
  const p = getPairing('virtuoso_technique', 'eddie_van_halen');
  return !!p && isPairingEnabled(p);
}

export function isRiffSouthernRockMotifSeedEnabled(): boolean {
  const p = getPairing('southern_rock', 'jimmy_herring');
  return !!p && isPairingEnabled(p);
}

export function resetRiffPhraseMotifSeedCacheForTests(): void {
  poolCache.clear();
}

export function resetRiffSaxMotifSeedPocCacheForTests(): void {
  resetRiffPhraseMotifSeedCacheForTests();
}

export function setRiffPhraseMotifSeedPoolForTests(
  category: RiffPhraseCategory,
  pool: RiffPhraseEntry[] | null
): void {
  poolCache.set(category, pool);
}

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
 * Empty or all-zero interval sequences produce flat/unison lines (cos=0 / MI fail).
 * P4: selection-time guard — do not bind these as phrase motifs.
 */
export function isDegeneratePhraseIntervalSequence(
  intervalSequence: readonly number[] | undefined
): boolean {
  const iv = intervalSequence ?? [];
  if (iv.length === 0) return true;
  return iv.every((x) => x === 0);
}

/**
 * Deterministic category pick for seed.
 * Starts at `seed % pool.length`, then walks forward (wrapping) past phrases with
 * empty / all-zero `intervalSequence` (P4). Non-degenerate native landings unchanged.
 * Returns undefined only if the pool is empty or every phrase is degenerate.
 */
export function pickPhraseForSeed(
  category: RiffPhraseCategory,
  seed: number
): RiffPhraseEntry | undefined {
  const pool = loadCategoryPool(category);
  if (pool.length === 0) return undefined;
  const start = (seed >>> 0) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const phrase = pool[(start + i) % pool.length]!;
    if (!isDegeneratePhraseIntervalSequence(phrase.intervalSequence)) {
      return phrase;
    }
  }
  return undefined;
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

export function pickProgBluesPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_PROGBLUES_MOTIF_SEED_CATEGORY, seed);
}

export function pickModernRockPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_MODERNROCK_MOTIF_SEED_CATEGORY, seed);
}

export function pickVirtuosoPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_VIRTUOSO_MOTIF_SEED_CATEGORY, seed);
}

export function pickSouthernRockPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  return pickPhraseForSeed(RIFF_SOUTHERNROCK_MOTIF_SEED_CATEGORY, seed);
}

/** True when profile has ≥1 shipped phrase-seed pairing (UI shows toggle). */
export function profileHasPhraseMotifSeedPairing(profileId: string | undefined): boolean {
  return getPairingsForProfile(profileId).length > 0;
}

/** @deprecated use profileHasPhraseMotifSeedPairing */
export function vrbHasPhraseMotifSeedPairing(vrbId: string | undefined): boolean {
  return profileHasPhraseMotifSeedPairing(vrbId);
}

/**
 * Musician-facing checkbox label for a paired profile, or null when unpaired.
 * Uses the profile's sole pairing category (or lex-first if multiple).
 */
export function phraseMotifSeedCheckboxLabel(profileId: string | undefined): string | null {
  const pairings = getPairingsForProfile(profileId);
  if (pairings.length === 0) return null;
  const pairing =
    pairings.length === 1
      ? pairings[0]!
      : pairings.slice().sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const short =
    CATEGORY_LICK_LABEL[pairing.categoryId] ??
    RIFF_PHRASE_CATEGORY_LABELS[pairing.categoryId]?.toLowerCase() ??
    pairing.categoryId.replace(/_/g, ' ');
  return 'Seed motif from real ' + short + ' licks';
}

export type ResolveRiffCoreMotifOpts = {
  /**
   * Per-generate-call opt-in (API `riffPhraseMotifSeed`).
   * When true and profile is paired, seeds from phrase corpus (env not required).
   */
  phraseMotifSeed?: boolean;
  /** Optional in-process PairingFlags map (tests / future API). */
  pairingFlags?: PairingFlags;
  /** Disambiguate when a profile has multiple category edges. */
  categoryId?: RiffPhraseCategory;
};

/**
 * Resolve CoreMotif for riff build.
 * Selects exactly one StylePairing for the profile (no blend).
 * OFF unless edge enabled / request phraseMotifSeed — then phraseEntryToCoreMotif.
 */
export function resolveRiffCoreMotif(
  seed: number,
  profileId?: string,
  opts?: ResolveRiffCoreMotifOpts
): CoreMotif {
  const pairing = resolvePairingForProfile(profileId, {
    phraseMotifSeed: opts?.phraseMotifSeed,
    pairingFlags: opts?.pairingFlags,
    categoryId: opts?.categoryId,
  });
  if (pairing) {
    const phrase = pickPhraseForSeed(pairing.categoryId, seed);
    if (phrase) return phraseEntryToCoreMotif(phrase);
  }
  return generateRiffCoreMotif(seed);
}

/**
 * Find seeds whose category pick has intervalSequence.length >= minIntervals
 * and is not empty/all-zero (P4). Prefers distinct phrases. Used by export/compare.
 * Uses {@link pickPhraseForSeed} so live pick + scan share the same guard.
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
    const phrase = pickPhraseForSeed(category, s);
    if (!phrase) continue;
    if (phrase.intervalSequence.length < minIntervals) continue;
    if (usedPhrase.has(phrase.id)) continue;
    usedPhrase.add(phrase.id);
    out.push(s);
  }
  if (out.length < count) {
    for (let s = startSeed; s < startSeed + 200000 && out.length < count; s++) {
      const phrase = pickPhraseForSeed(category, s);
      if (!phrase) continue;
      if (phrase.intervalSequence.length < minIntervals) continue;
      if (out.includes(s)) continue;
      out.push(s);
    }
  }
  return out;
}
