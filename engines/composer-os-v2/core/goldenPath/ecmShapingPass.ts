/**
 * ECM aesthetic shaping — post-expressive, post-variation, pre bar-math seal.
 * Density, space, interval smoothing, chord clarity, light bass restraint (deterministic from seed).
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, NoteEvent, RestEvent } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { chordTonesForChordSymbol, pitchClassToBassMidi } from '../harmony/chordSymbolAnalysis';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';

const G_LOW = 55;
const G_HIGH = 79;
const BASS_LOW = 36;
const BASS_HIGH = 52;

function chordForBar(context: CompositionContext, barIndex: number, mChord?: string): string {
  if (mChord && mChord.trim()) return mChord.trim();
  for (const seg of context.chordSymbolPlan.segments) {
    if (barIndex >= seg.startBar && barIndex < seg.startBar + seg.bars) return seg.chord;
  }
  throw new Error(`ecmShapingPass: no chord for bar ${barIndex}`);
}

function chordTonePitchesInRange(chord: string, low: number, high: number): number[] {
  if (low >= G_LOW) {
    const t = guitarChordTonesInRange(chord, low, high);
    return [t.root, t.third, t.fifth, t.seventh].map((x) => Math.round(x));
  }
  const t = chordTonesForChordSymbol(chord);
  return [t.root, t.third, t.fifth, t.seventh].map((midi) => {
    const pc = ((midi % 12) + 12) % 12;
    return clampPitch(pitchClassToBassMidi(pc, low, high), low, high);
  });
}

function smoothLeapTowardPrev(p1: number, p2: number, chord: string, low: number, high: number): number {
  if (Math.abs(p2 - p1) <= 5) return p2;
  const pool = chordTonePitchesInRange(chord, low, high);
  let best = p2;
  let bestDist = 999;
  for (const c of pool) {
    const cc = clampPitch(c, low, high);
    if (Math.abs(cc - p1) <= 5 && Math.abs(cc - p2) < bestDist) {
      bestDist = Math.abs(cc - p2);
      best = cc;
    }
  }
  if (bestDist < 999) return best;
  const step = p2 > p1 ? -2 : 2;
  return clampPitch(p2 + step, low, high);
}

function snapTowardChordTone(pitch: number, chord: string, low: number, high: number): number {
  const pool = chordTonePitchesInRange(chord, low, high);
  const pcs = new Set(pool.map((p) => ((p % 12) + 12) % 12));
  const pc = ((pitch % 12) + 12) % 12;
  if (pcs.has(pc)) return pitch;
  let best = pitch;
  let bd = 99;
  for (const c of pool) {
    const d = Math.abs(c - pitch);
    if (d <= 3 && d < bd) {
      bd = d;
      best = c;
    }
  }
  return bd <= 3 ? best : pitch;
}

function reduceGuitarDensity(guitar: PartModel, context: CompositionContext, seed: number): void {
  const removeFrac = 0.15 + seededUnit(seed, 1, 13001) * 0.15;
  for (const m of [...guitar.measures].sort((a, b) => a.index - b.index)) {
    const noteIdxs: number[] = [];
    m.events.forEach((e, i) => {
      if (e.kind === 'note') noteIdxs.push(i);
    });
    if (noteIdxs.length <= 2) continue;
    const interior = noteIdxs.slice(1, -1);
    const targetRemove = Math.max(1, Math.floor(interior.length * removeFrac));
    const ranked = interior
      .map((ei) => ({ ei, r: seededUnit(seed, m.index * 2000 + ei, 13002) }))
      .sort((a, b) => a.r - b.r);
    const selected = new Set<number>();
    for (const { ei } of ranked) {
      if (selected.size >= targetRemove) break;
      const pos = noteIdxs.indexOf(ei);
      if (pos <= 0 || pos >= noteIdxs.length - 1) continue;
      const prev = noteIdxs[pos - 1];
      const next = noteIdxs[pos + 1];
      if (selected.has(prev) || selected.has(next)) continue;
      selected.add(ei);
    }
    for (const ei of selected) {
      const ev = m.events[ei];
      if (!ev || ev.kind !== 'note') continue;
      const n = ev as NoteEvent;
      const rest: RestEvent = createRest(n.startBeat, n.duration, n.voice ?? 1);
      m.events[ei] = rest;
    }
  }
}

function smoothPartIntervals(part: PartModel, context: CompositionContext, low: number, high: number): void {
  for (const m of [...part.measures].sort((a, b) => a.index - b.index)) {
    const chord = chordForBar(context, m.index, m.chord);
    const noteEntries: { idx: number }[] = [];
    m.events.forEach((e, idx) => {
      if (e.kind === 'note') noteEntries.push({ idx });
    });
    noteEntries.sort((a, b) => (m.events[a.idx] as NoteEvent).startBeat - (m.events[b.idx] as NoteEvent).startBeat);
    for (let i = 1; i < noteEntries.length; i++) {
      const prevEv = m.events[noteEntries[i - 1].idx];
      const curEv = m.events[noteEntries[i].idx];
      if (prevEv.kind !== 'note' || curEv.kind !== 'note') continue;
      const n0 = prevEv as NoteEvent;
      const n1 = curEv as NoteEvent;
      const p1 = n0.pitch;
      let p2 = n1.pitch;
      if (Math.abs(p2 - p1) <= 5) continue;
      p2 = smoothLeapTowardPrev(p1, p2, chord, low, high);
      if (p2 !== n1.pitch) m.events[noteEntries[i].idx] = { ...n1, pitch: p2 };
    }
  }
}

function applyHarmonicClarityGuitar(guitar: PartModel, context: CompositionContext, seed: number): void {
  for (const m of guitar.measures) {
    const chord = chordForBar(context, m.index, m.chord);
    m.events.forEach((e, idx) => {
      if (e.kind !== 'note') return;
      const n = e as NoteEvent;
      if (seededUnit(seed, m.index * 400 + idx, 13100) < 0.55) {
        const np = snapTowardChordTone(n.pitch, chord, G_LOW, G_HIGH);
        if (np !== n.pitch) m.events[idx] = { ...n, pitch: np };
      }
    });
  }
}

function reduceBassDensity(bass: PartModel, seed: number): void {
  const removeFrac = 0.1 + seededUnit(seed, 2, 13201) * 0.08;
  for (const m of [...bass.measures].sort((a, b) => a.index - b.index)) {
    const noteIdxs: number[] = [];
    m.events.forEach((e, i) => {
      if (e.kind === 'note') noteIdxs.push(i);
    });
    if (noteIdxs.length <= 2) continue;
    const interior = noteIdxs.slice(1, -1);
    const targetRemove = Math.max(0, Math.floor(interior.length * removeFrac));
    if (targetRemove === 0) continue;
    const ranked = interior
      .map((ei) => ({ ei, r: seededUnit(seed, m.index * 2500 + ei, 13202) }))
      .sort((a, b) => a.r - b.r);
    const selected = new Set<number>();
    for (const { ei } of ranked) {
      if (selected.size >= targetRemove) break;
      const pos = noteIdxs.indexOf(ei);
      if (pos <= 0 || pos >= noteIdxs.length - 1) continue;
      const prev = noteIdxs[pos - 1];
      const next = noteIdxs[pos + 1];
      if (selected.has(prev) || selected.has(next)) continue;
      selected.add(ei);
    }
    for (const ei of selected) {
      const ev = m.events[ei];
      if (!ev || ev.kind !== 'note') continue;
      const n = ev as NoteEvent;
      m.events[ei] = createRest(n.startBeat, n.duration, n.voice ?? 1);
    }
  }
}

/**
 * ECM-only: run after variation, before bar-math seal. Mutates score in place.
 */
export function applyECMShapingPass(score: ScoreModel, context: CompositionContext, seed: number): void {
  if (context.presetId !== 'ecm_chamber') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;

  reduceGuitarDensity(guitar, context, seed);
  smoothPartIntervals(guitar, context, G_LOW, G_HIGH);
  applyHarmonicClarityGuitar(guitar, context, seed);
  smoothPartIntervals(guitar, context, G_LOW, G_HIGH);

  if (bass) {
    reduceBassDensity(bass, seed);
    smoothPartIntervals(bass, context, BASS_LOW, BASS_HIGH);
  }
}

export function countPartNotes(part: PartModel): number {
  let n = 0;
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') n++;
    }
  }
  return n;
}

export function maxMelodicLeap(part: PartModel): number {
  let max = 0;
  for (const m of [...part.measures].sort((a, b) => a.index - b.index)) {
    const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
    notes.sort((a, b) => a.startBeat - b.startBeat);
    const pitches = notes.map((n) => n.pitch);
    for (let i = 1; i < pitches.length; i++) {
      max = Math.max(max, Math.abs(pitches[i] - pitches[i - 1]));
    }
  }
  return max;
}
