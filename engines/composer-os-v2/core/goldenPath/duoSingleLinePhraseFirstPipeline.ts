/**
 * Guitar–Bass Duo (Single-Line): phrase-first pipeline only.
 * PhrasePlan is created before any note material exists; candidates are scored and merged — no legacy duo generators.
 */

import type { CompositionContext } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { chordTonesForChordSymbolWithContext } from '../harmony/harmonyChordTonePolicy';
import type { ChordToneSet } from './guitarBassDuoHarmony';
import { clampPitch, seededUnit } from './guitarBassDuoHarmony';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { createMeasure, createNote, createRest, addEvent } from '../score-model/scoreEventBuilder';
import { guitarBassDuoPreset } from '../../presets/guitarBassDuoPreset';
import { GUITAR_BASS_DUO_BASS_PART_NAME } from '../instrument-profiles/guitarBassDuoExportNames';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import type { MotifTrackerState } from '../motif/motifTypes';

const MAX_CANDIDATES_PER_PHRASE = 6;
const BEATS = 4;
const STAGE18_SHIFT = 0.5;
const EPS = 1e-6;

/** Meta for Stage 18: 1-based total bars in the built segment (whole score pass). */
export interface PhraseStage18Meta {
  totalBars: number;
}

export type PhraseRole = 'statement' | 'response';
export type PhraseContour = 'up' | 'down' | 'arch';
export type DensitySeg = 'sparse' | 'medium' | 'dense' | 'resolve';
export type RoleCell = 'statement' | 'answer' | 'support';

export interface PhrasePlan {
  role: PhraseRole;
  contour: PhraseContour;
  /** 1-based bar index within the 4-bar phrase where cadence weight applies */
  cadenceBar: 1 | 2 | 3 | 4;
  densityCurve: [DensitySeg, DensitySeg, DensitySeg, DensitySeg];
  guitarRange: [number, number];
  bassRange: [number, number];
  roleMatrix: { guitar: RoleCell; bass: RoleCell };
}

interface PhrasePair {
  guitar: MeasureModel[];
  bass: MeasureModel[];
}

const DUO_SINGLE_TARGETS = new Set(['clean_electric_guitar', 'acoustic_upright_bass']);

function overlaps(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  const aEnd = aStart + aDur;
  const bEnd = bStart + bDur;
  return aStart < bEnd && bStart < aEnd;
}

function collapseOverlappingNotesInMeasure(m: MeasureModel, voice: number): void {
  let guard = 0;
  while (guard++ < 64) {
    const indexed = m.events
      .map((e, i) => ({ e, i }))
      .filter((x) => x.e.kind === 'note' && ((x.e as NoteEvent).voice ?? 1) === voice);
    let drop: number | undefined;
    outer: for (let i = 0; i < indexed.length; i++) {
      const a = indexed[i].e as NoteEvent;
      for (let j = i + 1; j < indexed.length; j++) {
        const b = indexed[j].e as NoteEvent;
        if (overlaps(a.startBeat, a.duration, b.startBeat, b.duration)) {
          drop = a.startBeat <= b.startBeat ? indexed[j].i : indexed[i].i;
          break outer;
        }
      }
    }
    if (drop === undefined) return;
    m.events = m.events.filter((_, k) => k !== drop);
  }
}

/** Single-line duo: voice-1 only + collapse overlaps (copied here so duo score stays in allowed file scope). */
export function applyPhraseFirstSingleLineMonophony(score: ScoreModel): void {
  for (const part of score.parts) {
    if (!DUO_SINGLE_TARGETS.has(part.instrumentIdentity)) continue;
    for (const m of part.measures) {
      m.events = m.events.filter((e) => {
        if (e.kind !== 'note') return true;
        const n = e as NoteEvent;
        return (n.voice ?? 1) === 1;
      });
      collapseOverlappingNotesInMeasure(m, 1);
    }
  }
}

function rehearsalForBar(bar: number, context: CompositionContext): string | undefined {
  for (const m of context.rehearsalMarkPlan.marks) {
    if (m.bar === bar) return m.label;
  }
  return undefined;
}

