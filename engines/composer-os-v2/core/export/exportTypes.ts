/**
 * Composer OS V2 — Export types
 */

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
  /** Variant A: bass part only — force every note/rest to voice 1 (monophonic staff). */
  bassStaffVoice1Only?: boolean;
  /** Variant B: omit all &lt;harmony&gt; chord symbols (measure-level). */
  omitChordSymbols?: boolean;
  /** Variant C: minimize number of tied fragments (DP) instead of greedy largest-first. */
  minimizeNoteFragmentation?: boolean;
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
