/**
 * Guitar phrase authority — intentional contours, guide-tone landings, ensemble stagger (duo golden path).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';

export type PhraseIntent = 'guitar_lead' | 'bass_lead' | 'answer_guitar' | 'answer_bass' | 'cadence';

export function liftToneToRange(pitch: number, low: number, high: number): number {
  let p = pitch;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return clampPitch(p, low, high);
}

/**
 * Phrase ending: chord 3rd/7th (or anchor pitch class when it matches harmony) — V3.0 singable landings.
 */
export function resolvePhraseEndForDuo(
  tones: ReturnType<typeof guitarChordTonesInRange>,
  anchorMidi: number | undefined,
  effectiveLow: number,
  effectiveHigh: number,
  seed: number,
  bar: number
): number {
  const endStrong = seededUnit(seed, bar, 401) < 0.52 ? tones.third : tones.seventh;
  if (anchorMidi === undefined) return endStrong;
  const anchorPc = ((anchorMidi % 12) + 12) % 12;
  const chordPcs = [tones.root, tones.third, tones.fifth, tones.seventh].map((p) => ((p % 12) + 12) % 12);
  if (chordPcs.includes(anchorPc) && seededUnit(seed, bar, 406) < 0.4) {
    return liftToneToRange(anchorMidi, effectiveLow, effectiveHigh);
  }
  return endStrong;
}

/** Chord tones placed in the current guitar window (idiomatic register). */
export function guitarChordTonesInRange(
  chord: string,
  low: number,
  high: number
): { third: number; seventh: number; fifth: number; root: number } {
  const t = chordTonesForChordSymbol(chord);
  return {
    root: liftToneToRange(t.root, low, high),
    third: liftToneToRange(t.third, low, high),
    fifth: liftToneToRange(t.fifth, low, high),
    seventh: liftToneToRange(t.seventh, low, high),
  };
}

/**
 * Bar-level dialogue roles — not 1:1 with section labels; drives stagger and phrase shape.
 * Bar 4: arrival in A; bar 7: B-side “moment”; bar 8: cadence.
 */
export function getDuoPhraseIntent(bar: number, seed: number): PhraseIntent {
  if (bar === 8) return 'cadence';
  if (bar === 4) return 'guitar_lead';
  if (bar === 7) return seededUnit(seed, bar, 301) < 0.55 ? 'guitar_lead' : 'answer_guitar';

  const u = (seed + bar * 31 + bar * bar) % 11;
  if (bar <= 4) {
    if (u < 4) return 'guitar_lead';
    if (u < 7) return 'bass_lead';
    return 'answer_guitar';
  }
  if (u < 3) return 'bass_lead';
  if (u < 7) return 'answer_guitar';
  return 'guitar_lead';
}

/** Ensemble stagger (quarter beats) from phrase intent — favors handoffs over unison downbeats. */
export function computeEnsembleStagger(bar: number, seed: number, intent: PhraseIntent): { guitar: number; bass: number } {
  const j = seededUnit(seed, bar, 201);
  switch (intent) {
    case 'cadence':
      return j < 0.45 ? { guitar: 0, bass: 0.5 } : { guitar: 0.5, bass: 0 };
    case 'guitar_lead':
      return { guitar: qBeat(0.15 + j * 0.2), bass: qBeat(0.55 + j * 0.35) };
    case 'bass_lead':
      return { guitar: qBeat(1 + j * 0.75), bass: qBeat(0.1 + j * 0.15) };
    case 'answer_guitar':
      return { guitar: qBeat(1.15 + j * 0.35), bass: qBeat(0.05 + j * 0.2) };
    case 'answer_bass':
      return { guitar: qBeat(0.2 + j * 0.25), bass: qBeat(1 + j * 0.5) };
    default:
      return { guitar: 0, bass: 0.5 };
  }
}

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/**
 * Non-motif guitar bar: phrase contour, decisive endings on 3rd/7th, space when answering bass.
 */
