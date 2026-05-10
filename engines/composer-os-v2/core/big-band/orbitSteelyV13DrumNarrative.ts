/**
 * Steely Orbit V1.3 — replace `bb_drums` with a section-wise narrative arc (drums only).
 * Voice 1: GM 40 / 42 / 46 / 51 only. Voice 2: BD (36), optional `bb_drum_bs`.
 */

import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

const DRUM_BD = 36;
const DRUM_HH = 42;
const DRUM_RIDE = 51;
const DRUM_OHH = 46;
const DRUM_BRUSH = 40;

function findDrums(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.id === 'bb_drums');
}

function effBeats(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

export function drumVoice1MeasureSignature(measure: MeasureModel): string {
  const bits: string[] = [];
  for (const e of measure.events) {
    if (e.kind !== 'note') continue;
    const v = e.voice ?? 1;
    if (v !== 1) continue;
    bits.push(`${e.startBeat.toFixed(4)}:${e.duration.toFixed(4)}:${(e as { pitch: number }).pitch}`);
  }
  bits.sort();
  return bits.join('|');
}

export function auditDrumVoice1FourBarRepeats(score: ScoreModel): {
  ok: boolean;
  messages: string[];
} {
  const drums = findDrums(score);
  if (!drums) return { ok: true, messages: [] };

  const tb = drums.measures.length;
  const sigs: string[] = [];
  for (let b = 1; b <= tb; b++) {
    sigs.push(drumVoice1MeasureSignature(drums.measures[b - 1]!));
  }

  const messages: string[] = [];
  for (let i = 0; i <= sigs.length - 4; i++) {
    const s0 = sigs[i]!;
    if (s0 === sigs[i + 1] && s0 === sigs[i + 2] && s0 === sigs[i + 3]) {
      messages.push(`voice 1 identical drums bars ${i + 1}–${i + 4}`);
    }
  }
  return { ok: messages.length === 0, messages };
}

/** Voice 1: eighth-note grid (fills `L`). */
function voice1Eighths(measure: MeasureModel, L: number, pitchAt: (i: number) => number): void {
  const n = Math.floor(L / 0.5 + 1e-6);
  for (let i = 0; i < n; i++) {
    const st = i * 0.5;
    if (st >= L - 1e-5) break;
    const dur = Math.min(0.5, L - st);
    addEvent(measure, createNote(pitchAt(i), st, dur, 1));
  }
}

/** Voice 2: three-quarter boom-chick-style grid for L=3. */
function voice2ThreeQuarters(measure: MeasureModel, L: number, middleSnare: boolean): void {
  if (L < 3 - 1e-3) {
    addEvent(measure, createNote(DRUM_BD, 0, L, 2));
    return;
  }
  addEvent(measure, createNote(DRUM_BD, 0, 1, 2));
  if (middleSnare) {
    addEvent(measure, createNote(DRUM_BD, 1, 1, 2, 'bb_drum_bs'));
  } else {
    addEvent(measure, createNote(DRUM_BD, 1, 1, 2));
  }
  addEvent(measure, createNote(DRUM_BD, 2, L - 2, 2));
}

/** Voice 2: displaced middle composite when barIndex matches. */
function voice2ThreeQuartersDisplaced(measure: MeasureModel, L: number, bar: number): void {
  if (L < 3 - 1e-3) {
    addEvent(measure, createNote(DRUM_BD, 0, L, 2));
    return;
  }
  addEvent(measure, createNote(DRUM_BD, 0, 1, 2));
  if (bar % 4 === 2) {
    addEvent(measure, createRest(1, 0.5, 2));
    addEvent(measure, createNote(DRUM_BD, 1.5, 0.5, 2, 'bb_drum_bs'));
    addEvent(measure, createNote(DRUM_BD, 2, 1, 2));
  } else {
    addEvent(measure, createNote(DRUM_BD, 1, 1, 2, 'bb_drum_bs'));
    addEvent(measure, createNote(DRUM_BD, 2, 1, 2));
  }
}

/** 1–8: brush taps only on v1 (cross-stick proxy); sparse BD on v2 — alternating layouts. */
function bars1to8(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  const odd = bar % 2 === 1;
  if (odd) {
    addEvent(measure, createNote(DRUM_BRUSH, 0, Math.min(0.45, L), 1));
    if (L > 0.45) addEvent(measure, createRest(0.45, L - 0.45, 1));
    addEvent(measure, createNote(DRUM_BD, 0, 1, 2));
    if (L > 1) addEvent(measure, createRest(1, L - 1, 2));
  } else {
    addEvent(measure, createRest(0, 1, 1));
    addEvent(measure, createNote(DRUM_BRUSH, 1, Math.min(0.45, L - 1), 1));
    if (L > 1.45) addEvent(measure, createRest(1.45, L - 1.45, 1));
    addEvent(measure, createRest(0, 2, 2));
    addEvent(measure, createNote(DRUM_BD, 2, Math.min(1, L - 2), 2));
    if (L > 3) addEvent(measure, createRest(3, L - 3, 2));
  }
}

const TOP4 = [DRUM_RIDE, DRUM_OHH, DRUM_HH, DRUM_BRUSH] as const;

/** 9–16 ride groove — rotate cymbal colour each bar so no 4-bar repeat. */
function bars9to16(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  voice1Eighths(measure, L, (i) => TOP4[(i + bar * 3 + 2) % 4]!);
  voice2ThreeQuarters(measure, L, true);
}

/** 17–24 displacement — varied hat layer per bar. */
function bars17to24(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  voice1Eighths(measure, L, (i) => TOP4[(i + bar * 5 + bar % 3) % 4]!);
  voice2ThreeQuartersDisplaced(measure, L, bar);
}

/** 25–32 HH pad + BD — alternate sparse vs full quarters. */
function bars25to32(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  const sparse = bar % 2 === 1;
  if (sparse && L >= 3 - 1e-3) {
    addEvent(measure, createNote(DRUM_HH, 0, 0.55, 1));
    addEvent(measure, createRest(0.55, 1.45, 1));
    addEvent(measure, createNote(DRUM_HH, 2, 1, 1));
    addEvent(measure, createRest(0, 1, 2));
    addEvent(measure, createNote(DRUM_BD, 1, 1, 2));
    addEvent(measure, createRest(2, L - 2, 2));
  } else {
    let t = 0;
    while (t < L - 1e-5) {
      const dur = Math.min(1, L - t);
      addEvent(measure, createNote(DRUM_HH, t, dur, 1));
      t += dur;
    }
    addEvent(measure, createRest(0, 1, 2));
    addEvent(measure, createNote(DRUM_BD, 1, 1, 2));
    addEvent(measure, createRest(2, L - 2, 2));
  }
}

/** 33–40 swung / dotted colour — dense ride layers */
function bars33to40(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  voice1Eighths(measure, L, (i) =>
    [DRUM_RIDE, DRUM_RIDE, DRUM_OHH, DRUM_BRUSH, DRUM_HH, DRUM_RIDE][(i + bar) % 6]!
  );
  voice2ThreeQuarters(measure, L, bar % 2 === 0);
}

function bar41(measure: MeasureModel, L: number): void {
  measure.events = [];
  addEvent(measure, createNote(DRUM_BRUSH, 0, Math.min(0.12, L), 1));
  if (L > 0.12) addEvent(measure, createRest(0.12, L - 0.12, 1));
  addEvent(measure, createRest(0, L, 2));
}

/** 42–48 peak */
function bars42to48(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  voice1Eighths(measure, L, (i) =>
    [DRUM_RIDE, DRUM_HH, DRUM_OHH, DRUM_RIDE, DRUM_BRUSH, DRUM_HH][(i + bar) % 6]!
  );
  voice2ThreeQuarters(measure, L, true);
}

/** 49–52 brush pulse — stagger which beats speak per bar. */
function bars49to52(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  const phase = bar % 4;
  if (phase === 0 || phase === 2) {
    let t = 0;
    while (t < L - 1e-5) {
      const dur = Math.min(1, L - t);
      addEvent(measure, createNote(DRUM_BRUSH, t, dur, 1));
      t += dur;
    }
  } else {
    addEvent(measure, createNote(DRUM_BRUSH, 0, 1, 1));
    addEvent(measure, createRest(1, 1, 1));
    addEvent(measure, createNote(DRUM_BRUSH, 2, Math.min(1, L - 2), 1));
    if (L > 3) addEvent(measure, createRest(3, L - 3, 1));
  }
  addEvent(measure, createNote(DRUM_BD, 0, 1, 2));
  addEvent(measure, createRest(1, L - 1, 2));
}

/** 53–56 dry sticks — explicit rests so each voice sums to `L`; micro-variation per bar. */
function bars53to56(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];

  const micro = (bar % 4) * 0.03;
  const bDur = 0.18 + micro;
  const rDur = 0.22 + micro * 0.5;

  let t = 0;
  addEvent(measure, createNote(DRUM_BRUSH, t, bDur, 1));
  t = bDur;
  addEvent(measure, createRest(t, 1 - t, 1));
  addEvent(measure, createNote(DRUM_RIDE, 1, rDur, 1));
  t = 1 + rDur;
  addEvent(measure, createRest(t, 2 - t, 1));
  const hhDur = Math.min(0.35 + micro * 0.4, L - 2);
  addEvent(measure, createNote(DRUM_HH, 2, hhDur, 1));
  t = 2 + hhDur;
  if (t < L - 1e-5) addEvent(measure, createRest(t, L - t, 1));

  addEvent(measure, createNote(DRUM_BD, 0, 0.5 + micro * 0.2, 2));
  let t2 = 0.5 + micro * 0.2;
  const sn = bar % 2 === 0 ? 1.5 : 2;
  if (sn > t2 + 1e-5) addEvent(measure, createRest(t2, sn - t2, 2));
  const sd = Math.min(0.42 + micro * 0.15, L - sn);
  addEvent(measure, createNote(DRUM_BD, sn, sd, 2, 'bb_drum_bs'));
  t2 = sn + sd;
  if (t2 < L - 1e-5) addEvent(measure, createRest(t2, L - t2, 2));
}

