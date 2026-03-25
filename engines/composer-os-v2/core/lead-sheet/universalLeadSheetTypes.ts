/**
 * Universal lead-sheet-ready contract across Duo / ECM / Song (planning-level).
 */

export type UniversalLeadSheetMode = 'duo' | 'ecm' | 'song' | 'planning_other';

export interface UniversalChordEntry {
  measure: number;
  beat: number;
  symbol: string;
  durationInBeats: number;
}

export interface UniversalFormSection {
  label: string;
  barStart: number;
  barEnd: number;
  role: string;
}

export interface UniversalRehearsalMark {
  measure: number;
  label: string;
}

/** Top-line placeholder — not final engraving. */
export interface UniversalTopLinePlaceholder {
  hasEvents: boolean;
  note?: string;
}

export interface UniversalLeadSheet {
  mode: UniversalLeadSheetMode;
  title: string;
  presetId?: string;
  chordSymbols: UniversalChordEntry[];
  formSections: UniversalFormSection[];
  rehearsalMarks: UniversalRehearsalMark[];
  topLine: UniversalTopLinePlaceholder;
  source: 'composition_context' | 'song_lead_sheet' | 'manual';
}
