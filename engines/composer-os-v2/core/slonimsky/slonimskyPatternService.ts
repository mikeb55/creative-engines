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
  resolveAllowedOutsideLevelForSlonimsky,
  selectSlonimskyPattern,
  SLONIMSKY_STYLE_PROFILE_MAP,
  type SlonimskyStyleProfileSpec,
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
  /** When true, section architecture owns catalogue choice ahead of songwriter defaults. */
  forceCatalogueSection?: boolean;
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
  /** Caps profile {@link SlonimskyContext.allowedOutsideLevel} (User Chromatic Strength). */
  allowedOutsideOverride?: 0 | 1 | 2;
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

/**
 * When canonical songwriter ids differ from {@link SLONIMSKY_STYLE_PROFILE_MAP} keys
 * (e.g. `antonio_carlos_jobim` → **JOBIM**).
 */
const SLONIMSKY_STYLE_PROFILE_MAP_KEY_BY_SONGWRITER_ID: Record<string, string> = {
  antonio_carlos_jobim: 'JOBIM',
};

function resolveSlonimskyStyleProfileForSongwriterId(
  songwriterId: string | undefined
): SlonimskyStyleProfileSpec | undefined {
  if (!songwriterId?.trim()) return undefined;
  const t = songwriterId.trim();
  const alias = SLONIMSKY_STYLE_PROFILE_MAP_KEY_BY_SONGWRITER_ID[t];
  if (alias && SLONIMSKY_STYLE_PROFILE_MAP[alias]) {
    return SLONIMSKY_STYLE_PROFILE_MAP[alias];
  }
  const upper = t.toUpperCase();
  const row = SLONIMSKY_STYLE_PROFILE_MAP[upper];
  return row;
}

function mergeEnsembleParamsWithSlonimskyStyleProfile(params: SlonimskyContextParams): SlonimskyContextParams {
  const spec = resolveSlonimskyStyleProfileForSongwriterId(params.songwriterId);
  if (!spec) return params;

  let catalogueSection = params.catalogueSection;
  let transpositionInterval = params.transpositionInterval;
  let maxInfraSteps = params.maxInfraSteps;
  let maxUltraSteps = params.maxUltraSteps;

  if (!params.forceCatalogueSection && spec.catalogueSection) catalogueSection = spec.catalogueSection;
  if (params.transpositionInterval === undefined && spec.transpositionInterval !== undefined) {
    transpositionInterval = spec.transpositionInterval;
  }
  if (spec.maxInfraSteps !== undefined) maxInfraSteps = spec.maxInfraSteps;
  if (spec.maxUltraSteps !== undefined) maxUltraSteps = spec.maxUltraSteps;

  return {
    ...params,
    catalogueSection,
    transpositionInterval,
    maxInfraSteps,
    maxUltraSteps,
  };
}

export function chromaticStrengthToOutsideLevel(
  s: 'off' | 'subtle' | 'prominent' | undefined
): 0 | 1 | 2 | undefined {
  if (s === 'off') return 0;
  if (s === 'subtle') return 1;
  if (s === 'prominent') return 2;
  return undefined;
}

/** Wyble `WybleParameters.chromaticismLevel` (0–1) from UI chromatic strength. */
export function chromaticStrengthToWybleChromaticismLevel(
  s: 'off' | 'subtle' | 'prominent' | undefined
): number | undefined {
  const level = chromaticStrengthToOutsideLevel(s);
  if (level === undefined) return undefined;
  if (level === 0) return 0;
  if (level === 1) return 0.45;
  return 0.9;
}

function resolveEffectiveEnsembleAllowedOutsideLevel(
  songwriterId: string | undefined,
  allowedOutsideOverride?: 0 | 1 | 2
): 0 | 1 | 2 {
  const profileLevel = resolveAllowedOutsideLevelForSlonimsky(songwriterId);
  return (
    allowedOutsideOverride !== undefined ? Math.min(allowedOutsideOverride, profileLevel) : profileLevel
  ) as 0 | 1 | 2;
}

