/**
 * Phase C4 — Ostinato / hook rhythm bias (V1): phrase-level 1-bar template from a 2–4 note window (read-only extraction).
 * Apply pass (bars 2+ of each phrase): velocity + articulation bias toward template; no pitch / note count / timing changes.
 * C4 is safety-first: no duration/onset mutation, no applyOverlayConstraints normalize (that path broke bar math).
 * Runs after C1/C2 + C3, before bar-math seal. Deterministic (seededUnit only).
 *
 * @see songModeOstinatoC4.prompt.md
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { seededUnit } from './guitarBassDuoHarmony';
import { songModePhraseSegments } from './songModePhraseEngineV1';
import {
  ensureBarSafeTimings,
  ensureNoteCountUnchanged,
  ensureTotalDurationUnchanged,
  snapshotMeasureNotes,
} from './jamesBrownFunkOverlay';
import { snapAttackBeatToGrid } from '../score-integrity/duoEighthBeatGrid';

const GRID_16TH = 0.25;
const EPS = 1e-4;

export type SongModeOstinatoStrengthLabel = 'Stable' | 'Balanced' | 'Surprise';

export interface SongModeOstinatoPhraseMeta {
  phraseIndex: number;
  ostinatoActive: boolean;
  ostinatoLengthBars: 1;
  ostinatoStrength: SongModeOstinatoStrengthLabel;
  ostinatoSummary?: string;
}

type RhythmStrength = 'stable' | 'balanced' | 'surprise';

function strengthLabel(s: RhythmStrength | undefined): SongModeOstinatoStrengthLabel {
  const v = s ?? 'balanced';
  if (v === 'stable') return 'Stable';
  if (v === 'surprise') return 'Surprise';
  return 'Balanced';
}

function activationThreshold(strength: RhythmStrength | undefined): number {
  const s = strength ?? 'balanced';
  if (s === 'stable') return 0.22;
  if (s === 'surprise') return 0.72;
  return 0.48;
}

function baseBiasStrength(strength: RhythmStrength | undefined): number {
  const s = strength ?? 'balanced';
  if (s === 'stable') return 0.14;
  if (s === 'surprise') return 0.52;
  return 0.32;
}

function phraseBeat(bar: number, startBar: number, startBeat: number): number {
  return (bar - startBar) * BEATS_PER_MEASURE + startBeat;
}

function collectGuitarPhraseNotesOrdered(
  guitar: PartModel,
  startBar: number,
  endBar: number
): Array<{ bar: number; n: NoteEvent }> {
  const out: Array<{ bar: number; n: NoteEvent }> = [];
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind === 'note') out.push({ bar: b, n: e as NoteEvent });
    }
  }
  out.sort((a, b) => (a.bar - b.bar) || a.n.startBeat - b.n.startBeat);
  return out;
}

function countPhraseNotes(part: PartModel, startBar: number, endBar: number): number {
  let n = 0;
  for (let b = startBar; b <= endBar; b++) {
    const m = part.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) {
      if (e.kind === 'note') n++;
    }
  }
  return n;
}

function windowSpansTooManyBars(firstBar: number, lastBar: number): boolean {
  return lastBar - firstBar > 1;
}

function ioisForWindow(
  window: Array<{ bar: number; n: NoteEvent }>,
  startBar: number
): number[] {
  const beats = window.map((w) => phraseBeat(w.bar, startBar, w.n.startBeat));
  const iois: number[] = [];
  for (let i = 1; i < beats.length; i++) iois.push(beats[i]! - beats[i - 1]!);
  return iois;
}

function hasInternalRepetition(iois: number[]): boolean {
  for (let i = 0; i < iois.length - 1; i++) {
    if (Math.abs(iois[i]! - iois[i + 1]!) < 0.06) return true;
  }
  return false;
}

function looksRandom(iois: number[]): boolean {
  if (iois.length === 0) return true;
  const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
  if (mean < 1e-4) return true;
  const v = iois.reduce((s, x) => s + (x - mean) ** 2, 0) / iois.length;
  const cv = Math.sqrt(v) / mean;
  return cv > 0.62 && !hasInternalRepetition(iois);
}

function tooDense(iois: number[]): boolean {
  return iois.some((x) => x < GRID_16TH - 1e-4);
}

function acceptableWindow(
  slice: Array<{ bar: number; n: NoteEvent }>,
  startBar: number
): boolean {
  if (slice.length < 2) return false;
  const firstBar = slice[0]!.bar;
  const lastBar = slice[slice.length - 1]!.bar;
  if (windowSpansTooManyBars(firstBar, lastBar)) return false;
  const iois = ioisForWindow(slice, startBar);
  if (tooDense(iois)) return false;
  if (looksRandom(iois)) return false;
  if (!hasInternalRepetition(iois)) {
    const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
    const v = iois.reduce((s, x) => s + (x - mean) ** 2, 0) / iois.length;
    const cv = mean > 1e-4 ? Math.sqrt(v) / mean : 0;
    if (cv < 0.12) return false;
  }
  return true;
}

export interface OstinatoTemplate {
  onsets: number[];
  durations: number[];
  accentWeight: number[];
}

function buildOneBarTemplate(
  slice: Array<{ bar: number; n: NoteEvent }>,
  startBar: number
): OstinatoTemplate | null {
  const k = slice.length;
  if (k < 2) return null;
  const beats = slice.map((w) => phraseBeat(w.bar, startBar, w.n.startBeat));
  const rel = beats.map((b) => b - beats[0]!);
  const span = rel[k - 1]! + 0.02;
  const scale = span > BEATS_PER_MEASURE - 1e-3 ? (BEATS_PER_MEASURE - 0.5) / span : 1;
  const raw = rel.map((r) => r * scale);
  const onsets: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const o = snapAttackBeatToGrid(Math.min(BEATS_PER_MEASURE - 0.5, raw[i]! - raw[0]!));
    onsets.push(Math.max(0, o));
  }
  for (let i = 1; i < onsets.length; i++) {
    if (onsets[i]! <= onsets[i - 1]!) {
      onsets[i] = snapAttackBeatToGrid(onsets[i - 1]! + 0.5);
    }
  }
  const durations = slice.map((w) => snapAttackBeatToGrid(w.n.duration));
  const accentWeight = slice.map((w) => {
    const v = w.n.velocity ?? 90;
    const bump = w.n.articulation === 'accent' ? 18 : 0;
    return Math.min(127, v + bump);
  });
  return { onsets, durations, accentWeight };
}

function isMechanicalLoop(iois: number[]): boolean {
  if (iois.length < 2) return false;
  const a = iois[0]!;
  return iois.every((x) => Math.abs(x - a) < 0.04);
}

function cloneScoreEvent(e: ScoreEvent): ScoreEvent {
  if (e.kind === 'note') {
    const n = e as NoteEvent;
    return { ...n };
  }
  const r = e as RestEvent;
  return { ...r };
}

function cloneMeasuresRange(part: PartModel, startBar: number, endBar: number): Map<number, ScoreEvent[]> {
  const map = new Map<number, ScoreEvent[]>();
  for (let b = startBar; b <= endBar; b++) {
    const m = part.measures.find((x) => x.index === b);
    if (!m) continue;
    map.set(b, m.events.map(cloneScoreEvent));
  }
  return map;
}

function clonePartMeasures(part: PartModel): Map<number, ScoreEvent[]> {
  const map = new Map<number, ScoreEvent[]>();
  for (const m of part.measures) {
    map.set(m.index, m.events.map(cloneScoreEvent));
  }
  return map;
}

function restorePhraseRange(part: PartModel, backup: Map<number, ScoreEvent[]>): void {
  for (const [idx, ev] of backup) {
    const m = part.measures.find((x) => x.index === idx);
    if (m) m.events = ev.map(cloneScoreEvent);
  }
}

function restorePartFromClone(part: PartModel, backup: Map<number, ScoreEvent[]>): void {
  for (const m of part.measures) {
    const ev = backup.get(m.index);
    if (ev) m.events = ev.map(cloneScoreEvent);
  }
}

function distToNearestBarBoundary(note: NoteEvent): number {
  const end = note.startBeat + note.duration;
  return Math.min(note.startBeat, BEATS_PER_MEASURE - end);
}

function countNotesAtSameAttack(measure: MeasureModel, startBeat: number): number {
  let c = 0;
  for (const e of measure.events) {
    if (e.kind === 'note' && Math.abs((e as NoteEvent).startBeat - startBeat) < 1e-4) c++;
  }
  return c;
}

/** C4 must not touch these notes (velocity/articulation only still skipped = no modification). */
function shouldSkipOstinatoNote(note: NoteEvent, measure: MeasureModel): boolean {
  if (distToNearestBarBoundary(note) <= GRID_16TH + EPS) return true;
  if (note.duration <= GRID_16TH + EPS) return true;
  if (note.startBeat + note.duration >= BEATS_PER_MEASURE - EPS) return true;
  if (countNotesAtSameAttack(measure, note.startBeat) >= 2) return true;
  return false;
}