function bar57(measure: MeasureModel, L: number): void {
  measure.events = [];
  let t = 0;
  while (t < L - 1e-5) {
    const dur = Math.min(1, L - t);
    addEvent(measure, createNote(DRUM_HH, t, dur, 1));
    t += dur;
  }
  addEvent(measure, createRest(0, L, 2));
}

function bar58(measure: MeasureModel, L: number): void {
  measure.events = [];
  addEvent(measure, createRest(0, 1, 1));
  addEvent(measure, createNote(DRUM_BRUSH, 1, Math.min(0.55, L - 1), 1));
  if (L > 1.55) addEvent(measure, createRest(1.55, L - 1.55, 1));
  addEvent(measure, createRest(0, L, 2));
}

function bar59(measure: MeasureModel, L: number): void {
  measure.events = [];
  addEvent(measure, createRest(0, L, 1));
  let t = 0;
  while (t < L - 1e-5) {
    const dur = Math.min(1, L - t);
    addEvent(measure, createNote(DRUM_BD, t, dur, 2));
    t += dur;
  }
}

function bar60(measure: MeasureModel, L: number): void {
  measure.events = [];
  addEvent(measure, createRest(0, L, 1));
  addEvent(measure, createNote(DRUM_BD, 0, Math.min(0.3, L), 2));
  if (L > 0.3) addEvent(measure, createRest(0.3, L - 0.3, 2));
}

