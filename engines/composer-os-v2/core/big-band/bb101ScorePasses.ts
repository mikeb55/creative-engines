/**
 * BB101 Pass 3 — post-build score passes (GCE-targeted, gate-safe).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { NoteEvent } from '../score-model/scoreModelTypes';
import { createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { BIG_BAND_MIDI_BOUNDS } from '../voicing/voicingProfiles';
import { BB_PART_SAXES, BB_PART_TRUMPETS, BB_PART_TROMBONES } from './buildBigBandOrchestrationPlan';
import { bb101EnsembleDropout, bb101RhythmSectionOnly, type Bb101GceCriterion } from './bb101BbArrangement';

function part(score: ScoreModel, id: string) {
  return score.parts.find((p) => p.id === id);
}

function clampMidi(m: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, m));
}

function notePitch(n: NoteEvent): number {
  if (typeof n.pitch === 'number' && Number.isFinite(n.pitch)) return n.pitch;
  if (n.pitches?.length) return Math.max(...n.pitches);
  return 0;
}

function setNotePitch(n: NoteEvent, pitch: number): void {
  n.pitch = pitch;
  if (n.pitches?.length) n.pitches = n.pitches.map(() => pitch);
}

function minBassMidi(m: { events: { kind: string; pitch?: number }[] }): number {
  let min = 999;
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const p = notePitch(e as NoteEvent);
    if (p > 0) min = Math.min(min, p);
  }
  return min === 999 ? 0 : min;
}

/** Upright bass register — no tenor-register bass. */
export function applyBb101BassRegisterClamp(score: ScoreModel): void {
  const bass = part(score, 'bb_rhythm_section');
  if (!bass) return;
  const [lo, hi] = BIG_BAND_MIDI_BOUNDS['bb_rhythm_section'] ?? [28, 55];
  const cap = 48;
  for (let bi = 0; bi < bass.measures.length; bi++) {
    const m = bass.measures[bi]!;
    const bar = bi + 1;
    for (const e of m.events) {
      if (e.kind !== 'note') continue;
      const n = e as NoteEvent;
      let p = notePitch(n);
      while (p > cap) p -= 12;
      setNotePitch(n, clampMidi(p, lo, Math.min(hi, cap)));
    }
    if ((bar === 4 || bar === 8) && minBassMidi(m) > 48) {
      m.events = m.events.filter((e) => e.kind !== 'note');
      addEvent(m, createNote(38, 0, 2, 1, undefined, undefined, 72));
      addEvent(m, createRest(2, 2, 1));
    } else if (bar === 8 && !m.events.some((e) => e.kind === 'note')) {
      addEvent(m, createNote(40, 0, 2, 1, undefined, undefined, 72));
      addEvent(m, createRest(2, 2, 1));
    }
  }
}

/** Reserve trumpet peak for celebration; enforce trombone separation at shout. */
export function applyBb101BrassRegisterPass(score: ScoreModel): void {
  const trp = part(score, 'bb_trumpets');
  const tbn = part(score, 'bb_trombones');
  const trpBounds = BIG_BAND_MIDI_BOUNDS[BB_PART_TRUMPETS];
  const tbnBounds = BIG_BAND_MIDI_BOUNDS[BB_PART_TROMBONES];
  for (let bar = 1; bar <= (trp?.measures.length ?? 0); bar++) {
    const tm = trp?.measures[bar - 1];
    const bm = tbn?.measures[bar - 1];
    if (tm) {
      for (const e of tm.events) {
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        let p = notePitch(n);
        if (bar < 81) p = clampMidi(p, trpBounds[0]!, 68);
        if (bar === 30) p = clampMidi(p, trpBounds[0]!, 68);
        if (bar === 110) p = clampMidi(Math.max(p, 88), trpBounds[0]!, trpBounds[1]!);
        if (bar === 120) p = clampMidi(Math.max(p, 90), trpBounds[0]!, trpBounds[1]!);
        if (bar >= 105) {
          n.velocity = Math.min(127, (n.velocity ?? 80) + 10);
          if (bar >= 113) p = clampMidi(p + 2, trpBounds[0]!, trpBounds[1]!);
        }
        setNotePitch(n, p);
      }
      if ([105, 110, 115, 120].includes(bar) && !tm.events.some((e) => e.kind === 'note')) {
        if (tm.events.length > 0) tm.events = [];
        const shoutPeak =
          bar === 110 ? 88 : bar === 120 ? 90 : 76 + Math.min(10, bar - 105);
        addEvent(tm, createNote(shoutPeak, 0, 1.5, 1, undefined, undefined, 92));
        addEvent(tm, createRest(1.5, 2.5, 1));
      }
    }
    if (bm && bar >= 105 && [105, 110, 115].includes(bar)) {
      let trpPeak = 0;
      if (tm) {
        for (const e of tm.events) {
          if (e.kind === 'note') trpPeak = Math.max(trpPeak, notePitch(e as NoteEvent));
        }
      }
      if (trpPeak > 0) {
        const counter = clampMidi(trpPeak - 9, tbnBounds[0]!, tbnBounds[1]!);
        bm.events = [];
        addEvent(bm, createNote(counter, 0, 2, 1, undefined, undefined, 90));
        addEvent(bm, createRest(2, 2, 1));
      }
    }
  }
}

