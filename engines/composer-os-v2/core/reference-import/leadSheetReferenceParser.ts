/**
 * Lead-sheet-style chord / section text → ReferencePiece.
 */

import { chordInputTextToScaffold } from '../chord-input/chordInputAdapter';
import { parseChordInputBlocks } from '../chord-input/chordInputParser';
import type { ReferencePiece } from './referencePieceTypes';
import { importSuccess, emptyImportFailure, type ReferenceImportResult } from './referenceImportTypes';

/**
 * Parse multi-line chord blocks (see `chord-input` parser) into a reference piece.
 */
export function parseLeadSheetReferenceText(text: string): ReferenceImportResult {
  const warnings: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) {
    return emptyImportFailure(['lead sheet text is empty'], warnings);
  }

  const plan = parseChordInputBlocks(trimmed);
  if (plan.allBars.length === 0) {
    return emptyImportFailure(['no chord symbols parsed from lead sheet text'], warnings);
  }

  const scaffold = chordInputTextToScaffold(trimmed);
  const totalBars = scaffold.chordSymbolPlan.totalBars;

  let sections = scaffold.sectionRanges.map((r) => ({
    label: r.label,
    startBar: r.startBar,
    barCount: Math.max(1, r.endBar - r.startBar + 1),
  }));
  if (sections.length === 0) {
    sections = [{ label: 'A', startBar: 1, barCount: totalBars }];
  }

  const chordSegments = scaffold.chordSymbolPlan.segments.map((s) => ({
    chord: s.chord,
    startBar: s.startBar,
    bars: s.bars,
  }));

  let harmonicRhythmBars = 0;
  if (chordSegments.length > 0) {
    harmonicRhythmBars = chordSegments.reduce((a, s) => a + s.bars, 0) / chordSegments.length;
  }

  const piece: ReferencePiece = {
    sourceKind: 'lead_sheet_text',
    totalBars,
    sections,
    chordSegments,
    rehearsalMarks: [],
    pitchByPart: {},
    noteSamples: [],
    harmonicRhythmBars,
    warnings,
    partial: false,
  };

  return importSuccess(piece, warnings);
}
