/**
 * Phase C5 — Blending (V1): interpolate rhythm *feel* between two adjacent feel states across a contiguous bar range.
 * Gradually shifts implied rhythm density and offbeat probability from `fromFeel` → `toFeel` over `blendLength` bars starting at `blendStart`.
 * Apply pass: soft velocity / articulation bias only (no pitch change; timing edits minimal and grid-safe when applied).
 * Not wired into the golden path until integrated by the pipeline.
 *
 * @see songModeOstinatoC4.ts (parallel module structure)
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
import { normalizeMeasureToEighthBeatGrid } from '../score-integrity/duoEighthBeatGrid';
import { getEffectiveRhythmStrength } from '../rhythmIntentResolve';
import { isProtectedBar } from '../score-integrity/identityLock';

const GRID_16TH = 0.25;
const EPS = 1e-4;

/** Display label for receipts / debug (mirrors C4 strength labels). */
export type SongModeBlendStrengthLabel = 'Light' | 'Medium' | 'Strong';

export interface SongModeBlendPhraseMeta {
  phraseIndex: number;
  blendActive: boolean;
  blendLengthBars: number;
  blendStrength: SongModeBlendStrengthLabel;
  blendSummary?: string;
  /** Set when phrase-level or global safety restore invalidated C5 edits for this phrase row. */
  blendSafetyReverted?: boolean;
}

/** User / pipeline parameters for a single blend span (not yet read from `CompositionContext`). */
export interface C5BlendParams {
  blendStart: number;
  blendLength: number;
  fromFeel: RhythmFeel;
  toFeel: RhythmFeel;
  c5Strength: 'light' | 'medium' | 'strong';
}

type RhythmFeel = 'stable' | 'balanced' | 'surprise';

function strengthLabelC5(s: 'light' | 'medium' | 'strong' | undefined): SongModeBlendStrengthLabel {
  const v = s ?? 'medium';
  if (v === 'light') return 'Light';
  if (v === 'strong') return 'Strong';
  return 'Medium';
}

function c5StrengthScale(s: 'light' | 'medium' | 'strong' | undefined): number {
  const v = s ?? 'medium';
  if (v === 'light') return 0.55;
  if (v === 'strong') return 1.35;
  return 1;
}

/**
 * Endpoint metrics for blending: density ∈ [0,1] (higher = more attacks implied), offbeat ∈ [0,1] (offbeat emphasis probability).
 * Chosen to be monotonic across stable → balanced → surprise for predictable gradients.
 */
export function feelMetricsForBlend(feel: RhythmFeel): { density: number; offbeatProb: number } {
  switch (feel) {
    case 'stable':
      return { density: 0.32, offbeatProb: 0.18 };
    case 'surprise':
      return { density: 0.78, offbeatProb: 0.72 };
    default:
      return { density: 0.52, offbeatProb: 0.44 };
  }
}

/**
 * Linear interpolation factor for bar index `barOffset` ∈ [0, blendLength - 1].
 * Returns t ∈ [0, 1] from `fromFeel` → `toFeel`.
 */
export function blendInterpolationT(barOffset: number, blendLength: number): number {
  if (blendLength <= 1) return 0;
  const t = barOffset / (blendLength - 1);
  return Math.min(1, Math.max(0, t));
}

/** Interpolated density and offbeat probability at normalized t. */
export function interpolateC5BlendMetrics(
  fromFeel: RhythmFeel,
  toFeel: RhythmFeel,
  t: number
): { density: number; offbeatProb: number } {
  const a = feelMetricsForBlend(fromFeel);
  const b = feelMetricsForBlend(toFeel);
  const u = Math.min(1, Math.max(0, t));
  return {
    density: a.density + (b.density - a.density) * u,
    offbeatProb: a.offbeatProb + (b.offbeatProb - a.offbeatProb) * u,
  };
}

