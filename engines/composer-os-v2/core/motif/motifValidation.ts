/**
 * Composer OS V2 — Motif validation
 */

import type { MotifTrackerState } from './motifTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';

export interface MotifValidationResult {
  valid: boolean;
  errors: string[];
}

function extractGuitarPitchesByBar(score: ScoreModel): Map<number, number[]> {
  const p = score.parts.find((x) => x.instrumentIdentity === 'clean_electric_guitar');
  if (!p) return new Map();
  const byBar = new Map<number, number[]>();
  for (const m of p.measures) {
    const pitches = m.events
      .filter((e) => e.kind === 'note')
      .map((e) => (e as { pitch: number }).pitch);
    if (pitches.length) byBar.set(m.index, pitches);
  }
  return byBar;
}

/**
 * Guitar note count for motif-content ratio.
 * 8-bar étude: all guitar notes (unchanged).
 * Long-form (>8 bars): only bars with planned motif/LOCK placements — development
 * bars outside those windows must not dilute the ratio.
 */
function guitarNoteCountForMotifRatio(
  guitarPitches: Map<number, number[]>,
  guitarBarCount: number,
  placementBars: ReadonlySet<number>
): number {
  if (guitarBarCount <= 8 || placementBars.size === 0) {
    return [...guitarPitches.values()].reduce((s, arr) => s + arr.length, 0);
  }
  let n = 0;
  for (const bar of placementBars) {
    n += guitarPitches.get(bar)?.length ?? 0;
  }
  return n;
}

export function validateMotifIntegrity(
  state: MotifTrackerState,
  score: ScoreModel
): MotifValidationResult {
  const errors: string[] = [];

  if (state.placements.length < 2) errors.push('No motif reuse: at least 2 placements required');
  if (state.baseMotifs.length < 1) errors.push('No base motifs');

  const variants = new Set(state.placements.map((p) => p.variant));
  if (variants.size < 2 && state.placements.length >= 2) {
    errors.push('No transformation across sections: variation required');
  }

  const aPlacements = state.placements.filter((p) => p.startBar <= 4);
  const bPlacements = state.placements.filter((p) => p.startBar >= 5);
  if (aPlacements.length === 0 || bPlacements.length === 0) {
    errors.push('Motifs must recur across A and B');
  }

  const totalNotes = state.placements.reduce((s, p) => s + p.notes.length, 0);
  const guitarPitches = extractGuitarPitchesByBar(score);
  const guitarBarCount =
    score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar')?.measures.length ?? 0;
  const placementBars = new Set(state.placements.map((p) => p.startBar));
  const scoreNoteCount = guitarNoteCountForMotifRatio(
    guitarPitches,
    guitarBarCount,
    placementBars
  );
  if (scoreNoteCount > 0 && totalNotes > 0) {
    const motifRatio = totalNotes / scoreNoteCount;
    /** 8-bar etude: tight motif/note ratio. Long-form allows more through-composed line vs motif footprint. */
    let minRatio = state.placements.length >= 6 ? 0.42 : 0.3;
    if (guitarBarCount >= 32) {
      minRatio = state.placements.length >= 6 ? 0.28 : 0.2;
    } else if (guitarBarCount >= 16) {
      minRatio = state.placements.length >= 6 ? 0.34 : 0.24;
    }
    if (motifRatio < minRatio) errors.push('Excessive new-note rate: motif content too low');
  }

  return { valid: errors.length === 0, errors };
}
