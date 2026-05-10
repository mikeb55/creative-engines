/**
 * Steely Orbit V1.7 — transition/orchestration pass (after V15 alto + V13 drums).
 * Handoff 61–64: bass + piano + dark sparse brass; drum tail variation; light layer fill 33–56; alto 42–44 contour nudge.
 */

import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import {
  BB_PART_RHYTHM,
  BB_PART_SAXES,
  BB_PART_TRUMPETS,
  BB_PART_TROMBONES,
} from './buildBigBandOrchestrationPlan';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, NoteEvent, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

const DRUM_BD = 36;
const DRUM_BRUSH = 40;
const DRUM_RIDE = 51;
const DRUM_HH = 42;
const DRUM_OHH = 46;

function effBar(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

function chordAtBar(score: ScoreModel, bar1: number): string {
  for (const p of score.parts) {
    const m = p.measures[bar1 - 1];
    const c = m?.chord?.trim();
    if (c) return c;
  }
  return 'Fmaj7';
}

function findPart(score: ScoreModel, id: string): PartModel | undefined {
  return score.parts.find((p) => p.id === id);
}

function clampPiano(m: number): number {
  return snapMidiToRange(m, 55, 84);
}

function pianoShellFromSymbol(sym: string): { r: number; t: number; s: number } {
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const root = clampPiano(60 + rpc);
  const low = sym.trim().toLowerCase();
  const minorThird = /^[a-g][#b]?m(?!aj)/i.test(sym.trim());
  const thirdHs = minorThird ? 3 : 4;
  const seventhHs = low.includes('m7') && !low.includes('maj') ? 10 : low.includes('maj') || low.includes('Δ') ? 11 : 10;
  return { r: root, t: clampPiano(root + thirdHs), s: clampPiano(root + seventhHs) };
}

function brassPitch(sym: string, slot: 'trp' | 'tbn'): number {
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const raw = slot === 'trp' ? 72 + rpc : 55 + rpc;
  const b =
    slot === 'trp' ? BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]! : BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES]!;
  return snapMidiToRange(raw, b[0], b[1]);
}

/** Memorable peak: raise longest alto note in bar 44 by +4 semitones (voice-leading clamped). */
function refineSingable4244(score: ScoreModel): void {
  const alto = findPart(score, 'bb_alto_sax');
  if (!alto) return;
  const m44 = alto.measures[43];
  if (!m44) return;
  const saxB = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
  let best: NoteEvent | undefined;
  let bestDur = -1;
  for (const e of m44.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    const n = e as NoteEvent;
    if (n.duration > bestDur) {
      bestDur = n.duration;
      best = n;
    }
  }
  if (best) best.pitch = snapMidiToRange(best.pitch + 4, saxB[0], saxB[1]);
}

/** Light brass colour on 42 / 44 only — quarter pads, no tutti. */
function lightBrassColour4244(score: ScoreModel): void {
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  if (!tbn || !trp) return;
  const L42 = effBar(score, 42);
  const L44 = effBar(score, 44);
  const sym42 = chordAtBar(score, 42);
  const sym44 = chordAtBar(score, 44);
  const tbn42 = tbn.measures[41]!;
  stripVoice1NotesAndRests(tbn42);
  addEvent(tbn42, createRest(0, 1, 1));
  addEvent(tbn42, createNote(brassPitch(sym42, 'tbn'), 1, 1, 1, undefined, undefined, 54));
  if (L42 > 2) addEvent(tbn42, createRest(2, L42 - 2, 1));

  const trp44 = trp.measures[43]!;
  stripVoice1NotesAndRests(trp44);
  addEvent(trp44, createRest(0, 2, 1));
  addEvent(trp44, createNote(brassPitch(sym44, 'trp'), 2, Math.min(1, L44 - 2), 1, undefined, undefined, 52));
  if (3 < L44 - 1e-4) addEvent(trp44, createRest(3, L44 - 3, 1));
}

