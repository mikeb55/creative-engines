/**
 * Orbit BB V3 — lead-line authority: alto = locked imported melody; backgrounds defer.
 */

import type { LeadSheet, LeadSheetMelodyNoteEvent } from '../lead-sheet/leadSheetTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel } from '../score-model/scoreModelTypes';

export function orbitMelodyEventsForBar(lead: LeadSheet, bar1: number): LeadSheetMelodyNoteEvent[] {
  return lead.melodyEvents.filter((e) => e.bar === bar1).sort((a, b) => a.beat - b.beat);
}

export function leadBarHasPitchedNotes(lead: LeadSheet | undefined, bar1: number): boolean {
  if (!lead) return false;
  return lead.melodyEvents.some((e) => e.bar === bar1);
}

export function leadAttacksDownbeat(lead: LeadSheet | undefined, bar1: number): boolean {
  if (!lead) return false;
  const evs = orbitMelodyEventsForBar(lead, bar1);
  return evs.some((e) => e.beat < 1e-5 && e.durationBeats > 0);
}

/** Shift brass punch off beat 0 when lead occupies downbeat (grid 0–3 quarter indices). */
export function orbitV3MelodyProtectBrassBeats(
  brassBeats: number[] | undefined,
  leadAtDownbeat: boolean
): number[] | undefined {
  if (!brassBeats?.length || !leadAtDownbeat) return brassBeats;
  return [...new Set(brassBeats.map((b) => (b === 0 ? 2 : b)))].sort((a, b) => a - b);
}

/** Emit exact lead rhythm + MIDI (concert) on alto — gaps filled with rests. */
export function addLockedLeadAltoMeasure(
  measure: MeasureModel,
  events: LeadSheetMelodyNoteEvent[],
  effectiveBeats: number,
  velocity?: number
): void {
  if (events.length === 0) {
    addEvent(measure, createRest(0, effectiveBeats, 1));
    return;
  }
  let t = 0;
  for (const ev of events) {
    const start = Math.min(Math.max(0, ev.beat), effectiveBeats);
    if (start > t + 1e-6) {
      addEvent(measure, createRest(t, start - t, 1));
    }
    const dur = Math.min(ev.durationBeats, effectiveBeats - start);
    if (dur > 1e-6) {
      addEvent(measure, createNote(ev.midi, start, dur, 1, undefined, undefined, velocity));
    }
    t = Math.max(t, start + Math.max(0, dur));
  }
  if (t < effectiveBeats - 1e-6) {
    addEvent(measure, createRest(t, effectiveBeats - t, 1));
  }
}

/** Lead voice sits above pads — slightly hotter than V2 wind tier. */
export function orbitV3AltoLeadVelocity(bar: number): number {
  return Math.min(118, 52 + bar + Math.floor(bar / 4) * 2);
}

export function orbitV3TenorPadVelocity(bar: number): number {
  return Math.max(28, orbitV3AltoLeadVelocity(bar) - 18);
}
