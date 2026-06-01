/**
 * V104p3 — Tritonic timeline: cells placed on bar/beat grid with spans and overlap.
 * Always-on — no feature flag.
 */

import type { TritonicCell } from './tritonicCell';
import type { TritonicRealisationMode } from './tritonicRealisation';

export type TritonicTimelineEvent = {
  /** 1-indexed bar. */
  bar: number;
  /** 1-indexed beat within bar. */
  beat: number;
  /** Duration in beats (may span bar boundaries). */
  duration: number;
  cell: TritonicCell;
};

export type ScheduleTimelineOptions = {
  /** When set (vault path), events stay within this bar span. */
  barCount?: number;
  beatsPerBar?: number;
};

const DEFAULT_BEATS_PER_BAR = 4;

/** End beat position (exclusive) within bar coordinate space from bar 1 beat 1. */
export function timelineEventEndBeat(event: TritonicTimelineEvent, beatsPerBar = DEFAULT_BEATS_PER_BAR): number {
  return (event.bar - 1) * beatsPerBar + event.beat - 1 + event.duration;
}

export function timelineEventStartBeat(event: TritonicTimelineEvent, beatsPerBar = DEFAULT_BEATS_PER_BAR): number {
  return (event.bar - 1) * beatsPerBar + event.beat - 1;
}

/** Count events whose onset falls in `bar` (0..n cells per bar). */
export function countCellsPerBar(
  events: readonly TritonicTimelineEvent[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const e of events) {
    counts.set(e.bar, (counts.get(e.bar) ?? 0) + 1);
  }
  return counts;
}

/** True when any two events occupy overlapping beat ranges. */
export function timelineHasOverlap(
  events: readonly TritonicTimelineEvent[],
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
): boolean {
  for (let i = 0; i < events.length; i++) {
    const aStart = timelineEventStartBeat(events[i]!, beatsPerBar);
    const aEnd = timelineEventEndBeat(events[i]!, beatsPerBar);
    for (let j = i + 1; j < events.length; j++) {
      const bStart = timelineEventStartBeat(events[j]!, beatsPerBar);
      const bEnd = timelineEventEndBeat(events[j]!, beatsPerBar);
      if (aStart < bEnd && bStart < aEnd) return true;
    }
  }
  return false;
}

/** One cell per bar — vault/chart-length solos (bars 1..N). */
function scheduleOnePerBar(cells: readonly TritonicCell[], barCount: number): TritonicTimelineEvent[] {
  const n = Math.min(cells.length, barCount);
  const events: TritonicTimelineEvent[] = [];
  for (let i = 0; i < n; i++) {
    events.push({ bar: i + 1, beat: 1, duration: 4, cell: cells[i]! });
  }
  return events;
}

function scheduleDense(cells: readonly TritonicCell[], barCount: number): TritonicTimelineEvent[] {
  const events: TritonicTimelineEvent[] = [];
  for (let i = 0; i < cells.length; i++) {
    const bar = (Math.floor(i / 2) % barCount) + 1;
    const beat = i % 2 === 0 ? 1 : 3;
    const duration = i % 3 === 0 ? 2 : 1;
    events.push({ bar, beat, duration, cell: cells[i]! });
  }
  return events;
}

/** Sparse placement — empty bars between onsets (0 cells on even-offset bars). */
function scheduleSparse(cells: readonly TritonicCell[], barCount: number): TritonicTimelineEvent[] {
  const events: TritonicTimelineEvent[] = [];
  for (let i = 0; i < cells.length; i++) {
    const bar = Math.min(i * 2 + 1, barCount);
    events.push({ bar, beat: 1, duration: 4, cell: cells[i]! });
  }
  return events;
}

/** Sustained cells with staggered onsets and span/overlap (ECM). */
function scheduleSustained(cells: readonly TritonicCell[], barCount: number): TritonicTimelineEvent[] {
  const events: TritonicTimelineEvent[] = [];
  for (let i = 0; i < cells.length; i++) {
    const bar = Math.min(Math.floor(i / 2) + 1, barCount);
    const beat = i % 2 === 0 ? 1 : 3;
    const duration = i % 2 === 0 ? 3.5 : 2;
    events.push({ bar, beat, duration, cell: cells[i]! });
  }
  return events;
}

function defaultBarSpan(cellCount: number, mode: TritonicRealisationMode): number {
  if (mode === 'sq') return Math.max(cellCount * 2 - 1, cellCount);
  return Math.max(cellCount, 4);
}

/**
 * Map a voice-led cell chain onto a bar/beat timeline (0..n cells per bar, spans, overlap).
 */
export function scheduleTritonicTimeline(
  cells: readonly TritonicCell[],
  mode: TritonicRealisationMode,
  options?: ScheduleTimelineOptions,
): TritonicTimelineEvent[] {
  if (cells.length === 0) return [];
  const barCount = options?.barCount ?? defaultBarSpan(cells.length, mode);
  if (options?.barCount != null && cells.length >= barCount) {
    return scheduleOnePerBar(cells, barCount);
  }
  if (mode === 'bb') return scheduleDense(cells, barCount);
  if (mode === 'sq') return scheduleSparse(cells, barCount);
  return scheduleSustained(cells, barCount);
}

/** Highest bar index referenced by any event (including span tail). */
export function timelineBarSpan(
  events: readonly TritonicTimelineEvent[],
  beatsPerBar = DEFAULT_BEATS_PER_BAR,
): number {
  let maxBar = 0;
  for (const e of events) {
    const endBeat = timelineEventEndBeat(e, beatsPerBar);
    const endBar = Math.floor(endBeat / beatsPerBar) + 1;
    maxBar = Math.max(maxBar, e.bar, endBar);
  }
  return maxBar;
}
