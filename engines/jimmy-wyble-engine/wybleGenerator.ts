/**
 * Jimmy Wyble Engine — Generator: primary upper melody, supportive lower, optional sparse call/response bar.
 */

import type {
  HarmonicContext,
  WybleParameters,
  WybleOutput,
  VoiceLine,
  NoteEvent,
  ImpliedHarmony,
} from './wybleTypes';

const UPPER_MIN = 64;
const UPPER_MAX = 76;
const LOWER_MIN = 48;
const LOWER_MAX = 60;
const VOICE_DISTANCE_MIN = 10;
/** Prefer at least this gap when choosing lower notes (reduces vertical clustering). */
const VOICE_DISTANCE_PREFERRED = 12;
const VOICE_DISTANCE_MAX = 17;
const VOICE_DISTANCE_REJECT = 18;
const PREFERRED_DYAD_INTERVALS = [3, 4, 8, 9, 10, 15, 16, 17];
const MAX_LEAP = 7;
/** Deterministic [0, 1) from integer seed (lower presence variation). */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const SCALE_DEGREES: Record<string, number[]> = {
  maj: [0, 2, 4, 5, 7, 9, 11],
  min: [0, 2, 3, 5, 7, 8, 10],
  dom: [0, 2, 4, 5, 7, 9, 10],
};

const ALTERED_DOMINANT_TONES = [1, 3, 6, 8];
const HALF_WHOLE_DIM = [0, 1, 3, 4, 6, 7, 9, 10];

const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};

function getChordTones(root: string, quality: string, octave: number): number[] {
  const rootMidi = ROOT_MIDI[root] ?? 60;
  const base = rootMidi + (octave - 4) * 12;
  const degrees = SCALE_DEGREES[quality] ?? SCALE_DEGREES.maj;
  return degrees.map(d => base + d);
}

function getChordTonesWithAltered(
  root: string,
  quality: string,
  octave: number,
  alteredBias: number
): number[] {
  const base = getChordTones(root, quality, octave);
  if (quality !== 'dom' || alteredBias <= 0) return base;
  const rootMidi = ROOT_MIDI[root] ?? 60;
  const baseRoot = rootMidi + (octave - 4) * 12;
  const altered = ALTERED_DOMINANT_TONES.map(d => baseRoot + d);
  const hw = HALF_WHOLE_DIM.map(d => baseRoot + d);
  const extra = Math.random() < alteredBias ? altered : hw;
  return [...new Set([...base, ...extra])];
}

function parseChord(chord: string): { root: string; quality: string } {
  const match = chord.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
  if (!match) return { root: 'C', quality: 'maj' };
  let q = (match[2] ?? 'maj').toLowerCase();
  if (q === 'm7' || q === 'min7') q = 'min';
  if (q === '7' || q === 'dom7') q = 'dom';
  if (q === 'maj7') q = 'maj';
  return { root: match[1], quality: q };
}

