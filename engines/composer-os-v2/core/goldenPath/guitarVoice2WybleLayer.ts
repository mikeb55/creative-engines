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
/** Inner voice register floor (MIDI). */
const INNER_LOW = 48;
/** Never stack more than two simultaneous guitar notes (melody + inner). */
const MAX_GUITAR_SIMULT = 2;

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

/** Deterministic 30–60% coverage per 8-bar section without 3 consecutive active bars. */
function collectActiveBarIndices(totalBars: number, seed: number): number[] {
  const active = new Set<number>();
  const sectionCount = Math.ceil(totalBars / 8);
  const patterns4 = [
    [0, 2, 4, 6],
    [1, 3, 5, 7],
    [0, 3, 4, 7],
    [1, 2, 5, 6],
    [0, 2, 5, 7],
    [1, 4, 6, 7],
  ];
  const patterns3 = [
    [0, 3, 6],
    [1, 4, 7],
    [0, 2, 5],
    [1, 3, 6],
  ];
  for (let sec = 0; sec < sectionCount; sec++) {
    const useSparse = seededUnit(seed, sec, 1820) < 0.45;
    const pat = useSparse
      ? patterns3[(Math.abs(seed) + sec * 17) % patterns3.length]!
      : patterns4[(Math.abs(seed) + sec * 13) % patterns4.length]!;
    const base = sec * 8;
    for (const off of pat) {
      const b = base + off + 1;
      if (b >= 1 && b <= totalBars) active.add(b);
    }
  }
  const sorted = [...active].sort((a, b) => a - b);
  const filtered = removeTripleConsecutive(sorted);
  if (filtered.length === 0 && totalBars >= 4) {
    filtered.push(4);
  }
  return filtered;
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
  contour: 'up' | 'down' | 'flat'
): { primary: number; secondary: number; innerHigh: number } | null {
  const strictCeiling = minOverlappingV1;
  if (strictCeiling <= INNER_LOW) return null;
  const innerHigh = Math.min(66, strictCeiling - 1);
  if (innerHigh < INNER_LOW) return null;
  const tones = guitarChordTonesInRange(chord, INNER_LOW, innerHigh, chordOpts(context));
  const preferThirdFirst = seededUnit(seed, bar + segSalt, 1821) < 0.55;
  const pThird = placeStrictlyBelowCeiling(strictCeiling, tones.third, INNER_LOW);
  const pSeventh = placeStrictlyBelowCeiling(strictCeiling, tones.seventh, INNER_LOW);
  let primary = preferThirdFirst ? pThird : pSeventh;
  let secondary = preferThirdFirst ? pSeventh : pThird;
  if (contour === 'up' && secondary > primary) {
    secondary = clampPitch(primary - 1, INNER_LOW, innerHigh);
  } else if (contour === 'down' && secondary < primary) {
    secondary = clampPitch(primary + 1, INNER_LOW, innerHigh);
  }
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

    const rhythmMode = seededUnit(seed, bar, 1823);
    if (rhythmMode < 0.34) {
      const c = minOverlappingV1Pitch(v1notes, 2, 4);
      if (c === undefined) continue;
      const pair = pickPrimarySecondaryForSegment(c, chord, context, seed, bar, 0, contour);
      if (!pair) continue;
      addEvent(m, createRest(0, 2, V2_VOICE));
      addEvent(m, createNote(pair.primary, 2, 2, V2_VOICE));
    } else if (rhythmMode < 0.67) {
      const cA = minOverlappingV1Pitch(v1notes, 0, 2);
      const cB = minOverlappingV1Pitch(v1notes, 2, 4);
      if (cA === undefined || cB === undefined) continue;
      const pairA = pickPrimarySecondaryForSegment(cA, chord, context, seed, bar, 1, contour);
      const pairB = pickPrimarySecondaryForSegment(cB, chord, context, seed, bar, 2, contour);
      if (!pairA || !pairB) continue;
      const p1 = pairA.primary;
      const innerHB = pairB.innerHigh;
      const p2 =
        contour === 'up'
          ? clampPitch(Math.min(pairB.secondary, pairB.primary - 1), INNER_LOW, innerHB)
          : clampPitch(Math.max(pairB.secondary, pairB.primary + 1), INNER_LOW, innerHB);
      addEvent(m, createNote(p1, 0, 2, V2_VOICE));
      addEvent(m, createNote(p2, 2, 2, V2_VOICE));
    } else {
      const c1 = minOverlappingV1Pitch(v1notes, 1, 2);
      const c3 = minOverlappingV1Pitch(v1notes, 3, 4);
      if (c1 === undefined || c3 === undefined) continue;
      const pair1 = pickPrimarySecondaryForSegment(c1, chord, context, seed, bar, 3, contour);
      const pair3 = pickPrimarySecondaryForSegment(c3, chord, context, seed, bar, 4, contour);
      if (!pair1 || !pair3) continue;
      addEvent(m, createRest(0, 1, V2_VOICE));
      addEvent(m, createNote(pair1.primary, 1, 1, V2_VOICE));
      addEvent(m, createRest(2, 1, V2_VOICE));
      addEvent(m, createNote(pair3.secondary, 3, 1, V2_VOICE));
    }

    m.events.sort((a, b) => (a as { startBeat: number }).startBeat - (b as { startBeat: number }).startBeat);

    const v2notes = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === V2_VOICE) as NoteEvent[];
    const v2sum = v2notes.reduce((s, n) => s + n.duration, 0);
    if (Math.abs(v2sum - 4) > 0.001) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      continue;
    }

    if (!voice2StrictlyBelowOverlappingV1(v1notes, v2notes)) {
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
 * After post-orchestration / voice-leading edits to voice 1, drop voice 2 in any bar where register would cross.
 * Keeps export unchanged; only removes invalid inner-voice events.
 */
export function stripVoice2IfCrossingMelody(guitar: PartModel): number {
  let strippedBars = 0;
  for (const m of guitar.measures) {
    const v1 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1) as NoteEvent[];
    const v2 = m.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 2) as NoteEvent[];
    if (v2.length === 0) continue;
    if (!voice2StrictlyBelowOverlappingV1(v1, v2)) {
      m.events = m.events.filter((e) => (e.voice ?? 1) !== V2_VOICE);
      strippedBars += 1;
    }
  }
  return strippedBars;
}
