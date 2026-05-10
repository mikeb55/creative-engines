/**
 * Additive pulse-cycle rhythm (no culture-specific labels).
 * Complements {@link BarMeterMap} / odd-meter quantisation — does not replace bar signatures.
 */

import type { NoteEvent } from '../score-model/scoreModelTypes';

export type AccentClass = 'strong' | 'halfStrong' | 'weak';

export interface CycleDefinition {
  /** Must equal sum(grouping). */
  pulsesPerCycle: number;
  /** Additive cell lengths in pulses (e.g. [3,2,2] → 7). */
  grouping: number[];
  /** One accent class per grouping cell (onset at cell start). */
  accentMap: AccentClass[];
  /** Subdivision for mapping pulses → quarter-note durations on {@link NoteEvent}. */
  pulseUnit: 'sixteenth' | 'eighth';
}

export interface Onset {
  pulseOffset: number;
  accentClass: AccentClass;
  weight: number;
}

export interface RhythmicEvent extends Onset {
  /** Span in pulses until next onset or end of cycle. */
  durationPulses: number;
}

export const ACCENT_SCALE: Record<AccentClass, number> = {
  strong: 1.0,
  halfStrong: 0.65,
  weak: 0.35,
};

export function validateCycle(cycle: CycleDefinition): void {
  const { pulsesPerCycle, grouping, accentMap } = cycle;
  if (!Array.isArray(grouping) || grouping.length === 0) {
    throw new Error('asymmetricRhythmEngine: grouping must be a non-empty array');
  }
  if (!Number.isFinite(pulsesPerCycle) || pulsesPerCycle <= 0 || !Number.isInteger(pulsesPerCycle)) {
    throw new Error('asymmetricRhythmEngine: pulsesPerCycle must be a positive integer');
  }
  if (accentMap.length !== grouping.length) {
    throw new Error(
      `asymmetricRhythmEngine: accentMap length ${accentMap.length} !== grouping length ${grouping.length}`
    );
  }
  let sum = 0;
  for (let i = 0; i < grouping.length; i++) {
    const g = grouping[i]!;
    if (!Number.isFinite(g) || g <= 0 || !Number.isInteger(g)) {
      throw new Error(`asymmetricRhythmEngine: grouping[${i}] must be a positive integer`);
    }
    sum += g;
  }
  if (sum !== pulsesPerCycle) {
    throw new Error(
      `asymmetricRhythmEngine: grouping sum ${sum} !== pulsesPerCycle ${pulsesPerCycle}`
    );
  }
}

export function materializeOnsets(cycle: CycleDefinition): Onset[] {
  validateCycle(cycle);
  const { grouping, accentMap } = cycle;
  let pulseOffset = 0;
  const out: Onset[] = [];
  for (let i = 0; i < grouping.length; i++) {
    const accentClass = accentMap[i]!;
    const weight = ACCENT_SCALE[accentClass];
    out.push({ pulseOffset, accentClass, weight });
    pulseOffset += grouping[i]!;
  }
  return out;
}

export function generateCycle(cycle: CycleDefinition): RhythmicEvent[] {
  const onsets = materializeOnsets(cycle);
  const { pulsesPerCycle } = cycle;
  const out: RhythmicEvent[] = [];
  for (let i = 0; i < onsets.length; i++) {
    const o = onsets[i]!;
    const nextOffset = i + 1 < onsets.length ? onsets[i + 1]!.pulseOffset : pulsesPerCycle;
    const durationPulses = nextOffset - o.pulseOffset;
    if (durationPulses <= 0) {
      throw new Error('asymmetricRhythmEngine: invalid durationPulses (cycle definition bug)');
    }
    out.push({
      pulseOffset: o.pulseOffset,
      accentClass: o.accentClass,
      weight: o.weight,
      durationPulses,
    });
  }
  return out;
}

/** Quarter-note length of one pulse for NoteEvent.duration / spacing. */
export function quartersPerPulse(pulseUnit: 'sixteenth' | 'eighth'): number {
  return pulseUnit === 'sixteenth' ? 0.25 : 0.5;
}

/**
 * Map one cycle of rhythmic events to notes in a single measure.
 * First onset lands on beat 1; later onsets use quarter-note positions from pulse offsets.
 */
export function rhythmicEventsToNoteEvents(
  events: RhythmicEvent[],
  pulseUnit: 'sixteenth' | 'eighth',
  options?: { pitch?: number; voice?: number }
): NoteEvent[] {
  const q = quartersPerPulse(pulseUnit);
  const pitch = options?.pitch ?? 60;
  const voice = options?.voice;
  return events.map((e) => ({
    kind: 'note' as const,
    pitch,
    startBeat: 1 + e.pulseOffset * q,
    duration: e.durationPulses * q,
    ...(voice !== undefined ? { voice } : {}),
  }));
}

/** Total span in quarter-note beats for one full cycle (matches a bar whose meter matches the cycle). */
export function cycleSpanQuarters(cycle: CycleDefinition): number {
  validateCycle(cycle);
  return cycle.pulsesPerCycle * quartersPerPulse(cycle.pulseUnit);
}
