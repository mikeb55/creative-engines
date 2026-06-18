/**
 * V80j - canonical Import IR for MusicXML + MIDI ingestion.
 */

export const MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION = 1;
export const IMPORT_EIGHTH_GRID_BEATS = 0.5;
export const IMPORT_QUANTIZE_SNAP_TOLERANCE_BEATS = 0.25;

export type ImportSourceFormat = 'musicxml' | 'midi';
export type ImportFieldOrigin = 'explicit' | 'inferred' | 'carried' | 'defaulted' | 'user-override';

export interface ImportTimeSignature {
  num: number;
  den: number;
}

export interface ImportKeyEstimate {
  tonic: string;
  mode: 'major' | 'minor' | 'unknown';
  confidence: number;
  fieldOrigin: ImportFieldOrigin;
}

export interface ImportHarmonyBar {
  bar: number;
  chordSymbol: string;
  confidence: number;
  fieldOrigin: ImportFieldOrigin;
}

export interface ImportMelodyNote {
  bar: number;
  onsetBeat: number;
  durationBeats: number;
  midiPitch: number;
  confidence: number;
  fieldOrigin: ImportFieldOrigin;
}

export interface MosaicImportTimeline {
  schemaVersion: typeof MOSAIC_IMPORT_TIMELINE_SCHEMA_VERSION;
  sourceFormat: ImportSourceFormat;
  bars: number;
  timeSig: ImportTimeSignature;
  keyEstimate: ImportKeyEstimate;
  harmonyByBar: ImportHarmonyBar[];
  melodyLine: ImportMelodyNote[];
  swingRatio?: number;
  parseDiagnostics?: string[];
}

export const IMPORT_EXPLICIT_HARMONY_CONFIDENCE = 0.95;
export const IMPORT_HARD_LOCK_CONFIDENCE = 0.85;
export const IMPORT_CANDIDATE_MIN_CONFIDENCE = 0.5;
