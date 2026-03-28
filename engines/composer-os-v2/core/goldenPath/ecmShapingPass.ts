/**
 * ECM aesthetic shaping — post-expressive, post-variation, pre bar-math seal.
 * Density, harmonic clarity, strict voice-leading (BH order), contour anti-loop (matches behaviourGates).
 */

import type { CompositionContext } from '../compositionContext';
import type { ScoreModel, PartModel, NoteEvent, RestEvent, MeasureModel } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { guitarChordTonesInRange } from './guitarPhraseAuthority';
import { chordTonesForChordSymbolWithContext, shouldUseUserChordSemanticsForTones } from '../harmony/harmonyChordTonePolicy';
import { resolveChordForDuoPostPass } from '../harmony/harmonyResolution';
import { pitchClassToBassMidi } from '../harmony/chordSymbolAnalysis';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';

const G_LOW = 55;
const G_HIGH = 79;
const BASS_LOW = 36;
const BASS_HIGH = 52;
/** Guitar: match strict ECM shaping + Barry Harris voice-leading check (global consecutive in BH order). */
const GUITAR_MAX_LEAP = 5;
/** Bass: Barry Harris allows up to 14; stay under cap. */
const BASS_MAX_LEAP = 14;

function chordForBar(context: CompositionContext, barIndex: number, mChord?: string): string {
  return resolveChordForDuoPostPass(context, barIndex, mChord);
}

function chordTonePitchesInRange(
  chord: string,
  low: number,
  high: number,
  context: CompositionContext
): number[] {
  if (low >= G_LOW) {
    const t = guitarChordTonesInRange(
      chord,
      low,
      high,
      shouldUseUserChordSemanticsForTones(context) ? { lockedHarmony: true } : undefined
    );
    return [t.root, t.third, t.fifth, t.seventh].map((x) => Math.round(x));
  }
  const t = chordTonesForChordSymbolWithContext(chord, context);
  return [t.root, t.third, t.fifth, t.seventh].map((midi) => {
    const pc = ((midi % 12) + 12) % 12;
    return clampPitch(pitchClassToBassMidi(pc, low, high), low, high);
  });
}

/**
 * Strict: |result - p1| <= maxLeap. Prefer nearest chord tone to p2 within ±3 semitones that satisfies leap;
 * else step from p1 toward p2 by at most maxLeap.
 */
function resolvePitchTowardPrev(
  p1: number,
  p2: number,
  chord: string,
  low: number,
  high: number,
  maxLeap: number,
  context: CompositionContext
): number {
  if (Math.abs(p2 - p1) <= maxLeap) return p2;
  const pool = chordTonePitchesInRange(chord, low, high, context);
  let best: number | undefined;
  let bd = 999;
  for (const c of pool) {
    const cc = clampPitch(c, low, high);
    if (Math.abs(cc - p1) <= maxLeap) {
      const d = Math.abs(cc - p2);
      if (d <= 3 && d < bd) {
        bd = d;
        best = cc;
      }
    }
  }
  if (best !== undefined) return best;
  const delta = p2 - p1;
  const step = Math.sign(delta) * Math.min(Math.abs(delta), maxLeap);
  return clampPitch(p1 + step, low, high);
}

