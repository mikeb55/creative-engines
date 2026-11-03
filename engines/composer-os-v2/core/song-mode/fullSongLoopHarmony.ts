/**
 * Timed supplied-harmony contract for full-song generation (Loop Editor → engine).
 *
 * Unlike `lockedHarmonyBarsRaw` (one primary symbol per bar), this input keeps
 * multi-chord bars, rests, and cross-bar holds as absolute quarter-note events.
 *
 * Generation must not invent harmony when this field is present but unsupported:
 * validate, then refuse — never fall back to Song Mode chordPlan.
 */

import type { CanonicalChord } from '../../../core/canonicalChord';
import type { BeatDuration } from '../primitives/primitiveTypes';
import type { BarMeterSignature } from '../rhythm/barMeterTypes';

const QUARTER_EPS = 1e-9;

/** Chord sounding event — structured identity + exact cycle timing. */
export type FullSongLoopHarmonyChordEvent = {
  kind: 'chord';
  /** Absolute onset within the loop cycle, quarter-note beats from cycle start (0). */
  onsetQuarters: number;
  /** Positive duration in quarter-note beats. */
  durationQuarters: BeatDuration;
  /**
   * Structured chord identity (root / quality / extensions / alterations / slash bass / exact text).
   * Prefer {@link parseLeadSheetChordToCanonical} at the Tunepainter boundary.
   */
  chord: CanonicalChord;
};

/** Explicit silence — required; uncovered cycle regions are invalid (no implicit N.C.). */
export type FullSongLoopHarmonyRestEvent = {
  kind: 'rest';
  onsetQuarters: number;
  durationQuarters: BeatDuration;
};

export type FullSongLoopHarmonyEvent =
  | FullSongLoopHarmonyChordEvent
  | FullSongLoopHarmonyRestEvent;

/**
 * One loop cycle of timed harmony.
 *
 * Timing unit: quarter-note beats (absolute). {@link meter} documents the bar grid for
 * later projection; it does not rescale onset/duration.
 */
export type FullSongLoopHarmonyInput = {
  /** Loop cycle length in quarter-note beats (must be &gt; 0). */
  cycleLengthQuarters: number;
  /** Loop metre — reused {@link BarMeterSignature} (numerator / denominator). */
  meter: BarMeterSignature;
  /**
   * Ordered chord/rest events covering `[0, cycleLengthQuarters]` without gaps or overlaps.
   * Onsets ascending; each event abutting the previous (`onset === previousEnd`).
   */
  events: FullSongLoopHarmonyEvent[];
};

export type FullSongLoopHarmonyValidationResult =
  | { ok: true; input: FullSongLoopHarmonyInput }
  | { ok: false; error: string };

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= QUARTER_EPS;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isNonNegFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}

function isCanonicalChord(value: unknown): value is CanonicalChord {
  if (!value || typeof value !== 'object') return false;
  const c = value as CanonicalChord;
  if (typeof c.root !== 'string' || c.root.trim() === '') return false;
  if (typeof c.quality !== 'string' || c.quality.trim() === '') return false;
  if (typeof c.text !== 'string' || c.text.trim() === '') return false;
  if (typeof c.kind !== 'string') return false;
  if (!Array.isArray(c.extensions) || !Array.isArray(c.alterations) || !Array.isArray(c.degreeSet)) {
    return false;
  }
  if (!(c.bass === null || typeof c.bass === 'string')) return false;
  return true;
}

/** Quarters spanned by one bar under {@link meter} (e.g. 4/4 → 4, 7/8 → 3.5). */
export function quartersPerBarFromMeter(meter: BarMeterSignature): number {
  const num = Number(meter?.numerator);
  const den = Number(meter?.denominator);
  if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0) {
    throw new Error('quartersPerBarFromMeter: meter numerator/denominator must be positive finite');
  }
  return (num * 4) / den;
}

/** Song length in quarters from bar count + metre (projection helper; not a quantize of events). */
export function songLengthQuartersFromBars(meter: BarMeterSignature, totalBars: number): number {
  const bars = Math.floor(totalBars);
  if (!Number.isFinite(bars) || bars < 1) {
    throw new Error('songLengthQuartersFromBars: totalBars must be positive integer');
  }
  return bars * quartersPerBarFromMeter(meter);
}

/**
 * Repeat-to-song-length + final-boundary clipping.
 *
 * For song length `D` quarters: tile each cycle event at `onset + k * cycleLength`
 * for `k = 0, 1, …` while `onset + k * cycleLength < D`.
 * If an instance would end past `D`, keep it when `onset < D` and clip
 * `duration` to `D - onset`. Drop instances with `onset >= D`.
 * Do not wrap a clipped tail into the next cycle.
 *
 * Output events stay absolute from song start (0); kind/chord identity preserved.
 */
