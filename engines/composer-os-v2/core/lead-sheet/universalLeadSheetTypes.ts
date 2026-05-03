/**
 * Universal lead-sheet-ready contract across Duo / ECM / Song (planning-level).
 */

export type UniversalLeadSheetMode = 'duo' | 'ecm' | 'song' | 'big_band' | 'quartet' | 'planning_other';

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

/** Imported / engine repeat barlines (parallel to `LeadSheet.repeatMarkers`, numeric volta index). */
export interface UniversalRepeatMarker {
  bar: number;
  kind: 'repeat_start' | 'repeat_end' | 'ending_start' | 'ending_stop';
  endingNumber?: number;
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
  /** Optional chart length from form + repeat markers (import path sets via `computeTotalBarsWithRepeats`). */
  totalBars?: number;
  chordSymbols: UniversalChordEntry[];
  formSections: UniversalFormSection[];
  rehearsalMarks: UniversalRehearsalMark[];
  repeatMarkers: UniversalRepeatMarker[];
  topLine: UniversalTopLinePlaceholder;
  /** Section phase labels (parallel to form slices when available). */
  sectionLabels?: string[];
  source:
    | 'composition_context'
    | 'song_lead_sheet'
    | 'manual'
    | 'big_band_plan'
    | 'quartet_plan'
    | 'imported_musicxml';
}