function medianNums(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function cloneScoreEvent(e: ScoreEvent): ScoreEvent {
  if (e.kind === 'note') {
    const n = e as NoteEvent;
    return { ...n };
  }
  const r = e as RestEvent;
  return { ...r };
}

function clonePartMeasures(part: PartModel): Map<number, ScoreEvent[]> {
  const map = new Map<number, ScoreEvent[]>();
  for (const m of part.measures) {
    map.set(m.index, m.events.map(cloneScoreEvent));
  }
  return map;
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

/** C5 must not touch these notes (same guard philosophy as C4 ostinato). */
function shouldSkipBlendNote(note: NoteEvent, measure: MeasureModel): boolean {
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

function isOffbeatEighth(sb: number): boolean {
  return (
    Math.abs(sb - 0.5) < 0.02 ||
    Math.abs(sb - 1.5) < 0.02 ||
    Math.abs(sb - 2.5) < 0.02 ||
    Math.abs(sb - 3.5) < 0.02
  );
}

/**
 * Soft layer: bias velocity / articulation from interpolated density + offbeat probability (no pitch edits).
 */
function applyBlendToMeasure(
  measure: MeasureModel,
  barIndex: number,
  metrics: { density: number; offbeatProb: number },
  scale: number,
  seed: number,
  phraseIdx: number
): void {
  const notes = measure.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length === 0) return;

  const med = medianNums(notes.map((n) => n.velocity ?? 90));
  const densBias = (metrics.density - 0.5) * 14 * scale;
  const offBias = (metrics.offbeatProb - 0.45) * 18 * scale;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]!;
    if (shouldSkipBlendNote(note, measure)) continue;
    const base = note.velocity ?? 90;
    const u = seededUnit(seed, phraseIdx, 98200 + barIndex * 5 + i);
    let delta = densBias * 0.35;
    if (isOffbeatEighth(note.startBeat)) {
      delta += offBias * (0.55 + u * 0.2);
    } else {
      delta -= offBias * 0.25 * (1 - u);
    }
    if (base < med - 2) delta += 3 * scale;
    if (base > med + 2) delta -= 2 * scale;
    note.velocity = Math.min(127, Math.max(48, Math.round(base + delta)));
  }

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]!;
    if (shouldSkipBlendNote(note, measure)) continue;
    const u = seededUnit(seed, phraseIdx, 98300 + barIndex * 3 + i);
    if (metrics.offbeatProb > 0.55 && isOffbeatEighth(note.startBeat) && u < metrics.offbeatProb * 0.35) {
      if (!note.articulation) note.articulation = 'accent';
    } else if (metrics.density < 0.42 && u < 0.22) {
      if (!note.articulation) note.articulation = 'tenuto';
    }
  }
}

export function applyC5DensityLayer(
  measure: MeasureModel,
  c5Strength: 'light' | 'medium' | 'strong',
  seed: number,
  phraseIdx: number,
  barIndex: number
): void {
  if (c5Strength === 'medium') return;
  const notes = measure.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);
  if (notes.length < 2) return;

  if (c5Strength === 'light') {
    // Remove at most 1 weak offbeat note
    const candidates = notes.filter(
      (n) => isOffbeatEighth(n.startBeat) && !n.motifRef
    );
    if (candidates.length === 0) return;
    const idx = Math.floor(seededUnit(seed, phraseIdx, 97100 + barIndex) * candidates.length);
    const target = candidates[idx];
    if (!target) return;
    const rest: RestEvent = {
      kind: 'rest',
      startBeat: target.startBeat,
      duration: target.duration,
    };
    const pos = measure.events.indexOf(target);
    if (pos >= 0) measure.events.splice(pos, 1, rest);
    return;
  }

  if (c5Strength === 'strong') {
    // Split one longer offbeat-friendly note into two shorter notes
    const candidates = notes.filter(
      (n) => n.duration >= 0.5 && isOffbeatEighth(n.startBeat) && !n.motifRef
    );
    if (candidates.length === 0) return;
    const idx = Math.floor(seededUnit(seed, phraseIdx, 97200 + barIndex) * candidates.length);
    const target = candidates[idx];
    if (!target) return;
    const half = target.duration / 2;
    const second: NoteEvent = {
      kind: 'note',
      pitch: target.pitch,
      startBeat: target.startBeat + half,
      duration: half,
      velocity: target.velocity,
      voice: target.voice,
    };
    target.duration = half;
    measure.events.push(second);
  }
}

function runGlobalC5SafetyAfterApply(
  guitar: PartModel,
  bass: PartModel | undefined,
  beforeG: { noteCount: number; totalSpan: number },
  beforeB: { noteCount: number; totalSpan: number } | null,
  fullBackupG: Map<number, ScoreEvent[]>,
  fullBackupB: Map<number, ScoreEvent[]> | null,
  out: SongModeBlendPhraseMeta[]
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
      o.blendActive = false;
      o.blendSafetyReverted = true;
      o.blendSummary = 'reverted: global safety';
    }
  }
}

/**
 * Primary C5 entry — blends feel across `[blendStart, blendStart + blendLength - 1]` on guitar (and lightly on bass when safe).
 * Uses `params` for explicit endpoints; phrase loop still mirrors C4’s segment structure for structural parity.
 */
