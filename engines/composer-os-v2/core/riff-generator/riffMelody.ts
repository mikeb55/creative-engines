/**
 * Assign pitches to riff rhythm: chord tones on strong beats, passing tones weak, hook + loop closure.
 */

import type { RiffIntervalWeightMap } from '../composer/riffProfileTypes';
import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import type { ResolvedPitchField } from '../harmony/pitchFieldSpineTypes';
import type { CoreMotif } from '../motif/motifEngineTypes';
import { RIFF_INTERVAL_WEIGHT_SEMITONES } from './riffPitchField';
import type { RiffRhythmSegment, RiffStyleId } from './riffTypes';
import { randInt } from './riffRandom';

/** Peak on these → suppress forced leap inject (step-heavy). */
const ENFORCE_HOOK_STEP_KEYS: ReadonlyArray<keyof RiffIntervalWeightMap> = ['m2', 'M2', 'm3'];
/** Peak (or tie) on these → keep forced leap inject (leap-heavy). */
const ENFORCE_HOOK_LEAP_KEYS: ReadonlyArray<keyof RiffIntervalWeightMap> = ['P4', 'tritone', 'P5'];

/**
 * PR B — when `intervalWeights` peak on ≤M2/m3, skip forced-leap inject.
 * Absent / empty / leap-family peak (P4/P5/tritone) / other peaks (M3/M6) → do not suppress.
 */
export function shouldSuppressEnforceHookLeap(
  weights: RiffIntervalWeightMap | undefined
): boolean {
  if (!weights) return false;
  let maxW = -Infinity;
  let any = false;
  for (const key of Object.keys(RIFF_INTERVAL_WEIGHT_SEMITONES) as Array<keyof RiffIntervalWeightMap>) {
    const w = weights[key];
    if (typeof w !== 'number' || !Number.isFinite(w)) continue;
    any = true;
    if (w > maxW) maxW = w;
  }
  if (!any) return false;
  if (ENFORCE_HOOK_LEAP_KEYS.some((k) => weights[k] === maxW)) return false;
  return ENFORCE_HOOK_STEP_KEYS.some((k) => weights[k] === maxW);
}

const EPS = 1e-5;

function midiInRange(pc: number, low: number, high: number): number {
  let m = low + ((pc % 12) + 12) % 12;
  while (m < low) m += 12;
  while (m > high) m -= 12;
  return Math.max(low, Math.min(high, m));
}

function isStrongBeat(startBeat: number): boolean {
  for (const b of [0, 1, 2, 3]) {
    if (Math.abs(startBeat - b) < 0.15) return true;
  }
  return false;
}

function styleRegister(style: RiffStyleId): { low: number; high: number } {
  switch (style) {
    case 'metheny':
      return { low: 55, high: 76 };
    case 'scofield':
      return { low: 52, high: 74 };
    case 'funk':
      return { low: 50, high: 72 };
    default:
      return { low: 52, high: 75 };
  }
}

/** Pick chord tone or tension for strong beat. */
function strongPitch(
  tones: ChordToneSet,
  chord: string,
  rng: () => number,
  low: number,
  high: number
): number {
  const pool = [tones.root, tones.third, tones.fifth, tones.seventh].filter(
    (p) => p >= low - 12 && p <= high + 12
  );
  if (/13|6/.test(chord)) {
    pool.push(tones.root + 9);
  }
  return midiInRange(pool[randInt(rng, 0, Math.max(0, pool.length - 1))]! % 12, low, high);
}

function passingPitch(prev: number | undefined, tones: ChordToneSet, rng: () => number, low: number, high: number): number {
  const base = prev ?? tones.root;
  const step = randInt(rng, -2, 2);
  let p = base + step;
  p = Math.max(low, Math.min(high, p));
  return p;
}

export function pickWeightedPc(
  pool: Array<{ pc: number; weight: number }>,
  rng: () => number
): number {
  if (pool.length === 0) return 0;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let u = rng() * total;
  for (const e of pool) {
    u -= e.weight;
    if (u <= 0) return e.pc;
  }
  return pool[pool.length - 1]!.pc;
}

