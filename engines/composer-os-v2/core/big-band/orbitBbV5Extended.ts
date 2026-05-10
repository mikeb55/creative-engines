/**
 * Post-pass for Orbit BB V5.0 (64-bar): bar-level vacuum, staged soli brass schedule,
 * signature rhythm-section strip (45–48), shout antiphony / unison / shock, sax chorale coda.
 * Runs after {@link applyOrbitBbV64Overlay}; deterministic.
 */

import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_RHYTHM, BB_PART_SAXES, BB_PART_TROMBONES, BB_PART_TRUMPETS } from './buildBigBandOrchestrationPlan';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

const DRUM_RIDE = 51;
const DRUM_BRUSH = 40;

function effBeats(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

function findPart(score: ScoreModel, id: string): PartModel | undefined {
  return score.parts.find((p) => p.id === id);
}

function wipeVoice1Rest(m: MeasureModel, len: number): void {
  m.events = [];
  addEvent(m, createRest(0, len, 1));
}

function wipeTwoVoiceRest(m: MeasureModel, len: number): void {
  m.events = [];
  addEvent(m, createRest(0, len, 1));
  addEvent(m, createRest(0, len, 2));
}

function cymbalOnlyDrums(score: ScoreModel, bar: number, textureMidi: number): void {
  const drums = findPart(score, 'bb_drums');
  if (!drums) return;
  const len = effBeats(score, bar);
  const m = drums.measures[bar - 1]!;
  const q = len / 4;
  m.events = [];
  for (let b = 0; b < 4; b++) {
    addEvent(m, createNote(textureMidi, b * q, q, 1));
  }
  addEvent(m, createRest(0, len, 2));
}

function brushRollDrums(score: ScoreModel, bar: number): void {
  const drums = findPart(score, 'bb_drums');
  if (!drums) return;
  const len = effBeats(score, bar);
  const m = drums.measures[bar - 1]!;
  const eighth = len / 8;
  m.events = [];
  for (let i = 0; i < 8; i++) {
    addEvent(m, createNote(i % 2 === 0 ? DRUM_BRUSH : DRUM_RIDE, i * eighth, eighth, 1));
  }
  addEvent(m, createRest(0, len, 2));
}

/** Bar 48 closing fill — four cymbal-brush slices on the same grid as {@link cymbalOnlyDrums} (sums to `len`). */
function fillBar48(score: ScoreModel): void {
  cymbalOnlyDrums(score, 48, DRUM_BRUSH);
}

function pianoShellSymbol(sym: string): number[] {
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const root = snapMidiToRange(53 + rpc, 48, 72);
  const third = snapMidiToRange(root + 4, 48, 79);
  const seventh = snapMidiToRange(root + 11, 48, 79);
  return [root, third, seventh];
}

function injectPianoSparse(score: ScoreModel, bar: number, beats: Array<{ start: number; dur: number }>): void {
  const piano = findPart(score, 'bb_piano');
  if (!piano) return;
  const len = effBeats(score, bar);
  const m = piano.measures[bar - 1]!;
  const sym = m.chord ?? 'Fmaj7';
  const shell = pianoShellSymbol(sym);
  m.events = [];
  let cursor = 0;
  for (const hit of beats) {
    if (cursor < hit.start) addEvent(m, createRest(cursor, hit.start - cursor, 1));
    addEvent(m, createNote(shell[0]!, hit.start, hit.dur, 1, undefined, shell));
    cursor = hit.start + hit.dur;
  }
  if (cursor < len) addEvent(m, createRest(cursor, len - cursor, 1));
}

function injectPianoCompHalfBar(score: ScoreModel, bar: number): void {
  const len = effBeats(score, bar);
  injectPianoSparse(score, bar, [
    { start: 0, dur: Math.min(1.5, len / 2) },
    { start: Math.min(1.5, len - 1), dur: Math.min(1, len - Math.min(1.5, len - 1)) },
  ]);
}

function bassMotifFeEbBb(score: ScoreModel, bar: number): void {
  const bass = findPart(score, BB_PART_RHYTHM);
  if (!bass) return;
  const len = effBeats(score, bar);
  const m = bass.measures[bar - 1]!;
  const sym = m.chord ?? 'Fmaj7';
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const p0 = snapMidiToRange(36 + rpc, 28, 55);
  const p1 = snapMidiToRange(p0 - 2, 28, 55);
  const p2 = snapMidiToRange(p0 - 7, 28, 55);
  m.events = [];
  if (len >= 3) {
    addEvent(m, createNote(p0, 0, 1, 1));
    addEvent(m, createNote(p1, 1, 1, 1));
    addEvent(m, createNote(p2, 2, 1, 1));
  } else {
    addEvent(m, createNote(p0, 0, len, 1));
  }
}

function brassPitch(sym: string, slot: 'trp' | 'tbn'): number {
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const raw = slot === 'trp' ? 72 + rpc : 58 + rpc;
  const bounds =
    slot === 'trp' ? BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS] : BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES];
  return snapMidiToRange(raw, bounds[0], bounds[1]);
}