function snapTowardChordTone(
  pitch: number,
  chord: string,
  low: number,
  high: number,
  context: CompositionContext
): number {
  const pool = chordTonePitchesInRange(chord, low, high, context);
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

/** Same iteration order as `moduleValidation` / Barry Harris guitar voice-leading. */
function collectNoteRefsBarryHarrisOrder(part: PartModel): Array<{ bar: number; ei: number }> {
  const out: Array<{ bar: number; ei: number }> = [];
  for (const m of [...part.measures].sort((a, b) => a.index - b.index)) {
    m.events.forEach((e, ei) => {
      if (e.kind === 'note') out.push({ bar: m.index, ei });
    });
  }
  return out;
}

function findMeasure(part: PartModel, barIndex: number): MeasureModel | undefined {
  return part.measures.find((m) => m.index === barIndex);
}

/**
 * Enforce maxLeap between consecutive notes in Barry Harris global order (measure order, then event order).
 */
function strictEnforceGlobalLeaps(
  part: PartModel,
  context: CompositionContext,
  low: number,
  high: number,
  maxLeap: number
): void {
  for (let iter = 0; iter < 16; iter++) {
    const refs = collectNoteRefsBarryHarrisOrder(part);
    let changed = false;
    for (let i = 1; i < refs.length; i++) {
      const m1 = findMeasure(part, refs[i - 1].bar);
      const m2 = findMeasure(part, refs[i].bar);
      if (!m1 || !m2) continue;
      const ev1 = m1.events[refs[i - 1].ei];
      const ev2 = m2.events[refs[i].ei];
      if (!ev1 || ev1.kind !== 'note' || !ev2 || ev2.kind !== 'note') continue;
      const n1 = ev1 as NoteEvent;
      const n2 = ev2 as NoteEvent;
      const p1 = n1.pitch;
      const p2 = n2.pitch;
      if (Math.abs(p2 - p1) <= maxLeap) continue;
      const chord = chordForBar(context, refs[i].bar, m2.chord);
      const np = resolvePitchTowardPrev(p1, p2, chord, low, high, maxLeap, context);
      if (np !== p2) {
        m2.events[refs[i].ei] = { ...n2, pitch: np };
        changed = true;
      }
    }
    if (!changed) break;
  }
}

/** Same contour signature as `validateEcmAntiLoop` in behaviourGates.ts */
export function guitarBarContourSig(m: MeasureModel): string {
  const notes = [...m.events]
    .filter((e) => e.kind === 'note')
    .sort((a, b) => (a as NoteEvent).startBeat - (b as NoteEvent).startBeat) as NoteEvent[];
  if (notes.length === 0) return 'rest';
  if (notes.length === 1) return `P${notes[0].pitch % 12}`;
  return notes
    .slice(1)
    .map((n, i) => n.pitch - notes[i].pitch)
    .join(',');
}

/**
 * If three consecutive bars share identical pitch contour, nudge one interior note in the third bar.
 */
function applyContourAntiLoopGuitar(guitar: PartModel, seed: number): void {
  for (let round = 0; round < 16; round++) {
    const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
    const sigs = sorted.map((m) => guitarBarContourSig(m));
    let broke = false;
    for (let i = 2; i < sigs.length; i++) {
      if (sigs[i] !== sigs[i - 1] || sigs[i] !== sigs[i - 2] || sigs[i] === 'rest') continue;
      const m = sorted[i];
      const entries = m.events
        .map((e, idx) => ({ e, idx }))
        .filter((x) => x.e.kind === 'note') as { e: NoteEvent; idx: number }[];
      entries.sort((a, b) => a.e.startBeat - b.e.startBeat);
      if (entries.length < 2) continue;
      const interior = entries.slice(1, -1);
      if (interior.length === 0) continue;
      const pick = interior[Math.floor(seededUnit(seed, i * 1000 + round, 14100) * interior.length)];
      const dir = seededUnit(seed, i + round * 17, 14101) < 0.5 ? -1 : 1;
      const np = clampPitch(pick.e.pitch + dir, G_LOW, G_HIGH);
      m.events[pick.idx] = { ...pick.e, pitch: np };
      broke = true;
      break;
    }
    if (!broke) break;
  }
}

function reduceGuitarDensity(guitar: PartModel, seed: number): void {
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

function applyHarmonicClarityGuitar(guitar: PartModel, context: CompositionContext, seed: number): void {
  for (const m of guitar.measures) {
    const chord = chordForBar(context, m.index, m.chord);
    m.events.forEach((e, idx) => {
      if (e.kind !== 'note') return;
      const n = e as NoteEvent;
      if (seededUnit(seed, m.index * 400 + idx, 13100) < 0.55) {
        const np = snapTowardChordTone(n.pitch, chord, G_LOW, G_HIGH, context);
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
 * Order: density → harmonic snap → strict voice-leading → contour anti-loop → strict VL again → bass density → bass VL.
 */
export function applyECMShapingPass(score: ScoreModel, context: CompositionContext, seed: number): void {
  if (context.presetId !== 'ecm_chamber') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;

  reduceGuitarDensity(guitar, seed);
  applyHarmonicClarityGuitar(guitar, context, seed);
  strictEnforceGlobalLeaps(guitar, context, G_LOW, G_HIGH, GUITAR_MAX_LEAP);
  applyContourAntiLoopGuitar(guitar, seed);
  strictEnforceGlobalLeaps(guitar, context, G_LOW, G_HIGH, GUITAR_MAX_LEAP);

  if (bass) {
    reduceBassDensity(bass, seed);
    strictEnforceGlobalLeaps(bass, context, BASS_LOW, BASS_HIGH, BASS_MAX_LEAP);
  }
}

/**
 * Re-run strict guitar/bass voice-leading + contour anti-loop after post-ECM mutations (e.g. orchestration).
 */
export function enforceEcmPostEditGuards(score: ScoreModel, context: CompositionContext, seed: number): void {
  if (context.presetId !== 'ecm_chamber') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;
  strictEnforceGlobalLeaps(guitar, context, G_LOW, G_HIGH, GUITAR_MAX_LEAP);
  applyContourAntiLoopGuitar(guitar, seed);
  strictEnforceGlobalLeaps(guitar, context, G_LOW, G_HIGH, GUITAR_MAX_LEAP);
  if (bass) strictEnforceGlobalLeaps(bass, context, BASS_LOW, BASS_HIGH, BASS_MAX_LEAP);
}

const DUO_GUITAR_MAX_LEAP = 12;

/** Barry Harris cap for golden-path duo after non-ECM orchestration edits. */
export function enforceDuoVoiceLeadingPostOrchestration(score: ScoreModel, context: CompositionContext): void {
  if (context.presetId !== 'guitar_bass_duo') return;
  const guitar = score.parts.find((p) => p.instrumentIdentity === 'clean_electric_guitar');
  const bass = score.parts.find((p) => p.instrumentIdentity === 'acoustic_upright_bass');
  if (!guitar) return;
  strictEnforceGlobalLeaps(guitar, context, G_LOW, G_HIGH, DUO_GUITAR_MAX_LEAP);
  if (bass) strictEnforceGlobalLeaps(bass, context, BASS_LOW, BASS_HIGH, BASS_MAX_LEAP);
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

/** Per-bar consecutive notes only (legacy / local contour). */
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

/** Barry Harris global voice-leading order — matches style module validation. */
export function maxGlobalLeapBarryHarrisOrder(part: PartModel): number {
  const pitches: number[] = [];
  for (const m of [...part.measures].sort((a, b) => a.index - b.index)) {
    for (const e of m.events) {
      if (e.kind === 'note') pitches.push((e as NoteEvent).pitch);
    }
  }
  let max = 0;
  for (let i = 1; i < pitches.length; i++) {
    max = Math.max(max, Math.abs(pitches[i] - pitches[i - 1]));
  }
  return max;
}

/** Max run length of identical `guitarBarContourSig` (ECM anti-loop gate: must be ≤ 2). */
export function maxGuitarContourRepeatRun(guitar: PartModel): number {
  const sorted = [...guitar.measures].sort((a, b) => a.index - b.index);
  const sigs = sorted.map((m) => guitarBarContourSig(m));
  let prev = '';
  let run = 0;
  let maxRun = 0;
  for (const co of sigs) {
    if (co === prev) run++;
    else {
      run = 1;
      prev = co;
    }
    maxRun = Math.max(maxRun, run);
  }
  return maxRun;
}