function bars61to64(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  const hitDur = Math.min(1, 0.92 + (bar % 4) * 0.02);
  addEvent(measure, createNote(DRUM_BRUSH, 0, hitDur, 1));
  if (L > hitDur) addEvent(measure, createRest(hitDur, L - hitDur, 1));
  addEvent(measure, createRest(0, L, 2));
}

function buildBar(measure: MeasureModel, L: number, bar: number): void {
  measure.events = [];
  if (bar <= 8) bars1to8(measure, L, bar);
  else if (bar <= 16) bars9to16(measure, L, bar);
  else if (bar <= 24) bars17to24(measure, L, bar);
  else if (bar <= 32) bars25to32(measure, L, bar);
  else if (bar <= 40) bars33to40(measure, L, bar);
  else if (bar === 41) bar41(measure, L);
  else if (bar <= 48) bars42to48(measure, L, bar);
  else if (bar <= 52) bars49to52(measure, L, bar);
  else if (bar <= 56) bars53to56(measure, L, bar);
  else if (bar === 57) bar57(measure, L);
  else if (bar === 58) bar58(measure, L);
  else if (bar === 59) bar59(measure, L);
  else if (bar === 60) bar60(measure, L);
  else bars61to64(measure, L, bar);
}

export function applySteelyOrbitDrumNarrative(score: ScoreModel): void {
  const drums = findDrums(score);
  if (!drums) return;

  const tb = Math.min(64, drums.measures.length);
  for (let bar = 1; bar <= tb; bar++) {
    const L = effBeats(score, bar);
    const m = drums.measures[bar - 1]!;
    buildBar(m, L, bar);
  }
}