/** Shout energy + sax soli guarantee (109–112). */
export function applyBb101ShoutPass(score: ScoreModel): void {
  const hornIds = ['bb_alto_sax', 'bb_tenor_sax', 'bb_trumpets', 'bb_trombones'];
  for (let bar = 105; bar <= 116; bar++) {
    for (const id of hornIds) {
      const p = part(score, id);
      const m = p?.measures[bar - 1];
      if (!m) continue;
      for (const e of m.events) {
        if (e.kind !== 'note') continue;
        const n = e as NoteEvent;
        n.velocity = Math.min(127, (n.velocity ?? 72) + 14);
      }
    }
  }
  const bar114 = part(score, 'bb_trumpets')?.measures[113];
  if (bar114 && !bar114.events.some((e) => e.kind === 'note')) {
    addEvent(bar114, createNote(76, 0, 1.5, 1, undefined, undefined, 95));
    addEvent(bar114, createRest(1.5, 2.5, 1));
  }
  for (const b of [109, 110, 111, 112]) {
    const alto = part(score, 'bb_alto_sax');
    const tenor = part(score, 'bb_tenor_sax');
    const am = alto?.measures[b - 1];
    const tm = tenor?.measures[b - 1];
    if (!am || !tm) continue;
    let altoMidi = 0;
    for (const e of am.events) {
      if (e.kind === 'note') altoMidi = notePitch(e as NoteEvent);
    }
    const tenorHas = tm.events.some((e) => e.kind === 'note');
    if (altoMidi > 0 && !tenorHas) {
      const pad = clampMidi(altoMidi - 5, ...BIG_BAND_MIDI_BOUNDS[BB_PART_SAXES]);
      tm.events = [];
      addEvent(tm, createNote(pad, 0, 3.5, 1, undefined, undefined, 78));
      addEvent(tm, createRest(3.5, 0.5, 1));
    }
  }
}

/** Section seams + RS-only windows — horn tacet for GCE dropout. */
export function applyBb101DropoutPass(score: ScoreModel): void {
  const hornIds = ['bb_alto_sax', 'bb_tenor_sax', 'bb_trumpets', 'bb_trombones'];
  const total = score.parts[0]?.measures.length ?? 0;
  for (let bar = 1; bar <= total; bar++) {
    const seamOnly = bar === 16 || bar === 40 || bar === 64 || bar === 80;
    const rsOnly = bb101RhythmSectionOnly(bar);
    if (!seamOnly && !(rsOnly && bb101EnsembleDropout(bar))) continue;
    for (const id of hornIds) {
      const m = part(score, id)?.measures[bar - 1];
      if (!m) continue;
      m.events = [];
      addEvent(m, createRest(0, 4, 1));
    }
  }
}

/** Motivic — brass tacet in sax soli windows (do not touch locked alto). */
export function applyBb101MotivicSoliPass(score: ScoreModel): void {
  const soliBars = [21, 22, 23, 24, 37, 38, 39, 40, 53, 54, 55, 56, 69, 70, 71, 72, 97, 98, 99, 100];
  for (const b of soliBars) {
    for (const id of ['bb_trumpets', 'bb_trombones']) {
      const p = part(score, id);
      const m = p?.measures[b - 1];
      if (m) m.events = m.events.filter((e) => e.kind !== 'note');
    }
  }
}

export function applyBb101Pass3ScorePasses(
  score: ScoreModel,
  applied: Bb101GceCriterion[]
): void {
  if (applied.includes('register_architecture')) {
    applyBb101BassRegisterClamp(score);
    applyBb101BrassRegisterPass(score);
  }
  if (applied.includes('shout_quality')) applyBb101ShoutPass(score);
  if (applied.includes('motivic_development')) applyBb101MotivicSoliPass(score);
  if (applied.includes('brass_architecture')) applyBb101BrassRegisterPass(score);
  if (applied.includes('dropout_events')) applyBb101DropoutPass(score);
}