function staggerBrassBar(score: ScoreModel, bar: number, trpBeat: number, tbnBeat: number): void {
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  if (!trp || !tbn) return;
  const len = effBeats(score, bar);
  const symTr = trp.measures[bar - 1]?.chord ?? 'Fmaj7';
  const mt = trp.measures[bar - 1]!;
  const mb = tbn.measures[bar - 1]!;
  mt.events = [];
  mb.events = [];
  const pt = brassPitch(symTr, 'trp');
  const pb = brassPitch(symTr, 'tbn');
  const hitDur = Math.min(0.45, len * 0.2);
  let c = 0;
  if (trpBeat > c) {
    addEvent(mt, createRest(c, trpBeat - c, 1));
    c = trpBeat;
  }
  addEvent(mt, createNote(pt, trpBeat, hitDur, 1));
  c = trpBeat + hitDur;
  if (c < len) addEvent(mt, createRest(c, len - c, 1));

  c = 0;
  if (tbnBeat > c) {
    addEvent(mb, createRest(c, tbnBeat - c, 1));
    c = tbnBeat;
  }
  addEvent(mb, createNote(pb, tbnBeat, hitDur, 1));
  c = tbnBeat + hitDur;
  if (c < len) addEvent(mb, createRest(c, len - c, 1));
}

function unisonMotifBar(score: ScoreModel, bar: number): void {
  const alto = findPart(score, 'bb_alto_sax');
  const trp = findPart(score, BB_PART_TRUMPETS);
  if (!alto || !trp) return;
  const len = effBeats(score, bar);
  const sym = alto.measures[bar - 1]?.chord ?? 'Fmaj7';
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const hi = snapMidiToRange(77 + rpc, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  const lo = snapMidiToRange(hi - 12, ...BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS]);
  const ma = alto.measures[bar - 1]!;
  const mt = trp.measures[bar - 1]!;
  ma.events = [];
  mt.events = [];
  if (len >= 3) {
    addEvent(ma, createNote(hi, 0, 1, 1));
    addEvent(ma, createNote(hi - 2, 1, 1, 1));
    addEvent(ma, createNote(hi - 7, 2, 1, 1));
    addEvent(mt, createNote(lo, 0, 1, 1));
    addEvent(mt, createNote(lo - 2, 1, 1, 1));
    addEvent(mt, createNote(lo - 7, 2, 1, 1));
  }
}

function wipeHornsPiano(score: ScoreModel, bar: number): void {
  const len = effBeats(score, bar);
  for (const id of ['bb_alto_sax', 'bb_tenor_sax', BB_PART_TRUMPETS, BB_PART_TROMBONES]) {
    const p = findPart(score, id);
    if (p) wipeVoice1Rest(p.measures[bar - 1]!, len);
  }
  const piano = findPart(score, 'bb_piano');
  if (piano) {
    piano.measures[bar - 1]!.events = [];
    addEvent(piano.measures[bar - 1]!, createRest(0, len, 1));
  }
}

