/**
 * Phase 18.2B — Guitar polyphony inner voice (Wyble-style): contrapuntal line below melody.
 * Export layer untouched; this module only mutates guitar PartModel voice-2 events.
 */

import type { CompositionContext } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel } from '../score-model/scoreModelTypes';
import { addEvent, createNote, createRest } from '../score-model/scoreEventBuilder';
import type { ChordTonesOptions } from '../harmony/chordSymbolAnalysis';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { liftToneToRange, guitarChordTonesInRange } from './guitarPhraseAuthority';

const V2_VOICE = 2;
/** Inner voice register floor (MIDI); kept low for clear gap under melody. */
const INNER_LOW = 48;
/** Never stack more than two simultaneous guitar notes (melody + inner). */
const MAX_GUITAR_SIMULT = 2;
/** Minimum semitones below each overlapping melody pitch (clear gap, still realisable after post-passes). */
const MIN_MELODY_INNER_GAP_SEMITONES = 2;
/** Target share of bars with voice 2 (inclusive). Slightly higher floor/ceiling so V2 stays readable. */
const SPARSITY_MIN_RATIO = 0.28;
const SPARSITY_MAX_RATIO = 0.48;

function chordOpts(context: CompositionContext): ChordTonesOptions | undefined {
  return context.generationMetadata?.customHarmonyLocked ? { lockedHarmony: true } : undefined;
}

/**
 * Strictly below the ceiling pitch (min overlapping V1 pitch for this time span; may shift down octaves).
 */
function placeStrictlyBelowCeiling(ceilingPitch: number, candidate: number, floorMidi: number): number {
  let p = liftToneToRange(candidate, floorMidi, ceilingPitch - 1);
  while (p >= ceilingPitch) p -= 12;
  return Math.max(floorMidi, p);
}

/** Minimum V1 pitch sounding in [t0, t1); none if no overlap. */
function minOverlappingV1Pitch(v1: NoteEvent[], t0: number, t1: number): number | undefined {
  let m = Infinity;
  for (const n of v1) {
    const n1 = n.startBeat + n.duration;
    if (n.startBeat < t1 - 1e-6 && t0 < n1 - 1e-6) {
      m = Math.min(m, n.pitch);
    }
  }
  return m === Infinity ? undefined : m;
}

export function voice2StrictlyBelowOverlappingV1(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  for (const v2n of v2) {
    const t0 = v2n.startBeat;
    const t1 = t0 + v2n.duration;
    for (const v1n of v1) {
      const u1 = v1n.startBeat + v1n.duration;
      if (v1n.startBeat < t1 - 1e-6 && t0 < u1 - 1e-6) {
        if (v2n.pitch >= v1n.pitch) return false;
      }
    }
  }
  return true;
}

const PATTERNS2: number[][] = [
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [0, 5],
  [2, 7],
];
const PATTERNS3: number[][] = [
  [0, 3, 6],
  [1, 4, 7],
  [0, 4, 7],
  [1, 3, 6],
];
const PATTERNS4: number[][] = [
  [0, 2, 4, 6],
  [1, 3, 5, 7],
  [0, 3, 4, 7],
];

