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

/** Interval plan before any pitch exists — drives pitch, not the reverse. */
export type PhraseDirection = 'up' | 'down' | 'arch';

export interface PhraseSkeleton {
  length: number;
  direction: PhraseDirection;
  /** Signed semitone steps; intervals.length === length - 1. */
  intervals: number[];
}

/** Last completed phrase plan — reused to develop the next phrase (continuity). */
export type PhraseMemory = PhraseSkeleton;

const MAX_PHRASE_BEATS = 12;

function invertPhraseDirection(d: PhraseDirection): PhraseDirection {
  if (d === 'up') return 'down';
  if (d === 'down') return 'up';
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
      { length: 2, direction: 'up', intervals: [1] },
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
    direction = sign > 0 ? 'up' : 'down';
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

function sameSign(a: number, b: number): boolean {
  return (a === 0 && b === 0) || (a > 0 && b > 0) || (a < 0 && b < 0);
}

/**
 * Mandatory resolution pitch for the phrase (chord tone preferred, else strong tension).
 */
function pickPhraseTargetMidi(
  endBeat: number,
  chords: HarmonicContext['chords'],
  beatsPerBar: number,
  alteredBias: number,
  seed: number,
  phraseIdx: number
): number | null {
  const { root, quality } = getChordForBeat(chords, endBeat, beatsPerBar);
  const chordTones = getChordTonesWithAltered(root, quality, 5, alteredBias).filter(
    (t) => t >= UPPER_MIN && t <= UPPER_MAX
  );
  const landing = getHarmonyPitchesForBeat(root, quality, 5, alteredBias).filter(
    (t) =>
      t >= UPPER_MIN &&
      t <= UPPER_MAX &&
      isLandingPitch(t, root, quality, 5, alteredBias)
  );
  const chordPreferred = chordTones.filter((p) => landing.includes(p));
  const use = chordPreferred.length > 0 ? chordPreferred : landing;
  if (use.length === 0) return null;
  const k = Math.floor(seededRandom(seed + phraseIdx * 9001 + endBeat * 17) * use.length);
  return use[k] ?? use[0];
}

/** Intervals pull toward target while keeping skeleton contour when possible. */
function effectiveIntervalTowardTarget(
  skInt: number,
  prev: number,
  target: number,
  stepsLeft: number
): number {
  if (stepsLeft <= 0) return skInt;
  const gap = target - prev;
  const skSign = Math.sign(skInt);
  if (gap === 0) return skInt;
  const toward = gap / stepsLeft;
  if (skSign === 0) {
    const w = clamp(Math.round(toward), -MAX_LEAP, MAX_LEAP);
    return w !== 0 ? w : gap > 0 ? 1 : -1;
  }
  if (Math.sign(gap) === skSign) {
    const mag = Math.min(MAX_LEAP, Math.max(1, Math.round(Math.abs(toward))));
    return skSign * mag;
  }
  return skInt;
}

function pickAnchorTowardTarget(
  chainPrev: number,
  harmony: number[],
  target: number,
  phraseLen: number,
  repeatRun: number,
  avoidPitch: number | null
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
  const w = Math.max(1, phraseLen - 1);
  const sorted = pool.sort((a, b) => {
    const da = Math.abs(a - chainPrev) + Math.abs(target - a) / w;
    const db = Math.abs(b - chainPrev) + Math.abs(target - b) / w;
    return da - db;
  });
  return sorted[0] ?? null;
}

function tryPickExactTarget(
  prev: number,
  targetMidi: number,
  harmony: number[],
  root: string,
  quality: string,
  octave: number,
  alteredBias: number,
  repeatRun: number,
  avoidPitch: number | null
): number | null {
  if (!harmony.includes(targetMidi)) return null;
  if (!isLandingPitch(targetMidi, root, quality, octave, alteredBias)) return null;
  const gap = targetMidi - prev;
  if (gap > 0 && targetMidi <= prev) return null;
  if (gap < 0 && targetMidi >= prev) return null;
  if (repeatRun >= 2 && targetMidi === prev) return null;
  if (avoidPitch !== null && targetMidi === avoidPitch && harmony.some((p) => p !== avoidPitch && p !== prev))
    return null;
  return targetMidi;
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
 * Phrase arc + mandatory target: steps move toward target; last pitch equals pickPhraseTargetMidi.
 */
function tryRealizePhraseHard(
  sk: PhraseSkeleton,
  chainPrev: number,
  startBeat: number,
  upperPrefix: number[],
  chords: HarmonicContext['chords'],
  beatsPerBar: number,
  alteredDominantBias: number,
  repeatRunIn: number,
  seed: number,
  phraseIdx: number
): RealizeResult | null {
  const endBeat = startBeat + sk.length - 1;
  const targetMidi = pickPhraseTargetMidi(
    endBeat,
    chords,
    beatsPerBar,
    alteredDominantBias,
    seed,
    phraseIdx
  );
  if (targetMidi === null) return null;

  if (sk.length === 1) {
    const b = startBeat;
    const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
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
    return { pitches: [targetMidi], repeatRun };
  }

  const pitches: number[] = [];
  let prev = chainPrev;
  let repeatRun = repeatRunIn;

  for (let i = 0; i < sk.length; i++) {
    const b = startBeat + i;
    const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
    const harmony = getHarmonyPitchesForBeat(root, quality, 5, alteredDominantBias).filter(
      (t) => t >= UPPER_MIN && t <= UPPER_MAX
    );
    if (harmony.length === 0) return null;

    let avoidPitch: number | null = null;
    if (b >= 2) {
      const pA = globalPitchAtBeat(b - 2, startBeat, upperPrefix, pitches);
      const pM = globalPitchAtBeat(b - 1, startBeat, upperPrefix, pitches);
      if (pA !== undefined && pM !== undefined && pA !== pM) avoidPitch = pA;
    }

    const isLast = i === sk.length - 1;

    if (i === 0) {
      const anchor = pickAnchorTowardTarget(
        prev,
        harmony,
        targetMidi,
        sk.length,
        repeatRun,
        avoidPitch
      );
      if (anchor === null) return null;
      pitches.push(anchor);
      if (anchor === prev) repeatRun++;
      else repeatRun = 1;
      prev = anchor;
      continue;
    }

    if (isLast) {
      const exact = tryPickExactTarget(
        prev,
        targetMidi,
        harmony,
        root,
        quality,
        5,
        alteredDominantBias,
        repeatRun,
        avoidPitch
      );
      if (exact !== null) {
        pitches.push(exact);
        if (exact === prev) repeatRun++;
        else repeatRun = 1;
        prev = exact;
        continue;
      }
      const gap = targetMidi - prev;
      for (const delta of [0, 1, -1, 2, -2, 3, -3]) {
        const intv = clamp(gap + delta, -MAX_LEAP, MAX_LEAP);
        if (intv !== 0 && !sameSign(intv, gap)) continue;
        const nextTry = pickHarmonicStep(
          prev,
          intv,
          harmony,
          clamp(prev + intv, UPPER_MIN, UPPER_MAX),
          true,
          root,
          quality,
          5,
          alteredDominantBias,
          repeatRun,
          avoidPitch
        );
        if (nextTry === targetMidi) {
          pitches.push(nextTry);
          if (nextTry === prev) repeatRun++;
          else repeatRun = 1;
          prev = nextTry;
          break;
        }
      }
      if (pitches.length !== sk.length) return null;
      continue;
    }

    const skInt = sk.intervals[i - 1];
    const stepsLeft = sk.length - i;
    const effInt = effectiveIntervalTowardTarget(skInt, prev, targetMidi, stepsLeft);
    const ideal = clamp(prev + effInt, UPPER_MIN, UPPER_MAX);
    const next = pickHarmonicStep(
      prev,
      effInt,
      harmony,
      ideal,
      false,
      root,
      quality,
      5,
      alteredDominantBias,
      repeatRun,
      avoidPitch
    );
    if (next === null) return null;
    if (next === prev) repeatRun++;
    else repeatRun = 1;
    pitches.push(next);
    prev = next;
  }

  return { pitches, repeatRun };
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
  let direction: PhraseDirection =
    r < 0.34 ? 'arch' : r < 0.67 ? 'up' : 'down';
  const intervals: number[] = [];
  let leapUsed = false;

  if (direction === 'arch' && length >= 3) {
    const half = Math.max(1, Math.floor((length - 1) / 2));
    const sign1 = seededRandom(seed + phraseIdx * 11 + 702 + attempt) < 0.5 ? 1 : -1;
    for (let i = 0; i < length - 1; i++) {
      const leg = i < half ? sign1 : -sign1;
      const wantLeap =
        !leapUsed && seededRandom(seed + phraseIdx * 13 + i * 19 + 801 + attempt) < 0.28;
      const mag = wantLeap
        ? 3 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2)
        : 1 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2);
      leapUsed = leapUsed || wantLeap;
      intervals.push(leg * Math.min(mag, MAX_LEAP));
    }
  } else {
    const sign =
      direction === 'up'
        ? 1
        : direction === 'down'
          ? -1
          : seededRandom(seed + phraseIdx * 11 + 888 + attempt) < 0.5
            ? 1
            : -1;
    for (let i = 0; i < length - 1; i++) {
      const wantLeap =
        !leapUsed && seededRandom(seed + phraseIdx * 13 + i * 19 + 801 + attempt) < 0.32;
      const mag = wantLeap
        ? 3 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2)
        : 1 + Math.floor(seededRandom(seed + phraseIdx * 17 + i * 33 + 802) * 2);
      leapUsed = leapUsed || wantLeap;
      intervals.push(sign * Math.min(mag, MAX_LEAP));
    }
  }

  let sk: PhraseSkeleton = { length, direction, intervals };
  let fp = phraseFingerprint(sk);
  if (prevFingerprint && fp === prevFingerprint && intervals.length > 0) {
    const last = intervals.length - 1;
    const bump = sk.direction === 'down' ? -1 : 1;
    intervals[last] = clamp(intervals[last] + bump, -MAX_LEAP, MAX_LEAP);
    sk = { length, direction, intervals: [...intervals] };
  }
  return sk;
}