function registerZones(context: CompositionContext): { guitar: [number, number]; bass: [number, number] } {
  const g =
    context.register.byInstrument?.['clean_electric_guitar'] ??
    context.register.melody ??
    ([55, 79] as [number, number]);
  const b =
    context.register.byInstrument?.['acoustic_upright_bass'] ??
    context.register.bass ??
    ([36, 55] as [number, number]);
  return { guitar: g, bass: b };
}

function buildTwoPhrasePlans(
  seed: number,
  segmentIndex: number,
  zones: { guitar: [number, number]; bass: [number, number] }
): [PhrasePlan, PhrasePlan] {
  const s = seed + segmentIndex * 9973;
  const u = (k: number) => seededUnit(s, k, 701);
  const gz = zones.guitar;
  const bz = zones.bass;
  const p0: PhrasePlan = {
    role: 'statement',
    contour: u(1) < 0.45 ? 'up' : u(2) < 0.5 ? 'arch' : 'down',
    cadenceBar: 4,
    densityCurve: ['sparse', 'medium', 'dense', 'resolve'],
    guitarRange: [Math.max(52, gz[0]), Math.min(79, gz[1])],
    bassRange: [Math.max(28, bz[0]), Math.min(55, bz[1])],
    roleMatrix: { guitar: 'statement', bass: 'support' },
  };
  const p1: PhrasePlan = {
    role: 'response',
    contour: p0.contour === 'up' ? 'arch' : p0.contour === 'down' ? 'up' : 'down',
    cadenceBar: 4,
    densityCurve: ['sparse', 'dense', 'medium', 'resolve'],
    guitarRange: [Math.max(52, gz[0] - 1), Math.min(79, gz[1] - 1)],
    bassRange: [Math.max(28, bz[0]), Math.min(55, Math.min(54, bz[1] + 2))],
    roleMatrix: { guitar: 'answer', bass: 'statement' },
  };
  return [p0, p1];
}

function liftTone(pitch: number, low: number, high: number): number {
  let p = pitch;
  while (p < low) p += 12;
  while (p > high) p -= 12;
  return clampPitch(p, low, high);
}

function tonesForBar(bar: number, context: CompositionContext): ChordToneSet {
  const chord = getChordForBar(bar, context);
  return chordTonesForChordSymbolWithContext(chord, context);
}

function emitGuitarBar(
  m: MeasureModel,
  plan: PhrasePlan,
  barInPhrase: number,
  tones: ChordToneSet,
  candIdx: number,
  seed: number
): void {
  const d = plan.densityCurve[Math.min(barInPhrase, 3)];
  const [lo, hi] = plan.guitarRange;
  /** Build one octave above final (written) range; pipeline applies −12 at end per product rule. */
  const gLo = lo + 12;
  const gHi = hi + 12;
  const pool = [
    liftTone(tones.root, gLo, gHi),
    liftTone(tones.third, gLo, gHi),
    liftTone(tones.fifth, gLo, gHi),
    liftTone(tones.seventh, gLo, gHi),
  ];
  const pick = (i: number) => pool[(candIdx * 3 + barInPhrase * 2 + i + seed) % pool.length];

  if (d === 'sparse') {
    addEvent(m, createNote(pick(0), 0, 1.5));
    addEvent(m, createRest(1.5, 0.5));
    addEvent(m, createNote(pick(1), 2, 2));
  } else if (d === 'medium') {
    addEvent(m, createNote(pick(0), 0, 1));
    addEvent(m, createNote(pick(1), 1, 1));
    addEvent(m, createNote(pick(2), 2, 1));
    addEvent(m, createRest(3, 1));
  } else if (d === 'dense') {
    for (let b = 0; b < 4; b++) {
      addEvent(m, createNote(pick(b), b, 1));
    }
  } else {
    addEvent(m, createNote(pick(0), 0, 2.5));
    addEvent(m, createRest(2.5, 0.5));
    addEvent(m, createNote(pick(3), 3, 1));
  }
}