/** Deterministic 25–45% of bars; no triple consecutive; never >50% after trim. */
function collectActiveBarIndices(totalBars: number, seed: number): number[] {
  const minB = Math.max(1, Math.ceil(totalBars * SPARSITY_MIN_RATIO));
  const maxB = Math.max(minB, Math.floor(totalBars * SPARSITY_MAX_RATIO));
  const u = seededUnit(seed, 0, 1825);
  const target = Math.round(minB + u * (maxB - minB));
  const sectionCount = Math.ceil(totalBars / 8);
  const baseCounts = Array.from({ length: sectionCount }, () => 3);
  let sum = baseCounts.reduce((a, b) => a + b, 0);
  let rem = target - sum;
  let guard = 0;
  while (rem > 0 && guard < sectionCount * 8) {
    const s = (seed + guard * 7) % sectionCount;
    if (baseCounts[s]! < 4) {
      baseCounts[s]! += 1;
      rem -= 1;
    }
    guard++;
  }
  const active = new Set<number>();
  for (let sec = 0; sec < sectionCount; sec++) {
    const base = sec * 8;
    const n = baseCounts[sec]!;
    const patList = n === 2 ? PATTERNS2 : n === 3 ? PATTERNS3 : PATTERNS4;
    const pat = patList[(Math.abs(seed) + sec * 19) % patList.length]!;
    for (const off of pat) {
      const b = base + off + 1;
      if (b >= 1 && b <= totalBars) active.add(b);
    }
  }
  let sorted = [...active].sort((a, b) => a - b);
  sorted = removeTripleConsecutive(sorted);
  while (sorted.length > maxB && sorted.length > 0) {
    const idx = Math.min(sorted.length - 1, Math.floor(seededUnit(seed, sorted.length, 1827) * sorted.length));
    const drop = sorted[idx]!;
    sorted = sorted.filter((x) => x !== drop);
  }
  for (let tries = 0; tries < totalBars * 4 && sorted.length < minB; tries++) {
    const b = ((tries * 5 + Math.abs(seed)) % totalBars) + 1;
    if (sorted.includes(b)) continue;
    const trial = [...sorted, b].sort((a, c) => a - c);
    if (hasTripleConsecutiveBars(trial)) continue;
    sorted = trial;
  }
  if (sorted.length === 0 && totalBars >= 4) sorted.push(4);
  return sorted;
}

function removeTripleConsecutive(sorted: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]!;
    if (i >= 2 && sorted[i - 1] === b - 1 && sorted[i - 2] === b - 2) continue;
    out.push(b);
  }
  return out;
}

function hasTripleConsecutiveBars(nums: number[]): boolean {
  const s = [...nums].sort((a, b) => a - b);
  for (let i = 2; i < s.length; i++) {
    if (s[i] === s[i - 1]! + 1 && s[i - 1] === s[i - 2]! + 1) return true;
  }
  return false;
}

function v1MelodyContour(notes: NoteEvent[]): 'up' | 'down' | 'flat' {
  if (notes.length < 2) return 'flat';
  const sorted = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  const first = sorted[0]!.pitch;
  const last = sorted[sorted.length - 1]!.pitch;
  if (last > first + 1) return 'up';
  if (last < first - 1) return 'down';
  return 'flat';
}

/** Max simultaneous pitched notes on guitar (voices 1+2) at any instant. */
function maxSimultaneousGuitarNotes(m: MeasureModel): number {
  const noteSpans = m.events
    .filter((e) => e.kind === 'note' && ((e.voice ?? 1) === 1 || (e.voice ?? 1) === 2))
    .map((e) => ({ t0: e.startBeat, t1: e.startBeat + e.duration }));
  if (noteSpans.length === 0) return 0;
  const times = new Set<number>();
  for (const s of noteSpans) {
    times.add(s.t0);
    times.add(s.t1);
    times.add(s.t0 + (s.t1 - s.t0) * 0.5);
  }
  let maxN = 0;
  for (const t of times) {
    const n = noteSpans.filter((s) => t >= s.t0 && t < s.t1 - 1e-9).length;
    maxN = Math.max(maxN, n);
  }
  return maxN;
}

function rhythmMirrorsVoice1(v1Attacks: Set<number>, v2Attacks: Set<number>): boolean {
  if (v1Attacks.size === 0 || v2Attacks.size === 0) return false;
  if (v1Attacks.size !== v2Attacks.size) return false;
  const a = [...v1Attacks].sort((x, y) => x - y).join(',');
  const b = [...v2Attacks].sort((x, y) => x - y).join(',');
  return a === b;
}

/** Any voice-2 attack within ~1/16 of a melody attack (same-beat coupling). */
function v2SharesAttackWithV1(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  for (const v2n of v2) {
    const s = v2n.startBeat;
    for (const v1n of v1) {
      if (Math.abs(v1n.startBeat - s) < 0.09) return true;
    }
  }
  return false;
}

function melodyAttacksBeatZero(v1: NoteEvent[]): boolean {
  return v1.some((n) => Math.abs(n.startBeat) < 0.02);
}

