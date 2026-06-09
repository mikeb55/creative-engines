/**
 * V81b+c - Song Mode lead-planner melody to ImportMelodyNote IR (field mapping only).
 */

import {
  IMPORT_EIGHTH_GRID_BEATS,
  IMPORT_QUANTIZE_SNAP_TOLERANCE_BEATS,
  type ImportFieldOrigin,
  type ImportMelodyNote,
} from '../import/mosaicImportTimeline';
import type { MelodyNoteEvent } from '../song-mode/leadMelodyTypes';

/** Song Mode generated melody row (lead planner output). */
export type ScoreMelodyNote = MelodyNoteEvent;

function snapToGrid(beat: number): number {
  const grid = IMPORT_EIGHTH_GRID_BEATS;
  const snapped = Math.round(beat / grid) * grid;
  if (Math.abs(beat - snapped) <= IMPORT_QUANTIZE_SNAP_TOLERANCE_BEATS) return snapped;
  return snapped;
}

/**
 * Map lead-planner melody events to the same IR shape as MosaicImportTimeline post-parse.
 * No pitch transformation or reharmonisation - field mapping only.
 */
export function scoreMelodyToImportMelody(notes: readonly ScoreMelodyNote[]): ImportMelodyNote[] {
  const fieldOrigin: ImportFieldOrigin = 'explicit';
  return notes.map((n) => ({
    bar: n.measure,
    onsetBeat: snapToGrid(n.beat),
    durationBeats: n.duration,
    midiPitch: n.midi,
    confidence: 1,
    fieldOrigin,
  }));
}