function countVoice1Pitches(part: PartModel | undefined, bar: number): number {
  if (!part) return 0;
  const m = part.measures[bar - 1];
  if (!m) return 0;
  let c = 0;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    if ((e.voice ?? 1) !== 1) continue;
    c++;
  }
  return c;
}

function stripVoice1NotesAndRests(m: MeasureModel): void {
  m.events = m.events.filter((e) => {
    if (e.kind === 'chord') return true;
    if ((e.voice ?? 1) !== 1) return true;
    return false;
  });
}

/** Add comp only when the target part has no voice-1 pitches (avoids bar-math clashes). */
function layerFillBar(
  score: ScoreModel,
  bar: number,
  minNotes: number,
  preferPiano: boolean
): void {
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const piano = findPart(score, 'bb_piano');
  if (!alto || !tenor || !trp || !tbn || !piano) return;
  const parts = [alto, tenor, trp, tbn, piano];
  let n = 0;
  for (const p of parts) {
    if (countVoice1Pitches(p, bar) > 0) n++;
  }
  if (n >= minNotes) return;
  const L = effBar(score, bar);
  const sym = chordAtBar(score, bar);
  const shell = pianoShellFromSymbol(sym);
  const pm = piano.measures[bar - 1]!;
  const tm = tenor.measures[bar - 1]!;
  if (preferPiano && countVoice1Pitches(piano, bar) === 0) {
    stripVoice1NotesAndRests(pm);
    addEvent(pm, createNote(shell.r, 0, 1, 1, undefined, undefined, 62));
    addEvent(pm, createNote(shell.t, 1, 1, 1, undefined, undefined, 58));
    addEvent(pm, createNote(shell.s, 2, 1, 1, undefined, undefined, 56));
  } else if (!preferPiano && countVoice1Pitches(tenor, bar) === 0) {
    stripVoice1NotesAndRests(tm);
    const rpc = chordSymbolRootPc(sym) ?? 5;
    const tb = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
    const mid = snapMidiToRange(68 + rpc, tb[0], tb[1]);
    addEvent(tm, createRest(0, 2, 1));
    addEvent(tm, createNote(mid, 2, Math.min(1, L - 2), 1, undefined, undefined, 60));
    if (3 < L - 1e-4) addEvent(tm, createRest(3, L - 3, 1));
  }
}

/** Target conversational density — sparse piano/tenor where thin. */
function conversationalLayers3356(score: ScoreModel): void {
  for (let bar = 33; bar <= 40; bar++) {
    layerFillBar(score, bar, 3, bar % 2 === 0);
  }
  for (let bar = 41; bar <= 48; bar++) {
    layerFillBar(score, bar, 4, bar % 2 === 1);
  }
  for (let bar = 49; bar <= 52; bar++) {
    layerFillBar(score, bar, 2, true);
  }
  for (let bar = 53; bar <= 56; bar++) {
    layerFillBar(score, bar, 4, false);
  }
}

/**
 * Fingerprint `section_transition_min_density_delta`: Fill (bar 48) vs Shout (bar 49) must not be identical density.
 * Bar 48 = sparse: alto + bass + drums only (tacet brass, piano, tenor).
 * Bar 49 = tutti entry: piano shell + brass sustain + tenor — ≥5 active layers before bass/drums.
 */
