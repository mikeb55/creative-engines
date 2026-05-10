/**
 * Orbit BB V6.0 — micro-orchestration pass after {@link applyOrbitBbV5Extended}.
 * Shout motif identity, head inner motion (tenor/trombone), fragile duo, total silence bar 57,
 * shock bar 58, drum/bass specifics, coda rewrite.
 */

import { chordSymbolRootPc, snapMidiToRange } from '../voicing/ensembleHarmonyUtils';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_RHYTHM, BB_PART_SAXES, BB_PART_TROMBONES, BB_PART_TRUMPETS } from './buildBigBandOrchestrationPlan';
import { resolveMeasureBeatSpanQuarters } from '../rhythm/oddMeterQuantiser';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';

/** Written vacuum bass pitches (Orbit A-section descent). */
const VACUUM_BASS_MIDIS: [number, number, number] = [41, 39, 34]; // F2, Eb2, Bb1

const DRUM_BD = 36;
const DRUM_BRUSH = 40;
const DRUM_RIDE = 51;

function effBeats(score: ScoreModel, bar1: number): number {
  return score.barMeterMap ? resolveMeasureBeatSpanQuarters(bar1, score.barMeterMap) : 4;
}

function findPart(score: ScoreModel, id: string): PartModel | undefined {
  return score.parts.find((p) => p.id === id);
}

function brassPitch(sym: string, slot: 'trp' | 'tbn'): number {
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const raw = slot === 'trp' ? 72 + rpc : 58 + rpc;
  const bounds =
    slot === 'trp' ? BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS] : BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES];
  return snapMidiToRange(raw, bounds[0], bounds[1]);
}

function wipeVoice1Rest(m: import('../score-model/scoreModelTypes').MeasureModel, len: number): void {
  m.events = [];
  addEvent(m, createRest(0, len, 1));
}

function wipeTwoVoiceRest(m: import('../score-model/scoreModelTypes').MeasureModel, len: number): void {
  m.events = [];
  addEvent(m, createRest(0, len, 1));
  addEvent(m, createRest(0, len, 2));
}

/** Moment A — bar 57: every part rest (voices 1–2 on drums). */
function totalSilenceBar(score: ScoreModel, bar: number): void {
  const len = effBeats(score, bar);
  for (const p of score.parts) {
    const m = p.measures[bar - 1]!;
    m.events = [];
    addEvent(m, createRest(0, len, 1));
    if (p.id === 'bb_drums') addEvent(m, createRest(0, len, 2));
  }
}

/** Moment B — bars 38–39: alto + tenor only, parallel sixths, no accompaniment. */
function fragileExposed3839(score: ScoreModel): void {
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const piano = findPart(score, 'bb_piano');
  const bass = findPart(score, BB_PART_RHYTHM);
  const drums = findPart(score, 'bb_drums');
  const saxLo = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
  for (const b of [38, 39]) {
    const len = effBeats(score, b);
    if (trp) wipeVoice1Rest(trp.measures[b - 1]!, len);
    if (tbn) wipeVoice1Rest(tbn.measures[b - 1]!, len);
    if (piano) wipeVoice1Rest(piano.measures[b - 1]!, len);
    if (bass) wipeVoice1Rest(bass.measures[b - 1]!, len);
    if (drums) wipeTwoVoiceRest(drums.measures[b - 1]!, len);
    if (!alto || !tenor) continue;
    const step = b - 38;
    const hi = snapMidiToRange(74 + step * 2, saxLo[0], saxLo[1]);
    const lo = snapMidiToRange(hi - 9, saxLo[0], saxLo[1]);
    alto.measures[b - 1]!.events = [];
    tenor.measures[b - 1]!.events = [];
    addEvent(alto.measures[b - 1]!, createNote(hi, 0, 1, 1));
    addEvent(alto.measures[b - 1]!, createNote(hi + 2, 1, 1, 1));
    addEvent(alto.measures[b - 1]!, createNote(hi + 4, 2, 1, 1));
    addEvent(tenor.measures[b - 1]!, createNote(lo, 0, 1, 1));
    addEvent(tenor.measures[b - 1]!, createNote(lo + 2, 1, 1, 1));
    addEvent(tenor.measures[b - 1]!, createNote(lo + 4, 2, 1, 1));
  }
}

