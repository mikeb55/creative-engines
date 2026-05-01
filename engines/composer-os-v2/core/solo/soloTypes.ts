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

export interface SoloPhrase {
  /** 1-based bar indices covered by this phrase window. */
  barRange: [number, number];
  notes: SoloNote[];
}

export interface ZappaSoloReceiptFlags {
  hasSeptuplet: boolean;
  hasQuintuplet: boolean;
  hasDescendingMinorSixth: boolean;
  hasTetrachord0137: boolean;
}

/** Output of {@link generateZappaSolo}. */
export interface SoloLine {
  phrases: SoloPhrase[];
  /** Flattened time order for export + smoke. */
  allNotes: SoloNote[];
  receipt: ZappaSoloReceiptFlags;
  /** Human-readable single line for manifests (optional). */
  digest?: string;
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
