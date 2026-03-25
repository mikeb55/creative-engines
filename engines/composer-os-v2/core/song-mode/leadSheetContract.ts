/**
 * Composer OS V2 — Lead sheet contract (internal; aligns with songwriting_bridge LeadSheet spirit).
 * No MusicXML export here — structural contract for future bridge.
 */

/** Placeholder vocal line — events optional until melody generation exists. */
export interface LeadSheetVocalMelody {
  events: Array<{ measure: number; beat: number; duration: number; pitch?: number }>;
  voiceType: string;
  adaptedRange: [number, number];
}

export interface LeadSheetChordSymbol {
  measure: number;
  beat: number;
  chord: string;
  durationInBeats: number;
}

export interface LeadSheetLyricPlaceholder {
  measure: number;
  beat: number;
  placeholderId: string;
}

export interface LeadSheetFormSummary {
  sections: Array<{ label: string; barStart: number; barEnd: number; role: string }>;
}

/** Optional planning hints for lead-sheet consumers (no lyrics). */
export interface LeadSheetSongwritingHints {
  primaryStyleId: string;
  hookTypesPriority: string[];
  prosodyStabilityTags: 'stable_heavy' | 'balanced';
}

export interface LeadSheetContract {
  title: string;
  vocalMelody: LeadSheetVocalMelody;
  chordSymbols: LeadSheetChordSymbol[];
  lyricPlaceholders: LeadSheetLyricPlaceholder[];
  formSummary: LeadSheetFormSummary;
  songwritingHints?: LeadSheetSongwritingHints;
}
