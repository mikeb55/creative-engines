/**
 * Composer OS V2 — Export types
 */

import type { BarMeterMap } from '../rhythm/barMeterTypes';

/** MusicXML export result. */
export interface MusicXmlExportResult {
  success: boolean;
  xml?: string;
  errors: string[];
}

/**
 * Optional Sibelius diagnostic toggles (same ScoreModel; only export output changes).
 * Use one at a time to isolate display issues in Sibelius.
 */
export interface MusicXmlExportOptions {
  /** Quarter-note BPM for measure-1 metronome + &lt;sound tempo&gt; (export); defaults with {@link ScoreModel.tempo} in exporter. */
  bpm?: number;
  /** Variant A: bass part only — force every note/rest to voice 1 (monophonic staff). */
  bassStaffVoice1Only?: boolean;
  /** Variant B: omit all &lt;harmony&gt; chord symbols (measure-level). */
  omitChordSymbols?: boolean;
  /** When true, write &lt;kind text&gt; from the user suffix without lead-sheet normalization (custom locked progressions). */
  preserveChordKindLiterals?: boolean;
  /** When set (custom_locked), verify each measure chord matches before emitting &lt;harmony&gt; (fail fast if score drifted). */
  assertLockedHarmonyBars?: string[];
  /** Variant C: minimize number of tied fragments (DP) instead of greedy largest-first. */
  minimizeNoteFragmentation?: boolean;
  /**
   * Phase A — per-bar time signatures (1-based). When set, each measure uses matching divisions and
   * MusicXML `<time>` changes at meter boundaries. Omit for legacy all–4/4 export.
   */
  barMeterMap?: BarMeterMap;
}

/** Schema validation result. */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/** Re-parse result. */
export interface ReParseResult {
  valid: boolean;
  measureCount?: number;
  errors: string[];
}

/** Sibelius-safe status. */
export interface SibeliusSafeStatus {
  safe: boolean;
  issues: string[];
}
