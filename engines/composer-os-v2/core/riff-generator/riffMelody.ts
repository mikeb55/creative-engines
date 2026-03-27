/**
 * Assign pitches to riff rhythm: chord tones on strong beats, passing tones weak, hook + loop closure.
 */

import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';
import { chordTonesFromSymbol } from '../harmony/chordSymbolAnalysis';
import type { RiffRhythmSegment, RiffStyleId } from './riffTypes';
import { randInt } from './riffRandom';

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

export interface MelodyLine {
  startBeat: number;
  duration: number;
  pitch: number;
}

/**
 * Build monophonic melody for one bar; `firstBarPitch` seeds loop when bIndex > 0.
 */
export function assignMelodyToBar(
  bar: RiffRhythmSegment[],
  chord: string,
  style: RiffStyleId,
  rng: () => number,
  bIndex: number,
  firstBarFirstPitch: number | undefined,
  prevLastPitch: number | undefined
): { notes: MelodyLine[]; lastPitch: number } {
  const tones = chordTonesFromSymbol(chord);
  const { low, high } = styleRegister(style);
  const notes: MelodyLine[] = [];
  let last = prevLastPitch ?? firstBarFirstPitch;

  for (const s of bar) {
    if (s.rest) continue;
    let pitch: number;
    if (isStrongBeat(s.startBeat)) {
      pitch = strongPitch(tones, chord, rng, low, high);
    } else {
      pitch = passingPitch(last, tones, rng, low, high);
    }
    /** Hook: bar 0 first note — favor wider interval on second note */
    if (bIndex === 0 && notes.length === 0) {
      pitch = strongPitch(tones, chord, rng, low, high);
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
export function enforceHook(notes: MelodyLine[], rng: () => number): void {
  if (notes.length < 2) return;
  let hasLeap = false;
  let hasChromatic = false;
  for (let i = 1; i < notes.length; i++) {
    const d = Math.abs(notes[i]!.pitch - notes[i - 1]!.pitch);
    if (d >= 4) hasLeap = true;
    if (d === 1) hasChromatic = true;
  }
  if (hasLeap || hasChromatic) return;
  /** Widen second interval */
  const dir = rng() > 0.5 ? 1 : -1;
  notes[1]!.pitch = Math.max(40, Math.min(90, notes[0]!.pitch + dir * 5));
}

/** Last bar last note leads toward first pitch (loop closure). */
export function applyLoopClosure(
  lastBarNotes: MelodyLine[],
  firstBarFirstPitch: number,
  rng: () => number
): void {
  if (lastBarNotes.length === 0) return;
  const last = lastBarNotes[lastBarNotes.length - 1]!;
  const targetPc = firstBarFirstPitch % 12;
  const curPc = last.pitch % 12;
  const diff = ((targetPc - curPc + 6) % 12) - 6;
  if (Math.abs(diff) <= 2) return;
  /** Step toward target */
  last.pitch = last.pitch + (diff > 0 ? 1 : -1) * randInt(rng, 1, 2);
}