function enforceFill48Shout49Contrast(score: ScoreModel): void {
  const L48 = effBar(score, 48);
  const L49 = effBar(score, 49);
  const sym49 = chordAtBar(score, 49);

  for (const id of [BB_PART_TRUMPETS, BB_PART_TROMBONES, 'bb_piano', 'bb_tenor_sax'] as const) {
    const p = findPart(score, id);
    if (!p) continue;
    const m = p.measures[47];
    if (!m) continue;
    stripVoice1NotesAndRests(m);
    addEvent(m, createRest(0, L48, 1));
  }

  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const piano = findPart(score, 'bb_piano');
  const tenor = findPart(score, 'bb_tenor_sax');
  if (!trp || !tbn || !piano || !tenor) return;

  const shell = pianoShellFromSymbol(sym49);
  const pm = piano.measures[48];
  if (!pm) return;
  stripVoice1NotesAndRests(pm);
  addEvent(pm, createNote(shell.r, 0, 1, 1, undefined, undefined, 62));
  addEvent(pm, createNote(shell.t, 1, 1, 1, undefined, undefined, 58));
  addEvent(pm, createNote(shell.s, 2, Math.min(1, L49 - 2), 1, undefined, undefined, 56));
  if (L49 > 3 - 1e-4) addEvent(pm, createRest(3, L49 - 3, 1));

  const trpM = trp.measures[48];
  const tbnM = tbn.measures[48];
  const tm = tenor.measures[48];
  if (!trpM || !tbnM || !tm) return;

  stripVoice1NotesAndRests(trpM);
  stripVoice1NotesAndRests(tbnM);
  stripVoice1NotesAndRests(tm);

  const pt = brassPitch(sym49, 'trp');
  const pb = brassPitch(sym49, 'tbn');
  addEvent(trpM, createNote(pt, 0, L49, 1, undefined, undefined, 52));
  addEvent(tbnM, createNote(pb, 0, L49, 1, undefined, undefined, 50));

  const rpc = chordSymbolRootPc(sym49) ?? 5;
  const tb = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
  const midTen = snapMidiToRange(70 + rpc, tb[0], tb[1]);
  addEvent(tm, createNote(midTen, 0, L49, 1, undefined, undefined, 58));
}

function handoff6164(score: ScoreModel): void {
  const bass = findPart(score, BB_PART_RHYTHM);
  const piano = findPart(score, 'bb_piano');
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  if (!bass || !piano || !trp || !tbn) return;
  const bassB = BIG_BAND_MIDI_BOUNDS[BB_PART_RHYTHM]!;

  for (let bar = 61; bar <= 64; bar++) {
    const L = effBar(score, bar);
    const sym = chordAtBar(score, bar);
    const rpc = chordSymbolRootPc(sym) ?? 5;
    const root = snapMidiToRange(36 + rpc, bassB[0], bassB[1]);
    const fifth = snapMidiToRange(root + 7, bassB[0], bassB[1]);
    const approach = snapMidiToRange(root + (bar === 63 ? 1 : -1), bassB[0], bassB[1]);

    const bassM = bass.measures[bar - 1]!;
    bassM.events = [];
    addEvent(bassM, createNote(root, 0, 1, 1));
    addEvent(bassM, createNote(bar === 63 ? approach : fifth, 1, 1, 1));
    addEvent(bassM, createNote(root, 2, Math.min(1, L - 2), 1));

    const shell = pianoShellFromSymbol(sym);
    const pm = piano.measures[bar - 1]!;
    pm.events = [];
    addEvent(pm, createNote(shell.r, 0, 1, 1, undefined, undefined, 52));
    addEvent(pm, createNote(shell.t, 1, 1, 1, undefined, undefined, 48));
    addEvent(pm, createNote(shell.s, 2, Math.min(1, L - 2), 1, undefined, undefined, 46));

    const pt = brassPitch(sym, 'trp');
    const pb = brassPitch(sym, 'tbn');
    const trpM = trp.measures[bar - 1]!;
    const tbnM = tbn.measures[bar - 1]!;
    trpM.events = [];
    tbnM.events = [];
    addEvent(tbnM, createNote(pb, 0, L, 1, undefined, undefined, 44));
    addEvent(trpM, createRest(0, 1, 1));
    addEvent(trpM, createNote(snapMidiToRange(pt - 3, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]!), 1, 1, 1, undefined, undefined, 42));
    if (L > 2 - 1e-4) addEvent(trpM, createRest(2, L - 2, 1));

    const altoM = findPart(score, 'bb_alto_sax')?.measures[bar - 1];
    if (altoM) altoM.momentTag = 'handoff';
  }
}

