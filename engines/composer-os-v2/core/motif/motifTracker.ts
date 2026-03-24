/**
 * Composer OS V2 — Motif tracker: vary and place motifs across bars
 */

import type { BaseMotif, MotifNote, PlacedMotif, MotifVariant } from './motifTypes';

/** Transpose motif by semitones. */
export function transposeMotif(notes: MotifNote[], semitones: number): MotifNote[] {
  return notes.map((n) => ({ ...n, pitch: n.pitch + semitones }));
}

/** Light inversion: flip contour around first note. */
export function invertMotifLite(notes: MotifNote[]): MotifNote[] {
  if (notes.length < 2) return notes;
  const first = notes[0].pitch;
  return notes.map((n, i) => ({
    ...n,
    pitch: first - (n.pitch - first),
  }));
}

/** Shift rhythm (startBeat offset). */
export function rhythmShiftMotif(notes: MotifNote[], beatOffset: number): MotifNote[] {
  return notes.map((n) => ({ ...n, startBeat: n.startBeat + beatOffset }));
}

export function varyMotif(
  motif: BaseMotif,
  variant: MotifVariant,
  transposeBy: number = 0,
  beatOffset: number = 0
): MotifNote[] {
  let notes = [...motif.notes];
  if (variant === 'transposed' || transposeBy !== 0) {
    notes = transposeMotif(notes, transposeBy);
  }
  if (variant === 'inversion_lite') {
    notes = invertMotifLite(notes);
  }
  if (variant === 'rhythm_shift' || beatOffset !== 0) {
    notes = rhythmShiftMotif(notes, beatOffset);
  }
  return notes;
}

/** Place single motif at one bar. */
export function placeMotifAtBar(
  motif: BaseMotif,
  startBar: number,
  variant: MotifVariant,
  transposeBy: number,
  beatOffset: number
): PlacedMotif {
  const notes = varyMotif(motif, variant, transposeBy, beatOffset);
  return { motifId: motif.id, startBar, variant, notes };
}

/** Build full placement plan: m1 in A (bar 1) and B (bar 5), m2 in A (bar 3) and B (bar 7). */
export function placeMotifsAcrossBars(motifs: BaseMotif[], seed: number): PlacedMotif[] {
  const placements: PlacedMotif[] = [];
  const r = (n: number) => ((seed + n) % 5) - 2;
  placements.push(placeMotifAtBar(motifs[0], 1, 'original', 0, 0));
  placements.push(placeMotifAtBar(motifs[0], 5, 'transposed', r(1), 0.5));
  if (motifs.length > 1) {
    placements.push(placeMotifAtBar(motifs[1], 3, 'rhythm_shift', 0, (seed % 3) * 0.5));
    placements.push(placeMotifAtBar(motifs[1], 7, 'inversion_lite', r(2), 0));
  }
  return placements;
}