function validateMeasureNoteOrdering(m: MeasureModel): boolean {
  const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
  const sts = notes.map((n) => n.startBeat).sort((a, b) => a - b);
  for (let i = 1; i < sts.length; i++) {
    if (sts[i]! + EPS < sts[i - 1]!) return false;
  }
  return true;
}

/** Per-phrase rhythm invariant: match backup counts/spans; durations > 0; note end in bar; ordering preserved. */
function phraseTimingMatches(
  part: PartModel,
  startBar: number,
  endBar: number,
  backup: Map<number, ScoreEvent[]>
): boolean {
  for (let b = startBar; b <= endBar; b++) {
    const m = part.measures.find((x) => x.index === b);
    const ev = backup.get(b);
    if (!m) continue;
    if (!ev) return false;
    const s1 = snapshotMeasureNotes(m);
    const s2 = snapshotMeasureNotes({ index: b, events: ev });
    if (s1.noteCount !== s2.noteCount || Math.abs(s1.totalEventSpan - s2.totalEventSpan) > 0.02) return false;
    if (!validateMeasureNoteOrdering(m)) return false;
    const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
    for (const n of notes) {
      if (n.duration <= 1e-6) return false;
      if (n.startBeat + n.duration > BEATS_PER_MEASURE + 1e-3) return false;
      if (n.startBeat + n.duration <= n.startBeat + 1e-6) return false;
    }
  }
  return true;
}