function normalizeQuality(q: string): string {
  const s = q.toLowerCase();
  if (s === 'm7' || s === 'min7') return 'min';
  if (s === '7' || s === 'dom7') return 'dom';
  if (s === 'maj7') return 'maj';
  return s;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Phrase arc: ascending, descending, or arch (up then down). Stored on each phrase skeleton. */
export type PhraseArcType = 'ascending' | 'descending' | 'arch';

/** @deprecated Use PhraseArcType — alias kept for callers */
export type PhraseDirection = PhraseArcType;

export interface PhraseSkeleton {
  length: number;
  /** Explicit arc: ascending / descending / arch — drives contour + max one direction change (arch only). */
  direction: PhraseArcType;
  /** Signed semitone steps; intervals.length === length - 1. */
  intervals: number[];
}

/** Last completed phrase plan — reused to develop the next phrase (continuity). */
export type PhraseMemory = PhraseSkeleton;

const MAX_PHRASE_BEATS = 12;

function invertPhraseDirection(d: PhraseArcType): PhraseArcType {
  if (d === 'ascending') return 'descending';
  if (d === 'descending') return 'ascending';
  return 'arch';
}

function phraseLengthFromSeed(seed: number, phraseIdx: number, attempt: number): number {
  const r = seededRandom(seed + phraseIdx * 41 + 600 + attempt * 31);
  if (r < 0.72) {
    return 2 + Math.floor(seededRandom(seed + phraseIdx * 41 + 601 + attempt * 31) * 3);
  }
  if (r < 0.92) {
    return Math.min(MAX_PHRASE_BEATS, 5 + Math.floor(seededRandom(seed + phraseIdx * 42 + 700 + attempt) * 4));
  }
  return Math.min(MAX_PHRASE_BEATS, 8 + Math.floor(seededRandom(seed + phraseIdx * 44 + 800 + attempt) * 4));
}

/**
 * Next phrase skeleton from previous: repeat (rare), vary one interval, invert, truncate, or extend (2–3 bars).
 */
function deriveSkeletonFromPrevious(
  prev: PhraseSkeleton,
  seed: number,
  phraseIdx: number,
  remaining: number,
  attempt: number
): PhraseSkeleton {
  if (prev.intervals.length === 0) {
    return trimSkeletonToBeats(
      { length: 2, direction: 'ascending', intervals: [1] },
      remaining
    );
  }

  const roll = seededRandom(seed + phraseIdx * 4001 + attempt * 19);
  let intervals = [...prev.intervals];
  let direction = prev.direction;

  if (roll < 0.06) {
    return trimSkeletonToBeats(
      { length: prev.length, direction: prev.direction, intervals: [...prev.intervals] },
      remaining
    );
  }
  if (roll < 0.28) {
    intervals = intervals.map((x) => clamp(-x, -MAX_LEAP, MAX_LEAP));
    direction = invertPhraseDirection(direction);
  } else if (roll < 0.48) {
    const idx = Math.floor(seededRandom(seed + phraseIdx * 4003 + attempt) * intervals.length);
    const bump = seededRandom(seed + phraseIdx * 4004 + attempt) < 0.5 ? 1 : -1;
    intervals[idx] = clamp(intervals[idx] + bump, -MAX_LEAP, MAX_LEAP);
  } else if (roll < 0.68 && intervals.length > 1) {
    const drop = seededRandom(seed + phraseIdx * 4005 + attempt) < 0.55 ? 1 : 2;
    const keep = Math.max(1, intervals.length - drop);
    intervals = intervals.slice(0, keep);
  } else {
    const net = intervals.reduce((a, b) => a + b, 0);
    const sign =
      net > 0 ? 1 : net < 0 ? -1 : seededRandom(seed + phraseIdx * 4008 + attempt) < 0.5 ? 1 : -1;
    const extra = 2 + Math.floor(seededRandom(seed + phraseIdx * 4006 + attempt) * 3);
    const room = MAX_PHRASE_BEATS - intervals.length - 1;
    const maxAdd = Math.min(extra, Math.max(0, room));
    for (let i = 0; i < maxAdd; i++) {
      const mag = 1 + Math.floor(seededRandom(seed + phraseIdx * 4007 + attempt + i * 3) * 2);
      intervals.push(sign * Math.min(mag, MAX_LEAP));
    }
  }

  if (intervals.length === 0) {
    const sign = seededRandom(seed + phraseIdx * 4010 + attempt) < 0.5 ? 1 : -1;
    intervals = [sign * (1 + Math.floor(seededRandom(seed + phraseIdx * 4011 + attempt) * 2))];
    direction = sign > 0 ? 'ascending' : 'descending';
  }

  const length = intervals.length + 1;
  return trimSkeletonToBeats({ length, direction, intervals }, remaining);
}

function phraseFingerprint(sk: PhraseSkeleton): string {
  return `${sk.direction}|${sk.intervals.join(',')}`;
}

function trimSkeletonToBeats(sk: PhraseSkeleton, maxNotes: number): PhraseSkeleton {
  if (sk.length <= maxNotes) return sk;
  const length = Math.max(1, maxNotes);
  const intervals = length <= 1 ? [] : sk.intervals.slice(0, length - 1);
  return {
    ...sk,
    length,
    intervals,
  };
}

/** Chord tones + common tensions (9 / 11 / 13) in playable octave. */
function getHarmonyPitchesForBeat(
  root: string,
  quality: string,
  octave: number,
  alteredBias: number
): number[] {
  const chordTones = getChordTonesWithAltered(root, quality, octave, alteredBias);
  const rootMidi = ROOT_MIDI[root] ?? 60;
  const baseRoot = rootMidi + (octave - 4) * 12;
  const set = new Set<number>();
  for (const t of chordTones) {
    if (t >= UPPER_MIN - 12 && t <= UPPER_MAX + 12) set.add(t);
  }
  for (const tcp of [2, 5, 9]) {
    for (let k = -2; k <= 2; k++) {
      const p = baseRoot + tcp + k * 12;
      if (p >= UPPER_MIN && p <= UPPER_MAX) set.add(p);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function pitchClassFromRoot(pitch: number, root: string): number {
  const rootMidi = ROOT_MIDI[root] ?? 60;
  return ((pitch - rootMidi) % 12 + 12) % 12;
}

/** Final phrase note must be chord tone or strong tension (9, 11, 13). */
function isLandingPitch(
  pitch: number,
  root: string,
  quality: string,
  octave: number,
  alteredBias: number
): boolean {
  const chordTones = getChordTonesWithAltered(root, quality, octave, alteredBias);
  const rootMidi = ROOT_MIDI[root] ?? 60;
  const ppc = pitchClassFromRoot(pitch, root);
  const chordPcs = new Set(
    chordTones.map((t) => ((t - rootMidi) % 12 + 12) % 12)
  );
  const tensionPcs = [2, 5, 9];
  return chordPcs.has(ppc) || tensionPcs.includes(ppc);
}

const MAX_PHRASE_REGEN = 28;

/** Higher score = stronger preference for phrase resolution (3rd/7th > root/5th > tensions). */
function landingPriority(
  pitch: number,
  root: string,
  quality: string,
  octave: number,
  alteredBias: number
): number {
  const rootMidi = ROOT_MIDI[root] ?? 60;
  const baseRoot = rootMidi + (octave - 4) * 12;
  const pc = ((pitch - baseRoot) % 12 + 12) % 12;
  const q = normalizeQuality(quality);
  const third = q === 'min' ? 3 : 4;
  let s = 0;
  if (pc === third) s += 50;
  if ((q === 'maj' && pc === 11) || ((q === 'min' || q === 'dom') && pc === 10)) s += 45;
  if (pc === 0) s += 28;
  if (pc === 7) s += 22;
  if ([2, 5, 9].includes(pc)) s += 10;
  if (q === 'dom' && alteredBias > 0 && [1, 3, 6, 8].includes(pc)) s += 8;
  return s;
}

/**
 * Mandatory resolution pitch: weighted toward chord tones (3rd/7th/root/5th), else strong tensions.
 */
function pickPhraseTargetMidi(
  endBeat: number,
  harmonicContext: HarmonicContext,
  beatsPerBar: number,
  alteredBias: number,
  seed: number,
  phraseIdx: number
): number | null {
  const { root, quality } = getChordForBeat(harmonicContext, endBeat, beatsPerBar);
  const landing = getHarmonyPitchesForBeat(root, quality, 5, alteredBias).filter(
    (t) =>
      t >= UPPER_MIN &&
      t <= UPPER_MAX &&
      isLandingPitch(t, root, quality, 5, alteredBias)
  );
  if (landing.length === 0) return null;
  const scored = landing.map((p) => ({
    p,
    w: landingPriority(p, root, quality, 5, alteredBias) + seededRandom(seed + phraseIdx * 9001 + p * 3) * 0.01,
  }));
  scored.sort((a, b) => b.w - a.w);
  const top = scored[0]!.w;
  const tier = scored.filter((x) => x.w >= top - 0.05);
  const k = Math.floor(seededRandom(seed + phraseIdx * 9001 + endBeat * 17) * tier.length);
  return tier[k]?.p ?? scored[0]!.p;
}

/** Steps before the arch turns downward (matches buildPhraseSkeleton arch split). */
function archUpStepCount(length: number): number {
  if (length < 2) return 0;
  return Math.max(1, Math.floor((length - 1) / 2));
}

/**
 * Required melodic direction for interior step `stepIdx` (0 = first interval).
 * Arch: first leg ascending, second leg descending toward target.
 */
function requiredStepSign(arc: PhraseArcType, stepIdx: number, phraseLen: number): 1 | -1 {
  if (arc === 'ascending') return 1;
  if (arc === 'descending') return -1;
  return stepIdx < archUpStepCount(phraseLen) ? 1 : -1;
}

/** Counts sign flips between consecutive non-zero melodic steps. */
function directionChangeCount(pitches: number[]): number {
  let lastSign = 0;
  let changes = 0;
  for (let i = 0; i < pitches.length - 1; i++) {
    const d = pitches[i + 1]! - pitches[i]!;
    if (d === 0) continue;
    const s = d > 0 ? 1 : -1;
    if (lastSign !== 0 && s !== lastSign) changes++;
    lastSign = s;
  }
  return changes;
}

function contourValidForArc(pitches: number[], arc: PhraseArcType): boolean {
  if (pitches.length <= 1) return true;
  const changes = directionChangeCount(pitches);
  if (arc === 'arch') return changes <= 1;
  return changes === 0;
}

/** Non-final notes stay on the correct side of the resolution so the line aims at the target. */
function interiorOnCorrectSideOfTarget(
  pitches: number[],
  target: number,
  arc: PhraseArcType
): boolean {
  const n = pitches.length;
  if (n <= 1) return true;
  if (arc === 'ascending') {
    for (let i = 0; i < n - 1; i++) {
      if (pitches[i]! >= target) return false;
    }
  } else if (arc === 'descending') {
    for (let i = 0; i < n - 1; i++) {
      if (pitches[i]! <= target) return false;
    }
  }
  return true;
}

function pickAnchorTowardTarget(
  chainPrev: number,
  harmony: number[],
  target: number,
  phraseLen: number,
  repeatRun: number,
  avoidPitch: number | null,
  arc: PhraseArcType
): number | null {
  let pool = [...harmony];
  if (repeatRun >= 2) {
    const noRepeat = pool.filter((p) => p !== chainPrev);
    if (noRepeat.length > 0) pool = noRepeat;
  }
  if (avoidPitch !== null && pool.length > 1) {
    const noA = pool.filter((p) => p !== avoidPitch);
    if (noA.length > 0) pool = noA;
  }
  if (pool.length === 0) return null;

  let filtered = pool;
  if (arc === 'ascending') {
    const below = pool.filter((p) => p < target);
    if (below.length > 0) filtered = below;
  } else if (arc === 'descending') {
    const above = pool.filter((p) => p > target);
    if (above.length > 0) filtered = above;
  } else {
    const below = pool.filter((p) => p < target);
    if (below.length > 0) filtered = below;
  }
  if (filtered.length === 0) filtered = pool;

  const w = Math.max(1, phraseLen - 1);
  const sorted = [...filtered].sort((a, b) => {
    const da = Math.abs(a - chainPrev) + Math.abs(target - a) / w;
    const db = Math.abs(b - chainPrev) + Math.abs(target - b) / w;
    return da - db;
  });
  return sorted[0] ?? null;
}

/**
 * Backward step: choose p[i] given p[i+1] so the forward step i→i+1 matches arc (target-first path).
 * Prefer stepwise motion for the last 1–2 intervals before the target.
 */
function pickPitchBackwardTowardTarget(
  pNext: number,
  stepIdx: number,
  phraseLen: number,
  arc: PhraseArcType,
  harmony: number[],
  preferApproach: boolean,
  seed: number,
  phraseIdx: number,
  beatTag: number
): number | null {
  const sign = requiredStepSign(arc, stepIdx, phraseLen);
  let cands = harmony.filter((h) => (sign === 1 ? h < pNext : h > pNext));
  cands = cands.filter((h) => {
    const d = Math.abs(h - pNext);
    return d >= 1 && d <= MAX_LEAP;
  });
  if (cands.length === 0) return null;
  if (preferApproach) {
    const tight = cands.filter((h) => {
      const d = Math.abs(h - pNext);
      return d >= 1 && d <= 3;
    });
    if (tight.length > 0) cands = tight;
  }
  cands.sort((a, b) => {
    const da = Math.abs(pNext - a);
    const db = Math.abs(pNext - b);
    if (da !== db) return da - db;
    return seededRandom(seed + phraseIdx * 701 + beatTag * 19 + a * 2) -
      seededRandom(seed + phraseIdx * 701 + beatTag * 19 + b * 2);
  });
  const top = Math.min(4, cands.length);
  const k = Math.floor(seededRandom(seed + phraseIdx * 702 + beatTag * 31) * top);
  return cands[k] ?? cands[0] ?? null;
}

/** First pitch: arc-compatible with p[1], reachable from chainPrev, aimed at target (target-first). */
function pickFirstPitchTargetFirst(
  chainPrev: number,
  p1: number,
  harmony: number[],
  targetMidi: number,
  phraseLen: number,
  repeatRunIn: number,
  avoidPitch: number | null,
  arc: PhraseArcType
): number | null {
  const sign = requiredStepSign(arc, 0, phraseLen);
  const pool = harmony.filter((h) => (sign === 1 ? h < p1 : h > p1));
  if (pool.length === 0) return null;
  return pickAnchorTowardTarget(
    chainPrev,
    pool,
    targetMidi,
    phraseLen,
    repeatRunIn,
    avoidPitch,
    arc
  );
}

function computeRepeatRunAfterPhrase(chainPrev: number, pitches: number[], repeatRunIn: number): number {
  let repeatRun = repeatRunIn;
  let prev = chainPrev;
  for (const p of pitches) {
    if (p === prev) repeatRun++;
    else repeatRun = 1;
    prev = p;
  }
  return repeatRun;
}

/**
 * Pick harmony pitch: ideal = prev + interval (hard). Only harmony adjustment;
 * direction of (next - prev) MUST match interval sign (or equal if interval === 0).
 */
function pickHarmonicStep(
  prev: number,
  interval: number,
  harmony: number[],
  ideal: number,
  isLast: boolean,
  root: string,
  quality: string,
  octave: number,
  alteredBias: number,
  repeatRun: number,
  avoidPitch: number | null
): number | null {
  let cands = harmony.filter((p) => {
    if (interval > 0) return p > prev;
    if (interval < 0) return p < prev;
    return p === prev;
  });
  if (isLast) {
    cands = cands.filter((p) => isLandingPitch(p, root, quality, octave, alteredBias));
  }
  if (repeatRun >= 2 && interval !== 0) {
    cands = cands.filter((p) => p !== prev);
  }
  if (avoidPitch !== null && cands.length > 1) {
    cands = cands.filter((p) => p !== avoidPitch);
  }
  if (cands.length === 0) return null;
  const sorted = [...cands].sort(
    (a, b) => Math.abs(a - ideal) - Math.abs(b - ideal) || Math.abs(a - prev) - Math.abs(b - prev)
  );
  return sorted[0] ?? null;
}

function pickAnchorToHarmony(
  prev: number,
  harmony: number[],
  repeatRun: number,
  avoidPitch: number | null
): number | null {
  let pool = [...harmony];
  if (repeatRun >= 2) {
    const noRepeat = pool.filter((p) => p !== prev);
    if (noRepeat.length > 0) pool = noRepeat;
  }
  if (avoidPitch !== null && pool.length > 1) {
    const noA = pool.filter((p) => p !== avoidPitch);
    if (noA.length > 0) pool = noA;
  }
  if (pool.length === 0) return null;
  const sorted = pool.sort((a, b) => Math.abs(a - prev) - Math.abs(b - prev));
  return sorted[0] ?? null;
}

interface RealizeResult {
  pitches: number[];
  repeatRun: number;
  /** Phrase resolution target (last pitch equals this when realization succeeds). */
  targetMidi: number;
}

function globalPitchAtBeat(
  beat: number,
  startBeat: number,
  upperPrefix: number[],
  phrasePitches: number[]
): number | undefined {
  if (beat < 0) return undefined;
  if (beat < startBeat) return upperPrefix[beat];
  return phrasePitches[beat - startBeat];
}

/**
 * Target-first: pick resolution pitch before any interior note; build backward from target, then first pitch.
 * Last note is always target (strict); approach favors stepwise motion in the last 1–2 intervals.
 */
function tryRealizePhraseHard(
  sk: PhraseSkeleton,
  chainPrev: number,
  startBeat: number,
  upperPrefix: number[],
  harmonicContext: HarmonicContext,
  beatsPerBar: number,
  alteredDominantBias: number,
  repeatRunIn: number,
  seed: number,
  phraseIdx: number
): RealizeResult | null {
  const endBeat = startBeat + sk.length - 1;
  const targetMidi = pickPhraseTargetMidi(
    endBeat,
    harmonicContext,
    beatsPerBar,
    alteredDominantBias,
    seed,
    phraseIdx
  );
  if (targetMidi === null) return null;

  if (sk.length === 1) {
    const b = startBeat;
    const { root, quality } = getChordForBeat(harmonicContext, b, beatsPerBar);
    let harmony = getHarmonyPitchesForBeat(root, quality, 5, alteredDominantBias).filter(
      (t) => t >= UPPER_MIN && t <= UPPER_MAX
    );
    harmony = harmony.filter((p) => isLandingPitch(p, root, quality, 5, alteredDominantBias));
    if (!harmony.includes(targetMidi)) return null;
    let avoidPitch: number | null = null;
    if (b >= 2) {
      const pA = upperPrefix[b - 2];
      const pM = upperPrefix[b - 1];
      if (pA !== undefined && pM !== undefined && pA !== pM) avoidPitch = pA;
    }
    if (
      avoidPitch !== null &&
      targetMidi === avoidPitch &&
      harmony.some((p) => p !== avoidPitch && p !== chainPrev)
    ) {
      return null;
    }
    let repeatRun = repeatRunIn;
    if (targetMidi === chainPrev) repeatRun++;
    else repeatRun = 1;
    return { pitches: [targetMidi], repeatRun, targetMidi };
  }

  const n = sk.length;
  const { root: lr, quality: lq } = getChordForBeat(harmonicContext, endBeat, beatsPerBar);
  const harmonyLast = getHarmonyPitchesForBeat(lr, lq, 5, alteredDominantBias).filter(
    (t) => t >= UPPER_MIN && t <= UPPER_MAX
  );
  if (
    !harmonyLast.includes(targetMidi) ||
    !isLandingPitch(targetMidi, lr, lq, 5, alteredDominantBias)
  ) {
    return null;
  }

  const pitches: number[] = new Array(n);
  pitches[n - 1] = targetMidi;

  for (let i = n - 2; i >= 1; i--) {
    const b = startBeat + i;
    const { root, quality } = getChordForBeat(harmonicContext, b, beatsPerBar);
    const harmony = getHarmonyPitchesForBeat(root, quality, 5, alteredDominantBias).filter(
      (t) => t >= UPPER_MIN && t <= UPPER_MAX
    );
    if (harmony.length === 0) return null;
    const preferApproach = i >= n - 3;
    const p = pickPitchBackwardTowardTarget(
      pitches[i + 1]!,
      i,
      n,
      sk.direction,
      harmony,
      preferApproach,
      seed,
      phraseIdx,
      i
    );
    if (p === null) return null;
    pitches[i] = p;
  }

  const b0 = startBeat;
  const { root: r0, quality: q0 } = getChordForBeat(harmonicContext, b0, beatsPerBar);
  const harmony0 = getHarmonyPitchesForBeat(r0, q0, 5, alteredDominantBias).filter(
    (t) => t >= UPPER_MIN && t <= UPPER_MAX
  );
  if (harmony0.length === 0) return null;
  let avoidPitch0: number | null = null;
  if (b0 >= 2) {
    const pA = upperPrefix[b0 - 2];
    const pM = upperPrefix[b0 - 1];
    if (pA !== undefined && pM !== undefined && pA !== pM) avoidPitch0 = pA;
  }
  const p0 = pickFirstPitchTargetFirst(
    chainPrev,
    pitches[1]!,
    harmony0,
    targetMidi,
    n,
    repeatRunIn,
    avoidPitch0,
    sk.direction
  );
  if (p0 === null) return null;
  pitches[0] = p0;

  for (let i = 0; i < n; i++) {
    const b = startBeat + i;
    const { root, quality } = getChordForBeat(harmonicContext, b, beatsPerBar);
    const harmony = getHarmonyPitchesForBeat(root, quality, 5, alteredDominantBias).filter(
      (t) => t >= UPPER_MIN && t <= UPPER_MAX
    );
    if (!harmony.includes(pitches[i]!)) return null;
    const prevP = i === 0 ? chainPrev : pitches[i - 1]!;
    let avoidPitch: number | null = null;
    if (b >= 2) {
      const pA = globalPitchAtBeat(b - 2, startBeat, upperPrefix, pitches);
      const pM = globalPitchAtBeat(b - 1, startBeat, upperPrefix, pitches);
      if (pA !== undefined && pM !== undefined && pA !== pM) avoidPitch = pA;
    }
    if (
      avoidPitch !== null &&
      pitches[i] === avoidPitch &&
      harmony.some((p) => p !== avoidPitch && p !== prevP)
    ) {
      return null;
    }
  }

  if (pitches[n - 1] !== targetMidi) return null;
  if (!contourValidForArc(pitches, sk.direction)) return null;
  if (!interiorOnCorrectSideOfTarget(pitches, targetMidi, sk.direction)) return null;

  const repeatRun = computeRepeatRunAfterPhrase(chainPrev, pitches, repeatRunIn);

  return { pitches, repeatRun, targetMidi };
}

/**
 * Build interval plan (2–4 notes). Arch = rise then fall (or reverse). No reuse of previous fingerprint.
 */
function buildPhraseSkeleton(
  seed: number,
  phraseIdx: number,
  prevFingerprint: string,
  attempt: number
): PhraseSkeleton {
  const length = phraseLengthFromSeed(seed, phraseIdx, attempt);
  const r = seededRandom(seed + phraseIdx * 11 + 700 + attempt * 13);
  let direction: PhraseArcType =
    r < 0.34 ? 'arch' : r < 0.67 ? 'ascending' : 'descending';
  const intervals: number[] = [];
  let leapUsed: boolean = false;

  if (direction === 'arch' && length >= 3) {
    const half = Math.max(1, Math.floor((length - 1) / 2));
    const sign1 = seededRandom(seed + phraseIdx * 11 + 702 + attempt) < 0.5 ? 1 : -1;
    for (let i = 0; i < length - 1; i++) {
      const leg = i < half ? sign1 : -sign1;
      const lu: boolean = leapUsed;
      const takeLeap: boolean = !lu && seededRandom(seed + phraseIdx * 13 + i * 19 + 801 + attempt) < 0.28;
      const mag = takeLeap
        ? 3 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2)
        : 1 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2);
      leapUsed = lu || takeLeap;
      intervals.push(leg * Math.min(mag, MAX_LEAP));
    }
  } else {
    const sign =
      direction === 'ascending'
        ? 1
        : direction === 'descending'
          ? -1
          : seededRandom(seed + phraseIdx * 11 + 888 + attempt) < 0.5
            ? 1
            : -1;
    for (let i = 0; i < length - 1; i++) {
      const lu: boolean = leapUsed;
      const takeLeap: boolean = !lu && seededRandom(seed + phraseIdx * 13 + i * 19 + 801 + attempt) < 0.32;
      const mag = takeLeap
        ? 3 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2)
        : 1 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2);
      leapUsed = lu || takeLeap;
      intervals.push(sign * Math.min(mag, MAX_LEAP));
    }
  }

  let sk: PhraseSkeleton = { length, direction, intervals };
  let fp = phraseFingerprint(sk);
  if (prevFingerprint && fp === prevFingerprint && intervals.length > 0) {
    const last = intervals.length - 1;
    const bump = sk.direction === 'descending' ? -1 : 1;
    intervals[last] = clamp(intervals[last] + bump, -MAX_LEAP, MAX_LEAP);
    sk = { length, direction, intervals: [...intervals] };
  }
  return sk;
}

