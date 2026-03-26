/**
 * V3.4 — Key signature inference (planning metadata; does not change harmony generation).
 */

export type InferredMode = 'major' | 'minor' | 'ambiguous';

export interface KeyInferenceResult {
  /** 0–11 pitch class of inferred tonic (C=0). */
  inferredTonicPc: number;
  /** Display name for tonic (e.g. Eb, F#) — single spelling choice. */
  inferredTonicName: string;
  /** e.g. `Bb minor`, `Db major` — for receipts. */
  inferredKey: string;
  mode: InferredMode;
  /** 0 = no evidence, 1 = strong consensus. */
  confidence: number;
  /** MusicXML fifths for the recommended key signature (major or natural minor spelling). */
  recommendedFifths: number;
  /** Same as `recommendedFifths` — explicit for receipts / debug. */
  inferredFifths: number;
  /** Major vs minor for MusicXML `<mode>`. */
  recommendedMode: 'major' | 'minor';
  /** When true, avoid implying a single diatonic centre in notation. */
  noKeySignatureRecommended: boolean;
  /** Why inference stayed conservative (debug / manifest). */
  reason?: string;
}

export type KeySignatureRequestMode = 'auto' | 'override' | 'none';

export interface KeySignatureExport {
  fifths: number;
  mode: 'major' | 'minor';
  hideKeySignature: boolean;
  /** Optional measure-1 direction (ambiguous / none / chromatic). */
  caption?: string;
}

export interface ResolvedKeySignature {
  export: KeySignatureExport;
  metadata: KeySignatureReceiptMetadata;
}

/** Receipt / manifest — additive metadata only. */
export interface KeySignatureReceiptMetadata {
  inferredTonicPc: number;
  inferredTonicName: string;
  inferredMode: InferredMode;
  /** Human-readable key label, e.g. `Bb minor`, `Db major`. */
  inferredKey: string;
  /** Fifths implied by inference before export policy (same as `recommendedFifths` in result). */
  inferredFifths: number;
  confidence: number;
  noKeySignatureRecommended: boolean;
  overrideUsed: boolean;
  noneMode: boolean;
  /** Request mode that produced the export (default `auto`). */
  keySignatureModeApplied: KeySignatureRequestMode;
  /** True when a visible `<key>` was written (not `print-object="none"`). */
  exportKeyWritten: boolean;
  exportFifths: number;
  exportMode: 'major' | 'minor';
  hideKeySignature: boolean;
}