function snapshotPartTimingStats(part: PartModel): { noteCount: number; totalSpan: number } {
  let noteCount = 0;
  let totalSpan = 0;
  for (const m of part.measures) {
    const s = snapshotMeasureNotes(m);
    noteCount += s.noteCount;
    totalSpan += s.totalEventSpan;
  }
  return { noteCount, totalSpan };
}

/**
 * Velocity + articulation only. No onset/duration mutation; no applyOverlayConstraints (no grid normalize).
 */
function applyOstinatoToMeasure(
  measure: MeasureModel,
  barIndex: number,
  template: OstinatoTemplate,
  strength: number,
  seed: number,
  phraseIdx: number,
  isBass: boolean
): void {
  const notes = measure.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length === 0) return;
  const varPick = Math.floor(seededUnit(seed, phraseIdx, 96800 + barIndex) * notes.length);

  const sMul = isBass ? 0.44 : 1;
  const eff = strength * sMul;

  const M = template.onsets.length;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]!;
    if (shouldSkipOstinatoNote(note, measure)) continue;

    const slot = i % M;
    const tVel = template.accentWeight[slot]!;
    const baseV = note.velocity ?? 90;
    note.velocity = Math.round(baseV + (tVel - baseV) * eff * 0.42);
    if (tVel > 102 && seededUnit(seed, phraseIdx, 96920 + barIndex + i) < 0.38 * eff) {
      note.articulation = 'accent';
    }

    if (i === varPick) {
      if (seededUnit(seed, phraseIdx, 96950 + barIndex) < 0.5) {
        note.velocity = Math.min(
          127,
          Math.max(
            1,
            Math.round(
              (note.velocity ?? 90) + (seededUnit(seed, phraseIdx, 96951 + barIndex) < 0.5 ? -6 : 6)
            )
          )
        );
      } else if (seededUnit(seed, phraseIdx, 96952 + barIndex) < 0.5) {
        note.articulation = note.articulation === 'accent' ? undefined : 'accent';
      }
    }
  }
}

function applyOstinatoToPhrasePart(
  part: PartModel,
  startBar: number,
  endBar: number,
  template: OstinatoTemplate,
  strength: number,
  seed: number,
  phraseIdx: number,
  isBass: boolean
): void {
  for (let bar = startBar; bar <= endBar; bar++) {
    if (bar === startBar) continue;
    const m = part.measures.find((x) => x.index === bar);
    if (!m) continue;
    applyOstinatoToMeasure(m, bar, template, strength, seed, phraseIdx, isBass);
  }
}

function runGlobalC4SafetyAfterApply(
  guitar: PartModel,
  bass: PartModel | undefined,
  beforeG: { noteCount: number; totalSpan: number },
  beforeB: { noteCount: number; totalSpan: number } | null,
  fullBackupG: Map<number, ScoreEvent[]>,
  fullBackupB: Map<number, ScoreEvent[]> | null,
  out: SongModeOstinatoPhraseMeta[]
): void {
  try {
    const midG = snapshotPartTimingStats(guitar);
    ensureNoteCountUnchanged(beforeG.noteCount, midG.noteCount);
    ensureTotalDurationUnchanged(beforeG.totalSpan, midG.totalSpan);
    if (bass && beforeB) {
      const midB = snapshotPartTimingStats(bass);
      ensureNoteCountUnchanged(beforeB.noteCount, midB.noteCount);
      ensureTotalDurationUnchanged(beforeB.totalSpan, midB.totalSpan);
    }

    for (const m of guitar.measures) ensureBarSafeTimings(m);
    if (bass) for (const m of bass.measures) ensureBarSafeTimings(m);

    const afterG = snapshotPartTimingStats(guitar);
    ensureNoteCountUnchanged(beforeG.noteCount, afterG.noteCount);
    ensureTotalDurationUnchanged(beforeG.totalSpan, afterG.totalSpan);
    if (bass && beforeB) {
      const afterB = snapshotPartTimingStats(bass);
      ensureNoteCountUnchanged(beforeB.noteCount, afterB.noteCount);
      ensureTotalDurationUnchanged(beforeB.totalSpan, afterB.totalSpan);
    }
  } catch {
    restorePartFromClone(guitar, fullBackupG);
    if (bass && fullBackupB) restorePartFromClone(bass, fullBackupB);
    for (const o of out) {
      o.ostinatoActive = false;
      o.ostinatoSummary = 'reverted: global safety';
    }
  }
}

