/**
 * **Slonimsky pattern service** — single entry point for all Composer OS engines (duo, big band, string quartet,
 * and future ensembles) to access Slonimsky interval logic and catalogue lookups.
 *
 * Import from this module rather than `slonimskyEngine.ts` directly so duo / BB / SQ routes share one façade
 * and registry-backed helpers stay colocated.
 */

import type { PhraseIntent } from '../goldenPath/phraseIntentTypes';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { IntervalPattern, SlonimskyContext } from './slonimskyEngine';
import {
  buildDuoBarSlonimskyContext,
  inferSlonimskyChordTypeCategory,
  mapDuoPhraseIntentToSlonimskyContext,
  selectSlonimskyPattern,
} from './slonimskyEngine';
import { ENGINE_PATTERN_THESAURUS_MAP, getEnginePatternsForIntent, SLONIMSKY_ENGINE_PATTERNS } from './thesaurusRegistry';
import type { ThesaurusSectionKey } from './thesaurusRegistry';

/** Book section family — alias of {@link ThesaurusSectionKey} for service consumers. */
export type ThesaurusSection = ThesaurusSectionKey;

/**
 * Lead-sheet chord symbols passed into ensemble Slonimsky (e.g. a 3-bar window aligned with rolling melody accumulators).
 * Alias keeps call sites free of a separate harmony-domain `ChordSymbol` type.
 */
export type EnsembleSlonimskyChordSymbol = string;

/**
 * Parameters for ensemble Slonimsky contexts — mirrors {@link buildDuoBarSlonimskyContext} plus a catalogue section
 * for {@link getPatternsBySection} / {@link selectPatternForIntent}.
 */
export type SlonimskyContextParams = {
  duoIntent: PhraseIntent;
  phase: number;
  seed: number;
  songwriterId?: string;
  totalQuarterBeats: number;
  styleProfile?: string | null;
  chordSymbol: string;
  keyPc: number;
  effectiveLow: number;
  effectiveHigh: number;
  /** Slonimsky catalogue section id (see {@link ThesaurusSection} keys); widened to `string` for forward-compatible call sites. */
  catalogueSection: string;
  /**
   * Optional harmonic window (e.g. three bars). When set, the **last** symbol is used with
   * {@link inferSlonimskyChordTypeCategory} / {@link chordTonesForChordSymbol} for this bar’s context
   * (matches typical “current bar = third of three” rolling windows). Omit to use `chordSymbol` only.
   */
  chords?: readonly EnsembleSlonimskyChordSymbol[];
  /** When set, used as {@link SlonimskyContext.phraseIntent} (transposition / infra-ultra in engine); else weighted from seed. */
  phraseIntent?: SlonimskyContext['phraseIntent'];
  /** Passed through to {@link SlonimskyContext.transpositionInterval} (semitones per cycle); overrides phrase-intent default when set. */
  transpositionInterval?: number;
  /** Passed through to {@link SlonimskyContext.maxInfraSteps}. */
  maxInfraSteps?: number;
  /** Passed through to {@link SlonimskyContext.maxUltraSteps}. */
  maxUltraSteps?: number;
};

/** Intent mixture for ensemble-weighted `phraseIntent` (build / float / release / shock). */
export type SlonimskyIntentWeights = {
  build: number;
  float: number;
  release: number;
  shock: number;
};

const BIG_BAND_INTENT_WEIGHTS: SlonimskyIntentWeights = {
  build: 0.4,
  float: 0.4,
  release: 0.2,
  shock: 0,
};

const QUARTET_INTENT_WEIGHTS: SlonimskyIntentWeights = {
  build: 0.3,
  float: 0.5,
  release: 0.2,
  shock: 0,
};

