/**
 * Seedable long-line practice generator.
 * Profiles shape contour and rhythm only — no harmony substitution, no riff gates.
 */

import { guitarRange } from '../pentatonic/motifTransform';
import { canonicalPitchSet, mod12 } from '../pentatonic/pitch';
import { mulberry32, pick, randInt } from './prng';
import {
  LONG_LINE_PRACTICE_VERSION,
  type LongLineEvent,
  type LongLineProfile,
  type LongLineRegister,
  type LongLineRequest,
  type LongLineResult,
} from './types';

const EPS = 1e-9;

/** Lyrical: stepwise PC-degree motion, space, longer values. */
const LYRICAL_STEPS = [-2, -1, -1, 0, 1, 1, 2] as const;
const LYRICAL_DURATIONS = [1, 1, 1.5, 2, 2] as const;
const LYRICAL_REST_CHANCE = 0.22;

/**
 * Intervallic: register-lane skips (not PC-wrap) + sequenced cells.
 * Lane steps avoid ±n-collapse that caused same-MIDI repeats under nearest-PC resolve.
 */
const INTERVAL_STEPS = [-6, -5, -4, -3, 3, 4, 5, 6] as const;
const INTERVAL_DURATIONS = [0.5, 0.5, 1, 1] as const;
const INTERVAL_REST_CHANCE = 0.08;

/** Experimental: large lane leaps, odd durations, displacement. */
const EXPERIMENTAL_STEPS = [-9, -8, -7, -5, 5, 7, 8, 9] as const;
const EXPERIMENTAL_DURATIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5] as const;
const EXPERIMENTAL_REST_CHANCE = 0.1;

function profileSalt(profile: LongLineProfile): number {
  switch (profile) {
    case 'lyrical':
      return 0x11c1ca1;
    case 'intervallic':
      return 0x12f3e45;
    case 'experimental':
      return 0x13a9b07;
  }
}

function stepsFor(profile: LongLineProfile): readonly number[] {
  switch (profile) {
    case 'lyrical':
      return LYRICAL_STEPS;
    case 'intervallic':
      return INTERVAL_STEPS;
    case 'experimental':
      return EXPERIMENTAL_STEPS;
  }
}

function durationsFor(profile: LongLineProfile): readonly number[] {
  switch (profile) {
    case 'lyrical':
      return LYRICAL_DURATIONS;
    case 'intervallic':
      return INTERVAL_DURATIONS;
    case 'experimental':
      return EXPERIMENTAL_DURATIONS;
  }
}

function restChanceFor(profile: LongLineProfile): number {
  switch (profile) {
    case 'lyrical':
      return LYRICAL_REST_CHANCE;
    case 'intervallic':
      return INTERVAL_REST_CHANCE;
    case 'experimental':
      return EXPERIMENTAL_REST_CHANCE;
  }
}

/** Build sorted MIDI pool inside register for the given pitch classes. */
export function midisInRegister(pitchClasses: readonly number[], register: LongLineRegister): number[] {
  const set = new Set(canonicalPitchSet(pitchClasses));
  if (set.size === 0) return [];
  const low = Math.trunc(register.low);
  const high = Math.trunc(register.high);
  const out: number[] = [];
  for (let midi = low; midi <= high; midi += 1) {
    if (set.has(mod12(midi))) out.push(midi);
  }
  return out;
}

function degreeIndex(midi: number, orderedPcs: readonly number[]): number {
  const pc = mod12(midi);
  const idx = orderedPcs.indexOf(pc);
  return idx < 0 ? 0 : idx;
}