/** Two-note inner line with same first-interval sign as melody (duplicated contour). */
function innerContourDuplicatesMelody(v1: NoteEvent[], v2: NoteEvent[]): boolean {
  const a = [...v1].sort((x, y) => x.startBeat - y.startBeat);
  const b = [...v2].sort((x, y) => x.startBeat - y.startBeat);
  if (a.length < 2 || b.length < 2) return false;
  const d1 = a[1]!.pitch - a[0]!.pitch;
  const d2 = b[1]!.pitch - b[0]!.pitch;
  if (d1 === 0 || d2 === 0) return false;
  return Math.sign(d1) === Math.sign(d2) && Math.abs(d1 - d2) <= 1;
}

/**
 * 3rd/7th (and contour tweak) for one time span.
 * `minOverlappingV1` = min pitch of voice-1 notes overlapping this span.
 * Placement: strictly below min overlapping V1 (per time span).
 */
function pickPrimarySecondaryForSegment(
  minOverlappingV1: number,
  chord: string,
  context: CompositionContext,
  seed: number,
  bar: number,
  segSalt: number,
  _contour: 'up' | 'down' | 'flat'
): { primary: number; secondary: number; innerHigh: number } | null {
  const strictCeiling = minOverlappingV1 - MIN_MELODY_INNER_GAP_SEMITONES + 1;
  if (strictCeiling <= INNER_LOW) return null;
  const innerHigh = Math.min(63, strictCeiling - 1);
  if (innerHigh < INNER_LOW) return null;
  const tones = guitarChordTonesInRange(chord, INNER_LOW, innerHigh, chordOpts(context));
  const preferThirdFirst = seededUnit(seed, bar + segSalt, 1821) < 0.88;
  const pThird = placeStrictlyBelowCeiling(strictCeiling, tones.third, INNER_LOW);
  const pSeventh = placeStrictlyBelowCeiling(strictCeiling, tones.seventh, INNER_LOW);
  const primary = preferThirdFirst ? pThird : pSeventh;
  const secondary = preferThirdFirst ? pSeventh : pThird;
  return { primary, secondary, innerHigh };
}

/**
 * Phase 18.2B: inject sparse inner voice — contrary/oblique preference, 3rd/7th priority,
 * rhythmic independence, max 2 simultaneous guitar notes.
 * @returns number of measures that received voice-2 content
 */
