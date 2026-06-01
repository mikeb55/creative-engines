/**
 * Tritonic solo bar density — floating cells (3–5 notes, min eighth, breath rest).
 */

import type { SoloExportNote } from '../solo/soloMusicContextExport';
import { clampSoloMelodicMidi } from '../solo/soloMusicality';
import type { TritonicCell } from './tritonicCell';
import type { TritonicStrandNote } from './tritonicStrands';
import { pcToMidiNearAnchor } from './tritonicStrands';

export type TritonicNoteDensityPerBar = {
  min: number;
  targetLow: number;
  targetHigh: number;
};

/** v1.7p8 — 3–5 notes per bar, no 16ths. */
export const DEFAULT_TRITONIC_NOTE_DENSITY_PER_BAR: TritonicNoteDensityPerBar = {
  min: 3,
  targetLow: 3,
  targetHigh: 5,
};

const SINGER_MAX_LEAP = 4;

/** Rhythmic cell templates — quarter / dotted quarter / half / max 4 eighths. */
const FLOATING_CELL_TEMPLATES: Array<Array<{ startBeat: number; durationBeats: number }>> = [
  [
    { startBeat: 0.5, durationBeats: 0.5 },
    { startBeat: 1, durationBeats: 1 },
    { startBeat: 2.5, durationBeats: 1.5 },
  ],
  [
    { startBeat: 0, durationBeats: 1 },
    { startBeat: 1, durationBeats: 0.5 },
    { startBeat: 1.5, durationBeats: 0.5 },
    { startBeat: 2, durationBeats: 1.5 },
  ],
  [
    { startBeat: 0.5, durationBeats: 0.5 },
    { startBeat: 1, durationBeats: 0.5 },
    { startBeat: 1.5, durationBeats: 0.5 },
    { startBeat: 2, durationBeats: 0.5 },
    { startBeat: 3, durationBeats: 1 },
  ],
  [
    { startBeat: 0, durationBeats: 1.5 },
    { startBeat: 2, durationBeats: 1 },
    { startBeat: 3, durationBeats: 0.5 },
  ],
  [
    { startBeat: 0, durationBeats: 2 },
    { startBeat: 2.5, durationBeats: 0.5 },
    { startBeat: 3, durationBeats: 0.5 },
  ],
];

export function targetNoteCountForTension(
  tension: number,
  density: TritonicNoteDensityPerBar = DEFAULT_TRITONIC_NOTE_DENSITY_PER_BAR,
): number {
  const t = Math.max(0, Math.min(1, tension));
  const target = Math.round(density.targetLow + t * (density.targetHigh - density.targetLow));
  return Math.max(density.min, Math.min(density.targetHigh, target));
}

function clampSingerMidi(midi: number): number {
  return clampSoloMelodicMidi(midi);
}

function chromaticNeighbor(midi: number, barIndex: number, slot: number): number {
  const dir = (barIndex + slot) % 2 === 0 ? 1 : -1;
  return clampSingerMidi(midi + dir);
}

function stepwiseMidi(prev: number, target: number): number {
  let t = clampSingerMidi(target);
  const leap = t - prev;
  if (Math.abs(leap) > SINGER_MAX_LEAP) {
    t = prev + Math.sign(leap) * Math.min(Math.abs(leap), SINGER_MAX_LEAP);
    t = clampSingerMidi(t);
  }
  return t;
}

function cellPaletteMidis(cell: TritonicCell, anchorMidi: number): number[] {
  const midis = cell.notes.map((pc) => pcToMidiNearAnchor(pc, anchorMidi));
  const base = [...new Set([clampSingerMidi(anchorMidi), ...midis.map(clampSingerMidi)])];
  return base.flatMap((m, i) => [m, chromaticNeighbor(m, i, 0)]);
}

function slotsForBar(barIndex: number, noteCount: number): Array<{ startBeat: number; durationBeats: number }> {
  const template = FLOATING_CELL_TEMPLATES[barIndex % FLOATING_CELL_TEMPLATES.length]!;
  if (noteCount >= template.length) return template;
  return template.slice(0, noteCount);
}

/** Expand strand to floating cells — syncopation + chromaticism, not speed. */
export function expandSoloStrandToBarDensity(
  strandNotes: readonly TritonicStrandNote[],
  cells: readonly TritonicCell[],
  options?: {
    noteDensityPerBar?: Partial<TritonicNoteDensityPerBar>;
    beatsPerBar?: number;
  },
): SoloExportNote[] {
  const density: TritonicNoteDensityPerBar = {
    ...DEFAULT_TRITONIC_NOTE_DENSITY_PER_BAR,
    ...options?.noteDensityPerBar,
  };
  const out: SoloExportNote[] = [];

  for (let i = 0; i < strandNotes.length; i++) {
    const anchor = strandNotes[i]!;
    const cell = cells[i] ?? cells[cells.length - 1]!;
    const noteCount = targetNoteCountForTension(cell.tension, density);
    const slots = slotsForBar(anchor.bar, noteCount);
    const palette = cellPaletteMidis(cell, anchor.midi);
    let prevMidi = clampSingerMidi(anchor.midi);

    for (let j = 0; j < slots.length; j++) {
      const useChromatic = j > 0 && (anchor.bar + j) % 3 === 0;
      const target = palette[(j + anchor.bar) % palette.length]!;
      const midi = j === 0 ? prevMidi : stepwiseMidi(prevMidi, useChromatic ? chromaticNeighbor(target, anchor.bar, j) : target);
      prevMidi = midi;
      const slot = slots[j]!;
      out.push({
        barIndex: anchor.bar,
        startBeat: slot.startBeat,
        durationBeats: slot.durationBeats,
        pitch: midi,
      });
    }
  }

  return out;
}

export function noteCountByBar(notes: readonly SoloExportNote[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const n of notes) {
    counts.set(n.barIndex, (counts.get(n.barIndex) ?? 0) + 1);
  }
  return counts;
}
