/**
 * Tritonic solo bar density — expand one strand note per bar into 3–8 sounding notes.
 */

import type { SoloExportNote } from '../solo/soloMusicContextExport';
import { clampSoloTrebleConcertMidi } from '../solo/soloTreblePitchRange';
import type { TritonicCell } from './tritonicCell';
import type { TritonicStrandNote } from './tritonicStrands';
import { pcToMidiNearAnchor } from './tritonicStrands';

export type TritonicNoteDensityPerBar = {
  /** Minimum sounding notes per bar (default 3). */
  min: number;
  /** Target at low tension (default 4). */
  targetLow: number;
  /** Target at high tension (default 8). */
  targetHigh: number;
};

/** Default solo export density — was implicitly 1 note/bar before v1.7p6. */
export const DEFAULT_TRITONIC_NOTE_DENSITY_PER_BAR: TritonicNoteDensityPerBar = {
  min: 3,
  targetLow: 4,
  targetHigh: 8,
};

const SINGER_MAX_LEAP = 4;

export function targetNoteCountForTension(
  tension: number,
  density: TritonicNoteDensityPerBar = DEFAULT_TRITONIC_NOTE_DENSITY_PER_BAR,
): number {
  const t = Math.max(0, Math.min(1, tension));
  const target = Math.round(density.targetLow + t * (density.targetHigh - density.targetLow));
  return Math.max(density.min, Math.min(density.targetHigh, target));
}

function clampSingerMidi(midi: number): number {
  return clampSoloTrebleConcertMidi(midi);
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

function rhythmicSlotsForCount(
  count: number,
  beatsPerBar: number,
): { startBeat: number; durationBeats: number }[] {
  const span = beatsPerBar / count;
  return Array.from({ length: count }, (_, i) => {
    const startBeat = i * span;
    const durationBeats = Math.max(0.25, Math.min(span * 0.9, beatsPerBar - startBeat - 0.05));
    return { startBeat, durationBeats };
  });
}

function cellPaletteMidis(cell: TritonicCell, anchorMidi: number): number[] {
  const midis = cell.notes.map((pc) => pcToMidiNearAnchor(pc, anchorMidi));
  return [...new Set([clampSingerMidi(anchorMidi), ...midis.map(clampSingerMidi)])];
}

/** Expand singer-safe strand (1 note/bar) to tension-weighted multi-note bars. */
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
  const beatsPerBar = options?.beatsPerBar ?? 4;
  const out: SoloExportNote[] = [];

  for (let i = 0; i < strandNotes.length; i++) {
    const anchor = strandNotes[i]!;
    const cell = cells[i] ?? cells[cells.length - 1]!;
    const noteCount = targetNoteCountForTension(cell.tension, density);
    const slots = rhythmicSlotsForCount(noteCount, beatsPerBar);
    const palette = cellPaletteMidis(cell, anchor.midi);
    let prevMidi = clampSingerMidi(anchor.midi);

    for (let j = 0; j < noteCount; j++) {
      const midi = j === 0 ? prevMidi : stepwiseMidi(prevMidi, palette[j % palette.length]!);
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

/** Count notes per 1-indexed bar. */
export function noteCountByBar(notes: readonly SoloExportNote[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const n of notes) {
    counts.set(n.barIndex, (counts.get(n.barIndex) ?? 0) + 1);
  }
  return counts;
}