export function emitGuitarPhraseBar(params: {
  m: MeasureModel;
  bar: number;
  chord: string;
  effectiveLow: number;
  effectiveHigh: number;
  density: 'sparse' | 'medium' | 'dense';
  useOffbeat: boolean;
  reduceAttack: boolean;
  intent: PhraseIntent;
  staggerG: number;
  seed: number;
  methenyShortenLong?: boolean;
  /** Primary motif anchor — repeated pitch class when harmonically valid (duo V3.0). */
  anchorMidi?: number;
  /** Duo swing: delayed downbeats, short–long cells, stronger syncopation. */
  swingDuo?: boolean;
}): void {
  const {
    m,
    bar,
    chord,
    effectiveLow,
    effectiveHigh,
    density,
    useOffbeat,
    reduceAttack,
    intent,
    staggerG,
    seed,
    methenyShortenLong,
    anchorMidi,
    swingDuo,
  } = params;

  const tones = guitarChordTonesInRange(chord, effectiveLow, effectiveHigh);
  const endStrong = resolvePhraseEndForDuo(tones, anchorMidi, effectiveLow, effectiveHigh, seed, bar);
  const uPen = seededUnit(seed, bar, 401);
  const pen = uPen < 0.4 ? tones.fifth : tones.root;
  const lead = seededUnit(seed, bar, 403) < 0.45 ? tones.fifth : tones.third;

  /** Final bar: stable chord tone, minimal motion (resolution). */
  if (bar === 8) {
    addEvent(m, createRest(0, 1.5));
    addEvent(m, createNote(endStrong, 1.5, 2.5));
    return;
  }

  let headRest =
    intent === 'answer_guitar' || intent === 'cadence'
      ? qBeat(0.75 + staggerG * 0.5 + seededUnit(seed, bar, 405) * 0.5)
      : intent === 'bass_lead'
        ? qBeat(1.1 + Math.min(staggerG, 0.75) + seededUnit(seed, bar, 407) * 0.35)
        : qBeat(0.35 + staggerG * 0.6 + (useOffbeat ? 0.35 : 0));

  if (density === 'sparse') {
    headRest = Math.min(headRest, 1.75);
  }

  /** Bar 4: reach higher register; bar 7: slight lift for tension line. */
  const regBump = bar === 4 ? 4 : bar === 7 ? 1 : 0;
  const hi = Math.min(effectiveHigh, endStrong + regBump);
  const mid = clampPitch(pen + (bar % 2), effectiveLow, effectiveHigh);
  const lo = clampPitch(lead - (intent === 'guitar_lead' ? 0 : 1), effectiveLow, effectiveHigh);

  const shorten = (d: number) => {
    let x = d;
    if (methenyShortenLong && x > 0.5) x = Math.min(x, 1.25);
    return qBeat(x);
  };

  if (density === 'sparse') {
    if (reduceAttack && intent !== 'answer_guitar') {
      addEvent(m, createRest(0, 2));
      addEvent(m, createNote(endStrong, 2, 2));
      return;
    }
    addEvent(m, createRest(0, headRest));
    const t0 = headRest;
    if (intent === 'cadence') {
      const a = shorten(1);
      const b0 = shorten(1);
      const tail = 4 - t0 - a - b0;
      if (tail > 0.2) {
        addEvent(m, createNote(lo, t0, a));
        addEvent(m, createNote(mid, t0 + a, b0));
        addEvent(m, createNote(hi, t0 + a + b0, tail));
      } else {
        addEvent(m, createNote(lo, t0, 1.25));
        addEvent(m, createNote(endStrong, t0 + 1.25, 4 - t0 - 1.25));
      }
      return;
    }
    const n1 = bar === 4 ? shorten(1) : shorten(1.25);
    addEvent(m, createNote(lo, t0, n1));
    const gapAfter = bar === 4 ? 0.25 : 0.5;
    addEvent(m, createRest(t0 + n1, gapAfter));
    const lastStart = qBeat(t0 + n1 + gapAfter);
    const tailDur = qBeat(4 - lastStart);
    addEvent(m, createNote(endStrong, lastStart, tailDur));
    return;
  }

  if (density === 'medium') {
    const dyadBar = bar === 4;
    if (swingDuo && bar % 3 === 1 && intent !== 'answer_guitar') {
      addEvent(m, createRest(0, 0.5));
      addEvent(m, createNote(tones.third, 0.5, 0.5));
      addEvent(m, createNote(tones.fifth, 1, 1.25));
      addEvent(m, createRest(2.25, 0.25));
      addEvent(m, createNote(endStrong, 2.5, 1.5));
      return;
    }
    if (dyadBar && intent !== 'answer_guitar') {
      addEvent(m, createRest(0, 0.5));
      addEvent(m, createNote(tones.third, 0.5, 1));
      addEvent(m, createNote(tones.fifth, 1.5, 1));
      addEvent(m, createRest(2.5, 0.5));
      addEvent(m, createNote(endStrong, 3, 1));
      return;
    }
    const g = staggerG;
    if (g > 0) addEvent(m, createRest(0, g));
    const t0 = g;
    const rem = 4 - t0;
    if (rem <= 0.25) {
      addEvent(m, createNote(endStrong, t0, rem));
      return;
    }
    const d1 = qBeat(Math.min(1.5, rem * 0.48));
    addEvent(m, createNote(lo, t0, d1));
    if (bar === 7 && intent !== 'answer_guitar') {
      const chrom = clampPitch(mid - 1, effectiveLow, effectiveHigh);
      const dCh = qBeat(Math.min(0.75, (rem - d1) * 0.35));
      addEvent(m, createNote(chrom, t0 + d1, dCh));
      const afterChrom = rem - d1 - dCh;
      const r1 = qBeat(Math.min(1, afterChrom * 0.42));
      addEvent(m, createRest(t0 + d1 + dCh, r1));
      const tEnd = qBeat(t0 + d1 + dCh + r1);
      addEvent(m, createNote(endStrong, tEnd, qBeat(4 - tEnd)));
      return;
    }
    const r1 = qBeat(Math.min(1, (rem - d1) * 0.42));
    addEvent(m, createRest(t0 + d1, r1));
    const tEnd = qBeat(t0 + d1 + r1);
    addEvent(m, createNote(endStrong, tEnd, qBeat(4 - tEnd)));
    return;
  }

  /* dense */
  const g = staggerG;
  if (g > 0) addEvent(m, createRest(0, g));
  const t0 = g;
  const rem = 4 - t0;
  if (rem <= 0.25) {
    addEvent(m, createNote(endStrong, t0, rem));
    return;
  }
  const d1 = qBeat(Math.min(1, rem * 0.34));
  const d2 = qBeat(Math.min(1, (rem - d1) * 0.4));
  addEvent(m, createNote(lo, t0, d1));
  if (bar === 7) {
    const pass = clampPitch(mid - 1, effectiveLow, effectiveHigh);
    const dPass = qBeat(Math.min(0.5, (rem - d1) * 0.28));
    addEvent(m, createNote(pass, t0 + d1, dPass));
    const d2b = qBeat(Math.min(1, (rem - d1 - dPass) * 0.45));
    addEvent(m, createNote(mid, t0 + d1 + dPass, d2b));
    const r = qBeat(Math.min(0.5, rem - d1 - dPass - d2b));
    addEvent(m, createRest(t0 + d1 + dPass + d2b, r));
    const tLast = qBeat(t0 + d1 + dPass + d2b + r);
    addEvent(m, createNote(hi, tLast, qBeat(4 - tLast)));
    return;
  }
  addEvent(m, createNote(mid, t0 + d1, d2));
  const r = qBeat(Math.min(0.5, rem - d1 - d2));
  addEvent(m, createRest(t0 + d1 + d2, r));
  const tLast = qBeat(t0 + d1 + d2 + r);
  addEvent(m, createNote(hi, tLast, qBeat(4 - tLast)));
}
