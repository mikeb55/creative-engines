/**
 * Jimmy Wyble legacy Score — controlled post-pass for two-voice independence (rhythmic + light contrapuntal).
 * Does not replace generation; runs after `finalizeWybleMeasureBarMathPerVoice` once, then caller re-finalizes.
 * Pitch nudges are minimal (±1 semitone) and register-safe; harmony symbols unchanged.
 */

import type { Measure, NoteEvent, Score } from './timing';
import { MEASURE_DIVISIONS } from './timing';

const EPS = 1e-6;
/** Eighth / quarter in divisions (1 beat = 4 divisions). */
const EIGHTH_DIV = 2;

/** Same bounds as `wybleGenerator`. */
const UPPER_MIN = 64;
const UPPER_MAX = 76;
const LOWER_MIN = 48;
const LOWER_MAX = 60;

/** Light touch only — allow natural doubling; refine only when coincidence is very high. */
const SHARED_ONSET_TARGET = 0.78;

function voiceSum(events: NoteEvent[]): number {
  return events.reduce((s, e) => s + e.duration, 0);
}

/** Note-onset positions (divisions from bar start). */
function noteOnsetPositions(events: NoteEvent[]): number[] {
  let t = 0;
  const out: number[] = [];
  for (const e of events) {
    if (e.pitch !== 0) out.push(t);
    t += e.duration;
  }
  return out;
}

function noteAttackCount(events: NoteEvent[]): number {
  return events.filter((e) => e.pitch !== 0).length;
}

/** Shared note starts (both voices attack a pitch at same division). */
function sharedOnsetRatio(v1: NoteEvent[], v2: NoteEvent[]): number {
  const s1 = noteOnsetPositions(v1);
  const s2 = noteOnsetPositions(v2);
  const set1 = new Set(s1);
  let shared = 0;
  for (const t of s2) {
    if (set1.has(t)) shared++;
  }
  const denom = Math.min(s1.length, s2.length);
  return denom <= 0 ? 0 : shared / denom;
}

/**
 * Prepend rest `shift` divisions and trim from end so total stays `total` (typically MEASURE_DIVISIONS).
 */
function prependRestTrimFromEnd(events: NoteEvent[], voice: number, shift: number, total: number): boolean {
  if (shift <= 0 || events.length === 0) return false;
  const sum = voiceSum(events);
  if (Math.abs(sum - total) > EPS) return false;
  events.unshift({ pitch: 0, duration: shift, voice });
  let rem = shift;
  for (let i = events.length - 1; i >= 0 && rem > EPS; i--) {
    const cut = Math.min(events[i].duration, rem);
    events[i].duration -= cut;
    rem -= cut;
    if (events[i].duration <= EPS) events.splice(i, 1);
  }
  return Math.abs(voiceSum(events) - total) < EPS;
}

/** Aligned melodic steps: nudge lower toward contrary motion (at most two intervals per bar). */
function antiParallelNudgeLowerPairs(measure: Measure): void {
  const u = measure.voices[1] ?? [];
  const l = measure.voices[2] ?? [];
  const uNotes = u.filter((e) => e.pitch > 0);
  const lNotes = l.filter((e) => e.pitch > 0);
  const maxK = Math.min(uNotes.length, lNotes.length, 4);
  if (maxK < 2) return;

  let nudges = 0;
  for (let k = 0; k < maxK - 1 && nudges < 2; k++) {
    const d1 = uNotes[k + 1].pitch - uNotes[k].pitch;
    const d2 = lNotes[k + 1].pitch - lNotes[k].pitch;
    if (d1 === 0 || d2 === 0) continue;
    if (Math.sign(d1) !== Math.sign(d2)) continue;
    if (Math.abs(d1) > 5 || Math.abs(d2) > 5) continue;
    const target = lNotes[k + 1];
    let np = target.pitch - Math.sign(d2);
    if (np < LOWER_MIN || np > LOWER_MAX) continue;
    if (np >= uNotes[k + 1].pitch - 6) np -= 12;
    if (np < LOWER_MIN || np > LOWER_MAX || np >= uNotes[k + 1].pitch - 4) continue;
    target.pitch = np;
    nudges++;
  }
}

/** Keep lower voice clearly below upper (idiomatic spacing). */
function registerSeparation(measure: Measure): void {
  const upperMax = Math.max(
    0,
    ...(measure.voices[1] ?? []).filter((e) => e.pitch > 0).map((e) => e.pitch)
  );
  if (upperMax < UPPER_MIN) return;
  for (const e of measure.voices[2] ?? []) {
    if (e.pitch === 0) continue;
    if (e.pitch > upperMax - 10) {
      let p = e.pitch;
      while (p > upperMax - 10 && p - 12 >= LOWER_MIN) p -= 12;
      if (p >= upperMax - 10) p = Math.max(LOWER_MIN, Math.min(LOWER_MAX, upperMax - 12));
      e.pitch = Math.max(LOWER_MIN, Math.min(LOWER_MAX, p));
    }
  }
}

/** Prefer staggering the voice with more attacks when both are similarly busy (dialogue). */
function pickVoiceToDelayFirst(m: Measure, seed: number): 1 | 2 {
  const n1 = noteAttackCount(m.voices[1] ?? []);
  const n2 = noteAttackCount(m.voices[2] ?? []);
  if (n1 > n2 + 1) return 1;
  if (n2 > n1 + 1) return 2;
  const barAlt = (m.index + Math.floor(seed % 7)) % 2 === 0;
  return barAlt ? 2 : 1;
}

function processMeasure(m: Measure, seed: number): void {
  const v1 = m.voices[1] ?? [];
  const v2 = m.voices[2] ?? [];
  if (v1.length === 0 || v2.length === 0) return;

  registerSeparation(m);

  let ratio = sharedOnsetRatio(v1, v2);
  let iter = 0;
  let nextVoice: 1 | 2 = pickVoiceToDelayFirst(m, seed);
  while (ratio > SHARED_ONSET_TARGET - EPS && iter < 2) {
    iter++;
    const ev = nextVoice === 1 ? v1 : v2;
    if (ev.length === 0) break;
    if (!prependRestTrimFromEnd(ev, nextVoice, EIGHTH_DIV, MEASURE_DIVISIONS)) break;
    ratio = sharedOnsetRatio(v1, v2);
    nextVoice = nextVoice === 1 ? 2 : 1;
  }

  antiParallelNudgeLowerPairs(m);
}

/**
 * Post-generation independence shaping: decouple onsets, break pitch loops, contrary/oblique nudges, register.
 * Caller must run `finalizeWybleMeasureBarMathPerVoice` on every measure afterward.
 */
export function applyWybleVoiceIndependence(score: Score, seed: number): void {
  for (const m of score.measures) {
    processMeasure(m, seed);
  }
}
