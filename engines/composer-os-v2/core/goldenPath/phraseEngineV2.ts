/**
 * Phrase engine V2 — motif pool extraction hook (golden path).
 */

import {
  applyMotifMutation,
  extractMotifCell,
  scoreMotifSimilarity as scoreMutationMotifSimilarity,
  selectMotifTransform,
  type MotifNoteLite,
  type MotifTransform,
  type MutationMotifCell,
} from '../song-mode/motifMutationEngine';
import type {
  ScoreModel,
  PartModel,
  NoteEvent,
  ScoreEvent,
  ChordEvent,
  MeasureModel,
} from '../score-model/scoreModelTypes';
import type { SongModeHookIdentity } from '../motif/motifEngineTypes';
import type { CompositionContext } from '../compositionContext';
import { getChordForBar } from '../harmony/harmonyResolution';
import { lockedHarmonyChordSymbolsEquivalent } from '../harmony/chordProgressionParser';
import { chordTonesForChordSymbol, noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import { vaultMotifPitchMutationSkipForV1Note, v1SortedNoteIndexForEvent } from './duoVaultMotifContourSnap';

/** Short melodic/rhythmic fragment candidate. */
export type MotifContour = 'up' | 'down' | 'arch' | 'flat';

export interface MotifCell {
  pitches: number[];
  durations: number[];
  contour: MotifContour;
  /** 0–1; mechanical extraction uses fixed mapping (no salience analysis yet). */
  weight: number;
}

export interface MotifPool {
  cells: MotifCell[];
  generationId: string;
}

/**
 * Minimal context for motif-pool generation (extend when wired to `runGoldenPath`).
 */
export interface GoldenPathContext {
  /** Stable id for correlating pools with a run. */
  generationId?: string;
  seed?: number;
  /** Primary extracted motif cell for mutation diagnostics / downstream receipts. */
  primaryMotifCell?: MutationMotifCell;
}

/** Phrase length in bars (aligned with Song Mode phrase segmentation). */
export const PHRASE_ENGINE_V2_PHRASE_BARS = 4;

/** Number of leading phrases to slice for the motif pool. */
export const PHRASE_ENGINE_V2_PHRASE_COUNT = 4;

/** Development / second-half region for rhythmic recall + pitch nudge (32-bar Song Mode). */
export const PHRASE_ENGINE_V2_DEVELOPMENT_LO = 17;
export const PHRASE_ENGINE_V2_DEVELOPMENT_HI = 32;

const DURATION_MATCH_EPS = 1e-3;

function isNoteEvent(ev: ScoreEvent): ev is NoteEvent {
  return ev.kind === 'note';
}

function findGuitarPart(score: ScoreModel): PartModel | undefined {
  return score.parts.find((p) => p.id === 'guitar');
}

function classifyContourTwo(p0: number, p1: number): MotifContour {
  const d = p1 - p0;
  if (d > 1) return 'up';
  if (d < -1) return 'down';
  return 'flat';
}

interface TaggedNote {
  bar: number;
  n: NoteEvent;
}

function sortedNotesInBarRange(part: PartModel, startBar: number, endBar: number): TaggedNote[] {
  const out: TaggedNote[] = [];
  for (const m of part.measures) {
    if (m.index < startBar || m.index > endBar) continue;
    for (const ev of m.events) {
      if (isNoteEvent(ev)) out.push({ bar: m.index, n: ev });
    }
  }
  out.sort((a, b) => (a.bar !== b.bar ? a.bar - b.bar : a.n.startBeat - b.n.startBeat));
  return out;
}

function mechanicalCellFromFirstTwoNotes(tagged: TaggedNote[]): MotifCell {
  if (tagged.length === 0) {
    return { pitches: [], durations: [], contour: 'flat', weight: 0 };
  }
  if (tagged.length === 1) {
    const n = tagged[0]!.n;
    return {
      pitches: [n.pitch],
      durations: [n.duration],
      contour: 'flat',
      weight: 1,
    };
  }
  const a = tagged[0]!.n;
  const b = tagged[1]!.n;
  const pitches = [a.pitch, b.pitch];
  const durations = [a.duration, b.duration];
  return {
    pitches,
    durations,
    contour: classifyContourTwo(pitches[0]!, pitches[1]!),
    weight: 1,
  };
}

function poolGenerationId(context: GoldenPathContext): string {
  if (context.generationId && context.generationId.length > 0) return context.generationId;
  return `phrase-engine-v2:${context.seed ?? 0}`;
}

function cloneScoreEvent(ev: ScoreEvent): ScoreEvent {
  if (ev.kind === 'note') {
    const n = ev as NoteEvent;
    return {
      ...n,
      ...(n.pitches && n.pitches.length > 0 ? { pitches: [...n.pitches] } : {}),
    };
  }
  if (ev.kind === 'chord') {
    const c = ev as ChordEvent;
    return { ...c, pitches: [...c.pitches] };
  }
  return { ...ev };
}

function clonePartModel(part: PartModel): PartModel {
  return {
    ...part,
    measures: part.measures.map(
      (m): MeasureModel => ({
        ...m,
        events: m.events.map(cloneScoreEvent),
      })
    ),
  };
}

interface NoteRef {
  mi: number;
  ei: number;
}

function collectSortedNoteRefs(part: PartModel, startBar: number, endBar: number, voice = 0): NoteRef[] {
  const refs: NoteRef[] = [];
  for (let mi = 0; mi < part.measures.length; mi++) {
    const m = part.measures[mi]!;
    if (m.index < startBar || m.index > endBar) continue;
    for (let ei = 0; ei < m.events.length; ei++) {
      const ev = m.events[ei]!;
      if (!isNoteEvent(ev)) continue;
      if (voice > 0 && (ev.voice ?? 1) !== voice) continue;
      refs.push({ mi, ei });
    }
  }
  refs.sort((a, b) => {
    const ma = part.measures[a.mi]!;
    const mb = part.measures[b.mi]!;
    if (ma.index !== mb.index) return ma.index - mb.index;
    const na = part.measures[a.mi]!.events[a.ei] as NoteEvent;
    const nb = part.measures[b.mi]!.events[b.ei] as NoteEvent;
    return na.startBeat - nb.startBeat;
  });
  return refs;
}

function durationsMatchFigure(notes: NoteEvent[], pattern: number[]): boolean {
  if (notes.length !== pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (Math.abs(notes[i]!.duration - pattern[i]!) > DURATION_MATCH_EPS) return false;
  }
  return true;
}

/** Move `actual` toward `target` by at most one semitone (no forced equality). */
function stepTowardPitch(actual: number, target: number): number {
  if (actual === target) return actual;
  if (actual < target) return actual + 1;
  return actual - 1;
}

function nearestMidiCarryingPc(currentMidi: number, pc: number): number {
  const curPc = ((currentMidi % 12) + 12) % 12;
  let delta = (((pc - curPc + 12) % 12) + 12) % 12;
  if (delta > 6) delta -= 12;
  return currentMidi + delta;
}

function chordTonePcs(symbol: string): number[] {
  const t = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  return [...new Set([t.root, t.third, t.fifth, t.seventh].map((p) => ((p % 12) + 12) % 12))];
}

function slashPcOfChordSymbol(symbol: string): number | undefined {
  const m = symbol.trim().match(/\/([A-Ga-g][#b]?)$/);
  if (!m) return undefined;
  return noteNameToPitchClass(m[1]!);
}

/** Destination chord tones + slash bass PC (locked-harmony write / diagnostic parity). */
function allowedDestinationPcs(symbol: string): number[] {
  const pcs = chordTonePcs(symbol);
  const slash = slashPcOfChordSymbol(symbol);
  if (slash !== undefined && !pcs.includes(slash)) pcs.push(slash);
  return pcs;
}

function nearestAllowedPc(pc: number, allowed: readonly number[]): number {
  const p = ((pc % 12) + 12) % 12;
  if (allowed.length === 0) return p;
  let best = ((allowed[0]! % 12) + 12) % 12;
  let bestD = 99;
  for (const raw of allowed) {
    const a = ((raw % 12) + 12) % 12;
    const d = Math.min(Math.abs(p - a), 12 - Math.abs(p - a));
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

/**
 * Write-time harmonic gate: keep chord tones + legitimate short approach/passing;
 * reject unresolved strong-beat or sustained non-chord tones (snap to nearest dest tone).
 */
function resolveDestinationWritablePitch(
  candidateMidi: number,
  destChord: string,
  startBeat: number,
  duration: number,
  prevPc: number | null,
  nextPc: number | null,
  band?: MutationMotifCell['registerBand']
): number {
  const allowed = allowedDestinationPcs(destChord);
  const allowedSet = new Set(allowed);
  const pc = ((candidateMidi % 12) + 12) % 12;
  if (allowedSet.has(pc)) {
    return band ? clampMidiToRegisterBand(candidateMidi, band) : candidateMidi;
  }

  const isStrong = startBeat < 1e-9 || Math.abs(startBeat - 2) < 1e-9;
  const sustained = duration >= 1 - 1e-9;
  const short = duration <= 0.5 + 1e-9;
  const near = (a: number, b: number) =>
    ((a - b + 12) % 12 === 1 || (b - a + 12) % 12 === 1);
  const approach =
    short &&
    ((nextPc != null && allowedSet.has(nextPc) && near(pc, nextPc)) ||
      (prevPc != null && allowedSet.has(prevPc) && near(pc, prevPc)));
  if (approach || (short && !isStrong)) {
    return band ? clampMidiToRegisterBand(candidateMidi, band) : candidateMidi;
  }
  if (!(isStrong || sustained)) {
    return band ? clampMidiToRegisterBand(candidateMidi, band) : candidateMidi;
  }

  const snapped = nearestMidiCarryingPc(candidateMidi, nearestAllowedPc(pc, allowed));
  return band ? clampMidiToRegisterBand(snapped, band) : snapped;
}

function chordToneMidiRefs(symbol: string): number[] {
  const t = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
  return [t.root, t.third, t.fifth, t.seventh];
}

function degreeIndexForPc(pc: number, chordPcs: readonly number[]): number | null {
  const p = ((pc % 12) + 12) % 12;
  for (let i = 0; i < chordPcs.length; i++) {
    if (((chordPcs[i]! % 12) + 12) % 12 === p) return i;
  }
  return null;
}

function rootPcOfChord(symbol: string): number {
  return chordTonePcs(symbol)[0] ?? 0;
}

/** Next chord-tone MIDI above/below `from` in the destination PC set (contour step). */
function stepAlongChordTones(
  fromMidi: number,
  destPcs: readonly number[],
  direction: 1 | -1,
  band: MutationMotifCell['registerBand']
): number {
  const ordered = [...destPcs].sort((a, b) => a - b);
  if (ordered.length === 0) return clampMidiToRegisterBand(fromMidi + direction, band);
  const fromPc = ((fromMidi % 12) + 12) % 12;
  let idx = ordered.findIndex((p) => p === fromPc);
  if (idx < 0) {
    // from is ornamental: pick nearest dest tone then step
    let best = ordered[0]!;
    let bestD = 99;
    for (const p of ordered) {
      const d = Math.min(Math.abs(fromPc - p), 12 - Math.abs(fromPc - p));
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    idx = ordered.indexOf(best);
  }
  const nextIdx = (idx + direction + ordered.length * 4) % ordered.length;
  let targetPc = ordered[nextIdx]!;
  // Keep rising/falling through octaves when wrapping the tone set.
  let realized = nearestMidiCarryingPc(fromMidi, targetPc);
  if (direction > 0 && realized <= fromMidi) realized += 12;
  if (direction < 0 && realized >= fromMidi) realized -= 12;
  return clampMidiToRegisterBand(realized, band);
}

/**
 * Destination-chord-aware motif chain realization (write-time, not post-hoc snap).
 * - Source chord tones: map by degree onto the destination chord (identity when harmony matches).
 * - Non-chord tones: keep contour via chord-degree steps on the destination (expressive color
 *   without planting foreign strong-beat PCs). Chromatic residue preserved as ±degree motion.
 * Exported for chorus opening motif recall (same write-time degree policy).
 */
export function adaptMotifChainToDestinationChord(
  chain: readonly number[],
  sourceChord: string,
  destChord: string,
  band: MutationMotifCell['registerBand'] = 'mid'
): number[] {
  if (chain.length === 0) return [];

  const srcPcs = chordTonePcs(sourceChord);
  const dstRefs = chordToneMidiRefs(destChord);
  const dstPcs = dstRefs.map((m) => ((m % 12) + 12) % 12);
  const harmonyMatches = lockedHarmonyChordSymbolsEquivalent(sourceChord, destChord);
  const rootShift = (rootPcOfChord(destChord) - rootPcOfChord(sourceChord) + 12) % 12;
  const signedRootShift = rootShift > 6 ? rootShift - 12 : rootShift;

  const out: number[] = [];
  for (let i = 0; i < chain.length; i++) {
    const midi = chain[i]!;
    const pc = ((midi % 12) + 12) % 12;
    const deg = degreeIndexForPc(pc, srcPcs);

    if (deg != null && deg < dstRefs.length) {
      // Structural chord tone: retain literal PC when harmony matches; else degree-map.
      if (harmonyMatches) {
        out.push(clampMidiToRegisterBand(midi, band));
      } else {
        const targetPc = dstPcs[deg]!;
        let realized = nearestMidiCarryingPc(midi + signedRootShift, targetPc);
        realized = clampMidiToRegisterBand(realized, band);
        out.push(realized);
      }
      continue;
    }

    // Non-chord (expressive) tone: write as destination chord-degree step in contour direction.
    if (i === 0 || out.length === 0) {
      const fallbackPc = dstPcs[0] ?? pc;
      out.push(clampMidiToRegisterBand(nearestMidiCarryingPc(midi, fallbackPc), band));
    } else {
      const srcInterval = midi - chain[i - 1]!;
      const direction: 1 | -1 = srcInterval >= 0 ? 1 : -1;
      out.push(stepAlongChordTones(out[out.length - 1]!, dstPcs, direction, band));
    }
  }
  return out;
}

function resolvePartBarChord(
  part: PartModel,
  bar: number,
  context?: CompositionContext
): string {
  if (context) {
    try {
      return getChordForBar(bar, context);
    } catch {
      /* fall through */
    }
  }
  return part.measures.find((m) => m.index === bar)?.chord?.trim() || 'Cmaj7';
}

/**
 * Build per-anchor motif chains:
 * - Source bar: leave pitches untouched (identity seed).
 * - Other anchors: cycle the source-bar pitch figure to the destination note count, then
 *   realize by destination-chord degree (literal chord tones when harmony matches).
 */
function motifChainsForAnchorBars(
  part: PartModel,
  anchors: readonly number[],
  primary: MutationMotifCell,
  band: MutationMotifCell['registerBand'],
  context?: CompositionContext
): Map<number, number[]> {
  const pcs = primary.pitchClasses;
  const chains = new Map<number, number[]>();
  if (pcs.length === 0 && primary.intervalSpine.length === 0) return chains;

  const sourceBar = anchors.find((b) => collectSortedNoteRefs(part, b, b, 1).length > 0) ?? anchors[0]!;
  const sourceChord = resolvePartBarChord(part, sourceBar, context);
  const sourceRefs = collectSortedNoteRefs(part, sourceBar, sourceBar, 1);
  if (sourceRefs.length === 0) return chains;

  /** Literal pitches as they sound on the source bar (not spine-reinvented). */
  const sourceLiteral: number[] = [];
  for (const ref of sourceRefs) {
    const ev = part.measures[ref.mi]!.events[ref.ei] as NoteEvent;
    sourceLiteral.push(clampMidiToRegisterBand(ev.pitch, band));
  }
  if (sourceLiteral.length === 0) return chains;

  for (const bar of anchors) {
    const destChord = resolvePartBarChord(part, bar, context);
    const destCount = Math.max(
      collectSortedNoteRefs(part, bar, bar, 1).length,
      sourceLiteral.length
    );
    const extended: number[] = [];
    for (let i = 0; i < destCount; i++) {
      extended.push(sourceLiteral[i % sourceLiteral.length]!);
    }
    // Same-harmony path retains chord-tone literals; non-chord tones degree-step on dest.
    chains.set(bar, adaptMotifChainToDestinationChord(extended, sourceChord, destChord, band));
  }
  return chains;
}

function sectionRoleForDevelopmentBar(bar: number): import('../song-mode/motifMutationEngine').SectionRole {
  if (bar <= 20) return 'B';
  if (bar <= 24) return 'bridge';
  if (bar <= 28) return 'A2';
  return 'coda';
}

/** Exported for Song Mode duo pipeline — A-section motif recall + development spine. */
export function primaryMutationCellFromPool(pool: MotifPool): MutationMotifCell | undefined {
  for (const cell of pool.cells) {
    if (cell.weight <= 0) continue;
    if (cell.pitches.length < 2) continue;
    const notes: MotifNoteLite[] = cell.pitches.map((p, i) => ({
      pitch: p,
      duration: cell.durations[i] ?? 1,
    }));
    return extractMotifCell(notes, notes.length);
  }
  return undefined;
}

function registerBandFromMidi(m: number): MutationMotifCell['registerBand'] {
  if (m < 58) return 'low';
  if (m > 72) return 'high';
  return 'mid';
}

/** Fold into register band by octave (+/−12) so pitch classes stay coherent for GCE sliding windows. */
function clampMidiToRegisterBand(midi: number, band: MutationMotifCell['registerBand']): number {
  const lo = band === 'low' ? 45 : band === 'high' ? 73 : 58;
  const hi = band === 'low' ? 57 : band === 'high' ? 84 : 72;
  let m = midi;
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  if (m >= lo && m <= hi) return m;
  return Math.max(lo, Math.min(hi, m));
}

function pcMatchesMotifTolerance(midi: number, pitchClasses: number[]): boolean {
  if (pitchClasses.length === 0) return false;
  const m = ((midi % 12) + 12) % 12;
  for (const pc of pitchClasses) {
    const p = ((pc % 12) + 12) % 12;
    const d = Math.min(Math.abs(m - p), 12 - Math.abs(m - p));
    if (d <= 1) return true;
  }
  return false;
}

function effectiveMotifRegisterBand(
  primary: MutationMotifCell,
  mutated: MutationMotifCell,
  transform: MotifTransform
): MutationMotifCell['registerBand'] {
  if (transform === 'registral_displacement' && mutated.registerBand !== primary.registerBand) {
    return mutated.registerBand;
  }
  return primary.registerBand;
}

/** Guitar treble + extracted `low` motif → fold in mid band so duo bass RegisterSeparation gate passes. */
function registerBandForTrebleMotif(
  band: MutationMotifCell['registerBand'],
  part: PartModel
): MutationMotifCell['registerBand'] {
  const trebleLead = part.id === 'guitar' || part.clef === 'treble';
  if (trebleLead && band === 'low') return 'mid';
  return band;
}

function enforceContourTwoNotes(
  p0: number,
  p1: number,
  cc: MutationMotifCell['contourCode']
): [number, number] {
  let a = p0;
  let b = p1;
  switch (cc) {
    case 'up':
    case 'arch':
      if (b <= a) b = a + 2;
      break;
    case 'down':
      if (b >= a) b = a - 2;
      break;
    case 'flat':
      if (Math.abs(b - a) > 1) b = a;
      break;
    case 'leap':
      if (Math.abs(b - a) < 4) b = a + (b >= a ? 5 : -5);
      break;
    default:
      break;
  }
  return [a, b];
}

/**
 * Reject unresolved strong/sustained non-chord tones on bars `lo`–`hi` at write time.
 * Preserves short approach/passing; snaps contradictions to nearest destination chord tone.
 */
function rejectUnresolvedDestinationContradictions(
  part: PartModel,
  lo: number,
  hi: number,
  context?: CompositionContext,
  band?: MutationMotifCell['registerBand']
): void {
  const lastBar = Math.max(0, ...part.measures.map((m) => m.index));
  const end = Math.min(hi, lastBar);
  for (let bar = lo; bar <= end; bar++) {
    const refs = collectSortedNoteRefs(part, bar, bar, 1);
    if (refs.length === 0) continue;
    const destChord = resolvePartBarChord(part, bar, context);
    const notes = refs.map((r) => part.measures[r.mi]!.events[r.ei] as NoteEvent);
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i]!;
      const ev = notes[i]!;
      const prevPc = i > 0 ? (((notes[i - 1]!.pitch % 12) + 12) % 12) : null;
      const nextPc = i + 1 < notes.length ? (((notes[i + 1]!.pitch % 12) + 12) % 12) : null;
      const nextPitch = resolveDestinationWritablePitch(
        ev.pitch,
        destChord,
        ev.startBeat,
        ev.duration,
        prevPc,
        nextPc,
        band
      );
      if (nextPitch !== ev.pitch) {
        part.measures[r.mi]!.events[r.ei] = { ...ev, pitch: nextPitch };
        notes[i] = part.measures[r.mi]!.events[r.ei] as NoteEvent;
      }
    }
  }
}

/**
 * Bars 1–16: destination-chord-aware motif at anchors 1 / 5 / 9 / 13.
 * Always writes (vault snap receipts do not suppress A-section recall — degree adapt at write time).
 * Rhythm / note count preserved; only pitch is selected.
 * Write-time gate rejects unresolved strong/sustained contradictions across the A window.
 */
export function applyMotifToASection(
  part: PartModel,
  primary: MutationMotifCell,
  context?: CompositionContext,
  _vaultPitchLock?: boolean,
): PartModel {
  const out = clonePartModel(part);
  const anchors = [1, 5, 9, 13];
  const pcs = primary.pitchClasses;
  const spine = primary.intervalSpine;
  if (pcs.length === 0 && spine.length === 0) return out;

  const aBand = registerBandForTrebleMotif(primary.registerBand, out);
  const chainsByBar = motifChainsForAnchorBars(out, anchors, primary, aBand, context);

  for (const bar of anchors) {
    const refs = collectSortedNoteRefs(out, bar, bar, 1);
    if (refs.length === 0) continue;
    const chain = chainsByBar.get(bar);
    if (!chain || chain.length === 0) continue;
    const destChord = resolvePartBarChord(out, bar, context);
    const notes = refs.map((r) => out.measures[r.mi]!.events[r.ei] as NoteEvent);

    const maxNotes = Math.min(chain.length, refs.length);
    for (let i = 0; i < maxNotes; i++) {
      const r = refs[i]!;
      const ev = notes[i]!;
      const prevPc = i > 0 ? (((notes[i - 1]!.pitch % 12) + 12) % 12) : null;
      const nextPc = i + 1 < notes.length ? (((notes[i + 1]!.pitch % 12) + 12) % 12) : null;
      // Prefer upcoming motif target PC as resolution hint when present.
      const nextMotifPc =
        i + 1 < maxNotes ? (((chain[i + 1]! % 12) + 12) % 12) : nextPc;
      const pitch = resolveDestinationWritablePitch(
        chain[i]!,
        destChord,
        ev.startBeat,
        ev.duration,
        prevPc,
        nextMotifPc,
        aBand
      );
      out.measures[r.mi]!.events[r.ei] = { ...ev, pitch };
      notes[i] = out.measures[r.mi]!.events[r.ei] as NoteEvent;
    }
  }

  // Hook reassert may plant absolute motif PCs on non-anchor A bars — gate those too.
  rejectUnresolvedDestinationContradictions(out, 1, 16, context, aBand);
  return out;
}

export interface PhraseEngineV2ApplyOptions {
  seed?: number;
  /** When set, vault-receipt / declined motif notes skip pitch mutation (Stage 5.2). */
  context?: CompositionContext;
  /** When true with vault receipts on score, skip all pitch edits (rhythm-only recall). */
  vaultPitchLock?: boolean;
}

/**
 * Mechanical extraction: first two notes (score order) from each of the first four 4-bar phrases
 * of the guitar part. Exactly four {@link MotifCell}s (empty phrases yield empty cells).
 */
export function buildMotifPool(score: ScoreModel, context: GoldenPathContext): MotifPool {
  const guitar = findGuitarPart(score);
  const generationId = poolGenerationId(context);

  const emptyCell = (): MotifCell => ({ pitches: [], durations: [], contour: 'flat', weight: 0 });

  if (!guitar) {
    return {
      cells: [emptyCell(), emptyCell(), emptyCell(), emptyCell()],
      generationId,
    };
  }

  const cells: MotifCell[] = [];
  for (let ph = 0; ph < PHRASE_ENGINE_V2_PHRASE_COUNT; ph++) {
    const startBar = ph * PHRASE_ENGINE_V2_PHRASE_BARS + 1;
    const endBar = startBar + PHRASE_ENGINE_V2_PHRASE_BARS - 1;
    const tagged = sortedNotesInBarRange(guitar, startBar, endBar);
    cells.push(mechanicalCellFromFirstTwoNotes(tagged));
  }

  return { cells, generationId };
}

/**
 * Appends one hook-seeded {@link MotifCell} from {@link SongModeHookIdentity} (flat contour, weight 0.8).
 * Does not mutate {@link pool}.
 */
export function seedPoolFromHookIdentity(pool: MotifPool, hookIdentity: SongModeHookIdentity): MotifPool {
  const root = hookIdentity.rootPitch;
  const rp = hookIdentity.rhythmicProfile;
  let cell: MotifCell;
  if (rp.length >= 2) {
    cell = {
      pitches: [root, root],
      durations: [rp[0]!.dur, rp[1]!.dur],
      contour: 'flat',
      weight: 0.8,
    };
  } else if (rp.length === 1) {
    cell = {
      pitches: [root],
      durations: [rp[0]!.dur],
      contour: 'flat',
      weight: 0.8,
    };
  } else {
    cell = {
      pitches: [root, root],
      durations: [1, 1],
      contour: 'flat',
      weight: 0.8,
    };
  }
  return {
    generationId: pool.generationId,
    cells: [...pool.cells, cell],
  };
}

/**
 * For each pool cell with weight > 0, finds the first matching duration-only figure in bars 17–32 and
 * nudges those note pitches one semitone toward the cell targets. Other notes unchanged.
 * Does not mutate {@link part}; returns a deep-cloned part with edits.
 */
/** Motif pitch-class match ratio target (55–65%). */
const MOTIF_PHRASE_MATCH_QUOTA = 0.55;

export function applyPhraseEngineV2(
  part: PartModel,
  pool: MotifPool,
  opts?: PhraseEngineV2ApplyOptions
): PartModel {
  let out = clonePartModel(part);
  const context = opts?.context;
  const vaultPitchLock =
    opts?.vaultPitchLock === true &&
    (context?.generationMetadata?.duoVaultMotifSnapReceipts?.length ?? 0) > 0;
  const refs = collectSortedNoteRefs(out, PHRASE_ENGINE_V2_DEVELOPMENT_LO, PHRASE_ENGINE_V2_DEVELOPMENT_HI, 1);

  const motifSourceChord = resolvePartBarChord(out, 1, context);

  for (const cell of pool.cells) {
    if (cell.weight <= 0) continue;
    const patLen = Math.min(cell.durations.length, cell.pitches.length);
    if (patLen === 0) continue;
    const pattern = cell.durations.slice(0, patLen);
    const targets = cell.pitches.slice(0, patLen);

    for (let start = 0; start + patLen <= refs.length; start++) {
      const slice = refs.slice(start, start + patLen);
      const notes = slice.map((r) => out.measures[r.mi]!.events[r.ei] as NoteEvent);
      if (!durationsMatchFigure(notes, pattern)) continue;

      for (let j = 0; j < patLen; j++) {
        if (vaultPitchLock) continue;
        const r = slice[j]!;
        const m = out.measures[r.mi]!;
        const v1Idx = v1SortedNoteIndexForEvent(m, r.ei);
        if (context && v1Idx >= 0 && vaultMotifPitchMutationSkipForV1Note(m.index, v1Idx, context)) continue;
        const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
        const destChord = resolvePartBarChord(out, m.index, context);
        const writeBand = registerBandFromMidi(targets[0] ?? ev.pitch);
        const adaptedTargets = adaptMotifChainToDestinationChord(
          targets,
          motifSourceChord,
          destChord,
          writeBand
        );
        const target = adaptedTargets[j] ?? targets[j]!;
        const stepped = stepTowardPitch(ev.pitch, target);
        const barNotes = slice.map((sr) => out.measures[sr.mi]!.events[sr.ei] as NoteEvent);
        const prevPc = j > 0 ? (((barNotes[j - 1]!.pitch % 12) + 12) % 12) : null;
        const nextPc =
          j + 1 < barNotes.length ? (((barNotes[j + 1]!.pitch % 12) + 12) % 12) : null;
        const nextPitch = resolveDestinationWritablePitch(
          stepped,
          destChord,
          ev.startBeat,
          ev.duration,
          prevPc,
          nextPc,
          writeBand
        );
        out.measures[r.mi]!.events[r.ei] = { ...ev, pitch: nextPitch };
      }
      break;
    }
  }

  const seed = opts?.seed ?? 0;
  const primary = primaryMutationCellFromPool(pool);
  if (primary) {
    /** One development mutation for all phrases 17–29 so literal openings repeat → GCE motif windows match. */
    const devRole = sectionRoleForDevelopmentBar(PHRASE_ENGINE_V2_DEVELOPMENT_LO);
    const devTr = selectMotifTransform(devRole, seed + PHRASE_ENGINE_V2_DEVELOPMENT_LO * 131);
    const mutatedShared = applyMotifMutation(primary, devTr);
    const band = registerBandForTrebleMotif(
      effectiveMotifRegisterBand(primary, mutatedShared, devTr),
      part
    );
    const sim = scoreMutationMotifSimilarity(primary, mutatedShared);
    if (sim < 0.3 || (sim > 0.95 && sim < 0.999)) {
      console.warn(
        `[PhraseEngineV2] motif mutation similarity=${sim.toFixed(3)} transform=${String(devTr)} role=${devRole}`
      );
    }

    const devStarts = [17, 21, 25, 29];
    /** Literal A-motif chain at source harmony; each development phrase adapts by destination chord. */
    let literalDevOpeningChain: number[] | undefined;
    const aSourceChord = motifSourceChord;
    for (const phraseStart of devStarts) {
      const phraseEnd = phraseStart + PHRASE_ENGINE_V2_PHRASE_BARS - 1;
      const phraseRefs = collectSortedNoteRefs(out, phraseStart, phraseEnd, 1);
      if (phraseRefs.length === 0) continue;

      const mutated = mutatedShared;

      if (!vaultPitchLock) {
      /** Primary spine/PC so B-section openings match A-section literal motif (GCE sliding-window recurrence). */
      const anchorPc =
        primary.pitchClasses.length > 0
          ? primary.pitchClasses[0]!
          : mutated.pitchClasses.length > 0
            ? mutated.pitchClasses[0]!
            : (((out.measures[phraseRefs[0]!.mi]!.events[phraseRefs[0]!.ei] as NoteEvent).pitch % 12) + 12) % 12;

      const spine = primary.intervalSpine.length > 0 ? primary.intervalSpine : mutated.intervalSpine;

      if (spine.length > 0) {
        if (literalDevOpeningChain === undefined) {
          const aRefs = collectSortedNoteRefs(out, 1, 4, 1);
          const hintRef = aRefs[0] ?? phraseRefs[0]!;
          const e0 = out.measures[hintRef.mi]!.events[hintRef.ei] as NoteEvent;
          let p0 = nearestMidiCarryingPc(e0.pitch, anchorPc);
          p0 = clampMidiToRegisterBand(p0, band);
          const built: number[] = [p0];
          for (let s = 0; s < spine.length && built.length < 4; s++) {
            built.push(built[built.length - 1]! + spine[s]!);
          }
          literalDevOpeningChain = built.map((m) => clampMidiToRegisterBand(m, band));
        }
        const destChord = resolvePartBarChord(out, phraseStart, context);
        const chain = adaptMotifChainToDestinationChord(
          literalDevOpeningChain,
          aSourceChord,
          destChord,
          band
        );
        const kMax = Math.min(4, chain.length, phraseRefs.length);
        for (let i = 0; i < kMax; i++) {
          const r = phraseRefs[i]!;
          const m = out.measures[r.mi]!;
          const v1Idx = v1SortedNoteIndexForEvent(m, r.ei);
          if (context && v1Idx >= 0 && vaultMotifPitchMutationSkipForV1Note(m.index, v1Idx, context)) continue;
          let pitch = chain[i]!;
          if (registerBandFromMidi(pitch) !== band) {
            console.warn(
              `[PhraseEngineV2] register drift (spine) phrase=${phraseStart} i=${i} midi=${pitch} band=${band}`
            );
          }
          pitch = clampMidiToRegisterBand(pitch, band);
          const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
          const destChordNote = resolvePartBarChord(out, m.index, context);
          const prevEv =
            i > 0 ? (out.measures[phraseRefs[i - 1]!.mi]!.events[phraseRefs[i - 1]!.ei] as NoteEvent) : null;
          const nextEv =
            i + 1 < kMax
              ? (out.measures[phraseRefs[i + 1]!.mi]!.events[phraseRefs[i + 1]!.ei] as NoteEvent)
              : null;
          const prevPc = prevEv ? (((prevEv.pitch % 12) + 12) % 12) : null;
          const nextPc =
            i + 1 < kMax
              ? (((chain[i + 1]! % 12) + 12) % 12)
              : nextEv
                ? (((nextEv.pitch % 12) + 12) % 12)
                : null;
          pitch = resolveDestinationWritablePitch(
            pitch,
            destChordNote,
            ev.startBeat,
            ev.duration,
            prevPc,
            nextPc,
            band
          );
          out.measures[r.mi]!.events[r.ei] = { ...ev, pitch };
        }
      } else if (phraseRefs.length >= 2) {
        const r0 = phraseRefs[0]!;
        const r1 = phraseRefs[1]!;
        const m0 = out.measures[r0.mi]!;
        const m1 = out.measures[r1.mi]!;
        const v1Idx0 = v1SortedNoteIndexForEvent(m0, r0.ei);
        const v1Idx1 = v1SortedNoteIndexForEvent(m1, r1.ei);
        const skip0 =
          context && v1Idx0 >= 0 && vaultMotifPitchMutationSkipForV1Note(m0.index, v1Idx0, context);
        const skip1 =
          context && v1Idx1 >= 0 && vaultMotifPitchMutationSkipForV1Note(m1.index, v1Idx1, context);
        if (!skip0 || !skip1) {
          const ev0 = out.measures[r0.mi]!.events[r0.ei] as NoteEvent;
          const ev1 = out.measures[r1.mi]!.events[r1.ei] as NoteEvent;
          let [np0, np1] = enforceContourTwoNotes(ev0.pitch, ev1.pitch, mutated.contourCode);
          np0 = clampMidiToRegisterBand(np0, band);
          np1 = clampMidiToRegisterBand(np1, band);
          const dest0 = resolvePartBarChord(out, m0.index, context);
          const dest1 = resolvePartBarChord(out, m1.index, context);
          np0 = resolveDestinationWritablePitch(
            np0,
            dest0,
            ev0.startBeat,
            ev0.duration,
            null,
            ((np1 % 12) + 12) % 12,
            band
          );
          np1 = resolveDestinationWritablePitch(
            np1,
            dest1,
            ev1.startBeat,
            ev1.duration,
            ((np0 % 12) + 12) % 12,
            null,
            band
          );
          if (!skip0) out.measures[r0.mi]!.events[r0.ei] = { ...ev0, pitch: np0 };
          if (!skip1) out.measures[r1.mi]!.events[r1.ei] = { ...ev1, pitch: np1 };
        }
      }

      const motifPcs = [...new Set([...primary.pitchClasses, ...mutated.pitchClasses])];
      if (motifPcs.length > 0) {
        let matchCount = 0;
        for (const r of phraseRefs) {
          const pv = (out.measures[r.mi]!.events[r.ei] as NoteEvent).pitch;
          if (pcMatchesMotifTolerance(pv, motifPcs)) matchCount++;
        }
        const ratio = matchCount / phraseRefs.length;
        if (ratio < MOTIF_PHRASE_MATCH_QUOTA) {
          const lastR = phraseRefs[phraseRefs.length - 1]!;
          const mLast = out.measures[lastR.mi]!;
          const v1LastIdx = v1SortedNoteIndexForEvent(mLast, lastR.ei);
          if (!(context && v1LastIdx >= 0 && vaultMotifPitchMutationSkipForV1Note(mLast.index, v1LastIdx, context))) {
            const lev = out.measures[lastR.mi]!.events[lastR.ei] as NoteEvent;
            const goalPc = motifPcs[0]!;
            let newP = nearestMidiCarryingPc(lev.pitch, goalPc);
            newP = clampMidiToRegisterBand(newP, band);
            const destLast = resolvePartBarChord(out, mLast.index, context);
            newP = resolveDestinationWritablePitch(
              newP,
              destLast,
              lev.startBeat,
              lev.duration,
              null,
              null,
              band
            );
            out.measures[lastR.mi]!.events[lastR.ei] = { ...lev, pitch: newP };
          }
        }
      }
      }

      if (!vaultPitchLock) {
      for (const r of phraseRefs) {
        const m = out.measures[r.mi]!;
        const v1Idx = v1SortedNoteIndexForEvent(m, r.ei);
        if (context && v1Idx >= 0 && vaultMotifPitchMutationSkipForV1Note(m.index, v1Idx, context)) continue;
        const evn = out.measures[r.mi]!.events[r.ei] as NoteEvent;
        const pv = evn.pitch;
        if (registerBandFromMidi(pv) !== band) {
          console.warn(
            `[PhraseEngineV2] register drift phrase=${phraseStart} bar=${out.measures[r.mi]!.index} midi=${pv} band=${band}`
          );
          out.measures[r.mi]!.events[r.ei] = {
            ...evn,
            pitch: clampMidiToRegisterBand(pv, band),
          };
        }
      }
      }
    }
  }

  return out;
}

function lowestPitchInCell(cell: MotifCell): number | undefined {
  if (cell.pitches.length === 0) return undefined;
  return Math.min(...cell.pitches);
}

function durationMatchesAnyCellDuration(noteDur: number, cellDurations: number[]): boolean {
  for (const d of cellDurations) {
    if (Math.abs(noteDur - d) <= DURATION_MATCH_EPS) return true;
  }
  return false;
}

const BASS_MOTIF_ANCHOR_BARS = [1, 9, 17, 25] as const;
/** Hard degree-adapted pitch write (A-section); 17/25 stay rhythm-only + soft development nudge. */
const BASS_MOTIF_PITCH_WRITE_ANCHORS = [1, 9] as const;

/** Slash / approach / passing — do not overwrite with motif echo. */
function isProtectedBassEchoNote(
  ev: NoteEvent,
  barChord: string,
  barNotes: readonly NoteEvent[],
  noteIdx: number
): boolean {
  const pc = ((ev.pitch % 12) + 12) % 12;
  const slash = slashPcOfChordSymbol(barChord);
  if (slash !== undefined && pc === slash) return true;

  const allowed = new Set(allowedDestinationPcs(barChord));
  if (allowed.has(pc)) return false;

  const isStrong = ev.startBeat < 1e-9 || Math.abs(ev.startBeat - 2) < 1e-9;
  const short = ev.duration <= 0.5 + 1e-9;
  const prev = noteIdx > 0 ? barNotes[noteIdx - 1] : undefined;
  const next = noteIdx + 1 < barNotes.length ? barNotes[noteIdx + 1] : undefined;
  const prevPc = prev ? (((prev.pitch % 12) + 12) % 12) : null;
  const nextPc = next ? (((next.pitch % 12) + 12) % 12) : null;
  const near = (a: number, b: number) => ((a - b + 12) % 12 === 1 || (b - a + 12) % 12 === 1);
  const approach =
    short &&
    ((nextPc != null && allowed.has(nextPc) && near(pc, nextPc)) ||
      (prevPc != null && allowed.has(prevPc) && near(pc, prevPc)));
  if (approach) return true;
  if (short && !isStrong) return true; // passing
  return false;
}

function barNotesSorted(part: PartModel, mi: number): NoteEvent[] {
  return part.measures[mi]!.events
    .filter((e): e is NoteEvent => isNoteEvent(e))
    .slice()
    .sort((a, b) => a.startBeat - b.startBeat);
}

/** Degree-adapt motif midis, then fold each PC into the existing bass octave. */
function adaptBassMotifPitchesNear(
  chain: readonly number[],
  sourceChord: string,
  destChord: string,
  nearMidis: readonly number[]
): number[] {
  const adapted = adaptMotifChainToDestinationChord(chain, sourceChord, destChord, 'low');
  const out: number[] = [];
  for (let i = 0; i < adapted.length; i++) {
    const near = nearMidis[i] ?? nearMidis[nearMidis.length - 1] ?? adapted[i]!;
    const pc = ((adapted[i]! % 12) + 12) % 12;
    out.push(nearestMidiCarryingPc(near, pc));
  }
  return out;
}

/**
 * Anchors 1 / 9 / 17 / 25: force bass note durations to primary motif {@link MutationMotifCell.rhythmicCell},
 * and write destination-chord degree-adapted motif pitches (literal when harmony matches).
 * Slash / approach / passing notes kept.
 * Strong/sustained arrivals gated via {@link resolveDestinationWritablePitch} (chord tones + slash bass).
 * Then: per weighted pool cell, duration-matched notes in bars 17–32 nudge ±1 semitone toward
 * harmony-adapted cell pitches (same {@link adaptMotifChainToDestinationChord} policy as guitar).
 * Finally: A-window reject gate (bars 1–16) mirrors guitar motif write — clears unresolved
 * strong/sustained arrivals without touching development soft nudges (17–32).
 */
export function applyBassMotifEcho(
  bassPart: PartModel,
  pool: MotifPool,
  context?: CompositionContext
): PartModel {
  const out = clonePartModel(bassPart);
  const primary = primaryMutationCellFromPool(pool);
  const motifSourceChord = resolvePartBarChord(out, 1, context);
  const seedCell = pool.cells.find((c) => c.weight > 0 && c.pitches.length > 0);
  const motifSeedPitches = seedCell?.pitches ?? [];

  const rhythm = primary?.rhythmicCell;
  for (const bar of BASS_MOTIF_ANCHOR_BARS) {
    const refs = collectSortedNoteRefs(out, bar, bar);
    if (refs.length === 0) continue;
    if (rhythm && rhythm.length > 0) {
      for (let i = 0; i < Math.min(rhythm.length, refs.length); i++) {
        const r = refs[i]!;
        const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
        out.measures[r.mi]!.events[r.ei] = { ...ev, duration: rhythm[i]! };
      }
    }
  }
  for (const bar of BASS_MOTIF_PITCH_WRITE_ANCHORS) {
    const refs = collectSortedNoteRefs(out, bar, bar);
    if (refs.length === 0 || motifSeedPitches.length === 0) continue;
    const destChord = resolvePartBarChord(out, bar, context);
    const near: number[] = [];
    const extended: number[] = [];
    for (let i = 0; i < refs.length; i++) {
      const ev = out.measures[refs[i]!.mi]!.events[refs[i]!.ei] as NoteEvent;
      near.push(ev.pitch);
      extended.push(motifSeedPitches[i % motifSeedPitches.length]!);
    }
    const adapted = adaptBassMotifPitchesNear(extended, motifSourceChord, destChord, near);
    const sorted = barNotesSorted(out, refs[0]!.mi);
    const writeNotes = refs.map((r) => out.measures[r.mi]!.events[r.ei] as NoteEvent);
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i]!;
      const ev = writeNotes[i]!;
      const noteIdx = sorted.findIndex(
        (n) => n.startBeat === ev.startBeat && n.pitch === ev.pitch && n.duration === ev.duration
      );
      if (isProtectedBassEchoNote(ev, destChord, sorted, noteIdx >= 0 ? noteIdx : i)) continue;
      const prevPc = i > 0 ? (((writeNotes[i - 1]!.pitch % 12) + 12) % 12) : null;
      const nextPc = i + 1 < writeNotes.length ? (((writeNotes[i + 1]!.pitch % 12) + 12) % 12) : null;
      const pitch = resolveDestinationWritablePitch(
        adapted[i]!,
        destChord,
        ev.startBeat,
        ev.duration,
        prevPc,
        nextPc,
        'low'
      );
      out.measures[r.mi]!.events[r.ei] = { ...ev, pitch };
      writeNotes[i] = out.measures[r.mi]!.events[r.ei] as NoteEvent;
    }
  }

  const refs = collectSortedNoteRefs(out, PHRASE_ENGINE_V2_DEVELOPMENT_LO, PHRASE_ENGINE_V2_DEVELOPMENT_HI);

  for (const cell of pool.cells) {
    if (cell.weight <= 0) continue;
    if (cell.durations.length === 0 || cell.pitches.length === 0) continue;
    const patLen = Math.min(cell.durations.length, cell.pitches.length);
    const pattern = cell.durations.slice(0, patLen);
    const targets = cell.pitches.slice(0, patLen);

    let wrote = false;
    for (let start = 0; start + patLen <= refs.length; start++) {
      const slice = refs.slice(start, start + patLen);
      const notes = slice.map((r) => out.measures[r.mi]!.events[r.ei] as NoteEvent);
      if (!durationsMatchFigure(notes, pattern)) continue;
      const destBar = out.measures[slice[0]!.mi]!.index;
      const destChord = resolvePartBarChord(out, destBar, context);
      const adapted = adaptBassMotifPitchesNear(targets, motifSourceChord, destChord, notes.map((n) => n.pitch));
      for (let j = 0; j < patLen; j++) {
        const r = slice[j]!;
        const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
        const sorted = barNotesSorted(out, r.mi);
        const noteIdx = sorted.findIndex(
          (n) => n.startBeat === ev.startBeat && n.pitch === ev.pitch && n.duration === ev.duration
        );
        if (isProtectedBassEchoNote(ev, destChord, sorted, noteIdx >= 0 ? noteIdx : j)) continue;
        const nextPitch = stepTowardPitch(ev.pitch, adapted[j]!);
        out.measures[r.mi]!.events[r.ei] = { ...ev, pitch: nextPitch };
      }
      wrote = true;
      break;
    }
    if (wrote) continue;

    // Fallback: first duration match → ±1 toward harmony-adapted cell floor (smoke / sparse bars).
    const targetLow = lowestPitchInCell(cell);
    if (targetLow === undefined || !Number.isFinite(targetLow)) continue;
    for (const r of refs) {
      const ev = out.measures[r.mi]!.events[r.ei] as NoteEvent;
      if (!durationMatchesAnyCellDuration(ev.duration, cell.durations)) continue;
      const destChord = resolvePartBarChord(out, out.measures[r.mi]!.index, context);
      const sorted = barNotesSorted(out, r.mi);
      const noteIdx = sorted.findIndex(
        (n) => n.startBeat === ev.startBeat && n.pitch === ev.pitch && n.duration === ev.duration
      );
      if (isProtectedBassEchoNote(ev, destChord, sorted, noteIdx >= 0 ? noteIdx : 0)) continue;
      const adapted = adaptBassMotifPitchesNear([targetLow], motifSourceChord, destChord, [ev.pitch]);
      const nextPitch = stepTowardPitch(ev.pitch, adapted[0]!);
      out.measures[r.mi]!.events[r.ei] = { ...ev, pitch: nextPitch };
      break;
    }
  }

  // A-window gate (guitar parity): strong/sustained arrivals must respect chord + slash bass.
  rejectUnresolvedDestinationContradictions(out, 1, 16, context, 'low');
  return out;
}