function midiAtDegree(
  degree: number,
  orderedPcs: readonly number[],
  pool: readonly number[],
  preferNear: number,
): number {
  const n = orderedPcs.length;
  const targetPc = orderedPcs[((degree % n) + n) % n]!;
  const candidates = pool.filter((m) => mod12(m) === targetPc);
  if (candidates.length === 0) return preferNear;
  let best = candidates[0]!;
  let bestDist = Math.abs(best - preferNear);
  for (let i = 1; i < candidates.length; i += 1) {
    const m = candidates[i]!;
    const d = Math.abs(m - preferNear);
    if (d < bestDist || (d === bestDist && m < best)) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/** Nearest index of midi inside sorted register lane (pool). */
function laneIndexOf(pool: readonly number[], midi: number): number {
  let best = 0;
  let bestDist = Math.abs(pool[0]! - midi);
  for (let i = 1; i < pool.length; i += 1) {
    const d = Math.abs(pool[i]! - midi);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Walk a sorted register lane by `step`, reflecting at ends.
 * Reflection flips sequence direction for intervallic development (no pitch collapse).
 */
function stepLaneIndex(
  index: number,
  step: number,
  laneLen: number,
): { index: number; step: number } {
  if (laneLen <= 1) return { index: 0, step };
  let i = index + step;
  let s = step;
  // Reflect until inside [0, laneLen).
  for (let guard = 0; guard < 8 && (i < 0 || i >= laneLen); guard += 1) {
    if (i < 0) {
      i = -i;
      s = -s;
    } else if (i >= laneLen) {
      i = 2 * (laneLen - 1) - i;
      s = -s;
    }
  }
  if (i < 0) i = 0;
  if (i >= laneLen) i = laneLen - 1;
  return { index: i, step: s };
}

/** If lane walk landed on the same midi, nudge by one lane slot (bounce-aware). */
function avoidLaneRepeat(
  index: number,
  step: number,
  laneLen: number,
  pool: readonly number[],
  fromMidi: number,
): { index: number; step: number } {
  if (laneLen <= 1) return { index, step };
  if (pool[index] !== fromMidi) return { index, step };
  const nudge = step === 0 ? 1 : Math.sign(step);
  return stepLaneIndex(index, nudge === 0 ? 1 : nudge, laneLen);
}

function eventSignature(events: readonly LongLineEvent[]): string {
  return events
    .map((e) => `${e.bar}@${e.startBeat}:${e.duration}:${e.midi}`)
    .join('|');
}

/**
 * Context-free default: middle of the pool.
 * With anchor / prefer pcs: nearest legal midi, favouring common-tone pcs when present.
 */
function pickStartMidi(
  pool: readonly number[],
  collection: readonly number[],
  anchorMidi: number | undefined,
  preferPitchClasses: readonly number[] | undefined,
): number {
  if (anchorMidi === undefined && (preferPitchClasses === undefined || preferPitchClasses.length === 0)) {
    return pool[Math.floor(pool.length / 2)]!;
  }
  const prefer = new Set(
    (preferPitchClasses ?? [])
      .map((pc) => mod12(pc))
      .filter((pc) => collection.includes(pc)),
  );
  const preferPool = prefer.size > 0 ? pool.filter((m) => prefer.has(mod12(m))) : pool;
  const usePool = preferPool.length > 0 ? preferPool : pool;
  const anchor = anchorMidi ?? usePool[Math.floor(usePool.length / 2)]!;
  let best = usePool[0]!;
  let bestDist = Math.abs(best - anchor);
  for (let i = 1; i < usePool.length; i += 1) {
    const m = usePool[i]!;
    const d = Math.abs(m - anchor);
    if (d < bestDist || (d === bestDist && m < best)) {
      best = m;
      bestDist = d;
    }
  }
  return best;
}

/** Exported for harmonic-context tests / callers that need a compact signature. */
export function longLineEventSignature(events: readonly LongLineEvent[]): string {
  return eventSignature(events);
}

function onsetBias(profile: LongLineProfile, rng: () => number, beatsPerBar: number): number {
  if (profile === 'experimental') {
    // Displacement: favour off-beat / fractional starts inside the bar.
    const grid = [0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2.25, 2.5, 2.75, 3.25];
    const legal = grid.filter((o) => o < beatsPerBar - EPS);
    return legal.length ? pick(rng, legal) : 0;
  }
  if (profile === 'intervallic') {
    const grid = [0, 0.5, 1, 1.5, 2, 2.5, 3];
    const legal = grid.filter((o) => o < beatsPerBar - EPS);
    return legal.length ? pick(rng, legal) : 0;
  }
  // Lyrical: strong beats first.
  const grid = [0, 1, 2, 3].filter((o) => o < beatsPerBar - EPS);
  return grid.length ? pick(rng, grid) : 0;
}

/**
 * Generate one monophonic long line from a pitch collection.
 * All note pitch classes stay inside the collection; all midis stay in register.
 */
export function generateLongLine(request: LongLineRequest): LongLineResult {
  const pitchClasses = canonicalPitchSet(request.pitchClasses);
  if (pitchClasses.length === 0) {
    throw new Error('long-line-practice: pitchClasses must contain at least one pitch class');
  }
  const bars = Math.trunc(request.bars);
  if (!Number.isFinite(bars) || bars < 1) {
    throw new Error('long-line-practice: bars must be a positive integer');
  }
  const register: LongLineRegister = {
    low: Math.trunc(request.register.low),
    high: Math.trunc(request.register.high),
  };
  if (register.high < register.low) {
    throw new Error('long-line-practice: register.high must be >= register.low');
  }
  const pool = midisInRegister(pitchClasses, register);
  if (pool.length === 0) {
    throw new Error('long-line-practice: no collection pitches fall inside register');
  }

  const beatsPerBar = request.beatsPerBar ?? 4;
  if (!(beatsPerBar > 0)) {
    throw new Error('long-line-practice: beatsPerBar must be positive');
  }

  const profile = request.profile;
  const seed = (request.seed ^ profileSalt(profile)) >>> 0;
  const rng = mulberry32(seed);

  const steps = stepsFor(profile);
  const durations = durationsFor(profile);
  const restChance = restChanceFor(profile);

  let cursor = pickStartMidi(pool, pitchClasses, request.anchorMidi, request.preferPitchClasses);
  let degree = degreeIndex(cursor, pitchClasses);
  let lane = laneIndexOf(pool, cursor);
  const events: LongLineEvent[] = [];
  const useLaneWalk = profile === 'intervallic' || profile === 'experimental';

  // Intervallic: sticky lane-interval cell for short developing sequences.
  let sequenceStep = pick(rng, steps);
  let sequenceLeft = profile === 'intervallic' ? randInt(rng, 3, 5) : 0;

  for (let bar = 0; bar < bars; bar += 1) {
    let t = profile === 'experimental' && bar > 0 ? onsetBias(profile, rng, beatsPerBar) % beatsPerBar : 0;
    if (profile === 'lyrical' && bar > 0 && rng() < 0.35) {
      t = onsetBias(profile, rng, beatsPerBar);
    }
    if (profile === 'intervallic' && bar > 0 && rng() < 0.25) {
      t = onsetBias(profile, rng, beatsPerBar);
    }

    while (t < beatsPerBar - EPS) {
      if (rng() < restChance && t > EPS) {
        const restDur = Math.min(pick(rng, durations), beatsPerBar - t);
        t += restDur;
        continue;
      }

      let step: number;
      if (profile === 'intervallic' && sequenceLeft > 0) {
        step = sequenceStep;
        sequenceLeft -= 1;
        if (sequenceLeft === 0) {
          sequenceStep = pick(rng, steps);
          sequenceLeft = randInt(rng, 3, 5);
        }
      } else {
        step = pick(rng, steps);
      }

      let midi: number;
      if (useLaneWalk) {
        const walked = stepLaneIndex(lane, step, pool.length);
        const avoided = avoidLaneRepeat(walked.index, walked.step, pool.length, pool, cursor);
        lane = avoided.index;
        if (profile === 'intervallic' && avoided.step !== sequenceStep && sequenceLeft > 0) {
          // Register bounce flips the developing sequence direction.
          sequenceStep = avoided.step;
        } else if (profile === 'intervallic' && walked.step !== step) {
          sequenceStep = walked.step;
        }
        midi = pool[lane]!;
        degree = degreeIndex(midi, pitchClasses);
      } else {
        degree += step;
        midi = midiAtDegree(degree, pitchClasses, pool, cursor);
        degree = degreeIndex(midi, pitchClasses);
        lane = laneIndexOf(pool, midi);
      }
      cursor = midi;

      let dur = pick(rng, durations);
      if (profile === 'experimental' && rng() < 0.35) {
        // Asymmetry: stretch or compress once in a while.
        dur = Math.max(0.25, dur * (rng() < 0.5 ? 0.5 : 1.5));
      }
      dur = Math.min(dur, beatsPerBar - t);
      if (dur <= EPS) break;

      events.push({
        bar,
        startBeat: Math.round(t * 1000) / 1000,
        duration: Math.round(dur * 1000) / 1000,
        midi,
        pitchClass: mod12(midi),
      });
      t += dur;
    }

    // Guarantee at least one note per bar when the bar started empty.
    const barNotes = events.filter((e) => e.bar === bar);
    if (barNotes.length === 0) {
      const midi = useLaneWalk
        ? pool[lane]!
        : midiAtDegree(degree, pitchClasses, pool, cursor);
      cursor = midi;
      degree = degreeIndex(midi, pitchClasses);
      lane = laneIndexOf(pool, midi);
      events.push({
        bar,
        startBeat: 0,
        duration: Math.min(1, beatsPerBar),
        midi,
        pitchClass: mod12(midi),
      });
    }
  }

  return {
    version: LONG_LINE_PRACTICE_VERSION,
    profile,
    seed: request.seed,
    bars,
    beatsPerBar,
    pitchClasses,
    register,
    events,
    signature: eventSignature(events),
  };
}

/** Default guitar sounding register from the shared instrument profile. */
export function defaultLongLineRegister(): LongLineRegister {
  const [low, high] = guitarRange();
  return { low, high };
}