/** Guaranteed small phrase — still interval-driven; used only after many failed regenerations. */
function buildFallbackPhraseSkeleton(remaining: number, seed: number, phraseIdx: number): PhraseSkeleton {
  if (remaining <= 1) {
    return { length: 1, direction: 'ascending', intervals: [] };
  }
  const length = Math.min(2, remaining);
  const sign = seededRandom(seed + phraseIdx * 999 + 777) < 0.5 ? 1 : -1;
  return {
    length,
    direction: sign > 0 ? 'ascending' : 'descending',
    intervals: [sign * (1 + Math.floor(seededRandom(seed + phraseIdx * 1001) * 2))],
  };
}

function phraseMetaAtBeat(
  b: number,
  phraseLengths: number[]
): { phraseIdx: number; posInPhrase: number; phraseLen: number } {
  let beat = 0;
  for (let pi = 0; pi < phraseLengths.length; pi++) {
    const len = phraseLengths[pi];
    if (b >= beat && b < beat + len) {
      return { phraseIdx: pi, posInPhrase: b - beat, phraseLen: len };
    }
    beat += len;
  }
  const lastLen = phraseLengths[phraseLengths.length - 1] ?? 4;
  return {
    phraseIdx: Math.max(0, phraseLengths.length - 1),
    posInPhrase: 0,
    phraseLen: lastLen,
  };
}