function emitBassBar(
  m: MeasureModel,
  plan: PhrasePlan,
  barInPhrase: number,
  tones: ChordToneSet,
  candIdx: number,
  seed: number
): void {
  const idx = Math.min(barInPhrase, 3);
  const [lo, hi] = plan.bassRange;
  const root = clampPitch(tones.root, lo, hi);
  const third = clampPitch(tones.third, lo, hi);
  const fifth = clampPitch(tones.fifth, lo, hi);
  const statementBass = plan.roleMatrix.bass === 'statement';
  if (statementBass || idx % 2 === 0) {
    addEvent(m, createNote(root, 0, 1));
    addEvent(m, createNote(fifth, 1, 1));
    addEvent(m, createNote(third, 2, 1));
    addEvent(m, createNote(root, 3, 1));
  } else {
    const off = seededUnit(seed + candIdx, idx, 88) * 0.5;
    addEvent(m, createRest(0, off));
    addEvent(m, createNote(root, off, 2));
    addEvent(m, createNote(fifth, off + 2, 2 - off));
  }
}

function emitPhrasePair(
  plan: PhrasePlan,
  context: CompositionContext,
  startBar: number,
  phraseBars: number,
  candIdx: number
): PhrasePair {
  const g: MeasureModel[] = [];
  const b: MeasureModel[] = [];
  for (let i = 0; i < phraseBars; i++) {
    const bar = startBar + i;
    const gm = createMeasure(bar, getChordForBar(bar, context), rehearsalForBar(bar, context));
    const bm = createMeasure(bar, getChordForBar(bar, context), rehearsalForBar(bar, context));
    const t = tonesForBar(bar, context);
    emitGuitarBar(gm, plan, i, t, candIdx, context.seed);
    emitBassBar(bm, plan, i, t, candIdx, context.seed);
    g.push(gm);
    b.push(bm);
  }
  return { guitar: g, bass: b };
}

function meanGuitarPitch(measures: MeasureModel[]): number[] {
  return measures.map((m) => {
    const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
    if (notes.length === 0) return 60;
    const s = notes.reduce((a, n) => a + n.pitch, 0);
    return s / notes.length;
  });
}

function contourScore(means: number[], contour: PhraseContour): number {
  if (means.length < 2) return 0;
  if (contour === 'up') {
    let ok = 0;
    for (let i = 1; i < means.length; i++) if (means[i] >= means[i - 1] - 0.01) ok++;
    return ok >= means.length - 1 ? 1 : 0;
  }
  if (contour === 'down') {
    let ok = 0;
    for (let i = 1; i < means.length; i++) if (means[i] <= means[i - 1] + 0.01) ok++;
    return ok >= means.length - 1 ? 1 : 0;
  }
  const mid = Math.floor(means.length / 2);
  const left = means.slice(0, mid + 1);
  const right = means.slice(mid);
  const up = left.length >= 2 && left[left.length - 1]! > left[0]!;
  const down = right.length >= 2 && right[right.length - 1]! < right[0]!;
  return up && down ? 1 : 0;
}

function cadenceScore(pair: PhrasePair, context: CompositionContext, startBar: number, phraseBars: number): number {
  const lastBar = startBar + phraseBars - 1;
  const chord = getChordForBar(lastBar, context);
  const t = chordTonesForChordSymbolWithContext(chord, context);
  const gm = pair.guitar[pair.guitar.length - 1];
  const bm = pair.bass[pair.bass.length - 1];
  const gNotes = gm?.events.filter((e) => e.kind === 'note') as NoteEvent[] | undefined;
  const bNotes = bm?.events.filter((e) => e.kind === 'note') as NoteEvent[] | undefined;
  if (!gNotes?.length || !bNotes?.length) return 0;
  const gLast = gNotes.reduce((a, n) => (n.startBeat + n.duration >= a.startBeat + a.duration ? n : a));
  const bLast = bNotes.reduce((a, n) => (n.startBeat + n.duration >= a.startBeat + a.duration ? n : a));
  const gPc = gLast.pitch % 12;
  const goodG = [t.root, t.third, t.fifth, t.seventh].some((p) => p % 12 === gPc);
  const bPc = bLast.pitch % 12;
  const goodB = bPc === t.root % 12 || bPc === t.fifth % 12;
  return goodG && goodB ? 1 : 0;
}