export function expandFullSongLoopHarmonyToSongLength(
  input: FullSongLoopHarmonyInput,
  songLengthQuarters: number
): FullSongLoopHarmonyEvent[] {
  const validated = validateFullSongLoopHarmony(input);
  if (!validated.ok) {
    throw new Error(`expandFullSongLoopHarmonyToSongLength: ${validated.error}`);
  }
  if (!isPositiveFinite(songLengthQuarters)) {
    throw new Error('expandFullSongLoopHarmonyToSongLength: songLengthQuarters must be positive finite');
  }

  const { cycleLengthQuarters, events } = validated.input;
  const out: FullSongLoopHarmonyEvent[] = [];
  const maxCycles = Math.ceil(songLengthQuarters / cycleLengthQuarters) + 1;

  for (let k = 0; k < maxCycles; k++) {
    const shift = k * cycleLengthQuarters;
    if (shift >= songLengthQuarters - QUARTER_EPS) break;
    for (const ev of events) {
      const onset = ev.onsetQuarters + shift;
      if (onset >= songLengthQuarters - QUARTER_EPS) continue;
      const rawEnd = onset + ev.durationQuarters;
      const end = Math.min(rawEnd, songLengthQuarters);
      const duration = end - onset;
      if (duration <= QUARTER_EPS) continue;
      if (ev.kind === 'rest') {
        out.push({ kind: 'rest', onsetQuarters: onset, durationQuarters: duration });
      } else {
        out.push({
          kind: 'chord',
          onsetQuarters: onset,
          durationQuarters: duration,
          chord: ev.chord,
        });
      }
    }
  }
  return out;
}

/**
 * Focused validator: positive durations, cycle bounds, no overlaps/gaps,
 * explicit rest coverage of the full cycle, structured chord identity.
 */
export function validateFullSongLoopHarmony(
  raw: FullSongLoopHarmonyInput | null | undefined
): FullSongLoopHarmonyValidationResult {
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, error: 'loopHarmony must be an object' };
  }

  const cycleLengthQuarters = (raw as FullSongLoopHarmonyInput).cycleLengthQuarters;
  if (!isPositiveFinite(cycleLengthQuarters)) {
    return { ok: false, error: 'cycleLengthQuarters must be a positive finite number' };
  }

  const meter = (raw as FullSongLoopHarmonyInput).meter;
  if (!meter || typeof meter !== 'object') {
    return { ok: false, error: 'meter is required' };
  }
  const numerator = Math.round(Number(meter.numerator));
  const denominator = Math.round(Number(meter.denominator));
  if (!Number.isFinite(numerator) || numerator <= 0 || !Number.isFinite(denominator) || denominator <= 0) {
    return { ok: false, error: 'meter.numerator and meter.denominator must be positive integers' };
  }

  const events = (raw as FullSongLoopHarmonyInput).events;
  if (!Array.isArray(events) || events.length === 0) {
    return { ok: false, error: 'events must be a non-empty array (explicit rests required for silence)' };
  }

  let cursor = 0;
  const normalized: FullSongLoopHarmonyEvent[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev || typeof ev !== 'object') {
      return { ok: false, error: `events[${i}]: must be an object` };
    }
    if (ev.kind !== 'chord' && ev.kind !== 'rest') {
      return { ok: false, error: `events[${i}]: kind must be "chord" or "rest"` };
    }
    if (!isNonNegFinite(ev.onsetQuarters)) {
      return { ok: false, error: `events[${i}]: onsetQuarters must be a finite number ≥ 0` };
    }
    if (!isPositiveFinite(ev.durationQuarters)) {
      return { ok: false, error: `events[${i}]: durationQuarters must be a positive finite number` };
    }

    const onset = ev.onsetQuarters;
    const duration = ev.durationQuarters;
    const end = onset + duration;

    if (onset > cycleLengthQuarters + QUARTER_EPS) {
      return { ok: false, error: `events[${i}]: onsetQuarters exceeds cycleLengthQuarters` };
    }
    if (end > cycleLengthQuarters + QUARTER_EPS) {
      return {
        ok: false,
        error: `events[${i}]: onset+duration exceeds cycleLengthQuarters (cross-bar holds must fit inside the cycle; tile via expand)`,
      };
    }

    if (onset + QUARTER_EPS < cursor) {
      return { ok: false, error: `events[${i}]: overlaps previous event (onset ${onset} < cursor ${cursor})` };
    }
    if (!nearlyEqual(onset, cursor)) {
      return {
        ok: false,
        error: `events[${i}]: gap before onset (expected ${cursor}, got ${onset}); cover with an explicit rest`,
      };
    }

    if (ev.kind === 'chord') {
      if (!isCanonicalChord(ev.chord)) {
        return {
          ok: false,
          error: `events[${i}]: chord must be CanonicalChord (root, quality, text, bass, extensions, alterations, degreeSet)`,
        };
      }
      normalized.push({
        kind: 'chord',
        onsetQuarters: onset,
        durationQuarters: duration,
        chord: ev.chord,
      });
    } else {
      normalized.push({ kind: 'rest', onsetQuarters: onset, durationQuarters: duration });
    }

    cursor = end;
  }

  if (!nearlyEqual(cursor, cycleLengthQuarters)) {
    return {
      ok: false,
      error: `events do not cover full cycle (covered ${cursor}, cycleLengthQuarters ${cycleLengthQuarters}); pad with explicit rest`,
    };
  }

  return {
    ok: true,
    input: {
      cycleLengthQuarters,
      meter: { numerator, denominator },
      events: normalized,
    },
  };
}

