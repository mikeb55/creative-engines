/**
 * Solo line types — Phase B Zappa melodic generator and future solo engines.
 */

/** Single melodic attack in quarter-beat space within one bar. */
export interface SoloNote {
  midi: number;
  /** Start offset inside the measure (quarter-note units; e.g. 4/4 → 0..4, 7/8 → 0..3.5). */
  startBeat: number;
  /** Duration in quarter-note units. */
  durationBeats: number;
  /** 1-based bar index. */
  barIndex: number;
  /** Primary tuplet vocabulary pools (Zappa PDF research). */
  tupletRole?: 'septuplet' | 'quintuplet' | 'plain';
  /** Structural markers for receipts / analysis. */
  marker?: 'descending_minor_sixth' | 'tetrachord_0137' | 'factory_32nd_shift';
}

/** One 7/8-bar rhythmic cell for Zappa Musicality Phase 1 (eighth-note groups sum to 7). */
export interface ZappaRhythmicCellDefinition {
  formSection: 'A' | 'B';
  /** Musician-facing label (e.g. A = 3+3+2, B = 3+2+2+2 for 7/8). */
  spec: string;
  /** Group lengths in eighth-note units for one 7/8 measure (sum === 7). */
  eighthSpans: readonly number[];
}

/** Stored on each {@link SoloPhrase} for callback / manifest consumers. */
export interface ZappaRhythmicCellPhraseMetadata {
  formSection: 'A' | 'B';
  spec: string;
  eighthSpans: readonly number[];
  /** True when this phrase window was selected for the ≥50% cell-lock pass (deterministic). */
  cellLockSelected: boolean;
  /** 7/8 bars touched by this phrase window. */
  sevenEightBarCount: number;
  /** Fraction of onsets in 7/8 bars within ε of a cell boundary after lock (0..1). */
  boundaryAlignment: number;
}

export interface SoloPhrase {
  /** 1-based bar indices covered by this phrase window. */
  barRange: [number, number];
  notes: SoloNote[];
  /** Zappa Phase 1 — rhythmic cell lock + alignment telemetry. */
  zappaRhythmicCell?: ZappaRhythmicCellPhraseMetadata;
}

export interface ZappaSoloReceiptFlags {
  hasSeptuplet: boolean;
  hasQuintuplet: boolean;
  hasDescendingMinorSixth: boolean;
  hasTetrachord0137: boolean;
}

/** Aggregate Phase 1 lock stats on {@link SoloLine}. */
export interface ZappaRhythmicCellLockSummary {
  /** Minimum share of phrases that must use the section cell (policy). */
  threshold: number;
  phraseCount: number;
  phrasesCellLocked: number;
  /** True when `phrasesCellLocked / phraseCount >= threshold` (or no phrases). */
  policyMet: boolean;
}

/** Phase 2 — one extracted anchor per form section (intervals + rhythm ratios). */
export interface ZappaMotifAnchorReceipt {
  sectionLabel: string;
  /** First bar of the two-bar anchor window. */
  anchorStartBar: number;
  /** Hex-ish digest of interval steps (semitones). */
  intervalsFingerprint: string;
  /** Digest of normalized duration ratios. */
  rhythmFingerprint: string;
  noteCount: number;
}

/** Per–four-bar phrase motif similarity telemetry. */
export interface ZappaMotifPhraseReceipt {
  phraseIndex: number;
  /** Four-bar window [lo, hi]. */
  barRange: [number, number];
  sectionLabel: string;
  similarity: number;
  /** Best-matching transform vs anchor IOI / contour. */
  transform: 'shift' | 'augment' | 'compress' | 'identity';
  /** True when phrase required injection / repair to meet policy. */
  repaired: boolean;
}

/** Phase 2 — motif ownership policy + fingerprints for manifests / callback engines. */
export interface ZappaMotifOwnershipReceipt {
  recurrenceThreshold: number;
  anchors: ZappaMotifAnchorReceipt[];
  phraseScores: ZappaMotifPhraseReceipt[];
  /** Mean similarity within each section label (development fragments only). */
  sectionRecurrence: Record<string, number>;
  /** Sections whose mean recurrence ≥ threshold after enforcement. */
  sectionsMeetingRecurrence: string[];
  phrasesRejectedOrRepaired: number;
}

/** Output of {@link generateZappaSolo}. */
export interface SoloLine {
  phrases: SoloPhrase[];
  /** Flattened time order for export + smoke. */
  allNotes: SoloNote[];
  receipt: ZappaSoloReceiptFlags;
  /** Human-readable single line for manifests (optional). */
  digest?: string;
  /** Phase 1 — rhythmic cell lock coverage vs ≥50% phrase policy. */
  rhythmicCellLock?: ZappaRhythmicCellLockSummary;
  /** Phase 2 — motif anchors, transforms, section recurrence. */
  zappaMotifReceipt?: ZappaMotifOwnershipReceipt;
}

/** Options for Zappa solo generation. */
export interface ZappasoloOptions {
  /** MIDI inclusive (default lead-guitar-ish). */
  midiLow?: number;
  midiHigh?: number;
  /** 0 = sparse … 1 = dense note fills per bar. */
  density?: number;
  /** 0 = consonant lean … 1 = maximum Slonimsky outside allowance. */
  dissonanceLevel?: number;
}