export function applySongModeOstinatoC4(score: ScoreModel, context: CompositionContext): void {
  const meta = context.generationMetadata as GenerationMetadata;
  if (meta.songModeRhythmOverlayDisabled === true) return;
  if (meta.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;
  const bass = score.parts.find((p) => p.id === 'bass') as PartModel | undefined;

  const beforeG = snapshotPartTimingStats(guitar);
  const beforeB = bass ? snapshotPartTimingStats(bass) : null;
  const fullBackupG = clonePartMeasures(guitar);
  const fullBackupB = bass ? clonePartMeasures(bass) : null;

  const segments = songModePhraseSegments();
  const seed = context.seed;
  const strengthMode = (meta.songModeRhythmStrength ?? 'balanced') as RhythmStrength;
  const out: SongModeOstinatoPhraseMeta[] = [];

  for (let pi = 0; pi < segments.length; pi++) {
    const { startBar, endBar } = segments[pi];
    const u = seededUnit(seed, pi, 96400);
    let active = u < activationThreshold(strengthMode);
    let summary = active ? 'candidate' : 'inactive: activation gate';

    const ordered = collectGuitarPhraseNotesOrdered(guitar, startBar, endBar);
    let slice: Array<{ bar: number; n: NoteEvent }> = [];
    if (ordered.length < 2) {
      active = false;
      summary = 'inactive: insufficient notes';
    } else {
      let winSize = 2 + Math.floor(seededUnit(seed, pi, 96410) * 3);
      winSize = Math.min(Math.max(2, winSize), ordered.length);
      const maxStart = ordered.length - winSize;
      const startIdx = Math.floor(seededUnit(seed, pi, 96411) * (maxStart + 1));
      slice = ordered.slice(startIdx, startIdx + winSize);
    }

    let template: OstinatoTemplate | null = null;
    if (active && slice.length >= 2) {
      if (!acceptableWindow(slice, startBar)) {
        active = false;
        summary = 'inactive: window rejected';
      } else {
        template = buildOneBarTemplate(slice, startBar);
        if (!template) {
          active = false;
          summary = 'inactive: template build failed';
        }
      }
    }

    let bias = baseBiasStrength(strengthMode);
    if (active && template) {
      const iois = ioisForWindow(slice, startBar);
      if (isMechanicalLoop(iois)) bias *= 0.52;
    }

    if (active && template) {
      const phraseBackupG = cloneMeasuresRange(guitar, startBar, endBar);
      const phraseBackupB = bass ? cloneMeasuresRange(bass, startBar, endBar) : null;

      applyOstinatoToPhrasePart(guitar, startBar, endBar, template, bias, seed, pi, false);
      let bassOk = false;
      if (bass) {
        const bCount = countPhraseNotes(bass, startBar, endBar);
        const gCount = countPhraseNotes(guitar, startBar, endBar);
        bassOk = bCount <= gCount * 1.18 + 2;
        if (bassOk) {
          const bassBias = bias * 0.42;
          applyOstinatoToPhrasePart(bass, startBar, endBar, template, bassBias, seed + 19, pi, true);
        }
      }

      let ok = phraseTimingMatches(guitar, startBar, endBar, phraseBackupG);
      if (bass && phraseBackupB) ok = ok && phraseTimingMatches(bass, startBar, endBar, phraseBackupB);

      if (!ok) {
        restorePhraseRange(guitar, phraseBackupG);
        if (bass && phraseBackupB) restorePhraseRange(bass, phraseBackupB);
        active = false;
        summary = 'reverted: phrase validation failed';
      } else {
        summary = `active: ${template.onsets.length}-slot cell; bias ${bias.toFixed(2)}${bass && bassOk ? '; bass' : bass ? '; bass skipped' : ''}`;
      }
    }

    out.push({
      phraseIndex: pi,
      ostinatoActive: active,
      ostinatoLengthBars: 1,
      ostinatoStrength: strengthLabel(strengthMode),
      ostinatoSummary: summary,
    });
  }

  runGlobalC4SafetyAfterApply(guitar, bass, beforeG, beforeB, fullBackupG, fullBackupB, out);

  meta.songModeOstinatoByPhrase = out;
}