/** Directed pitch-class interval 0–11 from previous MIDI to candidate PC. */
export function directedIntervalClass(preferPrevMidi: number, candidatePc: number): number {
  const prevPc = ((preferPrevMidi % 12) + 12) % 12;
  const cand = ((candidatePc % 12) + 12) % 12;
  return (cand - prevPc + 12) % 12;
}

/**
 * Multiply pool weights by preferredIntervals match (directed IC).
 * Unmatched intervals → pass-through factor 1.0 (not a hard filter).
 */
export function applyPreferredIntervalWeightsToPool(
  pool: Array<{ pc: number; weight: number }>,
  preferPrevMidi: number,
  preferredIntervals: Array<{ semitones: number; weight: number }>
): Array<{ pc: number; weight: number }> {
  if (preferredIntervals.length === 0) return pool;
  const byIc = new Map<number, number>();
  for (const iv of preferredIntervals) {
    const ic = ((iv.semitones % 12) + 12) % 12;
    byIc.set(ic, iv.weight);
  }
  return pool.map((e) => {
    const ic = directedIntervalClass(preferPrevMidi, e.pc);
    const factor = byIc.get(ic) ?? 1.0;
    return { pc: e.pc, weight: e.weight * factor };
  });
}

/** Near-prev-PC snap probability: reduced when intervalWeights drive preferredIntervals. */
export const RIFF_NEAR_PREV_SNAP_DEFAULT = 0.65;
export const RIFF_NEAR_PREV_SNAP_WITH_INTERVALS = 0.12;

function pitchFromField(
  field: ResolvedPitchField,
  rng: () => number,
  low: number,
  high: number,
  preferPrev?: number
): number {
  const pool = field.allowedPcs;
  if (pool.length === 0) return midiInRange(0, low, high);

  const preferred = field.preferredIntervals ?? [];
  const hasIntervalBias = preferred.length > 0 && preferPrev !== undefined;
  const weightedPool = hasIntervalBias
    ? applyPreferredIntervalWeightsToPool(pool, preferPrev!, preferred)
    : pool;

  let pc = pickWeightedPc(weightedPool, rng);

  if (preferPrev !== undefined && pool.length > 1) {
    const snapProb = preferred.length > 0 ? RIFF_NEAR_PREV_SNAP_WITH_INTERVALS : RIFF_NEAR_PREV_SNAP_DEFAULT;
    const targetPc = ((preferPrev % 12) + 12) % 12;
    const near = pool
      .map((e) => ({ e, d: Math.min(Math.abs(e.pc - targetPc), 12 - Math.abs(e.pc - targetPc)) }))
      .sort((a, b) => a.d - b.d)[0];
    if (near && rng() < snapProb) pc = near.e.pc;
  }
  return midiInRange(pc, low, high);
}

/** Test seam: run pitchFromField with an explicit field (same path as assignMelodyToBar). */
export function pitchFromFieldForTest(
  field: ResolvedPitchField,
  rng: () => number,
  low: number,
  high: number,
  preferPrev?: number
): number {
  return pitchFromField(field, rng, low, high, preferPrev);
}

