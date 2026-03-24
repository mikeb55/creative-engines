/**
 * Composer OS V2 — Export types
 */

/** MusicXML export result. */
export interface MusicXmlExportResult {
  success: boolean;
  xml?: string;
  errors: string[];
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
