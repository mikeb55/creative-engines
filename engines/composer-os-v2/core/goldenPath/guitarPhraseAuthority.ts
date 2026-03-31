/**
 * Guitar phrase authority — intentional contours, guide-tone landings, ensemble stagger (duo golden path).
 */

import type { MeasureModel } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import { chordTonesForChordSymbol, type ChordTonesOptions } from '../harmony/chordSymbolAnalysis';

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
  high: number,
  chordToneOpts?: ChordTonesOptions
): { third: number; seventh: number; fifth: number; root: number } {
  const t = chordTonesForChordSymbol(chord, chordToneOpts);
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

/**
 * V3.1 — Duo interaction authority: fixed 8-bar roles (cycle phase 1–8).
 * Phrase A (1–2): guitar lead / bass support; B (3–4): bass lead / guitar reduced;
 * (5–6): shared interlock; (7–8): guitar lead + cadence.
 */
export function getDuoPhraseIntentV31(phase: number): PhraseIntent {
  const p = ((phase - 1) % 8) + 1;
  if (p === 8) return 'cadence';
  if (p === 7) return 'guitar_lead';
  if (p === 5) return 'answer_bass';
  if (p === 6) return 'answer_guitar';
  if (p === 3 || p === 4) return 'bass_lead';
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
      return { guitar: qBeat(1.27 + j * 0.35), bass: qBeat(0.05 + j * 0.2) };
    case 'answer_bass':
      return { guitar: qBeat(0.28 + j * 0.25), bass: qBeat(1 + j * 0.5) };
    default:
      return { guitar: 0, bass: 0.5 };
  }
}

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/** V3.2 — Fixed chorus “signature” bar (listener hook). */
export const DUO_IDENTITY_MOMENT_BAR = 7 as const;

/**
 * V3.2 — Bar 7 identity: clear interval gesture, syncopation or long hold, peak before cadence.
 */