function getChordForBeat(
  ctx: HarmonicContext,
  beatIndex: number,
  beatsPerBar: number
): { root: string; quality: string } {
  const bar = Math.floor(beatIndex / beatsPerBar);
  const canon = ctx.canonicalChords;
  if (canon && canon.length > 0) {
    const c = canon[Math.min(bar, canon.length - 1)];
    if (c) return { root: c.root, quality: c.quality };
  }
  const chords = ctx.chords;
  let chordIndex = 0;
  let acc = 0;
  for (let i = 0; i < chords.length; i++) {
    const ch = chords[i];
    const bars = typeof ch === 'object' && 'bars' in ch
      ? (ch as { bars: number }).bars
      : Math.max(1, Math.ceil(32 / chords.length));
    if (bar < acc + bars) {
      chordIndex = i;
      break;
    }
    acc += bars;
  }
  const chord = chords[Math.min(chordIndex, chords.length - 1)] ?? chords[0];
  return typeof chord === 'string'
    ? parseChord(chord)
    : { root: (chord as { root: string }).root, quality: normalizeQuality((chord as { quality: string }).quality) };
}

export interface UpperVoiceResult {
  pitches: number[];
  phraseLengths: number[];
  /** Net semitone motion first→last pitch per phrase (realized line). */
  phraseNetDeltas: number[];
  /** Planned phrase arc per segment (ascending / descending / arch). */
  phraseDirections: PhraseDirection[];
  /** Mandatory resolution pitch per phrase (last note equals this). */
  phraseTargets: number[];
}

/**
 * Upper line: interval plan is mandatory; pitches are harmony-adjusted realizations of prev + interval[i].
 */
