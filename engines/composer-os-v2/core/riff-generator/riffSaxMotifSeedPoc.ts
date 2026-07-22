/**
 * Phase 2 POC - sax_inspired phrases -> CoreMotif seed for one fusion VRB.
 *
 * Pairing: weather_report only (sax register band + linear-melodic profile).
 * Flag: COMPOSER_OS_RIFF_SAX_MOTIF_SEED - default OFF (unset / not 1|true|on).
 * Motif seed only - no hook / loop / intervalWeights merge.
 */

import type { CoreMotif } from '../motif/motifEngineTypes';
import { generateRiffCoreMotif } from '../motif/songModeMotifEngine';
import { phraseEntryToCoreMotif } from './riffPhraseLibraryAdapters';
import { loadRiffPhraseCorpus } from './riffPhraseCorpusLoad';
import type { RiffPhraseEntry } from './riffPhraseLibraryTypes';

/** Env flag - OFF unless explicitly 1 / true / on (case-insensitive). */
export const RIFF_SAX_MOTIF_SEED_POC_ENV = 'COMPOSER_OS_RIFF_SAX_MOTIF_SEED';

/** Sole VRB pairing for this POC. */
export const RIFF_SAX_MOTIF_SEED_POC_VRB = 'weather_report' as const;

/** Phrase category this POC draws from. */
export const RIFF_SAX_MOTIF_SEED_POC_CATEGORY = 'sax_inspired' as const;

/** undefined = not loaded; null = force empty (tests). */
let saxPoolCache: RiffPhraseEntry[] | null | undefined;

export function isRiffSaxMotifSeedPocEnabled(): boolean {
  const v = process.env[RIFF_SAX_MOTIF_SEED_POC_ENV]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'on';
}

export function resetRiffSaxMotifSeedPocCacheForTests(): void {
  saxPoolCache = undefined;
}

/** Inject pool for unit tests (null = empty; skips disk). */
export function setRiffSaxMotifSeedPocPoolForTests(pool: RiffPhraseEntry[] | null): void {
  saxPoolCache = pool;
}

function loadSaxInspiredPool(): RiffPhraseEntry[] {
  if (saxPoolCache !== undefined) return saxPoolCache ?? [];
  const corpus = loadRiffPhraseCorpus();
  if (!corpus.ok) {
    saxPoolCache = [];
    return [];
  }
  saxPoolCache = corpus.phrases.filter((p) => p.category === RIFF_SAX_MOTIF_SEED_POC_CATEGORY);
  return saxPoolCache;
}

/**
 * Deterministic pick from sax_inspired pool (seed -> index).
 * Returns undefined when pool empty.
 */
export function pickSaxInspiredPhraseForSeed(seed: number): RiffPhraseEntry | undefined {
  const pool = loadSaxInspiredPool();
  if (pool.length === 0) return undefined;
  const idx = (seed >>> 0) % pool.length;
  return pool[idx];
}

/**
 * Resolve CoreMotif for riff build.
 * Flag OFF or non-POC VRB -> generateRiffCoreMotif (byte-identical path).
 * Flag ON + weather_report -> phraseEntryToCoreMotif from sax_inspired (fallback procedural if empty).
 */
export function resolveRiffCoreMotif(seed: number, vrbId?: string): CoreMotif {
  if (
    isRiffSaxMotifSeedPocEnabled() &&
    vrbId === RIFF_SAX_MOTIF_SEED_POC_VRB
  ) {
    const phrase = pickSaxInspiredPhraseForSeed(seed);
    if (phrase) return phraseEntryToCoreMotif(phrase);
  }
  return generateRiffCoreMotif(seed);
}