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
  type LongLineTimedBassEvent,
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

/** Degree-step + rhythm cell for lyrical 2–4-bar phrase continuity. */
export interface LyricalMotifCell {
  steps: readonly number[];
  durations: readonly number[];
}

/** Signed shortest step on the degree circle. */
function degreeStepBetween(fromMidi: number, toMidi: number, orderedPcs: readonly number[]): number {
  const n = orderedPcs.length;
  if (n <= 0) return 0;
  const d0 = degreeIndex(fromMidi, orderedPcs);
  const d1 = degreeIndex(toMidi, orderedPcs);
  let step = d1 - d0;
  if (step > n / 2) step -= n;
  if (step < -n / 2) step += n;
  return step;
}

/** Capture contour + rhythm from a bar's note events. */
export function extractLyricalMotif(
  events: readonly LongLineEvent[],
  orderedPcs: readonly number[],
): LyricalMotifCell | null {
  if (events.length === 0) return null;
  const durations = events.map((e) => e.duration);
  const steps: number[] = [];
  for (let i = 1; i < events.length; i += 1) {
    steps.push(degreeStepBetween(events[i - 1]!.midi, events[i]!.midi, orderedPcs));
  }
  return { steps, durations };
}

function varyLyricalDurations(
  base: readonly number[],
  rng: () => number,
  phraseEnding: boolean,
): number[] {
  const out = base.map((d) => d);
  if (out.length === 0) return out;
  // Rhythmic variation: stretch one value, shrink another (keep sparse feel).
  if (out.length >= 2 && rng() < 0.7) {
    const i = randInt(rng, 0, out.length - 1);
    const j = (i + 1) % out.length;
    const stretch = rng() < 0.5 ? 1.5 : 0.75;
    out[i] = Math.max(0.5, Math.round(out[i]! * stretch * 2) / 2);
    out[j] = Math.max(0.5, Math.round(out[j]! * (stretch > 1 ? 0.75 : 1.25) * 2) / 2);
  } else if (out.length === 1 && rng() < 0.5) {
    out[0] = Math.max(1, Math.round(out[0]! * (rng() < 0.5 ? 1.5 : 0.75) * 2) / 2);
  }
  if (phraseEnding) {
    const last = out.length - 1;
    out[last] = Math.max(out[last]!, 2);
  }
  return out;
}

function developLyricalSteps(
  base: readonly number[],
  rng: () => number,
  developIndex: number,
): number[] {
  if (base.length === 0) return [];
  // Contour shaping: invert, or nudge one step, keep identity recognisable.
  // Replace static 0-steps so development does not stall on repeated midis.
  const nonStatic = (steps: number[]): number[] =>
    steps.map((s) => (s === 0 ? pick(rng, [-1, 1] as const) : s));
  if (developIndex > 0 && rng() < 0.55) {
    return nonStatic(base.map((s) => -s));
  }
  if (developIndex > 0 && rng() < 0.4) {
    const out = nonStatic([...base]);
    const i = randInt(rng, 0, out.length - 1);
    const nudge = pick(rng, [-1, 1] as const);
    out[i] = out[i]! + nudge === 0 ? nudge : out[i]! + nudge;
    return out;
  }
  return nonStatic([...base]);
}

/** Signed bass contour at or before `beat` (0 = unknown / static). */
function bassDirectionAt(bass: readonly LongLineTimedBassEvent[], beat: number): number {
  if (bass.length < 2) return 0;
  const sorted = [...bass].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  let dir = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]!.startBeat <= beat + EPS) {
      dir = Math.sign(sorted[i]!.midi - sorted[i - 1]!.midi);
    }
  }
  if (dir !== 0) return dir;
  // Upcoming move in this bar still colours early guitar replies.
  if (beat <= sorted[1]!.startBeat + 0.5) {
    return Math.sign(sorted[1]!.midi - sorted[0]!.midi);
  }
  return 0;
}