function independenceScore(pair: PhrasePair): number {
  let contrary = 0;
  for (let i = 0; i < pair.guitar.length; i++) {
    const gn = pair.guitar[i].events.filter((e) => e.kind === 'note') as NoteEvent[];
    const bn = pair.bass[i].events.filter((e) => e.kind === 'note') as NoteEvent[];
    if (gn.length < 2 || bn.length < 2) continue;
    const gDir = Math.sign(gn[gn.length - 1].pitch - gn[0].pitch);
    const bDir = Math.sign(bn[bn.length - 1].pitch - bn[0].pitch);
    if (gDir !== 0 && bDir !== 0 && gDir !== bDir) contrary++;
  }
  return contrary >= 1 ? 1 : 0;
}

function identityVsPhrase1(gPhrase1: MeasureModel[] | undefined, gPhrase2: MeasureModel[]): number {
  if (!gPhrase1 || gPhrase1.length < 2 || gPhrase2.length < 2) return 0.5;
  const a = meanGuitarPitch(gPhrase1.slice(0, 2));
  const b = meanGuitarPitch(gPhrase2.slice(0, 2));
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) d += Math.abs(a[i]! - b[i]!);
  const norm = 1 - Math.min(1, d / 24);
  return norm;
}

function scoreCandidate(
  pair: PhrasePair,
  plan: PhrasePlan,
  context: CompositionContext,
  startBar: number,
  phraseBars: number,
  phrase1Guitar: MeasureModel[] | undefined
): number {
  const means = meanGuitarPitch(pair.guitar);
  const cCad = cadenceScore(pair, context, startBar, phraseBars);
  const cContour = contourScore(means, plan.contour);
  const cInd = independenceScore(pair);
  const cId =
    plan.role === 'response' ? identityVsPhrase1(phrase1Guitar, pair.guitar) : 0.5;
  return cCad + cContour + cInd + cId;
}

function transposeGuitarPart(part: PartModel, semitones: number): void {
  for (const m of part.measures) {
    for (const e of m.events) {
      if (e.kind === 'note') (e as NoteEvent).pitch += semitones;
    }
  }
}

function voice1Notes(m: MeasureModel): NoteEvent[] {
  return m.events.filter((e): e is NoteEvent => e.kind === 'note' && (e.voice ?? 1) === 1);
}

function canShiftOnsetInMeasure(m: MeasureModel, n: NoteEvent, delta: number): boolean {
  const ns = n.startBeat + delta;
  if (ns < -EPS || ns + n.duration > BEATS + EPS) return false;
  for (const o of voice1Notes(m)) {
    if (o === n) continue;
    if (ns < o.startBeat + o.duration - EPS && o.startBeat < ns + n.duration - EPS) return false;
  }
  return true;
}

function shiftNote(m: MeasureModel, n: NoteEvent, delta: number): boolean {
  if (!canShiftOnsetInMeasure(m, n, delta)) return false;
  n.startBeat += delta;
  return true;
}

function minOnsetInPhrase(
  measuresG: MeasureModel[],
  measuresB: MeasureModel[],
  barStart: number,
  barEnd: number
): { gMin: number; bMin: number; gBar: number | undefined; bBar: number | undefined } {
  let gMin = Infinity;
  let bMin = Infinity;
  let gBar: number | undefined;
  let bBar: number | undefined;
  for (let b = barStart; b <= barEnd; b++) {
    const gm = measuresG.find((x) => x.index === b);
    const bm = measuresB.find((x) => x.index === b);
    if (gm) for (const n of voice1Notes(gm)) if (n.startBeat < gMin - EPS) {
      gMin = n.startBeat;
      gBar = b;
    }
    if (bm) for (const n of voice1Notes(bm)) if (n.startBeat < bMin - EPS) {
      bMin = n.startBeat;
      bBar = b;
    }
  }
  return { gMin, bMin, gBar, bBar };
}