function generateUpperVoice(
  totalBeats: number,
  harmonicContext: HarmonicContext,
  params: WybleParameters,
  seed: number
): UpperVoiceResult {
  const { motifSeed, alteredDominantBias = 0 } = params;
  const beatsPerBar = 4;
  const upper: number[] = [];
  const phraseLengths: number[] = [];
  const phraseNetDeltas: number[] = [];
  const phraseDirections: PhraseDirection[] = [];
  const phraseTargets: number[] = [];
  let last = motifSeed?.[0] ?? 67;
  let repeatRun = 0;
  let b = 0;
  let phraseIdx = 0;
  let prevFp = '';
  let lastPhraseMemory: PhraseMemory | null = null;

  while (b < totalBeats) {
    const remaining = totalBeats - b;
    let realized: RealizeResult | null = null;
    let skUsed: PhraseSkeleton | null = null;

    for (let att = 0; att < MAX_PHRASE_REGEN; att++) {
      const memoryBias = lastPhraseMemory ? Math.max(0.18, 0.52 - att * 0.045) : 0;
      const useMemory =
        lastPhraseMemory !== null &&
        seededRandom(seed + phraseIdx * 5000 + att * 41) < memoryBias;
      let sk: PhraseSkeleton;
      if (useMemory) {
        sk = deriveSkeletonFromPrevious(lastPhraseMemory!, seed, phraseIdx, remaining, att);
      } else {
        sk = buildPhraseSkeleton(seed, phraseIdx, prevFp, att);
      }
      sk = trimSkeletonToBeats(sk, remaining);
      const r = tryRealizePhraseHard(
        sk,
        last,
        b,
        upper,
        harmonicContext,
        beatsPerBar,
        alteredDominantBias,
        repeatRun,
        seed,
        phraseIdx
      );
      if (r !== null) {
        realized = r;
        skUsed = sk;
        prevFp = phraseFingerprint(sk);
        break;
      }
    }

    if (realized === null) {
      let sk = buildFallbackPhraseSkeleton(remaining, seed, phraseIdx);
      sk = trimSkeletonToBeats(sk, remaining);
      let r = tryRealizePhraseHard(
        sk,
        last,
        b,
        upper,
        harmonicContext,
        beatsPerBar,
        alteredDominantBias,
        repeatRun,
        seed,
        phraseIdx
      );
      if (r === null) {
        sk = {
          ...sk,
          intervals: sk.intervals.map((x) => -x),
        };
        r = tryRealizePhraseHard(
          sk,
          last,
          b,
          upper,
          harmonicContext,
          beatsPerBar,
          alteredDominantBias,
          repeatRun,
          seed,
          phraseIdx
        );
      }
      if (r === null) {
        sk = { length: 1, direction: 'ascending', intervals: [] };
        r = tryRealizePhraseHard(
          sk,
          last,
          b,
          upper,
          harmonicContext,
          beatsPerBar,
          alteredDominantBias,
          repeatRun,
          seed,
          phraseIdx
        );
      }
      if (r === null) {
        const { root, quality } = getChordForBeat(harmonicContext, b, beatsPerBar);
        const tones = getChordTonesWithAltered(root, quality, 5, alteredDominantBias).filter(
          (t) => t >= UPPER_MIN && t <= UPPER_MAX
        );
        const emergency = tones.length > 0 ? tones[0]! : clamp(last, UPPER_MIN, UPPER_MAX);
        realized = {
          pitches: [emergency],
          repeatRun: emergency === last ? repeatRun + 1 : 1,
          targetMidi: emergency,
        };
        skUsed = { length: 1, direction: 'ascending', intervals: [] };
        prevFp = phraseFingerprint(skUsed);
      } else {
        realized = r;
        skUsed = sk;
        prevFp = phraseFingerprint(sk);
      }
    }

    for (const p of realized.pitches) upper.push(p);
    repeatRun = realized.repeatRun;
    last = upper[upper.length - 1]!;
    phraseDirections.push(skUsed!.direction);
    phraseTargets.push(realized.targetMidi);
    phraseLengths.push(realized.pitches.length);
    const start = upper.length - realized.pitches.length;
    const first = upper[start]!;
    const end = upper[upper.length - 1]!;
    phraseNetDeltas.push(end - first);
    b += realized.pitches.length;
    phraseIdx++;
    const mem: PhraseSkeleton = skUsed!;
    lastPhraseMemory = {
      length: mem.length,
      direction: mem.direction,
      intervals: [...mem.intervals],
    };
  }

  return { pitches: upper, phraseLengths, phraseNetDeltas, phraseDirections, phraseTargets };
}

function getGuideTones(root: string, quality: string, octave: number): number[] {
  const chordTones = getChordTones(root, quality, octave);
  const rootMidi = ROOT_MIDI[root] ?? 60;
  return chordTones.filter(t => {
    const pc = ((t - rootMidi) % 12 + 12) % 12;
    return pc === 3 || pc === 4 || pc === 10 || pc === 11;
  });
}

function phraseDirSign(d: PhraseDirection): number {
  if (d === 'ascending') return 1;
  if (d === 'descending') return -1;
  return 0;
}

/** Rough upper-voice motion density in ±2 beats (for space trading). */
function upperLocalMotionWindow(upperPitches: number[], b: number): number {
  let sum = 0;
  for (let k = Math.max(0, b - 2); k <= Math.min(upperPitches.length - 1, b + 1); k++) {
    if (k > 0) sum += Math.abs(upperPitches[k]! - upperPitches[k - 1]!);
  }
  return sum;
}

/**
 * Lower line: conversational counterpoint — phrase-aware response, contrary bias, space trading vs upper motion.
 */
