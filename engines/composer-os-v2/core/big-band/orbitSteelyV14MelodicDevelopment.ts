/**
 * Steely Orbit V1.4 / V1.5 — alto-only melodic development (seed cell + transformations).
 * Seed: F5 D#5 A#4 C#5 C5 → MIDI [77,75,70,73,72]. Runs after V12 + V13.
 * V1.5: snapshot bars 9–16 pre-pass (V1.3 orchestration) + eighth shift; rebuild 37–48; rest-span audit helper.
 */

import type { LeadSheet, LeadSheetMelodyNoteEvent } from '../lead-sheet/leadSheetTypes';
import { orbitMelodyEventsForBar } from './orbitBbV3MelodyAuthority';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_SAXES } from './buildBigBandOrchestrationPlan';

/** F5 D#5 A#4 C#5 C5 */
export const STEELY_ORBIT_V14_SEED_MIDI = [77, 75, 70, 73, 72] as const;

const EIGHTH = 0.5;
const MINOR_THIRD = 3;
const INV_AXIS = 77;

export type PhraseNote = { t: number; midi: number; dur: number };

export type SteelyOrbitMelodicVariant = 'v14' | 'v15';

type BarNoteSnap = { bar: number; startBeat: number; midi: number; dur: number };

/** Global beat from score bar 1 beat 0 (sum of prior measure lengths). */
export type AbsNote = { gb: number; midi: number; dur: number };

function findAlto(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.id === 'bb_alto_sax');
}

export function effBar(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

function snapAlto(m: number): number {
  return snapMidiToRange(m, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
}

export function cumulativeBarStart(score: ScoreModel, bar1: number): number {
  let s = 0;
  for (let b = 1; b < bar1; b++) s += effBar(score, b);
  return s;
}

function clearVoice1(measure: MeasureModel): void {
  measure.events = measure.events.filter((e) => {
    if (e.kind === 'note' || e.kind === 'rest') return (e.voice ?? 1) !== 1;
    return true;
  });
}

export function emitVoice1Segments(measure: MeasureModel, L: number, segments: Array<{ st: number; midi?: number; dur: number }>): void {
  clearVoice1(measure);
  const sorted = [...segments].sort((a, b) => a.st - b.st);
  let t = 0;
  for (const seg of sorted) {
    const st = Math.min(Math.max(0, seg.st), L - 1e-4);
    if (st > t + 1e-5) addEvent(measure, createRest(t, st - t, 1));
    const dur = Math.min(seg.dur, L - st);
    if (seg.midi !== undefined && dur > 1e-5) {
      addEvent(measure, createNote(snapAlto(seg.midi), st, dur, 1, undefined, undefined, 84));
    }
    t = Math.max(t, st + Math.max(0, dur));
  }
  if (t < L - 1e-5) addEvent(measure, createRest(t, L - t, 1));
}

function snapshotVoice1BarNotes(alto: PartModel, barLow: number, barHigh: number): BarNoteSnap[] {
  const out: BarNoteSnap[] = [];
  for (let bar = barLow; bar <= barHigh; bar++) {
    const m = alto.measures[bar - 1];
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if ((e.voice ?? 1) !== 1) continue;
      const n = e as NoteEvent;
      out.push({ bar, startBeat: n.startBeat, midi: n.pitch, dur: n.duration });
    }
  }
  return out;
}

function snapped916ToAbs(score: ScoreModel, rows: BarNoteSnap[], deltaBeats: number): AbsNote[] {
  return rows.map((r) => {
    const g0 = cumulativeBarStart(score, r.bar);
    return { gb: g0 + r.startBeat + deltaBeats, midi: r.midi, dur: r.dur };
  });
}

/** Two cycles of seed phrase on bars 9–16 (24 quarters), displaced +1 eighth from bar 9 beat 0. */
function fallback916DoubledPhrase(score: ScoreModel, phrase58: PhraseNote[]): AbsNote[] {
  const anchor9 = cumulativeBarStart(score, 9);
  const cap17 = cumulativeBarStart(score, 17);
  const cycleLen = 12;
  const out: AbsNote[] = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const p of phrase58) {
      const gb = anchor9 + cycle * cycleLen + p.t + EIGHTH;
      if (gb >= cap17 - 1e-5) break;
      const dur = Math.min(p.dur, cap17 - gb);
      if (dur > 1e-5) out.push({ gb, midi: p.midi, dur });
    }
  }
  return out;
}

function leadSorted(lead: LeadSheet, bar: number): LeadSheetMelodyNoteEvent[] {
  return [...orbitMelodyEventsForBar(lead, bar)].sort((a, b) => a.beat - b.beat);
}