function applyRule3Phrase(
  measuresG: MeasureModel[],
  measuresB: MeasureModel[],
  barStart: number,
  barEnd: number,
  guitarLeads: boolean
): void {
  let guard = 0;
  while (guard++ < 64) {
    const { gMin, bMin, gBar, bBar } = minOnsetInPhrase(measuresG, measuresB, barStart, barEnd);
    const gm = gBar !== undefined ? measuresG.find((x) => x.index === gBar) : undefined;
    const bm = bBar !== undefined ? measuresB.find((x) => x.index === bBar) : undefined;
    const gNotes = gm ? voice1Notes(gm).filter((n) => Math.abs(n.startBeat - gMin) < EPS) : [];
    const bNotes = bm ? voice1Notes(bm).filter((n) => Math.abs(n.startBeat - bMin) < EPS) : [];

    if (guitarLeads) {
      if (gNotes.length === 0 && bNotes.length === 0) return;
      if (gNotes.length === 0 && bNotes.length > 0 && bm && bNotes[0]) {
        if (!shiftNote(bm, bNotes[0], STAGE18_SHIFT)) return;
        continue;
      }
      if (gMin === Infinity) return;
      if (bMin === Infinity) return;
      if (bMin < gMin - EPS && bm && bNotes[0]) {
        if (!shiftNote(bm, bNotes[0], STAGE18_SHIFT)) return;
        continue;
      }
      if (Math.abs(gMin - bMin) < EPS && gm && bm && gNotes[0] && bNotes[0]) {
        if (shiftNote(bm, bNotes[0], STAGE18_SHIFT)) continue;
        if (shiftNote(gm, gNotes[0], STAGE18_SHIFT)) continue;
        return;
      }
      if (bMin < gMin + STAGE18_SHIFT - EPS && bm && bNotes[0]) {
        if (!shiftNote(bm, bNotes[0], STAGE18_SHIFT)) return;
        continue;
      }
      return;
    }
    if (gNotes.length === 0 && bNotes.length === 0) return;
    if (bNotes.length === 0 && gNotes.length > 0 && gm && gNotes[0]) {
      if (!shiftNote(gm, gNotes[0], STAGE18_SHIFT)) return;
      continue;
    }
    if (bMin === Infinity) return;
    if (gMin === Infinity) return;
    if (gMin < bMin - EPS && gm && gNotes[0]) {
      if (!shiftNote(gm, gNotes[0], STAGE18_SHIFT)) return;
      continue;
    }
    if (Math.abs(gMin - bMin) < EPS && gm && bm && gNotes[0] && bNotes[0]) {
      if (shiftNote(gm, gNotes[0], STAGE18_SHIFT)) continue;
      if (shiftNote(bm, bNotes[0], STAGE18_SHIFT)) continue;
      return;
    }
    if (gMin < bMin + STAGE18_SHIFT - EPS && gm && gNotes[0]) {
      if (!shiftNote(gm, gNotes[0], STAGE18_SHIFT)) return;
      continue;
    }
    return;
  }
}

/** Resolve every shared onset between voices: +0.5 on bass first, else guitar. */
function applySimultaneousStagger(measuresG: MeasureModel[], measuresB: MeasureModel[], barLo: number, barHi: number): void {
  let guard = 0;
  while (guard++ < 256) {
    let moved = false;
    for (let b = barLo; b <= barHi; b++) {
      const gm = measuresG.find((x) => x.index === b);
      const bm = measuresB.find((x) => x.index === b);
      if (!gm || !bm) continue;
      const gn = voice1Notes(gm);
      const bn = voice1Notes(bm);
      for (const g of gn) {
        const hit = bn.find((x) => Math.abs(x.startBeat - g.startBeat) < EPS);
        if (!hit) continue;
        if (shiftNote(bm, hit, STAGE18_SHIFT)) {
          moved = true;
          break;
        }
        if (shiftNote(gm, g, STAGE18_SHIFT)) {
          moved = true;
          break;
        }
      }
      if (moved) break;
    }
    if (!moved) return;
  }
}