function generateLowerVoice(
  totalBeats: number,
  harmonicContext: HarmonicContext,
  upperPitches: number[],
  params: WybleParameters,
  seed: number,
  phraseLengths: number[],
  phraseNetDeltas: number[],
  phraseDirections: PhraseDirection[],
  phraseTargets: number[]
): number[] {
  const { motifSeed, pedalToneEnabled = false } = params;
  const beatsPerBar = 4;
  const lower: number[] = [];
  let last = motifSeed?.[1] ?? 55;
  const chords = harmonicContext.chords;

  if (pedalToneEnabled && chords.length > 0) {
    const firstCanon = harmonicContext.canonicalChords?.[0];
    const first = chords[0];
    const parsed = firstCanon
      ? { root: firstCanon.root, quality: firstCanon.quality }
      : typeof first === 'string'
        ? parseChord(first)
        : { root: (first as { root: string }).root, quality: 'maj' };
    const rootMidi = ROOT_MIDI[parsed.root] ?? 60;
    const pedal = clamp(rootMidi - 12, LOWER_MIN, LOWER_MAX);
    for (let b = 0; b < totalBeats; b++) lower.push(pedal);
    return lower;
  }

  for (let b = 0; b < totalBeats; b++) {
    const beatInBar = b % beatsPerBar;
    const isStrongBeat = beatInBar === 1 || beatInBar === 3;
    const { root, quality } = getChordForBeat(harmonicContext, b, beatsPerBar);
    const chordTones = getChordTones(root, quality, 3).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);
    const guideTones = getGuideTones(root, quality, 3).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);
    const upperNow = upperPitches[b] ?? 67;
    const uDelta = b > 0 ? upperPitches[b] - upperPitches[b - 1] : 0;
    const meta = phraseMetaAtBeat(b, phraseLengths);
    const phraseIdx = meta.phraseIdx;
    const net =
      phraseIdx < phraseNetDeltas.length ? phraseNetDeltas[phraseIdx] : 0;
    const pSign =
      phraseIdx < phraseDirections.length
        ? phraseDirSign(phraseDirections[phraseIdx])
        : 0;

    const belowUpper = chordTones.filter((t) => t < upperNow - VOICE_DISTANCE_MIN && t >= LOWER_MIN);
    const upperMotionWin = upperLocalMotionWindow(upperPitches, b);
    const upperBusy = upperMotionWin >= 8;
    const upperSparseWindow = upperMotionWin <= 3;
    const supportBlend =
      upperBusy ? seededRandom(seed + b * 29 + 503) < 0.38 : seededRandom(seed + b * 29 + 503) < 0.72;

    const strongBeatPool = guideTones.length > 0 ? guideTones : chordTones;
    const pool = isStrongBeat ? strongBeatPool : chordTones;
    let effectiveCandidates = (pool.length > 0 ? pool : chordTones).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);

    /** Contrast boost: strong upper motion → hold lower (sustain) instead of shadowing motion. */
    if (
      Math.abs(uDelta) >= 2 &&
      chordTones.length > 0 &&
      seededRandom(seed + b * 31 + 9200) < (upperBusy ? 0.38 : 0.26)
    ) {
      lower.push(clamp(last, LOWER_MIN, LOWER_MAX));
      continue;
    }

    /** Phrase start: light contrary gesture keyed to this phrase’s contour (not generic). */
    if (
      meta.posInPhrase === 0 &&
      chordTones.length > 0 &&
      !upperBusy &&
      seededRandom(seed + phraseIdx * 91 + 2200) < 0.16
    ) {
      const contrarySign = -Math.sign(pSign || net || 1);
      const step = contrarySign * (1 + Math.floor(seededRandom(seed + b * 19 + 2300) * 2));
      const ansTarget = clamp(last + step, LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - ansTarget) < Math.abs(a - ansTarget) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 4) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    /** Response after previous phrase ended: answer under prior resolution (call–response). */
    if (
      phraseIdx > 0 &&
      phraseTargets.length >= phraseIdx &&
      meta.posInPhrase === 0 &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 617 + b + 3500) < 0.18
    ) {
      const prevT = phraseTargets[phraseIdx - 1] ?? upperNow;
      const idealLow = clamp(prevT - 12 - (phraseIdx % 3), LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - idealLow) < Math.abs(a - idealLow) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 4) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    /** Penultimate beat: light anticipation before upper resolution (arch phrases slightly more). */
    if (
      phraseTargets.length > phraseIdx &&
      meta.phraseLen > 2 &&
      meta.posInPhrase === meta.phraseLen - 2 &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 521 + b + 3400) <
        (phraseDirections[phraseIdx] === 'arch' ? 0.18 : 0.13)
    ) {
      const targ = phraseTargets[phraseIdx] ?? upperNow;
      const idealLow = clamp(targ - 14, LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - idealLow) < Math.abs(a - idealLow) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 4) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    /** Long phrase midpoint: light answer to upper fragment (multi-bar continuity). */
    if (
      meta.phraseLen >= 6 &&
      meta.posInPhrase === Math.floor(meta.phraseLen / 2) &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 311 + b * 7 + 3000) < 0.12
    ) {
      const contrarySign = -Math.sign(net || pSign || 1);
      const step = contrarySign * (1 + Math.floor(seededRandom(seed + b * 19 + 3150) * 2));
      const ansTarget = clamp(last + step, LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - ansTarget) < Math.abs(a - ansTarget) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 4) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    /** Phrase ending: settle under upper arrival; prefer when upper phrase ascends (release in lower). */
    if (
      meta.phraseLen > 1 &&
      meta.posInPhrase === meta.phraseLen - 1 &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 419 + b + 3300) <
        (phraseDirections[phraseIdx] === 'ascending' ? 0.16 : 0.1)
    ) {
      const idealLow = clamp(upperNow - 14, LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - idealLow) < Math.abs(a - idealLow) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 3) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    /** Short echo — contrary to upper step (avoid parallel motion with upper). */
    const echoPhrase =
      meta.posInPhrase > 0 &&
      Math.abs(uDelta) <= 4 &&
      upperSparseWindow &&
      seededRandom(seed + b * 17 + 1200) < 0.09;
    const answerPhrase =
      !echoPhrase &&
      meta.posInPhrase > 0 &&
      upperSparseWindow &&
      seededRandom(seed + b * 17 + 1300) < 0.13;

    if (echoPhrase && chordTones.length > 0 && uDelta !== 0) {
      const step = -Math.sign(uDelta) * Math.min(2, Math.max(1, Math.abs(uDelta)));
      const echoTarget = clamp(last + step, LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - echoTarget) < Math.abs(a - echoTarget) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 3) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    if (answerPhrase && chordTones.length > 0 && Math.abs(uDelta) <= 5) {
      const step =
        -Math.sign(uDelta || 1) * (1 + Math.floor(seededRandom(seed + b * 19 + 1400) * 2));
      const ansTarget = clamp(last + step, LOWER_MIN, LOWER_MAX);
      const near = chordTones.reduce((a, c) =>
        Math.abs(c - ansTarget) < Math.abs(a - ansTarget) ? c : a
      , chordTones[0]!);
      if (Math.abs(near - last) <= 4) {
        lower.push(near);
        last = near;
        continue;
      }
    }

    if (supportBlend && belowUpper.length > 0) {
      const ideal = upperNow - 12;
      const nearestSupport = belowUpper.reduce((a, c) =>
        Math.abs(c - ideal) < Math.abs(a - ideal) ? c : a
      );
      if (Math.abs(nearestSupport - last) <= 4) {
        effectiveCandidates = [nearestSupport, ...effectiveCandidates.filter((x) => x !== nearestSupport)];
      }
    }

    const stepwise = effectiveCandidates.filter(c => Math.abs(c - last) <= 2);
    const candidates = stepwise.length > 0 ? stepwise : effectiveCandidates;
    if (candidates.length === 0) {
      const hold = clamp(last, LOWER_MIN, LOWER_MAX);
      lower.push(hold);
      last = hold;
      continue;
    }

    const prevDir = lower.length >= 2 ? lower[lower.length - 1]! - lower[lower.length - 2]! : 0;
    const selfContrary = seededRandom(seed + b * 29 + 611) < 0.18;
    const dir = selfContrary ? -Math.sign(prevDir || 1) : Math.sign(prevDir || 1);
    const uStep = Math.sign(uDelta || 0);
    const preferContrary =
      uStep !== 0 && seededRandom(seed + b * 29 + 8800) < (upperBusy ? 0.22 : 0.36);
    const byMotion = [...candidates].sort((a, b) => {
      const stepA = a - last;
      const stepB = b - last;
      let scoreA = stepA * dir;
      let scoreB = stepB * dir;
      if (preferContrary) {
        scoreA -= uStep * Math.sign(stepA) * 1.15;
        scoreB -= uStep * Math.sign(stepB) * 1.15;
      }
      return scoreB - scoreA;
    });
    let next = clamp(byMotion[0] ?? candidates[0], LOWER_MIN, LOWER_MAX);

    const wideEnough = candidates.filter((c) => upperNow - c >= VOICE_DISTANCE_MIN);
    if (wideEnough.length > 0 && upperNow - next < VOICE_DISTANCE_PREFERRED) {
      wideEnough.sort((a, b) => (upperNow - b) - (upperNow - a));
      next = clamp(wideEnough[0]!, LOWER_MIN, LOWER_MAX);
    } else if (wideEnough.length > 0 && seededRandom(seed + b * 29 + 6600) < 0.5) {
      wideEnough.sort((a, b) => (upperNow - b) - (upperNow - a));
      next = clamp(wideEnough[0]!, LOWER_MIN, LOWER_MAX);
    }

    const smallSteps = candidates.filter((c) => Math.abs(c - last) <= 3);
    if (smallSteps.length > 0 && Math.abs(next - last) > 4 && seededRandom(seed + b * 29 + 7700) < 0.44) {
      smallSteps.sort((a, b) => Math.abs(a - last) - Math.abs(b - last));
      next = clamp(smallSteps[0]!, LOWER_MIN, LOWER_MAX);
    }

    if (isStrongBeat && guideTones.length > 0) {
      const isGuideTone = guideTones.some(gt => (gt % 12) === (next % 12));
      if (!isGuideTone) {
        const guideChoice = guideTones.reduce((a, c) =>
          Math.abs(c - last) < Math.abs(a - last) ? c : a
        );
        next = clamp(guideChoice, LOWER_MIN, LOWER_MAX);
      }
    }

    lower.push(next);
    last = next;
  }
  return lower;
}

function enforceCounterpoint(upper: number[], lower: number[], seed: number): { upper: number[]; lower: number[] } {
  const u = [...upper];
  const l = [...lower];

  for (let i = 1; i < u.length; i++) {
    const u1 = u[i - 1], u2 = u[i];
    const l1 = l[i - 1], l2 = l[i];
    const int1 = Math.abs(u1 - l1) % 12;
    const int2 = Math.abs(u2 - l2) % 12;
    const parallel5 = int1 === 7 && int2 === 7 && (u2 - u1) * (l2 - l1) > 0;
    const parallel8 = (int1 === 0 || int1 === 12) && (int2 === 0 || int2 === 12) && (u2 - u1) * (l2 - l1) > 0;
    if (parallel5 || parallel8) {
      const alt = l2 + (seededRandom(seed + i * 41 + 88) < 0.5 ? 2 : -2);
      l[i] = clamp(alt, LOWER_MIN, LOWER_MAX);
    }
  }

  for (let i = 1; i < u.length; i++) {
    const leap = Math.abs(l[i]! - l[i - 1]!);
    if (leap > 4 && seededRandom(seed + i * 61 + 10010) < 0.5) {
      const mid = Math.round((l[i]! + l[i - 1]!) / 2);
      l[i] = clamp(mid, LOWER_MIN, LOWER_MAX);
    }
  }

  for (let i = 0; i < u.length; i++) {
    const gap = u[i]! - l[i]!;
    if (gap >= 0 && gap < VOICE_DISTANCE_MIN) {
      const drop = Math.min(2, VOICE_DISTANCE_MIN - gap);
      l[i] = clamp(l[i]! - drop, LOWER_MIN, LOWER_MAX);
    } else if (gap > VOICE_DISTANCE_REJECT) {
      const preferred =
        PREFERRED_DYAD_INTERVALS.find(
          (iv) => u[i]! - iv >= LOWER_MIN && u[i]! - iv <= LOWER_MAX
        ) ?? 12;
      l[i] = clamp(u[i]! - preferred, LOWER_MIN, LOWER_MAX);
    }
  }

  return { upper: u, lower: l };
}

/** Explicit lower-voice reaction to a phrase ending (max one per phrase, timing layer). */
type PhraseEndResponseKind = 'stepwise' | 'sustain' | 'contrary';