function scaleRhythm(ev: LeadSheetMelodyNoteEvent[], L: number, lead: LeadSheet): Array<{ beat: number; dur: number }> {
  const srcQ = lead.timeSignature?.beats;
  const srcSpan = typeof srcQ === 'number' && srcQ > 0 ? srcQ : L;
  const scale = L / srcSpan;
  return ev.map((e) => ({
    beat: Math.min(Math.max(0, e.beat * scale), L - 1e-4),
    dur: Math.min(Math.max(1 / 64, e.durationBeats * scale), L),
  }));
}

/**
 * Phrase over bars 5–8 only — `t` starts at 0 at bar 5 beat 0.
 */
export function extractSeedPhraseFromLead(score: ScoreModel, lead: LeadSheet): PhraseNote[] {
  const seed = [...STEELY_ORBIT_V14_SEED_MIDI];
  let si = 0;
  const phrase: PhraseNote[] = [];
  let phraseT = 0;

  for (let bar = 5; bar <= 8; bar++) {
    const L = effBar(score, bar);
    const rh = scaleRhythm(leadSorted(lead, bar), L, lead);
    if (rh.length === 0) {
      const midi = snapAlto(seed[si++ % seed.length]!);
      const dur = Math.min(1.25, L);
      phrase.push({ t: phraseT, midi, dur });
      phraseT += L;
      continue;
    }
    for (const r of rh) {
      const midi = snapAlto(seed[si++ % seed.length]!);
      const dur = Math.min(r.dur, L - r.beat);
      if (dur < 1e-5) continue;
      phrase.push({ t: phraseT + r.beat, midi, dur });
    }
    phraseT += L;
  }
  return phrase;
}

function phraseToAbsolute(score: ScoreModel, phrase: PhraseNote[], anchorBar: number): AbsNote[] {
  const g0 = cumulativeBarStart(score, anchorBar);
  return phrase.map((p) => ({
    gb: g0 + p.t,
    midi: p.midi,
    dur: p.dur,
  }));
}

function emitAbsoluteRange(alto: PartModel, score: ScoreModel, barLow: number, barHigh: number, notes: AbsNote[]): void {
  for (let bar = barLow; bar <= barHigh; bar++) {
    const L = effBar(score, bar);
    const g0 = cumulativeBarStart(score, bar);
    const g1 = g0 + L;
    const segs: Array<{ st: number; midi?: number; dur: number }> = [];

    for (const n of notes) {
      const end = n.gb + n.dur;
      if (end <= g0 + 1e-5 || n.gb >= g1 - 1e-5) continue;
      const st = Math.max(0, n.gb - g0);
      const en = Math.min(L, end - g0);
      const dur = en - st;
      if (dur > 1e-5) segs.push({ st, midi: n.midi, dur });
    }
    emitVoice1Segments(alto.measures[bar - 1]!, L, segs);
  }
}

/** Validation: bars 9–17 vs 5–8 — ≥2 pitch differences OR rhythmic offset ≥ eighth on first attacks. */
export function validateAlto917Vs58(score: ScoreModel): { ok: boolean; detail: string } {
  const alto = findAlto(score);
  if (!alto) return { ok: false, detail: 'no bb_alto_sax' };

  const collect = (a: number, b: number) => {
    const out: Array<{ bar: number; beat: number; midi: number }> = [];
    for (let bar = a; bar <= b; bar++) {
      const m = alto.measures[bar - 1];
      if (!m) continue;
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        if ((e.voice ?? 1) !== 1) continue;
        const n = e as NoteEvent;
        out.push({ bar, beat: n.startBeat, midi: n.pitch });
      }
    }
    out.sort((x, y) => x.bar - y.bar || x.beat - y.beat);
    return out;
  };

  const p58 = collect(5, 8);
  const p917 = collect(9, 17);
  if (p917.length === 0) return { ok: false, detail: 'no alto notes in bars 9–17' };

  let diffPitch = 0;
  const len = Math.min(p58.length, p917.length);
  for (let i = 0; i < len; i++) {
    if (p58[i]!.midi !== p917[i]!.midi) diffPitch++;
  }
  diffPitch += Math.abs(p58.length - p917.length);

  const first58 = p58[0];
  const first917 = p917[0];
  let rhythmicOk = false;
  if (first58 && first917) {
    rhythmicOk = Math.abs(first917.beat - first58.beat) >= EIGHTH - 1e-3;
  }

  const ok = diffPitch >= 2 || rhythmicOk;
  return {
    ok,
    detail: ok
      ? `pitchDiff=${diffPitch}, rhythmicShift=${rhythmicOk}`
      : `FAIL pitchDiff=${diffPitch}, rhythmicShift=${rhythmicOk}`,
  };
}

function invertMidi(m: number): number {
  return snapAlto(INV_AXIS + (INV_AXIS - m));
}

/**
 * Alto voice 1: no more than 2 consecutive rest-only bars outside bars 1–4 and bar 32.
 */
