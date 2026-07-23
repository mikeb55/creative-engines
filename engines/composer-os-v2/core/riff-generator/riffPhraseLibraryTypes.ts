/**
 * Phase-1 riff phrase library — corpus schema freeze.
 *
 * New types only: RiffPhraseEntry, RiffPhraseCategory, RiffPhraseIngestAuditRow
 * (+ small supporting shapes that are not engine pitch/melody authorities).
 *
 * Maps onto existing types — do not shadow:
 * - noteEvents ≈ NoteEvent / RestEvent
 * - intervalSequence / contour / attacks ≈ CoreMotif
 * - interval hist soft-merge target = RiffIntervalWeightMap
 * - ornamentFlags = RiffOrnamentPolicy
 *
 * Hard gate: no GPX open/hash/parse until explicit licensing go-ahead.
 * Planned parser: guitarpro-parser @ Apache-2.0 (see RIFF_PHRASE_GPX_PARSER).
 */

import type { CoreMotif } from '../motif/motifEngineTypes';
import type { RiffIntervalWeightMap, RiffOrnamentPolicy } from '../composer/riffProfileTypes';
import type { NoteEvent, RestEvent } from '../score-model/scoreModelTypes';

/** Fixed corpus course ids (56 files planned; synthetic fixtures first). */
export const RIFF_PHRASE_CATEGORIES = [
  'bebop_jazz_blues',
  'blues_rock',
  'jazz_rock',
  'modern_rock',
  'progressive_blues',
  'sax_inspired',
  'diminished_lines',
  'white_rock_funk',
  'black_soul_funk',
] as const;

export type RiffPhraseCategory = (typeof RIFF_PHRASE_CATEGORIES)[number];

export const RIFF_PHRASE_CATEGORY_LABELS: Record<RiffPhraseCategory, string> = {
  bebop_jazz_blues: 'Bebop-Jazz Blues',
  blues_rock: 'Blues-Rock',
  jazz_rock: 'Jazz-Rock',
  modern_rock: 'Modern Rock',
  progressive_blues: 'Progressive Blues',
  sax_inspired: 'Sax-Inspired',
  diminished_lines: 'Diminished Lines',
  white_rock_funk: 'White Rock Funk',
  black_soul_funk: 'Black Soul Funk',
};

/** Planned corpus counts per category (real ingest later). */
export const RIFF_PHRASE_CATEGORY_TARGET_COUNTS: Record<RiffPhraseCategory, number> = {
  bebop_jazz_blues: 31,
  blues_rock: 6,
  jazz_rock: 5,
  modern_rock: 4,
  progressive_blues: 4,
  sax_inspired: 5,
  diminished_lines: 6,
  white_rock_funk: 8,
  black_soul_funk: 12,
};

/** Sum of category target counts. */
export const RIFF_PHRASE_CORPUS_TARGET_TOTAL = 81 as const;

/**
 * Parser notes for GPX/GP5 ingest (Phase 1 scripts only — not app runtime).
 * Planned: guitarpro-parser (Apache-2.0). Road-test uses @coderline/alphatab
 * (MPL-2.0) because guitarpro-parser fails on these GP5 lick files (DataView
 * bounds); GPX via guitarpro-parser also needs linkedom for Node DOMParser.
 */
export const RIFF_PHRASE_GPX_PARSER = {
  npmPackage: 'guitarpro-parser',
  license: 'Apache-2.0',
  /** Verified reachable on agent network (npm ping / registry GET). */
  registry: 'https://registry.npmjs.org',
  status: 'road_test_alphatab_fallback' as const,
  roadTestParser: {
    npmPackage: '@coderline/alphatab',
    license: 'MPL-2.0',
    reason: 'guitarpro-parser GP5 DataView failure on corpus lick files',
  },
};

export type RiffPhraseStartType = 'pickup' | 'downbeat' | 'syncopated' | 'rest_lead';

export type RiffPhraseEndType =
  | 'sustain'
  | 'rest'
  | 'leap_off'
  | 'chromatic_resolve'
  | 'open';