/** Prefer a field midi in `wantDir` from cursor (±1 degree), else nearest pool tone. */
function midiTowardDirection(
  pool: readonly number[],
  orderedPcs: readonly number[],
  cursor: number,
  wantDir: number,
  rng: () => number,
): number {
  if (pool.length === 0) return cursor;
  if (wantDir === 0) return cursor;
  const deg = degreeIndex(cursor, orderedPcs);
  const step = wantDir > 0 ? 1 : -1;
  let midi = midiAtDegree(deg + step, orderedPcs, pool, cursor);
  if (midi === cursor && orderedPcs.length > 1) {
    midi = midiAtDegree(deg + step * 2, orderedPcs, pool, cursor);
  }
  if (midi === cursor && pool.length > 1) {
    // Register nudge in the wanted direction when degree walk collapses.
    const candidates = pool.filter((m) => (wantDir > 0 ? m > cursor : m < cursor));
    if (candidates.length > 0) {
      midi = pick(rng, candidates);
    }
  }
  return midi;
}

function bassRhythmGrid(bass: readonly LongLineTimedBassEvent[], beatsPerBar: number): number[] {
  const grid: number[] = [];
  for (const ev of bass) {
    for (const offset of [0, 0.5, 1, 1.5]) {
      const t = ev.startBeat + offset;
      if (t >= -EPS && t < beatsPerBar - 0.25) grid.push(Math.round(t * 1000) / 1000);
    }
  }
  return grid;
}

/**
 * Repack one bar: monotonic onsets, no overlap, clamp to bar span.
 * Preserves pitch classes already validated by caller.
 */
function repackBarEvents(
  events: readonly LongLineEvent[],
  beatsPerBar: number,
  barIndex: number,
): LongLineEvent[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi);
  const out: LongLineEvent[] = [];
  let cursorT = 0;
  for (const ev of sorted) {
    let t = Math.max(ev.startBeat, cursorT);
    t = Math.min(t, Math.max(0, beatsPerBar - 0.25));
    let dur = Math.min(ev.duration, beatsPerBar - t);
    if (dur <= EPS) continue;
    // Keep a little air before the next packed note when we had to push.
    out.push({
      bar: barIndex,
      startBeat: Math.round(t * 1000) / 1000,
      duration: Math.round(dur * 1000) / 1000,
      midi: ev.midi,
      pitchClass: mod12(ev.midi),
    });
    cursorT = t + dur;
    if (cursorT >= beatsPerBar - EPS) break;
  }
  return out.length > 0
    ? out
    : [
        {
          bar: barIndex,
          startBeat: 0,
          duration: Math.min(1, beatsPerBar),
          midi: events[0]!.midi,
          pitchClass: mod12(events[0]!.midi),
        },
      ];
}

/**
 * Lyrical-only guitar↔bass dialogue over a single bar.
 * - complementary spacing around strong bass arrivals
 * - contrary / oblique motion vs bass contour
 * - onsets loosely coupled to the bass rhythm grid
 * Bass events are never rewritten. Pitches stay inside field + register.
 * No-op when bass timing is absent (context-free / midis-only paths).
 */