export function auditAltoConsecutiveRestBars(score: ScoreModel): {
  ok: boolean;
  maxSpanOutsideExempt: number;
  violations: string[];
} {
  const alto = findAlto(score);
  if (!alto) return { ok: false, maxSpanOutsideExempt: 0, violations: ['no bb_alto_sax'] };
  const exempt = (b: number) => (b >= 1 && b <= 4) || b === 32;
  const n = alto.measures.length;
  const barHasAltoV1Pitch = (bar: number): boolean => {
    const m = alto.measures[bar - 1];
    if (!m) return false;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      if ((e.voice ?? 1) !== 1) continue;
      return true;
    }
    return false;
  };
  let maxSpan = 0;
  const violations: string[] = [];
  let i = 1;
  while (i <= n) {
    if (exempt(i)) {
      i++;
      continue;
    }
    if (barHasAltoV1Pitch(i)) {
      i++;
      continue;
    }
    const start = i;
    while (i <= n && !exempt(i) && !barHasAltoV1Pitch(i)) {
      i++;
    }
    const len = i - start;
    maxSpan = Math.max(maxSpan, len);
    if (len > 2) {
      violations.push(`bars ${start}–${i - 1}: ${len} consecutive alto voice-1 rest-only measures`);
    }
  }
  return { ok: violations.length === 0, maxSpanOutsideExempt: maxSpan, violations };
}