export function injectGuitarVoice2WybleLayer(guitar: PartModel, context: CompositionContext): number {
  if (context.presetId !== 'guitar_bass_duo') {
    return 0;
  }
  const seed = context.seed;
  const tb = context.form.totalBars;
  if (tb < 1) return 0;

  const activeBars = collectActiveBarIndices(tb, seed);
  let injected = 0;

  for (const bar of activeBars) {
    const m = guitar.measures.find((x) => x.index === bar);
    if (!m) continue;

    m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);

    const chord = m.chord ?? 'Cmaj9';
    const v1notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    if (v1notes.length === 0) continue;

    const contour = v1MelodyContour(v1notes);

    const cFull = minOverlappingV1Pitch(v1notes, 0, 4);
    const cHalfBack = minOverlappingV1Pitch(v1notes, 2, 4);
    const rhythmMode = seededUnit(seed, bar, 1823);

    if (rhythmMode < 0.78) {
      if (cHalfBack === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cHalfBack, chord, context, seed, bar, 0, contour);
      if (!pair) continue;
      addEvent(m, createRest(0, 2, V2_VOICE));
      addEvent(m, createNote(pair.primary, 2, 2, V2_VOICE));
    } else if (rhythmMode < 0.95) {
      if (cFull === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 1, contour);
      if (!pair) continue;
      if (!melodyAttacksBeatZero(v1notes)) {
        addEvent(m, createNote(pair.primary, 0, 4, V2_VOICE));
      } else if (cHalfBack !== undefined) {
        const pairH = pickPrimarySecondaryForSegment(cHalfBack, chord, context, seed, bar, 2, contour);
        if (!pairH) continue;
        addEvent(m, createRest(0, 2, V2_VOICE));
        addEvent(m, createNote(pairH.primary, 2, 2, V2_VOICE));
      } else {
        continue;
      }
    } else {
      if (cFull === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 3, contour);
      if (!pair) continue;
      addEvent(m, createRest(0, 3, V2_VOICE));
      addEvent(m, createNote(pair.primary, 3, 1, V2_VOICE));
    }

    m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);

    const repairAttackOffset = (): boolean => {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      if (cHalfBack === undefined) return false;
      const pairH = pickPrimarySecondaryForSegment(cHalfBack, chord, context, seed, bar, 10, contour);
      if (!pairH) return false;
      addEvent(m, createRest(0, 2, V2_VOICE));
      addEvent(m, createNote(pairH.primary, 2, 2, V2_VOICE));
      m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
      let v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
      if (v2SharesAttackWithV1(v1notes, v2r)) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        if (cFull === undefined) return false;
        const pairQ = pickPrimarySecondaryForSegment(cFull, chord, context, seed, bar, 11, contour);
        if (!pairQ) return false;
        addEvent(m, createRest(0, 3, V2_VOICE));
        addEvent(m, createNote(pairQ.primary, 3, 1, V2_VOICE));
        m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
        v2r = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
      }
      return (
        Math.abs(v2r.reduce((s, n) => s + n.duration, 0) - 4) < 0.001 &&
        voice2StrictlyBelowOverlappingV1(v1notes, v2r) &&
        !v2SharesAttackWithV1(v1notes, v2r)
      );
    };

    let v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
    const v2sum = v2notes.reduce((s, n) => s + n.duration, 0);
    if (Math.abs(v2sum - 4) > 0.001) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    if (!voice2StrictlyBelowOverlappingV1(v1notes, v2notes)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    if (v2SharesAttackWithV1(v1notes, v2notes)) {
      if (!repairAttackOffset()) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        continue;
      }
      v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
    }

    if (v2notes.length >= 3 && innerContourDuplicatesMelody(v1notes, v2notes)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    const v1Attacks = new Set(
      v1notes.map((n) => Math.round(n.startBeat * 4) / 4)
    );
    const v2Attacks = new Set(
      m.events
        .filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE)
        .map((e) => Math.round((e as NoteEvent).startBeat * 4) / 4)
    );
    if (rhythmMirrorsVoice1(v1Attacks, v2Attacks)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      const cFb = minOverlappingV1Pitch(v1notes, 2, 4);
      if (cFb === undefined) {
        continue;
      }
      const pairFb = pickPrimarySecondaryForSegment(cFb, chord, context, seed, bar, 99, contour);
      if (!pairFb) continue;
      addEvent(m, createRest(0, 2, V2_VOICE));
      addEvent(m, createNote(pairFb.primary, 2, 2, V2_VOICE));
      m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);
      const v2After = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
      const v2a = new Set(v2After.map((e) => Math.round(e.startBeat * 4) / 4));
      if (
        rhythmMirrorsVoice1(v1Attacks, v2a) ||
        maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT ||
        !voice2StrictlyBelowOverlappingV1(v1notes, v2After)
      ) {
        m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
        continue;
      }
    }

    if (maxSimultaneousGuitarNotes(m) > MAX_GUITAR_SIMULT) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    injected++;
  }

  return injected;
}

/**
 * After post-orchestration / voice-leading edits to voice 1, fix register crossings:
 * try lowering voice 2 by one octave (repeat once); only then drop voice 2 in the bar.
 * Keeps export unchanged; only mutates inner-voice pitches or removes them.
 */
export function stripVoice2IfCrossingMelody(guitar: PartModel): number {
  let strippedBars = 0;
  for (const m of guitar.measures) {
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (v2.length === 0) continue;
    if (voice2StrictlyBelowOverlappingV1(v1, v2)) continue;
    let fixed = false;
    for (let step = 0; step < 3 && !fixed; step++) {
      for (let i = 0; i < m.events.length; i++) {
        const e = m.events[i]!;
        if (e.kind !== 'note' || (e.voice ?? 1) !== V2_VOICE) continue;
        const n = e as NoteEvent;
        m.events[i] = { ...n, pitch: n.pitch - 12 };
      }
      const v2a = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
      if (voice2StrictlyBelowOverlappingV1(v1, v2a)) fixed = true;
    }
    const v2b = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (!voice2StrictlyBelowOverlappingV1(v1, v2b)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      strippedBars += 1;
    }
  }
  return strippedBars;
}