/** Provenance — synthetic fixtures use placeholder hash, never a real GPX digest. */
export interface RiffPhraseSourceFile {
  name: string;
  /** Content hash when licensed ingest runs; synthetic = `synthetic:` prefix. */
  sha256: string;
}

/**
 * Corpus note: NoteEvent plus optional tie flag for GPX preservation.
 * Not a parallel score model — export/runtime still use NoteEvent / MelodyLine.
 */
export type RiffPhraseNoteEvent = NoteEvent & {
  tied?: boolean;
};

export type RiffPhraseRestEvent = RestEvent;

export type RiffPhraseScoreEvent = RiffPhraseNoteEvent | RiffPhraseRestEvent;

export interface RiffPhraseMeter {
  numerator: number;
  denominator: number;
}

export interface RiffPhraseLeapProfile {
  maxLeap: number;
  /** Fraction of successive note intervals with |Δ| ≥ 4. */
  leapRate: number;
  /** Absolute semitone leap → count (string keys for JSON). */
  leapSemitoneHist: Record<string, number>;
}

/**
 * Neutral ingested phrase. Runtime wiring (motif seed / intervalWeights merge /
 * hook / loop) is phase 2–3 — this type is corpus-only in phase 1.
 */
export interface RiffPhraseEntry {
  id: string;
  category: RiffPhraseCategory;
  sourceCourse: string;
  sourceFile: RiffPhraseSourceFile;
  barCount: number;
  meter: RiffPhraseMeter;
  noteEvents: RiffPhraseScoreEvent[];
  /** Signed semitone steps — same meaning as CoreMotif.intervalPattern. */
  intervalSequence: number[];
  /** Direction per interval step (−1 | 0 | 1) — same as CoreMotif.contourPattern. */
  contour: number[];
  /** Eighth-group cell (descriptor; Zappa rhythmicCellEighths cousin). */
  rhythmicCell: number[];
  /** Attack starts in quarter-beat space — CoreMotif rhythmPattern.startBeat. */
  attackPositions: number[];
  /** Per subdivision slot rest bits (length typically 8 or 16 for 4/4). */
  restMask: boolean[];
  /** Pitch classes (0–11) favoured on strong beats. */
  strongBeatTargets: number[];
  phraseStartType: RiffPhraseStartType;
  phraseEndType: RiffPhraseEndType;
  /** 0–1 descriptive strength — not RiffCadenceTypeWeights. */
  cadenceStrength: number;
  registerLow: number;
  registerHigh: number;
  registerCenter: number;
  /** 0–1 cousin of chromaticBudget — do not overwrite profile budget in P1. */
  chromaticityScore: number;
  leapProfile: RiffPhraseLeapProfile;
  /** Same shape as RiffOrnamentPolicy. */
  ornamentFlags: RiffOrnamentPolicy;
  /** Advisory only — never locks chord symbols. */
  inferredHarmonyHints: string[];
  tags: string[];
  /** Phase 1.5 S4 — curation / quarantine flags (optional; absent = clean). */
  curation?: RiffPhraseCuration;
}

/** S4 needs-review reasons (diminished_lines leftovers, max-bar chops, meter mismatch files). */
export type RiffPhraseCurationReason =
  | 'one_bar_leftover'
  | 'max_phrase_chop'
  | 'meter_mismatch_file';

export interface RiffPhraseCuration {
  needsReview: boolean;
  reasons: RiffPhraseCurationReason[];
}

/** One row of ingest audit CSV (emitted when real GPX ingest is unlocked). */
export interface RiffPhraseIngestAuditRow {
  file: string;
  parseOk: boolean;
  trackCount: number;
  voiceCount: number;
  barsIn: number;
  phrasesOut: number;
  droppedOrnaments: number;
  tieFixups: number;
  meterMismatch: boolean;
  hash: string;
  notes?: string;
}

/** Compile-time / docs: soft-merge target for phase-3 interval bias. */
export type RiffPhraseIntervalHist = RiffIntervalWeightMap;

/** Compile-time / docs: motif seed target for phase-2. */
export type RiffPhraseCoreMotifTarget = CoreMotif;