function phraseHasOffbeatOnset(measures: MeasureModel[], barLo: number, barHi: number): boolean {
  for (let b = barLo; b <= barHi; b++) {
    const m = measures.find((x) => x.index === b);
    if (!m) continue;
    for (const n of voice1Notes(m)) {
      const frac = n.startBeat % 1;
      if (frac > EPS && frac < 1 - EPS) return true;
    }
  }
  return false;
}

function applyRule4Syncopation(
  measuresG: MeasureModel[],
  measuresB: MeasureModel[],
  barLo: number,
  barHi: number
): void {
  if (phraseHasOffbeatOnset(measuresG, barLo, barHi) || phraseHasOffbeatOnset(measuresB, barLo, barHi)) return;
  for (let b = barLo; b <= barHi; b++) {
    const gm = measuresG.find((x) => x.index === b);
    if (gm) for (const n of voice1Notes(gm)) if (shiftNote(gm, n, STAGE18_SHIFT)) return;
    const bm = measuresB.find((x) => x.index === b);
    if (bm) for (const n of voice1Notes(bm)) if (shiftNote(bm, n, STAGE18_SHIFT)) return;
  }
}

function onsetPatternKey(m: MeasureModel): string {
  return voice1Notes(m)
    .map((n) => n.startBeat.toFixed(2))
    .sort()
    .join(',');
}

function measureHasRestOrGap(m: MeasureModel): boolean {
  let noteDur = 0;
  let restDur = 0;
  for (const e of m.events) {
    if (e.kind === 'note') noteDur += (e as NoteEvent).duration;
    if (e.kind === 'rest') restDur += (e as RestEvent).duration;
  }
  return restDur > EPS || noteDur < BEATS - EPS;
}

function noteToRest(m: MeasureModel, n: NoteEvent): void {
  const rest = createRest(n.startBeat, n.duration, n.voice ?? 1);
  m.events = m.events.filter((e) => e !== n);
  m.events.push(rest);
}

/** At least one bar of rest or gap in guitar OR bass; prefer converting guitar notes first. */
function ensureWallRestPerBar(
  measuresG: MeasureModel[],
  measuresB: MeasureModel[],
  barLo: number,
  barHi: number
): void {
  for (let bar = barLo; bar <= barHi; bar++) {
    const gm = measuresG.find((x) => x.index === bar);
    const bm = measuresB.find((x) => x.index === bar);
    if (!gm || !bm) continue;
    if (measureHasRestOrGap(gm) || measureHasRestOrGap(bm)) continue;
    const gn = voice1Notes(gm).sort((a, b) => b.startBeat - a.startBeat);
    if (gn[0]) {
      noteToRest(gm, gn[0]);
      continue;
    }
    const bn = voice1Notes(bm).sort((a, b) => b.startBeat - a.startBeat);
    if (bn[0]) noteToRest(bm, bn[0]);
  }
}

/** Phrase A: fewer bass onsets — drop one note per bar when bass is busy (≥2 notes). */
function reducePhraseABassDensity(measuresB: MeasureModel[], barLo: number, barHi: number): void {
  for (let bar = barLo; bar <= barHi; bar++) {
    const m = measuresB.find((x) => x.index === bar);
    if (!m) continue;
    const notes = voice1Notes(m).sort((a, b) => a.startBeat - b.startBeat);
    if (notes.length < 2) continue;
    const pick = notes[1] ?? notes[0];
    if (pick) noteToRest(m, pick);
  }
}

/** Phrase B: guitar quieter — convert 1–2 notes to rests across the phrase. */
function phraseBGuitarExtraRests(measuresG: MeasureModel[], barLo: number, barHi: number): void {
  let converted = 0;
  const target = 2;
  for (let bar = barLo; bar <= barHi && converted < target; bar++) {
    const m = measuresG.find((x) => x.index === bar);
    if (!m) continue;
    const notes = voice1Notes(m).sort((a, b) => a.startBeat - b.startBeat);
    if (notes.length === 0) continue;
    const pick = notes.length >= 2 ? notes[1]! : notes[0]!;
    noteToRest(m, pick);
    converted++;
  }
  if (converted >= target) return;
  for (let bar = barHi; bar >= barLo && converted < target; bar--) {
    const m = measuresG.find((x) => x.index === bar);
    if (!m) continue;
    const notes = voice1Notes(m).sort((a, b) => a.startBeat - b.startBeat);
    if (notes.length === 0) continue;
    const pick = notes[notes.length - 1]!;
    noteToRest(m, pick);
    converted++;
  }
}