/** Snap toward motif interval step from previous pitch (chord-tone pool). */
function pitchFromMotifInterval(
  last: number,
  stepIdx: number,
  coreMotif: CoreMotif,
  tones: ChordToneSet,
  low: number,
  high: number
): number {
  const ip = coreMotif.intervalPattern;
  if (ip.length === 0) return last;
  const step = ip[stepIdx % ip.length];
  const raw = last + step;
  const pool = [tones.root, tones.third, tones.fifth, tones.seventh].filter(
    (p) => p >= low - 12 && p <= high + 12
  );
  let best = midiInRange(raw % 12, low, high);
  let bd = 99;
  for (const p of pool) {
    const c = midiInRange(p % 12, low, high);
    const d = Math.abs(c - raw);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

export interface MelodyLine {
  startBeat: number;
  duration: number;
  pitch: number;
}

/**
 * Build monophonic melody for one bar; `firstBarPitch` seeds loop when bIndex > 0.
 * Optional `coreMotif` biases successive notes to the abstract interval pattern (motif → riff binding).
 */
export function assignMelodyToBar(
  bar: RiffRhythmSegment[],
  chord: string,
  style: RiffStyleId,
  rng: () => number,
  bIndex: number,
  firstBarFirstPitch: number | undefined,
  prevLastPitch: number | undefined,
  coreMotif?: CoreMotif,
  pitchField?: ResolvedPitchField
): { notes: MelodyLine[]; lastPitch: number } {
  const tones = chordTonesForChordSymbol(chord, { lockedHarmony: true });
  const { low, high } = styleRegister(style);
  const notes: MelodyLine[] = [];
  let last = prevLastPitch ?? firstBarFirstPitch;

  for (const s of bar) {
    if (s.rest) continue;
    let pitch: number;
    if (pitchField?.allowedPcs?.length) {
      pitch = pitchFromField(pitchField, rng, low, high, last);
    } else if (isStrongBeat(s.startBeat)) {
      pitch = strongPitch(tones, chord, rng, low, high);
    } else {
      pitch = passingPitch(last, tones, rng, low, high);
    }
    /** Hook: bar 0 first note — favor wider interval on second note */
    if (bIndex === 0 && notes.length === 0) {
      pitch = strongPitch(tones, chord, rng, low, high);
    }
    if (coreMotif && last !== undefined && notes.length > 0) {
      const motifPitch = pitchFromMotifInterval(last, notes.length - 1, coreMotif, tones, low, high);
      pitch = Math.round(0.55 * motifPitch + 0.45 * pitch);
    }
    notes.push({ startBeat: s.startBeat, duration: s.duration, pitch });
    last = pitch;
  }

  if (notes.length === 0) {
    return { notes, lastPitch: last ?? tones.root };
  }
  return { notes, lastPitch: notes[notes.length - 1]!.pitch };
}

/** Enforce hook: ≥4 semitone leap somewhere, or chromatic pair. */
export function enforceHook(
  notes: MelodyLine[],
  rng: () => number,
  intervalWeights?: RiffIntervalWeightMap
): void {
  if (notes.length < 2) return;
  let hasLeap = false;
  let hasChromatic = false;
  for (let i = 1; i < notes.length; i++) {
    const d = Math.abs(notes[i]!.pitch - notes[i - 1]!.pitch);
    if (d >= 4) hasLeap = true;
    if (d === 1) hasChromatic = true;
  }
  if (hasLeap || hasChromatic) return;
  if (shouldSuppressEnforceHookLeap(intervalWeights)) return;
  /** Widen second interval */
  const dir = rng() > 0.5 ? 1 : -1;
  notes[1]!.pitch = Math.max(40, Math.min(90, notes[0]!.pitch + dir * 5));
}

/** Last bar last note leads toward first pitch (loop closure). */
export function applyLoopClosure(
  lastBarNotes: MelodyLine[],
  firstBarFirstPitch: number,
  _rng: () => number
): void {
  if (lastBarNotes.length === 0) return;
  const last = lastBarNotes[lastBarNotes.length - 1]!;
  const targetPc = firstBarFirstPitch % 12;
  const lo = 40;
  const hi = 90;
  const penult = lastBarNotes.length >= 2 ? lastBarNotes[lastBarNotes.length - 2]!.pitch : undefined;
  const candidates: number[] = [];
  for (let k = -6; k <= 10; k++) {
    const p = targetPc + k * 12;
    if (p >= lo && p <= hi) candidates.push(p);
  }
  if (candidates.length === 0) return;
  let best = last.pitch;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const closeToCurrent = Math.abs(c - last.pitch);
    const closeToPenult = penult !== undefined ? Math.abs(c - penult) : 0;
    const leapPenalty = penult !== undefined && closeToPenult > 7 ? 6 : 0;
    const score = closeToCurrent + closeToPenult * 0.35 + leapPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  last.pitch = best;
}