export function applyLyricalBassDialogue(args: {
  events: readonly LongLineEvent[];
  bassEvents: readonly LongLineTimedBassEvent[];
  pitchClasses: readonly number[];
  register: LongLineRegister;
  beatsPerBar: number;
  barIndex: number;
  seed: number;
}): LongLineEvent[] {
  const { events, bassEvents, beatsPerBar, barIndex, seed } = args;
  if (events.length === 0 || bassEvents.length === 0) {
    return events.map((e) => ({ ...e }));
  }
  const pitchClasses = canonicalPitchSet(args.pitchClasses);
  const pool = midisInRegister(pitchClasses, args.register);
  if (pitchClasses.length === 0 || pool.length === 0) {
    return events.map((e) => ({ ...e }));
  }

  const rng = mulberry32((seed ^ 0x41a7d105 ^ (barIndex * 0x9e3779b9)) >>> 0);
  const arrivals = bassEvents.map((e) => e.startBeat);
  const grid = bassRhythmGrid(bassEvents, beatsPerBar);
  const shaped: LongLineEvent[] = [];
  let cursor = events[0]!.midi;

  for (let i = 0; i < events.length; i += 1) {
    const ev = events[i]!;
    let t = ev.startBeat;
    let dur = ev.duration;
    let midi = ev.midi;
    const prevEnd = shaped.length > 0 ? shaped[shaped.length - 1]!.startBeat + shaped[shaped.length - 1]!.duration : 0;

    // Complementary spacing: avoid stacking attacks on strong bass arrivals.
    const hitArrival = arrivals.find((a) => Math.abs(a - t) < 0.22);
    if (hitArrival !== undefined) {
      const complements = [hitArrival + 0.5, hitArrival + 1, hitArrival - 0.5]
        .map((x) => Math.round(x * 1000) / 1000)
        .filter((x) => x >= prevEnd - EPS && x >= 0 && x < beatsPerBar - 0.25);
      if (complements.length > 0) {
        t = complements.reduce((best, c) => (Math.abs(c - ev.startBeat) < Math.abs(best - ev.startBeat) ? c : best));
      } else {
        t = Math.min(beatsPerBar - 0.5, Math.max(prevEnd, hitArrival + 0.5));
      }
    }

    // Rhythm coupling: if far from every bass-relative slot, snap toward one.
    const nearGrid = grid.some((g) => Math.abs(g - t) < 0.35);
    if (!nearGrid && grid.length > 0 && rng() < 0.6) {
      const legal = grid.filter((g) => g >= prevEnd - EPS && g < beatsPerBar - 0.25);
      if (legal.length > 0) {
        t = legal.reduce((best, g) => (Math.abs(g - t) < Math.abs(best - t) ? g : best));
      }
    }

    // Leave air before a bass arrival that would land inside this sustain.
    for (const arrival of arrivals) {
      if (t + EPS < arrival && t + dur > arrival + EPS) {
        const gapEnd = arrival - 0.125;
        if (gapEnd > t + 0.25) {
          dur = gapEnd - t;
        }
      }
    }

    // Contrary / oblique vs bass contour (first note may still answer an early move).
    const bassDir = bassDirectionAt(bassEvents, t);
    if (bassDir !== 0) {
      const roll = rng();
      if (i === 0) {
        if (roll < 0.45) {
          midi = midiTowardDirection(pool, pitchClasses, midi, -bassDir, rng);
        }
      } else if (roll < 0.55) {
        midi = midiTowardDirection(pool, pitchClasses, cursor, -bassDir, rng);
      } else if (roll < 0.8) {
        // Oblique: hold while bass moves.
        midi = cursor;
      }
    }

    // Keep legal field tone inside register.
    if (!pool.includes(midi)) {
      midi = midiAtDegree(degreeIndex(midi, pitchClasses), pitchClasses, pool, cursor);
    }

    dur = Math.min(dur, beatsPerBar - t);
    if (dur <= EPS) continue;

    shaped.push({
      bar: barIndex,
      startBeat: Math.round(t * 1000) / 1000,
      duration: Math.round(dur * 1000) / 1000,
      midi,
      pitchClass: mod12(midi),
    });
    cursor = midi;
  }

  return repackBarEvents(shaped.length > 0 ? shaped : events, beatsPerBar, barIndex);
}

/**
 * Emit one lyrical bar by developing a motif cell into the current field.
 * Used by harmonic-context phrase continuity and multi-bar lyrical generation.
 */