type DrumSeg = { st: number; p: number; d: number };

/** Voice 1 & 2 each sum to `L`; four distinct bar layouts (no consecutive duplicate signatures). */
function drums6164V17(score: ScoreModel): void {
  const drums = findPart(score, 'bb_drums');
  if (!drums) return;

  const paint = (bar: number, v1: DrumSeg[], v2: DrumSeg[]) => {
    const L = effBar(score, bar);
    const m = drums.measures[bar - 1]!;
    m.events = [];
    let t = 0;
    for (const s of v1) {
      if (s.st > t + 1e-5) addEvent(m, createRest(t, s.st - t, 1));
      const dur = Math.min(s.d, L - s.st);
      addEvent(m, createNote(s.p, s.st, dur, 1));
      t = Math.max(t, s.st + dur);
    }
    if (t < L - 1e-5) addEvent(m, createRest(t, L - t, 1));
    let t2 = 0;
    for (const s of v2) {
      if (s.st > t2 + 1e-5) addEvent(m, createRest(t2, s.st - t2, 2));
      const dur = Math.min(s.d, L - s.st);
      addEvent(m, createNote(s.p, s.st, dur, 2));
      t2 = Math.max(t2, s.st + dur);
    }
    if (t2 < L - 1e-5) addEvent(m, createRest(t2, L - t2, 2));
  };

  paint(
    61,
    [
      { st: 0, p: DRUM_HH, d: 1 },
      { st: 1, p: DRUM_BRUSH, d: 1 },
      { st: 2, p: DRUM_RIDE, d: 1 },
    ],
    [
      { st: 0, p: DRUM_BD, d: 1 },
      { st: 1, p: DRUM_BD, d: 1 },
      { st: 2, p: DRUM_BD, d: 1 },
    ]
  );
  paint(
    62,
    [
      { st: 0, p: DRUM_BRUSH, d: 0.5 },
      { st: 0.5, p: DRUM_RIDE, d: 0.5 },
      { st: 1, p: DRUM_HH, d: 1 },
      { st: 2, p: DRUM_OHH, d: 1 },
    ],
    [
      { st: 0, p: DRUM_BD, d: 0.5 },
      { st: 1.5, p: DRUM_BD, d: 0.5 },
      { st: 2, p: DRUM_BD, d: 1 },
    ]
  );
  /** Fill bar — brush sixteenths on top + BD displacement. */
  paint(
    63,
    [
      { st: 0, p: DRUM_BRUSH, d: 0.25 },
      { st: 0.5, p: DRUM_BRUSH, d: 0.25 },
      { st: 1, p: DRUM_RIDE, d: 0.5 },
      { st: 1.5, p: DRUM_HH, d: 0.5 },
      { st: 2, p: DRUM_BRUSH, d: 1 },
    ],
    [
      { st: 0, p: DRUM_BD, d: 1 },
      { st: 1.25, p: DRUM_BD, d: 0.25 },
      { st: 2, p: DRUM_BD, d: 1 },
    ]
  );
  paint(
    64,
    [
      { st: 0, p: DRUM_HH, d: 1 },
      { st: 1, p: DRUM_BRUSH, d: 0.5 },
      { st: 2, p: DRUM_RIDE, d: 1 },
    ],
    [
      { st: 0, p: DRUM_BD, d: 1 },
      { st: 1.5, p: DRUM_BD, d: 0.25 },
      { st: 2, p: DRUM_BD, d: 1 },
    ]
  );
}

export function applySteelyOrbitV17Finishing(score: ScoreModel): void {
  refineSingable4244(score);
  lightBrassColour4244(score);
  conversationalLayers3356(score);
  enforceFill48Shout49Contrast(score);
  handoff6164(score);
  drums6164V17(score);
}