function applyRule5BassVariation(measuresB: MeasureModel[], segmentBar1: number): void {
  const keys: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bar = segmentBar1 + i;
    const m = measuresB.find((x) => x.index === bar);
    keys.push(m ? onsetPatternKey(m) : '');
  }
  for (let i = 0; i <= 5; i++) {
    const k = keys[i];
    if (!k || k !== keys[i + 1] || k !== keys[i + 2]) continue;
    const pool = [segmentBar1 + 2, segmentBar1 + 3, segmentBar1 + 6, segmentBar1 + 7];
    for (const bar of pool) {
      const m = measuresB.find((x) => x.index === bar);
      const n = m ? voice1Notes(m)[0] : undefined;
      if (m && n && shiftNote(m, n, STAGE18_SHIFT)) return;
    }
    return;
  }
}

/**
 * Stage 18: phrase realisation (post-process only). Onset shifts and note→rest (same duration) only.
 */
export function applyStage18Realisation(
  notesGuitar: MeasureModel[],
  notesBass: MeasureModel[],
  phraseMeta: PhraseStage18Meta
): { guitar: MeasureModel[]; bass: MeasureModel[] } {
  const tb = phraseMeta.totalBars;
  let segStart = 1;
  while (segStart <= tb) {
    const remaining = tb - segStart + 1;
    if (remaining >= 8) {
      applyRule3Phrase(notesGuitar, notesBass, segStart, segStart + 3, true);
      applyRule3Phrase(notesGuitar, notesBass, segStart + 4, segStart + 7, false);
      reducePhraseABassDensity(notesBass, segStart, segStart + 3);
      phraseBGuitarExtraRests(notesGuitar, segStart + 4, segStart + 7);
      ensureWallRestPerBar(notesGuitar, notesBass, segStart, segStart + 7);
      applyRule4Syncopation(notesGuitar, notesBass, segStart, segStart + 3);
      applyRule4Syncopation(notesGuitar, notesBass, segStart + 4, segStart + 7);
      applyRule5BassVariation(notesBass, segStart);
      applySimultaneousStagger(notesGuitar, notesBass, segStart, segStart + 7);
      segStart += 8;
    } else if (remaining >= 4) {
      applyRule3Phrase(notesGuitar, notesBass, segStart, segStart + 3, true);
      reducePhraseABassDensity(notesBass, segStart, segStart + 3);
      ensureWallRestPerBar(notesGuitar, notesBass, segStart, segStart + 3);
      applyRule4Syncopation(notesGuitar, notesBass, segStart, segStart + 3);
      applyRule5BassVariation(notesBass, segStart);
      applySimultaneousStagger(notesGuitar, notesBass, segStart, segStart + 3);
      segStart += 4;
    } else {
      applyRule3Phrase(notesGuitar, notesBass, segStart, tb, true);
      ensureWallRestPerBar(notesGuitar, notesBass, segStart, tb);
      applyRule4Syncopation(notesGuitar, notesBass, segStart, tb);
      applySimultaneousStagger(notesGuitar, notesBass, segStart, tb);
      segStart = tb + 1;
    }
  }
  return { guitar: notesGuitar, bass: notesBass };
}

function emptyMotifState(): MotifTrackerState {
  return { baseMotifs: [], placements: [] };
}

export interface PhraseFirstDuoBuild {
  guitarPart: PartModel;
  bassPart: PartModel;
  motifState: MotifTrackerState;
}

/**
 * Phrase-first single-line duo: plans first, then candidates, then deterministic score; guitar transposed −12 after build.
 */
