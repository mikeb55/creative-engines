/**
 * Quantise imported GM drum events onto Composer OS 16th-note grid.
 */

import type { GrooveDrumEvent, ImportedGroove } from './importGrooveMidiTypes';

const SIXTEENTH_QUARTER = 0.25;

function quantiseBeat(beat: number): number {
  return Math.round(beat / SIXTEENTH_QUARTER) * SIXTEENTH_QUARTER;
}

/**
 * Snap beat positions to the nearest 16th note; preserve pitch, velocity, and event count.
 * `targetTempo` is reserved for downstream tempo scaling (positions stay in quarter-note units).
 */
export function mapGmDrumsToComposerOsGrooveDrums(
  groove: ImportedGroove,
  _targetTempo: number,
): GrooveDrumEvent[] {
  void _targetTempo;

  const mapped = groove.events.map((event, index) => ({
    event: {
      ...event,
      beatPosition: quantiseBeat(event.beatPosition),
      durationQuarters: quantiseBeat(event.durationQuarters),
    },
    index,
  }));

  mapped.sort(
    (a, b) => a.event.beatPosition - b.event.beatPosition || a.index - b.index,
  );

  return mapped.map((entry) => entry.event);
}

export { SIXTEENTH_QUARTER };
