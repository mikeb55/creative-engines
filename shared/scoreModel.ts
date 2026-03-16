/**
 * Shared score model — measure-first architecture.
 * Generation: measure → voices → timed events → export
 * NOT: notes → exporter → measures
 */

/** Single timed event within a measure. All times in beats (0–4 within measure). */
export interface TimedEvent {
  pitch: number;      // MIDI; 0 = rest
  startBeat: number;  // 0–4 within measure
  duration: number;   // in beats
  voice: number;
  staff: number;
  part: string;
}

/** One voice's events within a measure. */
export interface Voice {
  voice: number;
  staff: number;
  part: string;
  events: TimedEvent[];
}

/** One measure: exactly 4 beats. */
export interface Measure {
  index: number;
  chord?: string;
  voices: Voice[];
}

/** Full score: ordered measures. */
export interface Score {
  title?: string;
  measures: Measure[];
  parts?: string[];  // part IDs in order
}

/** Create empty measure. */
export function emptyMeasure(index: number, chord?: string): Measure {
  return { index, chord, voices: [] };
}

/** Create empty voice. */
export function emptyVoice(voice: number, staff: number, part: string): Voice {
  return { voice, staff, part, events: [] };
}

/** Sum duration of events in a voice. */
export function voiceDuration(voice: Voice): number {
  return voice.events.reduce((sum, e) => sum + e.duration, 0);
}

/** Sum duration of all voices in a measure (per voice stream). */
export function measureDurationByStream(measure: Measure): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of measure.voices) {
    const key = `${v.part}:${v.voice}:${v.staff}`;
    out.set(key, (out.get(key) ?? 0) + voiceDuration(v));
  }
  return out;
}