/** Guaranteed small phrase — still interval-driven; used only after many failed regenerations. */
function buildFallbackPhraseSkeleton(remaining: number, seed: number, phraseIdx: number): PhraseSkeleton {
  if (remaining <= 1) {
    return { length: 1, direction: 'up', intervals: [] };
  }
  const length = Math.min(2, remaining);
  const sign = seededRandom(seed + phraseIdx * 999 + 777) < 0.5 ? 1 : -1;
  return {
    length,
    direction: sign > 0 ? 'up' : 'down',
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
  chords: HarmonicContext['chords'],
  beatIndex: number,
  beatsPerBar: number
): { root: string; quality: string } {
  const bar = Math.floor(beatIndex / beatsPerBar);
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
  /** Planned phrase contour per segment (interval plan). */
  phraseDirections: PhraseDirection[];
}

/**
 * Upper line: interval plan is mandatory; pitches are harmony-adjusted realizations of prev + interval[i].
 */
function generateUpperVoice(
  totalBeats: number,
  chords: HarmonicContext['chords'],
  params: WybleParameters,
  seed: number
): UpperVoiceResult {
  const { motifSeed, alteredDominantBias = 0 } = params;
  const beatsPerBar = 4;
  const upper: number[] = [];
  const phraseLengths: number[] = [];
  const phraseNetDeltas: number[] = [];
  const phraseDirections: PhraseDirection[] = [];
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
      let sk = useMemory
        ? deriveSkeletonFromPrevious(lastPhraseMemory, seed, phraseIdx, remaining, att)
        : buildPhraseSkeleton(seed, phraseIdx, prevFp, att);
      sk = trimSkeletonToBeats(sk, remaining);
      const r = tryRealizePhraseHard(
        sk,
        last,
        b,
        upper,
        chords,
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
        chords,
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
          chords,
          beatsPerBar,
          alteredDominantBias,
          repeatRun,
          seed,
          phraseIdx
        );
      }
      if (r === null) {
        sk = { length: 1, direction: 'up', intervals: [] };
        r = tryRealizePhraseHard(
          sk,
          last,
          b,
          upper,
          chords,
          beatsPerBar,
          alteredDominantBias,
          repeatRun,
          seed,
          phraseIdx
        );
      }
      if (r === null) {
        const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
        const tones = getChordTonesWithAltered(root, quality, 5, alteredDominantBias).filter(
          (t) => t >= UPPER_MIN && t <= UPPER_MAX
        );
        const emergency = tones.length > 0 ? tones[0]! : clamp(last, UPPER_MIN, UPPER_MAX);
        realized = {
          pitches: [emergency],
          repeatRun: emergency === last ? repeatRun + 1 : 1,
        };
        skUsed = { length: 1, direction: 'up', intervals: [] };
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
    phraseLengths.push(realized.pitches.length);
    const start = upper.length - realized.pitches.length;
    const first = upper[start]!;
    const end = upper[upper.length - 1]!;
    phraseNetDeltas.push(end - first);
    b += realized.pitches.length;
    phraseIdx++;
    const mem = skUsed!;
    lastPhraseMemory = {
      length: mem.length,
      direction: mem.direction,
      intervals: [...mem.intervals],
    };
  }

  return { pitches: upper, phraseLengths, phraseNetDeltas, phraseDirections };
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
  if (d === 'up') return 1;
  if (d === 'down') return -1;
  return 0;
}