export function generateLyricalMotifBar(args: {
  pitchClasses: readonly number[];
  register: LongLineRegister;
  seed: number;
  beatsPerBar: number;
  barIndex: number;
  motif: LyricalMotifCell;
  developIndex: number;
  phraseLen: number;
  anchorMidi?: number;
  preferPitchClasses?: readonly number[];
  /** Optional timed bass — lyrical dialogue only; never rewritten. */
  bassEvents?: readonly LongLineTimedBassEvent[];
}): { events: LongLineEvent[]; motif: LyricalMotifCell } {
  const pitchClasses = canonicalPitchSet(args.pitchClasses);
  const pool = midisInRegister(pitchClasses, args.register);
  if (pitchClasses.length === 0 || pool.length === 0) {
    throw new Error('long-line-practice: motif bar needs non-empty field in register');
  }
  const rng = mulberry32((args.seed ^ profileSalt('lyrical') ^ (args.barIndex * 0x85ebca6b)) >>> 0);
  const phraseEnding = args.developIndex >= args.phraseLen - 1;
  const steps = developLyricalSteps(args.motif.steps, rng, args.developIndex);
  const durations = varyLyricalDurations(args.motif.durations, rng, phraseEnding);

  let cursor = pickStartMidi(pool, pitchClasses, args.anchorMidi, args.preferPitchClasses);
  let degree = degreeIndex(cursor, pitchClasses);
  // Leave common-tone join, but do not restart phrase on exact prior midi.
  if (
    args.anchorMidi !== undefined &&
    cursor === args.anchorMidi &&
    pitchClasses.length > 1 &&
    args.developIndex > 0
  ) {
    degree += rng() < 0.5 ? 1 : -1;
    cursor = midiAtDegree(degree, pitchClasses, pool, args.anchorMidi);
    degree = degreeIndex(cursor, pitchClasses);
  }
  let t = 0;
  if (args.developIndex > 0 && rng() < 0.3) {
    t = onsetBias('lyrical', rng, args.beatsPerBar);
  }

  const events: LongLineEvent[] = [];
  const noteCount = Math.max(1, durations.length);
  // Phrase ending: leave trailing space (breath) — cap fill before bar end.
  const fillCap = phraseEnding
    ? Math.max(args.beatsPerBar * 0.55, args.beatsPerBar - 1.5)
    : args.beatsPerBar;

  for (let i = 0; i < noteCount; i += 1) {
    if (t >= fillCap - EPS) break;
    if (i > 0 && rng() < LYRICAL_REST_CHANCE * 0.6 && t > EPS) {
      const restDur = Math.min(0.5, fillCap - t);
      t += restDur;
      if (t >= fillCap - EPS) break;
    }

    if (i > 0) {
      let step = steps[i - 1] ?? pick(rng, LYRICAL_STEPS);
      if (step === 0) step = pick(rng, [-1, 1] as const);
      degree += step;
    }
    let midi = i === 0 ? cursor : midiAtDegree(degree, pitchClasses, pool, cursor);
    // Avoid consecutive unison — lyrical stays sparse, not stuck.
    if (i > 0 && midi === cursor && pitchClasses.length > 1) {
      degree += rng() < 0.5 ? 1 : -1;
      midi = midiAtDegree(degree, pitchClasses, pool, cursor);
    }
    degree = degreeIndex(midi, pitchClasses);
    cursor = midi;

    let dur = durations[i] ?? pick(rng, LYRICAL_DURATIONS);
    if (phraseEnding && i === noteCount - 1) {
      dur = Math.max(dur, Math.min(2, fillCap - t));
    }
    dur = Math.min(dur, fillCap - t);
    if (dur <= EPS) break;

    events.push({
      bar: args.barIndex,
      startBeat: Math.round(t * 1000) / 1000,
      duration: Math.round(dur * 1000) / 1000,
      midi,
      pitchClass: mod12(midi),
    });
    t += dur;
  }

  if (events.length === 0) {
    const midi = pickStartMidi(pool, pitchClasses, args.anchorMidi, args.preferPitchClasses);
    events.push({
      bar: args.barIndex,
      startBeat: 0,
      duration: Math.min(phraseEnding ? 2 : 1, args.beatsPerBar),
      midi,
      pitchClass: mod12(midi),
    });
  }

  const dialogued =
    args.bassEvents && args.bassEvents.length > 0
      ? applyLyricalBassDialogue({
          events,
          bassEvents: args.bassEvents,
          pitchClasses,
          register: args.register,
          beatsPerBar: args.beatsPerBar,
          barIndex: args.barIndex,
          seed: args.seed,
        })
      : events;

  const refreshed = extractLyricalMotif(dialogued, pitchClasses) ?? args.motif;
  return { events: dialogued, motif: refreshed };
}