export function applySongModeOstinatoC5(score: ScoreModel, context: CompositionContext, params: C5BlendParams): void {
  const meta = context.generationMetadata as GenerationMetadata;
  if (meta.songModeRhythmOverlayDisabled === true) return;
  if (meta.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const { blendStart, blendLength, fromFeel, toFeel, c5Strength } = params;
  if (!Number.isFinite(blendStart) || !Number.isFinite(blendLength)) return;
  if (blendLength < 1 || blendStart < 1) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;
  const bass = score.parts.find((p) => p.id === 'bass') as PartModel | undefined;

  const beforeG = snapshotPartTimingStats(guitar);
  const beforeB = bass ? snapshotPartTimingStats(bass) : null;
  const fullBackupG = clonePartMeasures(guitar);
  const fullBackupB = bass ? clonePartMeasures(bass) : null;

  const segments = songModePhraseSegments();
  const seed = context.seed;
  const scale = c5StrengthScale(c5Strength);
  const out: SongModeBlendPhraseMeta[] = [];

  for (let pi = 0; pi < segments.length; pi++) {
    const strengthMode = getEffectiveRhythmStrength(meta, pi) as RhythmFeel;
    const { startBar, endBar } = segments[pi];

    const overlapStart = Math.max(startBar, blendStart);
    const overlapEnd = Math.min(endBar, blendStart + blendLength - 1);
    const hasOverlap = overlapStart <= overlapEnd;

    let active = hasOverlap;
    let summary = active ? 'candidate' : 'inactive: no overlap with blend span';

    let phraseSafetyReverted = false;
    if (active) {
      const phraseBackupG = new Map<number, ScoreEvent[]>();
      const phraseBackupB = bass ? new Map<number, ScoreEvent[]>() : null;
      for (let b = startBar; b <= endBar; b++) {
        const m = guitar.measures.find((x) => x.index === b);
        if (m) phraseBackupG.set(b, m.events.map(cloneScoreEvent));
        if (bass && phraseBackupB) {
          const mb = bass.measures.find((x) => x.index === b);
          if (mb) phraseBackupB.set(b, mb.events.map(cloneScoreEvent));
        }
      }

      for (let bar = overlapStart; bar <= overlapEnd; bar++) {
        const barOffset = bar - blendStart;
        const t = blendInterpolationT(barOffset, blendLength);
        const metrics = interpolateC5BlendMetrics(fromFeel, toFeel, t);
        const mG = guitar.measures.find((x) => x.index === bar);
        if (mG) {
          applyBlendToMeasure(mG, bar, metrics, scale * (strengthMode === 'surprise' ? 1.06 : 1), seed, pi);
          applyC5DensityLayer(mG, c5Strength, seed, pi, bar);
          normalizeMeasureToEighthBeatGrid(mG);
        }
        if (bass) {
          const mB = bass.measures.find((x) => x.index === bar);
          if (mB) {
            applyBlendToMeasure(mB, bar, metrics, scale * 0.48, seed + 13, pi);
            normalizeMeasureToEighthBeatGrid(mB);
          }
        }
      }

      let ok = phraseTimingMatches(guitar, startBar, endBar, phraseBackupG);
      if (bass && phraseBackupB) ok = ok && phraseTimingMatches(bass, startBar, endBar, phraseBackupB);

      if (!ok) {
        for (const [idx, ev] of phraseBackupG) {
          const m = guitar.measures.find((x) => x.index === idx);
          if (m) m.events = ev.map(cloneScoreEvent);
        }
        if (bass && phraseBackupB) {
          for (const [idx, ev] of phraseBackupB) {
            const m = bass.measures.find((x) => x.index === idx);
            if (m) m.events = ev.map(cloneScoreEvent);
          }
        }
        active = false;
        phraseSafetyReverted = true;
        summary = 'reverted: phrase validation failed';
      } else {
        summary = `active: blend ${fromFeel}→${toFeel} · ${c5Strength} · overlap bars ${overlapStart}–${overlapEnd}`;
      }
    }

    out.push({
      phraseIndex: pi,
      blendActive: active,
      blendLengthBars: blendLength,
      blendStrength: strengthLabelC5(c5Strength),
      blendSummary: summary,
      blendSafetyReverted: phraseSafetyReverted,
    });
  }

  runGlobalC5SafetyAfterApply(guitar, bass, beforeG, beforeB, fullBackupG, fullBackupB, out);

  if (c5Strength !== 'medium') {
    for (let bar = blendStart; bar < blendStart + blendLength; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const mG = guitar.measures.find((x) => x.index === bar);
      if (mG) applyC5DensityLayer(mG, c5Strength, seed, 0, bar);
    }
  }
}

/**
 * Secondary export (mirrors the second exported pass in `songModeOstinatoC4.ts`): pure schedule of per-bar blend targets for receipts / tests.
 * Does not mutate the score.
 */
export function buildSongModeBlendScheduleC5(params: C5BlendParams): Array<{
  bar: number;
  t: number;
  density: number;
  offbeatProb: number;
}> {
  const { blendStart, blendLength, fromFeel, toFeel } = params;
  const rows: Array<{ bar: number; t: number; density: number; offbeatProb: number }> = [];
  if (blendLength < 1 || blendStart < 1) return rows;
  for (let i = 0; i < blendLength; i++) {
    const bar = blendStart + i;
    const t = blendInterpolationT(i, blendLength);
    const { density, offbeatProb } = interpolateC5BlendMetrics(fromFeel, toFeel, t);
    rows.push({ bar, t, density, offbeatProb });
  }
  return rows;
}