/**
 * Lower line: simple support — occasional contrary / answering gestures; does not mirror full phrase engine.
 */
function generateLowerVoice(
  totalBeats: number,
  chords: HarmonicContext['chords'],
  upperPitches: number[],
  params: WybleParameters,
  seed: number,
  phraseLengths: number[],
  phraseNetDeltas: number[],
  phraseDirections: PhraseDirection[]
): number[] {
  const { motifSeed, pedalToneEnabled = false } = params;
  const beatsPerBar = 4;
  const lower: number[] = [];
  let last = motifSeed?.[1] ?? 55;

  if (pedalToneEnabled && chords.length > 0) {
    const first = chords[0];
    const parsed = typeof first === 'string' ? parseChord(first) : { root: (first as { root: string }).root, quality: 'maj' };
    const rootMidi = ROOT_MIDI[parsed.root] ?? 60;
    const pedal = clamp(rootMidi - 12, LOWER_MIN, LOWER_MAX);
    for (let b = 0; b < totalBeats; b++) lower.push(pedal);
    return lower;
  }

  for (let b = 0; b < totalBeats; b++) {
    const beatInBar = b % beatsPerBar;
    const isStrongBeat = beatInBar === 1 || beatInBar === 3;
    const { root, quality } = getChordForBeat(chords, b, beatsPerBar);
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
    const supportBlend = seededRandom(seed + b * 29 + 503) < 0.72;

    const strongBeatPool = guideTones.length > 0 ? guideTones : chordTones;
    const pool = isStrongBeat ? strongBeatPool : chordTones;
    let effectiveCandidates = (pool.length > 0 ? pool : chordTones).filter(t => t >= LOWER_MIN && t <= LOWER_MAX);

    /** Occasional contrary at phrase start (light; does not compete with upper). */
    if (
      meta.posInPhrase === 0 &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 91 + 2200) < 0.16
    ) {
      const contrarySign = -Math.sign(net || pSign || 1);
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

    /** Long phrase midpoint: light answer to upper fragment (multi-bar continuity). */
    if (
      meta.phraseLen >= 6 &&
      meta.posInPhrase === Math.floor(meta.phraseLen / 2) &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 311 + b * 7 + 3000) < 0.15
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

    /** Phrase ending: subtle anticipation or resolution under upper arrival (sparse). */
    if (
      meta.phraseLen > 1 &&
      meta.posInPhrase === meta.phraseLen - 1 &&
      chordTones.length > 0 &&
      seededRandom(seed + phraseIdx * 419 + b + 3300) < 0.12
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

    const echoPhrase =
      meta.posInPhrase > 0 &&
      Math.abs(uDelta) <= 4 &&
      seededRandom(seed + b * 17 + 1200) < 0.14;
    const answerPhrase =
      !echoPhrase &&
      meta.posInPhrase > 0 &&
      seededRandom(seed + b * 17 + 1300) < 0.14;

    if (echoPhrase && chordTones.length > 0) {
      const step = Math.sign(uDelta) * Math.min(2, Math.max(1, Math.abs(uDelta)));
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
    const selfContrary = seededRandom(seed + b * 29 + 611) < 0.22;
    const dir = selfContrary ? -Math.sign(prevDir || 1) : Math.sign(prevDir || 1);
    const byMotion = [...candidates].sort((a, b) => {
      const da = (a - last) * dir;
      const db = (b - last) * dir;
      return db - da;
    });
    let next = clamp(byMotion[0] ?? candidates[0], LOWER_MIN, LOWER_MAX);

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
  return { upper: u, lower: l };
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
  const rhy = (seed + bar * 59) % 6;
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
    for (let i = 0; i < 4; i++) {
      upperEvents.push({ pitch: u(i), duration: 1, beat: i, isDyad: false });
    }
  }
}

/**
 * Lower counter-line: 2–3 pitch attacks per bar with varied rhythm (off-beat, syncopation, short+sustain).
 */
function pushLowerCounterLine(
  lowerEvents: NoteEvent[],
  l: (i: number) => number,
  bar: number,
  seed: number
): void {
  const t = (seed + bar * 97) % 3;
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
  } else {
    lowerEvents.push({ pitch: l(0), duration: 2, beat: 0, isDyad: false });
    lowerEvents.push({ pitch: l(2), duration: 0.5, beat: 2, isDyad: false });
    lowerEvents.push({ pitch: l(3), duration: 1.5, beat: 2.5, isDyad: false });
  }
}

function deriveMelodySupportLayout(
  upper: number[],
  lower: number[],
  chords: HarmonicContext['chords'],
  beatsPerBar: number,
  seed: number
): { upperEvents: NoteEvent[]; lowerEvents: NoteEvent[]; impliedHarmony: ImpliedHarmony[] } {
  const upperEvents: NoteEvent[] = [];
  const lowerEvents: NoteEvent[] = [];
  const impliedHarmony: ImpliedHarmony[] = [];
  const numBars = Math.max(1, Math.ceil(upper.length / beatsPerBar));

  for (let bar = 0; bar < numBars; bar++) {
    const base = bar * beatsPerBar;
    const u = (i: number) => upper[Math.min(base + i, upper.length - 1)];
    const l = (i: number) => lower[Math.min(base + i, lower.length - 1)];
    const { root, quality } = getChordForBeat(chords, base, beatsPerBar);
    const chordLabel = `${root}${quality === 'maj' ? 'maj7' : quality === 'min' ? 'm7' : '7'}`;
    impliedHarmony.push({ chord: chordLabel, bar, beat: 0, confidence: 0.85 });

    const useCallResponse = (seed + bar * 17) % 5 === 0;

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
      pushLowerCounterLine(lowerEvents, l, bar, seed);
    }
  }

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
  const chords = harmonicContext.chords;

  const upperResult = generateUpperVoice(totalBeats, chords, params, seedBase);
  const upperPitches = upperResult.pitches;
  const lowerPitches = generateLowerVoice(
    totalBeats,
    chords,
    upperPitches,
    params,
    seedBase,
    upperResult.phraseLengths,
    upperResult.phraseNetDeltas,
    upperResult.phraseDirections
  );

  const { upper: u, lower: l } = enforceCounterpoint(upperPitches, lowerPitches, seedBase);

  const { upperEvents, lowerEvents, impliedHarmony } = deriveMelodySupportLayout(
    u,
    l,
    chords,
    beatsPerBar,
    seedBase
  );

  const rawOutput: WybleOutput = {
    upper_line: { events: upperEvents, register: 'upper' },
    lower_line: { events: lowerEvents, register: 'lower' },
    implied_harmony: impliedHarmony,
  };

  return applyGuitarConstraints(rawOutput);
}