export {
  applySlonimskyToMelodyLine,
  selectSlonimskyPattern,
  selectSlonimskyPattern as getPatternForContext,
  buildDuoBarSlonimskyContext,
  mapDuoPhraseIntentToSlonimskyContext,
  resolveAllowedOutsideLevelForSlonimsky,
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
  const merged = mergeEnsembleParamsWithSlonimskyStyleProfile(params);
  const styleProfile = merged.styleProfile ?? defaults.styleProfile;
  const chordForBar = resolveChordSymbolForEnsembleBar(merged);
  const inferred = inferSlonimskyChordTypeCategory(chordForBar);
  const phraseIntent = merged.phraseIntent ?? weightedIntent(merged.seed, defaults.weights);

  const sectionPatterns = getPatternsBySection(merged.catalogueSection as ThesaurusSection);
  const allowedOutsideEffective = resolveEffectiveEnsembleAllowedOutsideLevel(
    merged.songwriterId,
    merged.allowedOutsideOverride
  );
  selectPatternForIntent({
    seed: merged.seed,
    sectionPatterns,
    phraseIntent,
    styleProfile: styleProfile ?? undefined,
    chordType: inferred,
    functionalStrength: 'medium',
    allowedOutsideLevel: allowedOutsideEffective,
  });

  const base: SlonimskyContext = {
    keyPc: merged.keyPc,
    chordType: inferred,
    functionalStrength: 'medium',
    allowedOutsideLevel: allowedOutsideEffective,
    phraseIntent,
    basePitch: 62,
    maxBeats: Math.max(4, merged.totalQuarterBeats),
    styleProfile: styleProfile ?? undefined,
    chordSymbol: chordForBar,
    effectiveLow: merged.effectiveLow,
    effectiveHigh: merged.effectiveHigh,
  };
  const t = chordTonesForChordSymbol(chordForBar);
  const third = liftIntoRange(t.third, merged.effectiveLow, merged.effectiveHigh);
  return {
    ...base,
    basePitch: third,
    maxBeats: 4,
    ...(merged.transpositionInterval !== undefined ? { transpositionInterval: merged.transpositionInterval } : {}),
    ...(merged.maxInfraSteps !== undefined ? { maxInfraSteps: merged.maxInfraSteps } : {}),
    ...(merged.maxUltraSteps !== undefined ? { maxUltraSteps: merged.maxUltraSteps } : {}),
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

function catalogueSectionForGbdSongwriter(songwriterId: string | undefined, bar: number): string {
  if (songwriterId === 'frank_zappa') {
    return bar % 2 === 0 ? 'tritone_progression' : 'intervallic_mirror_permutations';
  }
  if (songwriterId === 'allan_holdsworth') {
    return 'semitone_progression';
  }
  if (songwriterId === 'scott_henderson') {
    return 'pentatonic_scales';
  }
  if (
    songwriterId === 'pat_metheny' ||
    songwriterId === 'wayne_shorter' ||
    songwriterId === 'wes_montgomery' ||
    songwriterId === 'joe_pass'
  ) {
    return 'heptatonic_scales';
  }
  return 'pentatonic_scales';
}

const GBD_DUO_INTENT_WEIGHTS: SlonimskyIntentWeights = {
  build: 0.35,
  float: 0.35,
  release: 0.2,
  shock: 0.1,
};

/**
 * Z8 — Guitar–bass duo Slonimsky context: cell pattern selection via catalogue section + intent weights.
 */
export function buildGuitarBassDuoSlonimskyContext(
  params: Omit<SlonimskyContextParams, 'catalogueSection'> & { catalogueSection?: string }
): SlonimskyContext {
  const section =
    params.catalogueSection ?? catalogueSectionForGbdSongwriter(params.songwriterId, params.phase);
  return buildEnsembleBarSlonimskyContext(
    { ...params, catalogueSection: section },
    { styleProfile: params.styleProfile ?? 'ECM', weights: GBD_DUO_INTENT_WEIGHTS }
  );
}