export function emitGuitarDuoIdentityBar7(params: {
  m: MeasureModel;
  chord: string;
  effectiveLow: number;
  effectiveHigh: number;
  staggerG: number;
  seed: number;
  chordToneOpts?: ChordTonesOptions;
}): void {
  const { m, chord, effectiveLow, effectiveHigh, staggerG, seed, chordToneOpts } = params;
  const tones = guitarChordTonesInRange(chord, effectiveLow, effectiveHigh, chordToneOpts);
  const endStrong = resolvePhraseEndForDuo(tones, undefined, effectiveLow, effectiveHigh, seed, DUO_IDENTITY_MOMENT_BAR);
  const u = seededUnit(seed, DUO_IDENTITY_MOMENT_BAR, 702);
  const lo = clampPitch(tones.third, effectiveLow, effectiveHigh);
  const tOff = snapAttackBeatToGrid(qBeat(0.75 + Math.min(0.5, staggerG) + 0.2));

  if (u < 0.34) {
    const leap = clampPitch(lo + (seededUnit(seed, 7, 703) < 0.5 ? 8 : 9), effectiveLow, effectiveHigh);
    addEvent(m, createRest(0, tOff));
    addEvent(m, createNote(lo, tOff, 0.5));
    addEvent(m, createNote(leap, snapAttackBeatToGrid(tOff + 0.5), 1));
    addEvent(m, createNote(endStrong, snapAttackBeatToGrid(tOff + 1.5), qBeat(4 - tOff - 1.5)));
    return;
  }
  if (u < 0.67) {
    const hi = clampPitch(tones.fifth + (seededUnit(seed, 7, 704) < 0.5 ? 0 : 1), effectiveLow, effectiveHigh);
    const leapEnd = clampPitch(hi + (seededUnit(seed, 7, 705) < 0.5 ? 8 : 9), effectiveLow, effectiveHigh);
    addEvent(m, createRest(0, 1));
    addEvent(m, createNote(hi, 1, 2));
    addEvent(m, createRest(3, 0.5));
    addEvent(m, createNote(leapEnd, 3.5, 0.5));
    return;
  }
  const rep = clampPitch(tones.fifth, effectiveLow, effectiveHigh);
  addEvent(m, createRest(0, 1.5));
  addEvent(m, createNote(rep, 1.5, 1.0));
  addEvent(m, createRest(2.5, 0.5));
  addEvent(m, createNote(endStrong, 3, 1));
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
  chordToneOpts?: ChordTonesOptions;
  /** Lippincott triad pairs: favour third/fifth over scalar runs. */
  triadPairs?: boolean;
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
    chordToneOpts,
    triadPairs,
  } = params;

  /** Duo: attacks only on eighth-beat grid; durations still use quarter-beat rounding where needed. */
  const pos = swingDuo ? snapAttackBeatToGrid : qBeat;

  const tones = guitarChordTonesInRange(chord, effectiveLow, effectiveHigh, chordToneOpts);
  const endStrong = resolvePhraseEndForDuo(tones, anchorMidi, effectiveLow, effectiveHigh, seed, bar);
  const uPen = seededUnit(seed, bar, 401);
  const pen = uPen < 0.4 ? tones.fifth : tones.root;
  const lead = seededUnit(seed, bar, 403) < 0.45 ? tones.fifth : tones.third;

  /** V3.1: bass-lead phrase — guitar stabs / rests / fragments (few attacks → keeps V3 line clarity). */
  if (intent === 'bass_lead' && swingDuo) {
    const u = seededUnit(seed, bar, 551);
    if (u < 0.45) {
      addEvent(m, createRest(0, 2.5));
      addEvent(m, createNote(tones.third, 2.5, 1.5));
      return;
    }
    if (u < 0.82) {
      addEvent(m, createRest(0, 1.75));
      addEvent(m, createNote(tones.seventh, 1.75, 0.5));
      addEvent(m, createRest(2.25, 1.75));
      return;
    }
    addEvent(m, createRest(0, 3));
    addEvent(m, createNote(tones.fifth, 3, 1));
    return;
  }

  /** Final bar: stable chord tone, minimal motion (resolution). V3.2 duo: longer breath vs bar 7 peak. */
  if (bar === 8) {
    if (swingDuo) {
      addEvent(m, createRest(0, 2));
      addEvent(m, createNote(endStrong, 2, 2));
      return;
    }
    addEvent(m, createRest(0, 1.5));
    addEvent(m, createNote(endStrong, 1.5, 2.5));
    return;
  }

  let headRest =
    intent === 'answer_guitar' || intent === 'cadence'
      ? pos(0.75 + staggerG * 0.5 + seededUnit(seed, bar, 405) * 0.5)
      : intent === 'answer_bass'
        ? pos(0.2 + staggerG * 0.45 + seededUnit(seed, bar, 410) * 0.4)
        : intent === 'bass_lead'
          ? pos(1.1 + Math.min(staggerG, 0.75) + seededUnit(seed, bar, 407) * 0.35)
          : pos(0.35 + staggerG * 0.6 + (useOffbeat ? 0.35 : 0));

  if (density === 'sparse') {
    headRest = Math.min(headRest, swingDuo ? 2 : 1.75);
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
        addEvent(m, createNote(mid, pos(t0 + a), b0));
        addEvent(m, createNote(hi, pos(t0 + a + b0), tail));
      } else {
        addEvent(m, createNote(lo, t0, 1.25));
        addEvent(m, createNote(endStrong, pos(t0 + 1.25), 4 - t0 - 1.25));
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
      addEvent(m, createNote(tones.fifth, 1, 1));
      addEvent(m, createRest(2, 0.5));
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
    const lippincottPitch = triadPairs ? tones.third : lo;
    addEvent(m, createNote(lippincottPitch, t0, d1));
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
  const lippincottLo = triadPairs ? tones.third : lo;
  const lippincottMid = triadPairs ? tones.fifth : mid;
  addEvent(m, createNote(lippincottLo, t0, d1));
  if (bar === 7) {
    const pass = clampPitch(mid - 1, effectiveLow, effectiveHigh);
    const dPass = qBeat(Math.min(0.5, (rem - d1) * 0.28));
    addEvent(m, createNote(pass, pos(t0 + d1), dPass));
    const d2b = qBeat(Math.min(1, (rem - d1 - dPass) * 0.45));
    addEvent(m, createNote(mid, pos(t0 + d1 + dPass), d2b));
    const r = qBeat(Math.min(0.5, rem - d1 - dPass - d2b));
    addEvent(m, createRest(pos(t0 + d1 + dPass + d2b), r));
    const tLast = pos(t0 + d1 + dPass + d2b + r);
    addEvent(m, createNote(hi, tLast, qBeat(4 - tLast)));
    return;
  }
  addEvent(m, createNote(mid, pos(t0 + d1), d2));
  const r = qBeat(Math.min(0.5, rem - d1 - d2));
  addEvent(m, createRest(pos(t0 + d1 + d2), r));
  const tLast = pos(t0 + d1 + d2 + r);
  addEvent(m, createNote(hi, tLast, qBeat(4 - tLast)));
}