/**
 * After each phrase (except the last), ~25–40% chance of a timed lower response (reduced vs earlier
 * builds so not every phrase answers — clearer texture).
 */
function planPhraseEndResponses(
  phraseLengths: number[],
  seed: number,
  totalBeats: number
): Map<number, PhraseEndResponseKind> {
  const map = new Map<number, PhraseEndResponseKind>();
  let beat = 0;
  for (let pi = 0; pi < phraseLengths.length; pi++) {
    const len = phraseLengths[pi];
    const endB = beat + len - 1;
    const nextB = endB + 1;
    beat += len;
    if (nextB >= totalBeats) continue;
    const pResp = (0.3 + seededRandom(seed + pi * 9100 + 17) * 0.14) * 0.88;
    if (seededRandom(seed + pi * 9101 + 17) >= pResp) continue;
    const rk = seededRandom(seed + pi * 9102 + 17);
    const kind: PhraseEndResponseKind =
      rk < 0.34 ? 'stepwise' : rk < 0.67 ? 'sustain' : 'contrary';
    map.set(nextB, kind);
  }
  return map;
}

/**
 * Lower events for one bar: response starts +0.25 after phrase boundary beat (avoids upper downbeat attack).
 */
function pushLowerPhraseEndTriggered(
  lowerEvents: NoteEvent[],
  lowerPitches: number[],
  upperPitches: number[],
  base: number,
  beatsPerBar: number,
  nextGlobalBeat: number,
  kind: PhraseEndResponseKind,
  seed: number
): void {
  const beatInBar = nextGlobalBeat - base;
  if (beatInBar < 0 || beatInBar >= beatsPerBar) return;

  const gLower = (gb: number) => lowerPitches[Math.min(Math.max(0, gb), lowerPitches.length - 1)];
  const gUpper = (gb: number) => upperPitches[Math.min(Math.max(0, gb), upperPitches.length - 1)];

  if (beatInBar > 0) {
    lowerEvents.push({ pitch: 0, duration: beatInBar, beat: 0, isDyad: false });
  }
  const micro = seededRandom(seed + nextGlobalBeat * 5 + 88) < 0.35 ? 0.25 : 0.5;
  lowerEvents.push({ pitch: 0, duration: micro, beat: beatInBar, isDyad: false });
  const entryBeat = beatInBar + micro;
  const rem = beatsPerBar - entryBeat;
  if (rem <= 0.01) return;

  if (kind === 'sustain') {
    lowerEvents.push({
      pitch: gLower(nextGlobalBeat),
      duration: rem,
      beat: entryBeat,
      isDyad: false,
    });
    return;
  }

  if (kind === 'stepwise') {
    const p0 = gLower(nextGlobalBeat);
    const p1 = gLower(nextGlobalBeat + 1);
    const p2 = gLower(nextGlobalBeat + 2);
    let t = entryBeat;
    let left = rem;
    const d0 = Math.min(0.5, left * 0.42);
    lowerEvents.push({ pitch: p0, duration: d0, beat: t, isDyad: false });
    left -= d0;
    t += d0;
    if (left > 0.32) {
      const d1 = Math.min(0.5, left * 0.55);
      lowerEvents.push({ pitch: p1, duration: d1, beat: t, isDyad: false });
      left -= d1;
      t += d1;
    }
    if (left > 0.12) {
      lowerEvents.push({ pitch: p2, duration: left, beat: t, isDyad: false });
    }
    return;
  }

  const uStep =
    nextGlobalBeat > 0 ? gUpper(nextGlobalBeat) - gUpper(nextGlobalBeat - 1) : 0;
  const target = gLower(nextGlobalBeat);
  let pContrary = target;
  if (uStep > 0) pContrary = clamp(target - (1 + Math.floor(seededRandom(seed + 4411) * 2)), LOWER_MIN, LOWER_MAX);
  else if (uStep < 0) pContrary = clamp(target + (1 + Math.floor(seededRandom(seed + 4412) * 2)), LOWER_MIN, LOWER_MAX);

  const d1 = Math.min(1, rem * 0.55);
  lowerEvents.push({ pitch: pContrary, duration: d1, beat: entryBeat, isDyad: false });
  if (rem > d1 + 0.1) {
    lowerEvents.push({
      pitch: target,
      duration: rem - d1,
      beat: entryBeat + d1,
      isDyad: false,
    });
  }
}

/**
 * Upper rhythm variants (4 beats): phrase breath or sustained arcs — not only four quarters.
 * Lower counter-line: 2–3 pitch attacks per bar with varied rhythm.
 */
function pushUpperPhraseRhythm(
  upperEvents: NoteEvent[],
  u: (i: number) => number,
  bar: number,
  seed: number
): void {
  const rhy = (seed + bar * 59 + bar * 13) % 6;
  if (rhy === 0) {
    upperEvents.push({ pitch: u(0), duration: 2, beat: 0, isDyad: false });
    upperEvents.push({ pitch: u(2), duration: 2, beat: 2, isDyad: false });
  } else if (rhy === 1) {
    upperEvents.push({ pitch: u(0), duration: 1, beat: 0, isDyad: false });
    upperEvents.push({ pitch: u(1), duration: 1, beat: 1, isDyad: false });
    upperEvents.push({ pitch: u(2), duration: 2, beat: 2, isDyad: false });
  } else if (rhy === 2) {
    upperEvents.push({ pitch: u(0), duration: 1.5, beat: 0, isDyad: false });
    upperEvents.push({ pitch: 0, duration: 0.5, beat: 1.5, isDyad: false });
    upperEvents.push({ pitch: u(2), duration: 2, beat: 2, isDyad: false });
  } else {
    if (seededRandom(seed + bar * 71 + 3) < 0.26) {
      upperEvents.push({ pitch: u(0), duration: 1, beat: 0, isDyad: false });
      upperEvents.push({ pitch: u(1), duration: 0.875, beat: 1, isDyad: false });
      upperEvents.push({ pitch: 0, duration: 0.125, beat: 1.875, isDyad: false });
      upperEvents.push({ pitch: u(2), duration: 1, beat: 2, isDyad: false });
      upperEvents.push({ pitch: u(3), duration: 1, beat: 3, isDyad: false });
    } else {
      for (let i = 0; i < 4; i++) {
        upperEvents.push({ pitch: u(i), duration: 1, beat: i, isDyad: false });
      }
    }
  }
}

/**
 * Lower counter-line: 2–4 attacks per bar — when upper is quarter-heavy, prefer sustain / delayed entry (not mirrored grid).
 */
function pushLowerCounterLine(
  lowerEvents: NoteEvent[],
  l: (i: number) => number,
  bar: number,
  seed: number,
  upperQuarterHeavy: boolean
): void {
  const t = upperQuarterHeavy
    ? 2 + ((seed + bar * 41 + bar * 3) % 2)
    : (seed + bar * 97 + bar) % 3;
  if (t === 0) {
    lowerEvents.push({ pitch: 0, duration: 0.5, beat: 0, isDyad: false });
    lowerEvents.push({ pitch: l(0), duration: 0.5, beat: 0.5, isDyad: false });
    lowerEvents.push({ pitch: l(1), duration: 1, beat: 1, isDyad: false });
    lowerEvents.push({ pitch: l(2), duration: 2, beat: 2, isDyad: false });
  } else if (t === 1) {
    lowerEvents.push({ pitch: l(0), duration: 0.5, beat: 0, isDyad: false });
    lowerEvents.push({ pitch: 0, duration: 0.5, beat: 0.5, isDyad: false });
    lowerEvents.push({ pitch: l(1), duration: 1.5, beat: 1, isDyad: false });
    lowerEvents.push({ pitch: l(2), duration: 1.5, beat: 2.5, isDyad: false });
  } else if (t === 2) {
    lowerEvents.push({ pitch: l(0), duration: 2, beat: 0, isDyad: false });
    lowerEvents.push({ pitch: l(2), duration: 0.5, beat: 2, isDyad: false });
    lowerEvents.push({ pitch: l(3), duration: 1.5, beat: 2.5, isDyad: false });
  } else {
    lowerEvents.push({ pitch: 0, duration: 1, beat: 0, isDyad: false });
    lowerEvents.push({ pitch: l(1), duration: 1, beat: 1, isDyad: false });
    lowerEvents.push({ pitch: l(2), duration: 2, beat: 2, isDyad: false });
  }
}

