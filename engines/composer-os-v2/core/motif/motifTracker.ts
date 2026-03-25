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
export function placeMotifsAcrossBars(motifs: BaseMotif[], seed: number, duoLock?: boolean): PlacedMotif[] {
  if (duoLock && motifs.length >= 2) {
    const r = (n: number) => ((seed + n) % 5) - 2;
    const phase = (seed % 11) / 20;
    const placements: PlacedMotif[] = [];
    placements.push(placeMotifAtBar(motifs[0], 1, 'original', 0, 0));
    placements.push(placeMotifAtBar(motifs[0], 2, 'rhythm_shift', 0, 0.25 + phase * 0.25));
    placements.push(placeMotifAtBar(motifs[1], 3, 'original', 0, 0));
    placements.push(placeMotifAtBar(motifs[0], 4, 'transposed', r(1), 0.5));
    placements.push(placeMotifAtBar(motifs[0], 5, 'transposed', r(4), 0.5 + phase));
    placements.push(placeMotifAtBar(motifs[1], 6, 'inversion_lite', r(2), 0.25));
    placements.push(placeMotifAtBar(motifs[1], 7, 'rhythm_shift', 0, ((seed * 3) % 5) * 0.25));
    placements.push(placeMotifAtBar(motifs[0], 8, 'transposed', r(8), 0.75));
    return placements;
  }
  const placements: PlacedMotif[] = [];
  const r = (n: number) => ((seed + n) % 5) - 2;
  const phase = (seed % 11) / 20;
  placements.push(placeMotifAtBar(motifs[0], 1, 'original', 0, 0));
  placements.push(placeMotifAtBar(motifs[0], 5, 'transposed', r(1), 0.5 + phase));
  if (motifs.length > 1) {
    placements.push(placeMotifAtBar(motifs[1], 3, 'rhythm_shift', 0, ((seed * 3) % 5) * 0.25));
    placements.push(placeMotifAtBar(motifs[1], 7, 'inversion_lite', r(2), ((seed * 7) % 5) * 0.25));
  }
  return placements;
}

/** ECM extended form: motif entries each 8-bar cycle, varied transpose/rhythm (no bare 8-bar loop). */
export function placeMotifsForEcmForm(motifs: BaseMotif[], seed: number, totalBars: number): PlacedMotif[] {
  const placements: PlacedMotif[] = [];
  const r = (n: number) => ((seed + n) % 5) - 2;
  const phase = (seed % 11) / 20;
  for (let start = 1; start <= totalBars; start += 8) {
    const c = (start - 1) / 8;
    placements.push(
      placeMotifAtBar(motifs[0], start, c === 0 ? 'original' : 'transposed', r(start + 3), c * 0.15 + phase * 0.5)
    );
    if (start + 4 <= totalBars) {
      placements.push(
        placeMotifAtBar(motifs[0], start + 4, 'transposed', r(start + 9), 0.5 + phase + c * 0.1)
      );
    }
  }
  if (motifs.length > 1) {
    for (let start = 3; start <= totalBars; start += 8) {
      const c = (start - 3) / 8;
      placements.push(
        placeMotifAtBar(
          motifs[1],
          start,
          c % 2 === 0 ? 'rhythm_shift' : 'inversion_lite',
          r(start + 2),
          ((seed * 3 + start) % 5) * 0.25 + c * 0.05
        )
      );
    }
  }
  return placements;
}