export function applySteelyOrbitMelodicDevelopment(
  score: ScoreModel,
  lead: LeadSheet,
  variant: SteelyOrbitMelodicVariant = 'v14'
): void {
  const alto = findAlto(score);
  if (!alto) return;

  const snapshot916 = variant === 'v15' ? snapshotVoice1BarNotes(alto, 9, 16) : [];

  const phrase58 = extractSeedPhraseFromLead(score, lead);
  const anchor5gb = cumulativeBarStart(score, 5);

  /** Emit bars 5–8 seed */
  const abs58 = phraseToAbsolute(score, phrase58, 5);
  emitAbsoluteRange(alto, score, 5, 8, abs58);

  /** Bars 9–16: V14 seed timeline shifted from bar 5 anchor (legacy); V15 = snapshot pre-pass + eighth shift, fallback doubled phrase @ bar 9 */
  if (variant === 'v15') {
    let abs916 = snapped916ToAbs(score, snapshot916, EIGHTH);
    if (abs916.length === 0) abs916 = fallback916DoubledPhrase(score, phrase58);
    emitAbsoluteRange(alto, score, 9, 16, abs916);
  } else {
    const shifted: AbsNote[] = phrase58.map((p) => ({
      gb: anchor5gb + p.t + EIGHTH,
      midi: p.midi,
      dur: p.dur,
    }));
    emitAbsoluteRange(alto, score, 9, 16, shifted);
  }

  /** Bars 17–24: neighbour on beat 1 + contour raised minor third */
  const notes1724: AbsNote[] = [];
  for (let bar = 17; bar <= 24; bar++) {
    const L = effBar(score, bar);
    const g0 = cumulativeBarStart(score, bar);
    const neighUp = bar % 2 === 0;
    const open = snapAlto(STEELY_ORBIT_V14_SEED_MIDI[0]! + MINOR_THIRD);
    const nb = neighUp ? snapAlto(open + 1) : snapAlto(open - 1);
    notes1724.push({ gb: g0, midi: nb, dur: Math.min(EIGHTH, L) });
    const mst = Math.min(EIGHTH, L);
    notes1724.push({ gb: g0 + mst, midi: open, dur: Math.min(1.25, L - mst) });
    const tail = mst + Math.min(1.25, L - mst);
    if (tail < L - 1e-4) {
      notes1724.push({
        gb: g0 + tail,
        midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[1]! + MINOR_THIRD),
        dur: L - tail,
      });
    }
  }
  emitAbsoluteRange(alto, score, 17, 24, notes1724);

  /** Bars 25–32: first 3 seed notes fragment; silence bars 28 & 32 */
  for (let bar = 25; bar <= 32; bar++) {
    const L = effBar(score, bar);
    const m = alto.measures[bar - 1]!;
    if (bar === 28 || bar === 32) {
      emitVoice1Segments(m, L, []);
      continue;
    }
    const dur = Math.min(EIGHTH * 2, L / 3);
    emitVoice1Segments(m, L, [
      { st: 0, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[0]!), dur },
      { st: dur, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[1]!), dur },
      {
        st: 2 * dur,
        midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[2]!),
        dur: Math.min(dur, L - 2 * dur),
      },
    ]);
  }

  /** Bars 33–48: V14 inverted contour over full span (only fills ~4 bars — legacy); V15 split region */
  const t0 = phrase58.length ? phrase58[0]!.t : 0;
  const anchor33 = cumulativeBarStart(score, 33);

  if (variant === 'v15') {
    const cap37 = cumulativeBarStart(score, 37);
    const abs3336: AbsNote[] = [];
    for (const p of phrase58) {
      const gb = anchor33 + (p.t - t0);
      if (gb >= cap37 - 1e-5) break;
      abs3336.push({
        gb,
        midi: invertMidi(p.midi),
        dur: Math.min(p.dur, cap37 - gb),
      });
    }
    emitAbsoluteRange(alto, score, 33, 36, abs3336);

    /** 37–40 conversational figures */
    for (let bar = 37; bar <= 40; bar++) {
      const L = effBar(score, bar);
      const m = alto.measures[bar - 1]!;
      const off = (bar - 37) % 2 === 1 ? EIGHTH : 0;
      const a = snapAlto(STEELY_ORBIT_V14_SEED_MIDI[(bar - 37) % 5]!);
      const b = snapAlto(STEELY_ORBIT_V14_SEED_MIDI[(bar - 37 + 2) % 5]!);
      emitVoice1Segments(m, L, [
        { st: off, midi: a, dur: EIGHTH },
        { st: off + EIGHTH, midi: b, dur: EIGHTH },
        { st: off + 1, midi: a, dur: Math.max(0, L - off - 1) },
      ]);
    }

    /** Bar 41 bridge */
    {
      const L = effBar(score, 41);
      emitVoice1Segments(alto.measures[40]!, L, [
        { st: 0, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[0]!), dur: EIGHTH },
        { st: 1, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[2]!), dur: EIGHTH },
        { st: 2, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[4]!), dur: EIGHTH },
      ]);
    }

    /** 42–44 singable head */
    const singRows: Array<{ seedI: number; dur: number }> = [
      { seedI: 0, dur: 2.25 },
      { seedI: 1, dur: 2.25 },
      { seedI: 4, dur: 2.5 },
    ];
    for (let bar = 42; bar <= 44; bar++) {
      const L = effBar(score, bar);
      const spec = singRows[bar - 42]!;
      emitVoice1Segments(alto.measures[bar - 1]!, L, [
        { st: 0, midi: snapAlto(STEELY_ORBIT_V14_SEED_MIDI[spec.seedI]!), dur: Math.min(spec.dur, L) },
      ]);
    }

    /** 45–48 chromatic descent (support line) */
    let ch = snapAlto(72);
    for (let bar = 45; bar <= 48; bar++) {
      const L = effBar(score, bar);
      const segs: Array<{ st: number; midi?: number; dur: number }> = [];
      for (let beat = 0; beat < 3; beat++) {
        segs.push({ st: beat, midi: ch, dur: 1 });
        ch = snapAlto(ch - 1);
      }
      emitVoice1Segments(alto.measures[bar - 1]!, L, segs);
    }
  } else {
    const cap49 = cumulativeBarStart(score, 49);
    const abs3348: AbsNote[] = [];
    for (const p of phrase58) {
      const gb = anchor33 + (p.t - t0);
      if (gb >= cap49 - 1e-5) break;
      abs3348.push({
        gb,
        midi: invertMidi(p.midi),
        dur: Math.min(p.dur, cap49 - gb),
      });
    }
    emitAbsoluteRange(alto, score, 33, 48, abs3348);
  }

  /** Bars 49–52: held C#5 */
  for (let bar = 49; bar <= 52; bar++) {
    const L = effBar(score, bar);
    emitVoice1Segments(alto.measures[bar - 1]!, L, [{ st: 0, midi: snapAlto(73), dur: L }]);
  }

  /** Bars 53–56: verbatim seed phrase (same absolute spacing as 5–8, anchored at bar 53) */
  const anchor53 = cumulativeBarStart(score, 53);
  const offset53 = anchor53 - anchor5gb;
  const abs5356 = phrase58.map((p) => ({
    gb: anchor5gb + p.t + offset53,
    midi: p.midi,
    dur: p.dur,
  }));
  emitAbsoluteRange(alto, score, 53, 56, abs5356);

  /** Bars 57–64: cumulative flatten −(bar−56) semitones */
  const abs5764: AbsNote[] = [];
  for (let bar = 57; bar <= 64; bar++) {
    const down = bar - 56;
    const L = effBar(score, bar);
    const g0 = cumulativeBarStart(score, bar);
    let tp = 0;
    let pi = 0;
    while (tp < L - 1e-5) {
      const src = phrase58[pi % phrase58.length]!;
      pi++;
      const dur = Math.min(src.dur, L - tp);
      abs5764.push({ gb: g0 + tp, midi: snapAlto(src.midi - down), dur });
      tp += dur;
    }
  }
  emitAbsoluteRange(alto, score, 57, 64, abs5764);
}