export function buildPhraseFirstDuoScore(context: CompositionContext): PhraseFirstDuoBuild {
  const tb = context.form.totalBars;
  const seed = context.seed;
  const zones = registerZones(context);
  const guitarProfile =
    guitarBassDuoPreset.instrumentProfiles.find((p) => p.instrumentIdentity === 'clean_electric_guitar') ??
    CLEAN_ELECTRIC_GUITAR;
  const bassProfile =
    guitarBassDuoPreset.instrumentProfiles.find((p) => p.instrumentIdentity === 'acoustic_upright_bass') ??
    ACOUSTIC_UPRIGHT_BASS;

  const guitarMeasures: MeasureModel[] = [];
  const bassMeasures: MeasureModel[] = [];

  let seg = 0;
  let barPtr = 1;
  while (barPtr <= tb) {
    const remaining = tb - barPtr + 1;
    const [p0, p1] = buildTwoPhrasePlans(seed, seg, zones);

    if (remaining >= 8) {
      let best0: PhrasePair | undefined;
      let bestS0 = -1;
      for (let c = 0; c < MAX_CANDIDATES_PER_PHRASE; c++) {
        const pair = emitPhrasePair(p0, context, barPtr, 4, c);
        const sc = scoreCandidate(pair, p0, context, barPtr, 4, undefined);
        if (sc > bestS0) {
          bestS0 = sc;
          best0 = pair;
        }
      }
      if (!best0) throw new Error('phrase-first: no candidate (phrase A)');
      guitarMeasures.push(...best0.guitar);
      bassMeasures.push(...best0.bass);

      let best1: PhrasePair | undefined;
      let bestS1 = -1;
      const g1ref = best0.guitar;
      for (let c = 0; c < MAX_CANDIDATES_PER_PHRASE; c++) {
        const pair = emitPhrasePair(p1, context, barPtr + 4, 4, c);
        const sc = scoreCandidate(pair, p1, context, barPtr + 4, 4, g1ref);
        if (sc > bestS1) {
          bestS1 = sc;
          best1 = pair;
        }
      }
      if (!best1) throw new Error('phrase-first: no candidate (phrase B)');
      guitarMeasures.push(...best1.guitar);
      bassMeasures.push(...best1.bass);
      barPtr += 8;
    } else if (remaining >= 4) {
      const plan = p0;
      let best: PhrasePair | undefined;
      let bestS = -1;
      for (let c = 0; c < MAX_CANDIDATES_PER_PHRASE; c++) {
        const pair = emitPhrasePair(plan, context, barPtr, 4, c);
        const sc = scoreCandidate(pair, plan, context, barPtr, 4, undefined);
        if (sc > bestS) {
          bestS = sc;
          best = pair;
        }
      }
      if (!best) throw new Error('phrase-first: no candidate (partial 4)');
      guitarMeasures.push(...best.guitar);
      bassMeasures.push(...best.bass);
      barPtr += 4;
    } else {
      const plan = p0;
      const n = remaining;
      let best: PhrasePair | undefined;
      let bestS = -1;
      for (let c = 0; c < MAX_CANDIDATES_PER_PHRASE; c++) {
        const pair = emitPhrasePair(plan, context, barPtr, n, c);
        const sc = scoreCandidate(pair, plan, context, barPtr, n, undefined);
        if (sc > bestS) {
          bestS = sc;
          best = pair;
        }
      }
      if (!best) throw new Error('phrase-first: no candidate (tail)');
      guitarMeasures.push(...best.guitar);
      bassMeasures.push(...best.bass);
      barPtr += n;
    }
    seg++;
  }

  const guitarPart: PartModel = {
    id: 'guitar',
    name: 'Clean Electric Guitar',
    instrumentIdentity: guitarProfile.instrumentIdentity,
    midiProgram: guitarProfile.midiProgram,
    clef: 'treble',
    measures: guitarMeasures,
  };
  const bassPart: PartModel = {
    id: 'bass',
    name: GUITAR_BASS_DUO_BASS_PART_NAME,
    instrumentIdentity: bassProfile.instrumentIdentity,
    midiProgram: bassProfile.midiProgram,
    clef: 'bass',
    measures: bassMeasures,
  };

  transposeGuitarPart(guitarPart, -12);

  applyStage18Realisation(guitarMeasures, bassMeasures, { totalBars: tb });

  return { guitarPart, bassPart, motifState: emptyMotifState() };
}