export function applyOrbitBbV5Extended(score: ScoreModel): void {
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const piano = findPart(score, 'bb_piano');
  const drums = findPart(score, 'bb_drums');

  // --- Vacuum 33–36: cymbal-only drums (no BD layer); piano hits bar 35 only ---
  for (let b = 33; b <= 36; b++) {
    cymbalOnlyDrums(score, b, DRUM_RIDE);
  }
  if (piano) {
    for (const b of [33, 34, 36]) {
      wipeVoice1Rest(piano.measures[b - 1]!, effBeats(score, b));
    }
    const len35 = effBeats(score, 35);
    injectPianoSparse(score, 35, [
      { start: 0, dur: 0.9 },
      { start: 2, dur: 0.9 },
    ]);
    if (len35 < 3) {
      wipeVoice1Rest(piano.measures[34]!, len35);
    }
  }

  // --- Soli 37–44: brass tacet early → pads late ---
  if (trp && tbn) {
    for (let b = 37; b <= 40; b++) {
      const len = effBeats(score, b);
      wipeVoice1Rest(trp.measures[b - 1]!, len);
      wipeVoice1Rest(tbn.measures[b - 1]!, len);
    }
    for (let b = 41; b <= 42; b++) {
      const len = effBeats(score, b);
      const sym = trp.measures[b - 1]?.chord ?? 'Fmaj7';
      const pitch = brassPitch(sym, 'tbn');
      const mt = trp.measures[b - 1]!;
      const mb = tbn.measures[b - 1]!;
      mt.events = [];
      mb.events = [];
      addEvent(mt, createRest(0, len, 1));
      addEvent(mb, createNote(pitch, 0, Math.min(2, len), 1));
      addEvent(mb, createRest(Math.min(2, len), len - Math.min(2, len), 1));
    }
    for (let b = 43; b <= 44; b++) {
      const len = effBeats(score, b);
      const sym = trp.measures[b - 1]?.chord ?? 'Fmaj7';
      const pt = brassPitch(sym, 'trp');
      const pb = brassPitch(sym, 'tbn');
      const mt = trp.measures[b - 1]!;
      const mb = tbn.measures[b - 1]!;
      mt.events = [];
      mb.events = [];
      addEvent(mt, createNote(pt, 0, len, 1));
      addEvent(mb, createNote(pb, 0, len, 1));
    }
  }

  // --- Signature 45–48: horns + piano tacet; bass motif; drums build → fill ---
  for (let b = 45; b <= 47; b++) {
    wipeHornsPiano(score, b);
    bassMotifFeEbBb(score, b);
    brushRollDrums(score, b);
  }
  wipeHornsPiano(score, 48);
  bassMotifFeEbBb(score, 48);
  fillBar48(score);

  // --- Shout 49–60 ---
  if (trp && tbn) {
    for (let b = 49; b <= 50; b++) {
      const len = effBeats(score, b);
      wipeVoice1Rest(trp.measures[b - 1]!, len);
      wipeVoice1Rest(tbn.measures[b - 1]!, len);
    }
  }
  if (alto && tenor) {
    for (let b = 51; b <= 52; b++) {
      const len = effBeats(score, b);
      wipeVoice1Rest(alto.measures[b - 1]!, len);
      wipeVoice1Rest(tenor.measures[b - 1]!, len);
    }
  }
  staggerBrassBar(score, 51, 0, 1);
  staggerBrassBar(score, 52, 1, 2);

  unisonMotifBar(score, 55);
  unisonMotifBar(score, 56);

  for (let b = 57; b <= 58; b++) {
    const len = effBeats(score, b);
    wipeHornsPiano(score, b);
    cymbalOnlyDrums(score, b, DRUM_BRUSH);
    injectPianoCompHalfBar(score, b);
  }

  staggerBrassBar(score, 59, 0, 2);
  if (trp && tbn) {
    const len = effBeats(score, 60);
    const sym = trp.measures[60 - 1]?.chord ?? 'Fmaj7';
    const pt = brassPitch(sym, 'trp');
    const pb = brassPitch(sym, 'tbn');
    const mt = trp.measures[59]!;
    const mb = tbn.measures[59]!;
    mt.events = [];
    mb.events = [];
    addEvent(mt, createNote(pt, 0, len, 1));
    addEvent(mb, createNote(pb, 0, len, 1));
  }

  // --- Coda 61–64: sax-only chorale; no brass / rhythm / drums ---
  const bass = findPart(score, BB_PART_RHYTHM);
  if (trp && tbn) {
    for (let b = 61; b <= 64; b++) {
      const len = effBeats(score, b);
      wipeVoice1Rest(trp.measures[b - 1]!, len);
      wipeVoice1Rest(tbn.measures[b - 1]!, len);
    }
  }
  if (bass) {
    for (let b = 61; b <= 64; b++) {
      wipeVoice1Rest(bass.measures[b - 1]!, effBeats(score, b));
    }
  }
  if (piano) {
    for (let b = 61; b <= 64; b++) {
      wipeVoice1Rest(piano.measures[b - 1]!, effBeats(score, b));
    }
  }
  if (drums) {
    for (let b = 61; b <= 64; b++) {
      const len = effBeats(score, b);
      wipeTwoVoiceRest(drums.measures[b - 1]!, len);
    }
  }

  if (alto && tenor) {
    const saxLo = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
    for (const b of [61, 62, 64]) {
      const len = effBeats(score, b);
      const ma = alto.measures[b - 1]!;
      const mt = tenor.measures[b - 1]!;
      const sym = ma.chord ?? 'Fmaj7';
      const rpc = chordSymbolRootPc(sym) ?? 5;
      const top = snapMidiToRange(74 + rpc, saxLo[0], saxLo[1]);
      const mid = snapMidiToRange(top - 4, saxLo[0], saxLo[1]);
      ma.events = [];
      mt.events = [];
      addEvent(ma, createNote(top, 0, len, 1, undefined, [top, mid]));
      addEvent(mt, createNote(snapMidiToRange(top - 12, saxLo[0], saxLo[1]), 0, len, 1));
    }

    const len63 = effBeats(score, 63);
    const ma = alto.measures[62]!;
    const mt = tenor.measures[62]!;
    const sym = ma.chord ?? 'Fmaj7';
    const rpc = chordSymbolRootPc(sym) ?? 5;
    const hi = snapMidiToRange(77 + rpc, saxLo[0], saxLo[1]);
    ma.events = [];
    const fragDur = len63 / 6;
    addEvent(ma, createNote(hi, 0, fragDur, 1));
    addEvent(ma, createNote(hi - 2, fragDur, fragDur, 1));
    addEvent(ma, createRest(2 * fragDur, len63 - 2 * fragDur, 1));
    mt.events = [];
    addEvent(mt, createNote(snapMidiToRange(hi - 14, saxLo[0], saxLo[1]), 0, len63 - 0.25, 1));
    addEvent(mt, createNote(snapMidiToRange(hi - 26, saxLo[0], saxLo[1]), len63 - 0.25, 0.25, 1));
  }

  // Fill cue on bar 48 (not 47)
  if (drums?.measures[46]) drums.measures[46]!.rehearsalMark = undefined;
  if (drums?.measures[47]) drums.measures[47]!.rehearsalMark = 'Fill';

  const base = score.measureDynamicsMarkings ?? {};
  score.measureDynamicsMarkings = {
    ...base,
    33: 'pp',
    34: 'pp',
    35: 'p',
    36: 'pp',
    45: 'mp',
    48: 'mf',
    49: 'ff',
    51: 'ff',
    53: 'f',
    55: 'fff',
    56: 'fff',
    57: 'p',
    58: 'p',
    59: 'ff',
    60: 'fff',
    61: 'mp',
    62: 'p',
    63: 'pp',
    64: 'ppp',
  };
}