/** Last note in each voice of the final bar sustains to the barline (no clipped endings). */
function polishLastBarEnds(
  upperEvents: NoteEvent[],
  lowerEvents: NoteEvent[],
  uStart: number,
  lStart: number,
  beatsPerBar: number
): void {
  const extend = (arr: NoteEvent[], start: number) => {
    let lastIdx = -1;
    for (let i = arr.length - 1; i >= start; i--) {
      if (arr[i]!.pitch > 0) {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx < 0) return;
    const e = arr[lastIdx]!;
    const tail = e.beat + e.duration;
    if (tail < beatsPerBar - 0.02) {
      arr[lastIdx] = { ...e, duration: beatsPerBar - e.beat };
    }
  };
  extend(upperEvents, uStart);
  extend(lowerEvents, lStart);
}

function deriveMelodySupportLayout(
  upper: number[],
  lower: number[],
  harmonicContext: HarmonicContext,
  beatsPerBar: number,
  seed: number,
  phraseEndResponses: Map<number, PhraseEndResponseKind>,
  totalBeats: number
): { upperEvents: NoteEvent[]; lowerEvents: NoteEvent[]; impliedHarmony: ImpliedHarmony[] } {
  const upperEvents: NoteEvent[] = [];
  const lowerEvents: NoteEvent[] = [];
  const impliedHarmony: ImpliedHarmony[] = [];
  const numBars = Math.max(1, Math.ceil(upper.length / beatsPerBar));
  let upperLastBarStart = 0;
  let lowerLastBarStart = 0;

  for (let bar = 0; bar < numBars; bar++) {
    if (bar === numBars - 1) {
      upperLastBarStart = upperEvents.length;
      lowerLastBarStart = lowerEvents.length;
    }
    const base = bar * beatsPerBar;
    const u = (i: number) => upper[Math.min(base + i, upper.length - 1)];
    const l = (i: number) => lower[Math.min(base + i, lower.length - 1)];
    const { root, quality } = getChordForBeat(harmonicContext, base, beatsPerBar);
    const canon = harmonicContext.canonicalChords?.[bar];
    const chordLabel = canon ? canon.text : `${root}${quality === 'maj' ? 'maj7' : quality === 'min' ? 'm7' : '7'}`;
    impliedHarmony.push({ chord: chordLabel, bar, beat: 0, confidence: 0.85 });

    const useCallResponse = (seed + bar * 17) % 5 === 0;

    let responseBeat: number | undefined;
    for (let d = 0; d < beatsPerBar; d++) {
      const gb = base + d;
      if (gb < totalBeats && phraseEndResponses.has(gb)) {
        responseBeat = gb;
        break;
      }
    }

    if (useCallResponse) {
      const upperLeadsFirst = (seed + bar * 131) % 2 === 0;
      if (upperLeadsFirst) {
        upperEvents.push({ pitch: u(0), duration: 0.5, beat: 0, isDyad: false });
        upperEvents.push({ pitch: u(1), duration: 0.5, beat: 0.5, isDyad: false });
        upperEvents.push({ pitch: u(2), duration: 1, beat: 1, isDyad: false });
        lowerEvents.push({ pitch: 0, duration: 2, beat: 0, isDyad: false });
        lowerEvents.push({ pitch: l(2), duration: 1, beat: 2, isDyad: false });
        lowerEvents.push({ pitch: l(3), duration: 1, beat: 3, isDyad: false });
        upperEvents.push({ pitch: 0, duration: 0.5, beat: 2, isDyad: false });
        upperEvents.push({ pitch: u(2), duration: 1.5, beat: 2.5, isDyad: false });
      } else {
        lowerEvents.push({ pitch: l(0), duration: 0.5, beat: 0, isDyad: false });
        lowerEvents.push({ pitch: l(1), duration: 0.5, beat: 0.5, isDyad: false });
        lowerEvents.push({ pitch: l(2), duration: 1, beat: 1, isDyad: false });
        upperEvents.push({ pitch: 0, duration: 2, beat: 0, isDyad: false });
        upperEvents.push({ pitch: u(2), duration: 1, beat: 2, isDyad: false });
        upperEvents.push({ pitch: u(3), duration: 1, beat: 3, isDyad: false });
        lowerEvents.push({ pitch: 0, duration: 0.5, beat: 2, isDyad: false });
        lowerEvents.push({ pitch: l(3), duration: 1.5, beat: 2.5, isDyad: false });
      }
    } else {
      pushUpperPhraseRhythm(upperEvents, u, bar, seed);
      if (responseBeat !== undefined) {
        pushLowerPhraseEndTriggered(
          lowerEvents,
          lower,
          upper,
          base,
          beatsPerBar,
          responseBeat,
          phraseEndResponses.get(responseBeat)!,
          seed
        );
      } else {
        const upperRhy = (seed + bar * 59 + bar * 13) % 6;
        const upperQuarterHeavy = upperRhy >= 3;
        pushLowerCounterLine(lowerEvents, l, bar, seed, upperQuarterHeavy);
      }
    }
  }

  polishLastBarEnds(upperEvents, lowerEvents, upperLastBarStart, lowerLastBarStart, beatsPerBar);

  return { upperEvents, lowerEvents, impliedHarmony };
}

function applyGuitarConstraints(output: WybleOutput): WybleOutput {
  const upperEvents = [...output.upper_line.events];
  const lowerEvents = [...output.lower_line.events];
  const upperDyads = upperEvents.filter(e => e.isDyad);
  const lowerDyads = lowerEvents.filter(e => e.isDyad);

  for (let i = 0; i < Math.min(upperDyads.length, lowerDyads.length); i++) {
    const ui = upperEvents.indexOf(upperDyads[i]);
    const li = lowerEvents.indexOf(lowerDyads[i]);
    if (ui < 0 || li < 0) continue;
    const u = upperEvents[ui];
    const l = lowerEvents[li];
    const interval = u.pitch - l.pitch;
    if (interval > VOICE_DISTANCE_REJECT || interval < 0) {
      const preferred = PREFERRED_DYAD_INTERVALS.find(
        iv => u.pitch - iv >= LOWER_MIN && u.pitch - iv <= LOWER_MAX
      ) ?? 12;
      lowerEvents[li] = { ...l, pitch: clamp(u.pitch - preferred, LOWER_MIN, LOWER_MAX) };
    } else if (interval > 0 && interval < VOICE_DISTANCE_MIN) {
      lowerEvents[li] = { ...l, pitch: clamp(u.pitch - VOICE_DISTANCE_MIN, LOWER_MIN, LOWER_MAX) };
    }
  }

  return {
    upper_line: { events: upperEvents, register: 'upper' },
    lower_line: { events: lowerEvents, register: 'lower' },
    implied_harmony: output.implied_harmony,
  };
}

export function generateWybleEtude(params: WybleParameters): WybleOutput {
  const { harmonicContext, phraseLength = 8 } = params;

  const seedBase =
    (params as WybleParameters & { seed?: number }).seed ?? params.motifSeed?.[0] ?? 0;

  const beatsPerBar = 4;
  const totalBeats = phraseLength * beatsPerBar;

  const upperResult = generateUpperVoice(totalBeats, harmonicContext, params, seedBase);
  const upperPitches = upperResult.pitches;
  const lowerPitches = generateLowerVoice(
    totalBeats,
    harmonicContext,
    upperPitches,
    params,
    seedBase,
    upperResult.phraseLengths,
    upperResult.phraseNetDeltas,
    upperResult.phraseDirections,
    upperResult.phraseTargets
  );

  const { upper: u, lower: l } = enforceCounterpoint(upperPitches, lowerPitches, seedBase);

  const phraseEndResponses = planPhraseEndResponses(upperResult.phraseLengths, seedBase, totalBeats);
  const { upperEvents, lowerEvents, impliedHarmony } = deriveMelodySupportLayout(
    u,
    l,
    harmonicContext,
    beatsPerBar,
    seedBase,
    phraseEndResponses,
    totalBeats
  );

  const rawOutput: WybleOutput = {
    upper_line: { events: upperEvents, register: 'upper' },
    lower_line: { events: lowerEvents, register: 'lower' },
    implied_harmony: impliedHarmony,
  };

  return applyGuitarConstraints(rawOutput);
}