/** Bass compositional identity — fixed F2→Eb2→Bb1 quarters for bars 45–48. */
function vacuumBassExact(score: ScoreModel): void {
  const bass = findPart(score, BB_PART_RHYTHM);
  if (!bass) return;
  for (let b = 45; b <= 48; b++) {
    const len = effBeats(score, b);
    const m = bass.measures[b - 1]!;
    m.events = [];
    addEvent(m, createNote(VACUUM_BASS_MIDIS[0]!, 0, 1, 1));
    addEvent(m, createNote(VACUUM_BASS_MIDIS[1]!, 1, 1, 1));
    addEvent(m, createNote(VACUUM_BASS_MIDIS[2]!, 2, 1, 1));
    if (len > 3) addEvent(m, createRest(3, len - 3, 1));
  }
}

/**
 * Drum architecture — bar 48: four eighths across beats 2–3 (low→high colour).
 * Exporter voice 1 allows ride/brush/hat only — use brush↔ride ascent as tom-surrogate.
 */
function drumBar48TomFill(score: ScoreModel): void {
  const drums = findPart(score, 'bb_drums');
  if (!drums) return;
  const len = effBeats(score, 48);
  const m = drums.measures[47]!;
  const eighth = 0.5;
  const starts = [1, 1.5, 2, 2.5];
  const layers = [DRUM_BRUSH, DRUM_BRUSH, DRUM_RIDE, DRUM_RIDE];
  m.events = [];
  addEvent(m, createRest(0, 1, 1));
  for (let i = 0; i < 4; i++) {
    addEvent(m, createNote(layers[i]!, starts[i]!, eighth, 1));
  }
  addEvent(m, createRest(0, len, 2));
}

/** Drum architecture — bar 53: bass drum only on beat 3 (voice 2; ride layer silent). */
function drumBar53KickBeat3(score: ScoreModel): void {
  const drums = findPart(score, 'bb_drums');
  if (!drums) return;
  const len = effBeats(score, 53);
  const m = drums.measures[52]!;
  m.events = [];
  addEvent(m, createRest(0, len, 1));
  addEvent(m, createRest(0, 2, 2));
  addEvent(m, createNote(DRUM_BD, 2, 0.35, 2));
  addEvent(m, createRest(2.35, len - 2.35, 2));
}

/**
 * Iconic shout motif (3/4): brass quarter beat 1; rest beat 2; saxes eighth+eighth beat 3.
 * Brass and saxes never duplicate the same rhythmic layer.
 */