/** Active event at a song-relative quarter position (half-open timeline). */
export type FullSongLoopHarmonyLookupHit = {
  /** Song-relative query position (quarters). */
  atQuarters: number;
  /** Active chord or rest; CanonicalChord (incl. slash bass) preserved on chord hits. */
  event: FullSongLoopHarmonyEvent;
  /**
   * Next change boundary in song quarters — exclusive end of the active event
   * (`onset + duration`, or song end when the active span was clipped).
   * A query exactly on this value belongs to the following event (half-open).
   */
  nextBoundaryQuarters: number;
};

export type FullSongLoopHarmonyLookupResult =
  | { ok: true; hit: FullSongLoopHarmonyLookupHit }
  | { ok: false; error: string };

/**
 * Pure beat-level lookup on an expanded song timeline.
 *
 * Intervals are half-open `[onset, onset + duration)`: a boundary onset belongs
 * to the new event. Does not collapse to bar symbols / MeasureModel.chord.
 *
 * @param timeline - Song-absolute events from {@link expandFullSongLoopHarmonyToSongLength}
 * @param atQuarters - Song-relative quarter-note position
 * @param songLengthQuarters - Exclusive song end (same length used for expand/clip)
 */
export function lookupFullSongLoopHarmonyAt(
  timeline: readonly FullSongLoopHarmonyEvent[],
  atQuarters: number,
  songLengthQuarters: number
): FullSongLoopHarmonyLookupResult {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return { ok: false, error: 'timeline must be a non-empty expanded event list' };
  }
  if (!isNonNegFinite(atQuarters)) {
    return { ok: false, error: 'atQuarters must be a finite number ≥ 0' };
  }
  if (!isPositiveFinite(songLengthQuarters)) {
    return { ok: false, error: 'songLengthQuarters must be a positive finite number' };
  }
  if (atQuarters >= songLengthQuarters - QUARTER_EPS) {
    return {
      ok: false,
      error: `atQuarters ${atQuarters} is at/past song end ${songLengthQuarters} (half-open)`,
    };
  }

  // Binary search: last event with onset <= atQuarters
  let lo = 0;
  let hi = timeline.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const onset = timeline[mid]!.onsetQuarters;
    if (onset <= atQuarters + QUARTER_EPS) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx < 0) {
    return { ok: false, error: `no event covers atQuarters ${atQuarters}` };
  }

  const event = timeline[idx]!;
  const end = event.onsetQuarters + event.durationQuarters;
  if (atQuarters + QUARTER_EPS >= end) {
    return {
      ok: false,
      error: `gap in timeline at ${atQuarters} (event ${idx} ends at ${end})`,
    };
  }

  const nextBoundaryQuarters = Math.min(end, songLengthQuarters);
  return {
    ok: true,
    hit: {
      atQuarters,
      event,
      nextBoundaryQuarters,
    },
  };
}

/**
 * Expand + lookup convenience: validates/tiles/clips then resolves `atQuarters`.
 * Generation still must not consume this for MusicXML until loopHarmony is enabled.
 */
