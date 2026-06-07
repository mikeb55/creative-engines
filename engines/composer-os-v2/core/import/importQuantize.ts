/**
 * V80j quantization helpers - eighth grid, snap tolerance.
 */

import {
  IMPORT_EIGHTH_GRID_BEATS,
  IMPORT_QUANTIZE_SNAP_TOLERANCE_BEATS,
} from './mosaicImportTimeline';

export function snapToEighthGrid(beat: number): { value: number; overflow: boolean } {
  const grid = IMPORT_EIGHTH_GRID_BEATS;
  const nearest = Math.round(beat / grid) * grid;
  const overflow = Math.abs(beat - nearest) > IMPORT_QUANTIZE_SNAP_TOLERANCE_BEATS;
  return { value: Math.max(0, nearest), overflow };
}

export function quantizeDurationBeats(duration: number): number {
  const grid = IMPORT_EIGHTH_GRID_BEATS;
  return Math.max(grid, Math.round(duration / grid) * grid);
}

export function beatsPerBarFromTimeSig(num: number, den: number): number {
  return num * (4 / den);
}

export function globalBeatToBarOnset(
  globalBeat: number,
  beatsPerBar: number
): { bar: number; onsetBeat: number } {
  const bar = Math.floor(globalBeat / beatsPerBar) + 1;
  const onsetBeat = globalBeat - (bar - 1) * beatsPerBar;
  return { bar, onsetBeat };
}