function shoutMotifAntiphony(score: ScoreModel, bar: number, invertAlto: boolean): void {
  const len = effBeats(score, bar);
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  if (!trp || !tbn || !alto || !tenor) return;
  const sym = alto.measures[bar - 1]?.chord ?? 'Fmaj7';
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const pt = brassPitch(sym, 'trp');
  const pb = brassPitch(sym, 'tbn');
  trp.measures[bar - 1]!.events = [];
  tbn.measures[bar - 1]!.events = [];
  alto.measures[bar - 1]!.events = [];
  tenor.measures[bar - 1]!.events = [];
  addEvent(trp.measures[bar - 1]!, createNote(pt, 0, 1, 1));
  addEvent(trp.measures[bar - 1]!, createRest(1, len - 1, 1));
  addEvent(tbn.measures[bar - 1]!, createNote(pb, 0, 1, 1));
  addEvent(tbn.measures[bar - 1]!, createRest(1, len - 1, 1));

  let a1 = snapMidiToRange(76 + rpc, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  let a2 = snapMidiToRange(74 + rpc, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  if (invertAlto) {
    a1 -= 3;
    a2 -= 3;
  }
  const t1 = snapMidiToRange(a1 - 14, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  const t2 = snapMidiToRange(a2 - 14, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
  addEvent(alto.measures[bar - 1]!, createRest(0, 2, 1));
  addEvent(alto.measures[bar - 1]!, createNote(a1, 2, 0.5, 1));
  addEvent(alto.measures[bar - 1]!, createNote(a2, 2.5, 0.5, 1));
  addEvent(tenor.measures[bar - 1]!, createRest(0, 2, 1));
  addEvent(tenor.measures[bar - 1]!, createNote(t1, 2, 0.5, 1));
  addEvent(tenor.measures[bar - 1]!, createNote(t2, 2.5, 0.5, 1));
}

/** FIX 1 — motif absent in shock zone: sustained lanes (not the 3-beat shout cell). */
function shockZone556WithoutMotif(score: ScoreModel): void {
  const saxLo = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
  for (const b of [55, 56]) {
    const len = effBeats(score, b);
    const sym =
      findPart(score, 'bb_alto_sax')?.measures[b - 1]?.chord ??
      findPart(score, BB_PART_TRUMPETS)?.measures[b - 1]?.chord ??
      'Fmaj7';
    const rpc = chordSymbolRootPc(sym) ?? 5;
    const trp = findPart(score, BB_PART_TRUMPETS);
    const tbn = findPart(score, BB_PART_TROMBONES);
    const alto = findPart(score, 'bb_alto_sax');
    const tenor = findPart(score, 'bb_tenor_sax');
    if (!trp || !tbn || !alto || !tenor) continue;
    trp.measures[b - 1]!.events = [];
    tbn.measures[b - 1]!.events = [];
    alto.measures[b - 1]!.events = [];
    tenor.measures[b - 1]!.events = [];
    addEvent(trp.measures[b - 1]!, createNote(brassPitch(sym, 'trp'), 0, len, 1));
    addEvent(tbn.measures[b - 1]!, createNote(brassPitch(sym, 'tbn'), 0, len, 1));
    addEvent(alto.measures[b - 1]!, createNote(snapMidiToRange(73 + rpc, saxLo[0], saxLo[1]), 0, len, 1));
    addEvent(tenor.measures[b - 1]!, createNote(snapMidiToRange(65 + rpc, saxLo[0], saxLo[1]), 0, len, 1));
  }
}

/** Bar 58 — physical shock after silence: tutti quarter beat 1 (no shout motif cell). */
function shockBar58(score: ScoreModel): void {
  const bar = 58;
  const len = effBeats(score, bar);
  const sym =
    findPart(score, 'bb_alto_sax')?.measures[bar - 1]?.chord ??
    findPart(score, BB_PART_TRUMPETS)?.measures[bar - 1]?.chord ??
    'Fmaj7';
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const saxLo = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  const piano = findPart(score, 'bb_piano');
  const bass = findPart(score, BB_PART_RHYTHM);
  const drums = findPart(score, 'bb_drums');
  const hit = Math.min(1, len);
  if (trp) {
    const m = trp.measures[bar - 1]!;
    m.events = [];
    addEvent(m, createNote(brassPitch(sym, 'trp'), 0, hit, 1));
    addEvent(m, createRest(hit, len - hit, 1));
  }
  if (tbn) {
    const m = tbn.measures[bar - 1]!;
    m.events = [];
    addEvent(m, createNote(brassPitch(sym, 'tbn'), 0, hit, 1));
    addEvent(m, createRest(hit, len - hit, 1));
  }
  if (alto) {
    const m = alto.measures[bar - 1]!;
    m.events = [];
    addEvent(m, createNote(snapMidiToRange(79 + rpc, saxLo[0], saxLo[1]), 0, hit, 1));
    addEvent(m, createRest(hit, len - hit, 1));
  }
  if (tenor) {
    const m = tenor.measures[bar - 1]!;
    m.events = [];
    addEvent(m, createNote(snapMidiToRange(67 + rpc, saxLo[0], saxLo[1]), 0, hit, 1));
    addEvent(m, createRest(hit, len - hit, 1));
  }
  if (piano) {
    const m = piano.measures[bar - 1]!;
    const shell = [
      snapMidiToRange(53 + rpc, 48, 72),
      snapMidiToRange(57 + rpc, 48, 79),
      snapMidiToRange(60 + rpc, 48, 79),
    ];
    m.events = [];
    addEvent(m, createNote(shell[0]!, 0, hit, 1, undefined, shell));
    addEvent(m, createRest(hit, len - hit, 1));
  }
  if (bass) {
    const m = bass.measures[bar - 1]!;
    m.events = [];
    addEvent(m, createNote(snapMidiToRange(36 + rpc, 28, 55), 0, hit, 1));
    addEvent(m, createRest(hit, len - hit, 1));
  }
  if (drums) {
    const m = drums.measures[bar - 1]!;
    const q = len / 4;
    m.events = [];
    addEvent(m, createNote(51, 0, q, 1));
    addEvent(m, createRest(q, len - q, 1));
    addEvent(m, createNote(DRUM_BD, 0, q, 2));
    addEvent(m, createRest(q, len - q, 2));
  }
}

/** Tenor inner motion / pseudo-suspensions — does not alter locked alto melody (builder output overwritten only on tenor staff). */
function headInnerVoiceTenor(score: ScoreModel, bar: number, mode: 'suspension' | 'contrary'): void {
  const tenor = findPart(score, 'bb_tenor_sax');
  if (!tenor) return;
  const len = effBeats(score, bar);
  const m = tenor.measures[bar - 1]!;
  const sym = m.chord ?? 'Fmaj7';
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const lo = BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]!;
  m.events = [];
  if (mode === 'suspension') {
    const sus = snapMidiToRange(67 + rpc, lo[0], lo[1]);
    const res = snapMidiToRange(sus - 2, lo[0], lo[1]);
    addEvent(m, createNote(sus, 0, 1, 1));
    addEvent(m, createNote(res, 1, 1, 1));
    addEvent(m, createRest(2, len - 2, 1));
  } else {
    const p0 = snapMidiToRange(70 + rpc, lo[0], lo[1]);
    const p1 = snapMidiToRange(p0 - 2, lo[0], lo[1]);
    const p2 = snapMidiToRange(p1 - 2, lo[0], lo[1]);
    addEvent(m, createNote(p0, 0, 1, 1));
    addEvent(m, createNote(p1, 1, 1, 1));
    addEvent(m, createNote(p2, 2, 1, 1));
  }
}

function tromboneContraryGesture(score: ScoreModel, bar: number): void {
  const tbn = findPart(score, BB_PART_TROMBONES);
  if (!tbn) return;
  const len = effBeats(score, bar);
  const m = tbn.measures[bar - 1]!;
  const sym = m.chord ?? 'Fmaj7';
  const rpc = chordSymbolRootPc(sym) ?? 5;
  const lo = BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES]!;
  const hi = snapMidiToRange(62 + rpc, lo[0], lo[1]);
  const mid = snapMidiToRange(hi - 3, lo[0], lo[1]);
  const low = snapMidiToRange(mid - 4, lo[0], lo[1]);
  m.events = [];
  addEvent(m, createNote(hi, 0, 1, 1));
  addEvent(m, createNote(mid, 1, 1, 1));
  addEvent(m, createNote(low, 2, 1, 1));
}

/** FIX 3 — coda bars 61–64 (two sax staves + trumpet colour; “bari” ≈ low tenor). */
function codaRewrite6164(score: ScoreModel): void {
  const alto = findPart(score, 'bb_alto_sax');
  const tenor = findPart(score, 'bb_tenor_sax');
  const trp = findPart(score, BB_PART_TRUMPETS);
  const tbn = findPart(score, BB_PART_TROMBONES);
  const piano = findPart(score, 'bb_piano');
  const bass = findPart(score, BB_PART_RHYTHM);
  const drums = findPart(score, 'bb_drums');
  for (let b = 61; b <= 64; b++) {
    const len = effBeats(score, b);
    if (tbn) wipeVoice1Rest(tbn.measures[b - 1]!, len);
    if (piano) wipeVoice1Rest(piano.measures[b - 1]!, len);
    if (drums) wipeTwoVoiceRest(drums.measures[b - 1]!, len);
    if (bass) wipeVoice1Rest(bass.measures[b - 1]!, len);
  }

  // Bar 61 — Fmaj7 close; alto melody C5 on top; ppp via dynamics map
  if (alto && tenor) {
    const len = effBeats(score, 61);
    const close = [60, 64, 67, 72];
    alto.measures[60]!.events = [];
    tenor.measures[60]!.events = [];
    addEvent(alto.measures[60]!, createNote(72, 0, len, 1, undefined, [...close]));
    addEvent(tenor.measures[60]!, createNote(53, 0, len, 1, undefined, [53, 57]));
  }

  // Bar 62 — fragment F5–Eb5 (alto); tenor pad + Ab4 colour
  if (alto && tenor) {
    const len = effBeats(score, 62);
    alto.measures[61]!.events = [];
    addEvent(alto.measures[61]!, createNote(77, 0, 0.5, 1));
    addEvent(alto.measures[61]!, createNote(75, 0.5, 0.5, 1));
    addEvent(alto.measures[61]!, createRest(1, len - 1, 1));
    tenor.measures[61]!.events = [];
    addEvent(tenor.measures[61]!, createNote(69, 0, len, 1, undefined, [65, 69, 72]));
  }

  // Bar 63 — tenor Ab4; trumpet Eb5 (muted colour left to Sibelius); alto tacet
  if (tenor && trp) {
    const len = effBeats(score, 63);
    if (alto) wipeVoice1Rest(alto.measures[62]!, len);
    tenor.measures[62]!.events = [];
    addEvent(tenor.measures[62]!, createNote(69, 0, len, 1));
    trp.measures[62]!.events = [];
    addEvent(trp.measures[62]!, createRest(0, len * 0.45, 1));
    addEvent(trp.measures[62]!, createNote(75, len * 0.45, len * 0.55, 1));
  }

  // Bar 64 — Ab + Eb sustain (bari substitute + muted trumpet line)
  if (tenor && trp) {
    const len = effBeats(score, 64);
    if (alto) wipeVoice1Rest(alto.measures[63]!, len);
    tenor.measures[63]!.events = [];
    trp.measures[63]!.events = [];
    addEvent(tenor.measures[63]!, createNote(69, 0, len, 1));
    addEvent(trp.measures[63]!, createNote(75, 0, len, 1));
  }
}

export function applyOrbitBbV6Extended(score: ScoreModel): void {
  fragileExposed3839(score);
  headInnerVoiceTenor(score, 9, 'suspension');
  headInnerVoiceTenor(score, 17, 'suspension');
  headInnerVoiceTenor(score, 12, 'contrary');
  headInnerVoiceTenor(score, 20, 'contrary');
  headInnerVoiceTenor(score, 28, 'contrary');
  tromboneContraryGesture(score, 12);
  tromboneContraryGesture(score, 20);
  tromboneContraryGesture(score, 28);

  vacuumBassExact(score);
  drumBar48TomFill(score);

  for (const b of [49, 50]) shoutMotifAntiphony(score, b, false);
  for (const b of [53, 54]) shoutMotifAntiphony(score, b, true);
  for (const b of [59, 60]) shoutMotifAntiphony(score, b, false);

  shockZone556WithoutMotif(score);
  totalSilenceBar(score, 57);
  shockBar58(score);

  drumBar53KickBeat3(score);

  codaRewrite6164(score);

  const base = score.measureDynamicsMarkings ?? {};
  score.measureDynamicsMarkings = {
    ...base,
    38: 'pp',
    39: 'pp',
    57: 'ppp',
    58: 'fff',
    61: 'ppp',
    62: 'pp',
    63: 'pppp',
    64: 'ppp',
  };
}