export function lookupFullSongLoopHarmonyInputAt(
  input: FullSongLoopHarmonyInput,
  atQuarters: number,
  songLengthQuarters: number
): FullSongLoopHarmonyLookupResult {
  let timeline: FullSongLoopHarmonyEvent[];
  try {
    timeline = expandFullSongLoopHarmonyToSongLength(input, songLengthQuarters);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  return lookupFullSongLoopHarmonyAt(timeline, atQuarters, songLengthQuarters);
}

/** Integer stretch factors that can align a cycle onto a 4/4 bar grid. */
export type LoopHarmonyStretchFactor = 1 | 2 | 3 | 4;

export type StretchLoopHarmonyToLockedBarsResult =
  | {
      ok: true;
      /** Smallest N ∈ {1,2,3,4} aligning every boundary + cycle end to a 4/4 barline. */
      factor: LoopHarmonyStretchFactor;
      /** One chord symbol per stretched bar (`chord.text`); order preserved; no invented harmony. */
      barSymbols: string[];
      /** Stretched cycle length in quarters (`cycleLengthQuarters * factor`). */
      stretchedCycleLengthQuarters: number;
    }
  | { ok: false; error: string };

const BAR_QUARTERS_4_4 = 4;
const STRETCH_FACTORS: readonly LoopHarmonyStretchFactor[] = [1, 2, 3, 4];

function isMultipleOfBarQuarters(quarters: number): boolean {
  if (!Number.isFinite(quarters) || quarters < -QUARTER_EPS) return false;
  const bars = quarters / BAR_QUARTERS_4_4;
  return Math.abs(bars - Math.round(bars)) <= QUARTER_EPS;
}

/**
 * Opt-in proportional loop → locked bar symbols (pure; does not mutate `input`).
 *
 * Accepts a validated **4/4 chord-only** loop. Chooses the smallest factor N ∈ {1,2,3,4}
 * such that every event boundary and the cycle end, after ×N, is a multiple of 4 quarters.
 * Durations/onsets scale by N; chord order, proportions, CanonicalChord identity and slash
 * bass are preserved. Rejects rests, non-4/4 metres, and loops with no valid factor.
 * Never invents harmony.
 */
export function stretchLoopHarmonyToLockedBars(
  input: FullSongLoopHarmonyInput
): StretchLoopHarmonyToLockedBarsResult {
  const validated = validateFullSongLoopHarmony(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const { cycleLengthQuarters, meter, events } = validated.input;
  if (meter.numerator !== 4 || meter.denominator !== 4) {
    return { ok: false, error: 'stretchLoopHarmonyToLockedBars: meter must be 4/4' };
  }
  for (let i = 0; i < events.length; i++) {
    if (events[i]!.kind === 'rest') {
      return { ok: false, error: `stretchLoopHarmonyToLockedBars: events[${i}] rest not allowed` };
    }
  }

  const boundaries: number[] = [0];
  for (const ev of events) {
    boundaries.push(ev.onsetQuarters + ev.durationQuarters);
  }
  // Last boundary must equal cycle end (validator already enforces coverage).
  if (!nearlyEqual(boundaries[boundaries.length - 1]!, cycleLengthQuarters)) {
    return { ok: false, error: 'stretchLoopHarmonyToLockedBars: cycle coverage mismatch' };
  }

  let factor: LoopHarmonyStretchFactor | null = null;
  for (const n of STRETCH_FACTORS) {
    if (boundaries.every((b) => isMultipleOfBarQuarters(b * n))) {
      factor = n;
      break;
    }
  }
  if (factor === null) {
    return {
      ok: false,
      error: 'stretchLoopHarmonyToLockedBars: no factor in {1,2,3,4} aligns all boundaries to 4/4 barlines',
    };
  }

  const barSymbols: string[] = [];
  for (const ev of events) {
    if (ev.kind !== 'chord') {
      return { ok: false, error: 'stretchLoopHarmonyToLockedBars: unexpected non-chord after rest check' };
    }
    const stretchedDur = ev.durationQuarters * factor;
    if (!isMultipleOfBarQuarters(stretchedDur)) {
      return { ok: false, error: 'stretchLoopHarmonyToLockedBars: stretched duration not an integer bar count' };
    }
    const bars = Math.round(stretchedDur / BAR_QUARTERS_4_4);
    if (bars < 1) {
      return { ok: false, error: 'stretchLoopHarmonyToLockedBars: stretched chord shorter than one bar' };
    }
    const symbol = ev.chord.text;
    for (let i = 0; i < bars; i++) barSymbols.push(symbol);
  }

  const stretchedCycleLengthQuarters = cycleLengthQuarters * factor;
  if (!nearlyEqual(barSymbols.length * BAR_QUARTERS_4_4, stretchedCycleLengthQuarters)) {
    return { ok: false, error: 'stretchLoopHarmonyToLockedBars: barSymbols length mismatch vs stretched cycle' };
  }

  return {
    ok: true,
    factor,
    barSymbols,
    stretchedCycleLengthQuarters,
  };
}