/**
 * Generate one monophonic long line from a pitch collection.
 * All note pitch classes stay inside the collection; all midis stay in register.
 * Lyrical bars>4: 2–4-bar motif phrases (rhythmic variation, contour, endings).
 * Lyrical bars≤4: legacy path (golden-stable).
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

  // Lyrical phrase windows (bars > 4 only — preserves ≤4-bar golden).
  const useLyricalPhrases = profile === 'lyrical' && bars > 4;
  let phraseLen = 0;
  let phraseIndex = 0;
  let lyricalMotif: LyricalMotifCell | null = null;

  for (let bar = 0; bar < bars; bar += 1) {
    if (useLyricalPhrases) {
      if (phraseIndex >= phraseLen) {
        phraseLen = Math.min(randInt(rng, 2, 4), bars - bar);
        phraseIndex = 0;
        lyricalMotif = null;
      }

      if (lyricalMotif && phraseIndex > 0) {
        const developed = generateLyricalMotifBar({
          pitchClasses,
          register,
          seed: request.seed,
          beatsPerBar,
          barIndex: bar,
          motif: lyricalMotif,
          developIndex: phraseIndex,
          phraseLen,
          anchorMidi: cursor,
        });
        for (const event of developed.events) {
          events.push(event);
          cursor = event.midi;
        }
        degree = degreeIndex(cursor, pitchClasses);
        lane = laneIndexOf(pool, cursor);
        // Keep statement motif for continuity; refresh only on new phrase.
        phraseIndex += 1;
        continue;
      }
    }

    let t = profile === 'experimental' && bar > 0 ? onsetBias(profile, rng, beatsPerBar) % beatsPerBar : 0;
    if (profile === 'lyrical' && bar > 0 && rng() < 0.35) {
      t = onsetBias(profile, rng, beatsPerBar);
    }
    if (profile === 'intervallic' && bar > 0 && rng() < 0.25) {
      t = onsetBias(profile, rng, beatsPerBar);
    }

    // Lyrical phrase ending on free-generated last phrase bar: leave breath.
    const phraseEndingFree =
      useLyricalPhrases && phraseLen > 0 && phraseIndex === phraseLen - 1 && lyricalMotif === null;
    const fillCap = phraseEndingFree
      ? Math.max(beatsPerBar * 0.55, beatsPerBar - 1.5)
      : beatsPerBar;

    while (t < fillCap - EPS) {
      if (rng() < restChance && t > EPS) {
        const restDur = Math.min(pick(rng, durations), fillCap - t);
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
        // Phrase-developed lyrical: fewer static holds so motif cells stay mobile.
        if (useLyricalPhrases && step === 0 && rng() < 0.7) {
          step = pick(rng, [-1, 1] as const);
        }
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
        if (useLyricalPhrases && midi === cursor && pitchClasses.length > 1) {
          degree += rng() < 0.5 ? 1 : -1;
          midi = midiAtDegree(degree, pitchClasses, pool, cursor);
        }
        degree = degreeIndex(midi, pitchClasses);
        lane = laneIndexOf(pool, midi);
      }
      cursor = midi;

      let dur = pick(rng, durations);
      if (profile === 'experimental' && rng() < 0.35) {
        // Asymmetry: stretch or compress once in a while.
        dur = Math.max(0.25, dur * (rng() < 0.5 ? 0.5 : 1.5));
      }
      if (phraseEndingFree && t + dur >= fillCap - EPS) {
        dur = Math.max(dur, Math.min(2, fillCap - t));
      }
      dur = Math.min(dur, fillCap - t);
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
        duration: Math.min(phraseEndingFree ? 2 : 1, beatsPerBar),
        midi,
        pitchClass: mod12(midi),
      });
    }

    if (useLyricalPhrases) {
      const justWrote = events.filter((e) => e.bar === bar);
      if (phraseIndex === 0) {
        lyricalMotif = extractLyricalMotif(justWrote, pitchClasses);
      }
      phraseIndex += 1;
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