function seededUnit(seed: number): number {
  let s = seed >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

function weightedIntent(seed: number, w: SlonimskyIntentWeights): SlonimskyContext['phraseIntent'] {
  const u = seededUnit(seed + 7919);
  let cum = 0;
  const keys: SlonimskyContext['phraseIntent'][] = ['build', 'float', 'release', 'shock'];
  for (const k of keys) {
    cum += w[k];
    if (u < cum) return k;
  }
  return 'release';
}

function liftIntoRange(pitch: number, low: number, high: number): number {
  let p = pitch;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return Math.max(low, Math.min(high, p));
}

function resolveAllowedOutsideLevelForSlonimsky(songwriterId: string | undefined): 0 | 1 | 2 {
  if (songwriterId === 'wayne_shorter' || songwriterId === 'barry_harris') return 2;
  if (songwriterId === 'ecm_chamber' || songwriterId === 'pat_metheny') return 1;
  return 1;
}

export {
  applySlonimskyToMelodyLine,
  selectSlonimskyPattern,
  selectSlonimskyPattern as getPatternForContext,
  buildDuoBarSlonimskyContext,
  mapDuoPhraseIntentToSlonimskyContext,
  type SlonimskyContext,
  type SlonimskyNote,
} from './slonimskyEngine';

/** Shipped engine patterns whose {@link ENGINE_PATTERN_THESAURUS_MAP} filing matches `section`. */
export function getPatternsBySection(section: ThesaurusSection): readonly IntervalPattern[] {
  return SLONIMSKY_ENGINE_PATTERNS.filter(
    (p) => ENGINE_PATTERN_THESAURUS_MAP[p.id]?.sectionKey === section
  );
}

/**
 * Picks a {@link IntervalPattern} for `phraseIntent`, preferring the intersection of `sectionPatterns` with the
 * engine’s intent pool; if empty, falls back to {@link selectSlonimskyPattern}’s global choice when it matches the
 * section, else a deterministic pick from the intersection or intent pool.
 */
export function selectPatternForIntent(params: {
  seed: number;
  sectionPatterns: readonly IntervalPattern[];
  phraseIntent: SlonimskyContext['phraseIntent'];
  styleProfile?: string;
  chordType: string;
  functionalStrength?: SlonimskyContext['functionalStrength'];
  allowedOutsideLevel?: SlonimskyContext['allowedOutsideLevel'];
}): IntervalPattern | null {
  const intentPatterns = getEnginePatternsForIntent(params.phraseIntent);
  const intentIds = new Set(intentPatterns.map((p) => p.id));
  const pool = params.sectionPatterns.filter((p) => intentIds.has(p.id));

  const ctx: SlonimskyContext = {
    keyPc: 0,
    chordType: params.chordType,
    functionalStrength: params.functionalStrength ?? 'medium',
    allowedOutsideLevel: params.allowedOutsideLevel ?? 2,
    phraseIntent: params.phraseIntent,
    basePitch: 62,
    maxBeats: 4,
    styleProfile: params.styleProfile,
  };

  const globalPick = selectSlonimskyPattern(ctx, params.seed);
  if (globalPick && pool.some((p) => p.id === globalPick.id)) return globalPick;
  if (pool.length > 0) return pool[Math.abs(params.seed) % pool.length]!;
  return globalPick;
}

/**
 * Returns the engine representative {@link IntervalPattern} for the catalogue band that contains pattern number `no`
 * (inclusive `patternStart`…`patternEnd` from {@link ENGINE_PATTERN_THESAURUS_MAP}). When several shipped patterns
 * share the same inclusive band, the first match in {@link SLONIMSKY_ENGINE_PATTERNS} order wins.
 */
export function getPatternByNumber(no: number): IntervalPattern | undefined {
  for (const p of SLONIMSKY_ENGINE_PATTERNS) {
    const link = ENGINE_PATTERN_THESAURUS_MAP[p.id];
    if (!link) continue;
    if (no >= link.patternStart && no <= link.patternEnd) return p;
  }
  return undefined;
}

function resolveChordSymbolForEnsembleBar(params: SlonimskyContextParams): string {
  const w = params.chords;
  if (w && w.length > 0) return w[w.length - 1]!;
  return params.chordSymbol;
}

function buildEnsembleBarSlonimskyContext(
  params: SlonimskyContextParams,
  defaults: { styleProfile: string; weights: SlonimskyIntentWeights }
): SlonimskyContext {
  const styleProfile = params.styleProfile ?? defaults.styleProfile;
  const chordForBar = resolveChordSymbolForEnsembleBar(params);
  const inferred = inferSlonimskyChordTypeCategory(chordForBar);
  const phraseIntent = params.phraseIntent ?? weightedIntent(params.seed, defaults.weights);

  const sectionPatterns = getPatternsBySection(params.catalogueSection as ThesaurusSection);
  selectPatternForIntent({
    seed: params.seed,
    sectionPatterns,
    phraseIntent,
    styleProfile: styleProfile ?? undefined,
    chordType: inferred,
    functionalStrength: 'medium',
    allowedOutsideLevel: resolveAllowedOutsideLevelForSlonimsky(params.songwriterId),
  });

  const base: SlonimskyContext = {
    keyPc: params.keyPc,
    chordType: inferred,
    functionalStrength: 'medium',
    allowedOutsideLevel: resolveAllowedOutsideLevelForSlonimsky(params.songwriterId),
    phraseIntent,
    basePitch: 62,
    maxBeats: Math.max(4, params.totalQuarterBeats),
    styleProfile: styleProfile ?? undefined,
    chordSymbol: chordForBar,
    effectiveLow: params.effectiveLow,
    effectiveHigh: params.effectiveHigh,
  };
  const t = chordTonesForChordSymbol(chordForBar);
  const third = liftIntoRange(t.third, params.effectiveLow, params.effectiveHigh);
  return {
    ...base,
    basePitch: third,
    maxBeats: 4,
    ...(params.transpositionInterval !== undefined ? { transpositionInterval: params.transpositionInterval } : {}),
    ...(params.maxInfraSteps !== undefined ? { maxInfraSteps: params.maxInfraSteps } : {}),
    ...(params.maxUltraSteps !== undefined ? { maxUltraSteps: params.maxUltraSteps } : {}),
  };
}

/** Big-band Slonimsky bar context: default style **ECM**, intent weights build 0.4 / float 0.4 / release 0.2 / shock 0. */
export function buildBigBandSlonimskyContext(params: SlonimskyContextParams): SlonimskyContext {
  return buildEnsembleBarSlonimskyContext(params, { styleProfile: 'ECM', weights: BIG_BAND_INTENT_WEIGHTS });
}

/** String-quartet Slonimsky bar context: default style **Metheny**, intent weights build 0.3 / float 0.5 / release 0.2 / shock 0. */
export function buildQuartetSlonimskyContext(params: SlonimskyContextParams): SlonimskyContext {
  return buildEnsembleBarSlonimskyContext(params, { styleProfile: 'Metheny', weights: QUARTET_INTENT_WEIGHTS });
}
