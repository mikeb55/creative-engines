/**
 * Phase C7 — Space / density (V1): guitar-only rest + hold shaping after C6.
 * Deterministic (seededUnit); subtractive only; preserves bar total span; no pitch edits on kept notes.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import type { MeasureModel, NoteEvent, PartModel, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createRest } from '../score-model/scoreEventBuilder';
import { seededUnit } from './guitarBassDuoHarmony';
import { songModePhraseSegments } from './songModePhraseEngineV1';
import { getEffectiveRhythmStrength } from '../rhythmIntentResolve';
import { snapshotMeasureNotes } from './jamesBrownFunkOverlay';
import { guitarRestRatio } from '../score-integrity/duoLockQuality';
import { isProtectedBar } from '../score-integrity/identityLock';

type RhythmMode = 'stable' | 'balanced' | 'surprise';

/** Match `validateDuoSwingRhythm` / duo identity: guitar rest fraction must stay ≤ this (whole-part). */
const SWING_GUITAR_REST_CEILING = 0.45;

export interface SongModeC7PhraseRow {
  phraseIndex: number;
  c7Active: boolean;
  c7Summary?: string;
  c7OpsApplied?: number;
}

function cloneScoreEvent(e: ScoreEvent): ScoreEvent {
  if (e.kind === 'note') return { ...(e as NoteEvent) };
  const r = e as RestEvent;
  return { ...r };
}

function clonePhraseMeasures(guitar: PartModel, startBar: number, endBar: number): Map<number, ScoreEvent[]> {
  const map = new Map<number, ScoreEvent[]>();
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    map.set(b, m.events.map(cloneScoreEvent));
  }
  return map;
}

function restorePhraseMeasures(guitar: PartModel, backup: Map<number, ScoreEvent[]>): void {
  for (const m of guitar.measures) {
    const ev = backup.get(m.index);
    if (ev) m.events = ev.map(cloneScoreEvent);
  }
}

function sortEventsByStart(m: MeasureModel): void {
  m.events.sort((a, b) => {
    const sa = a.kind === 'note' || a.kind === 'rest' ? (a as { startBeat: number }).startBeat : 0;
    const sb = b.kind === 'note' || b.kind === 'rest' ? (b as { startBeat: number }).startBeat : 0;
    return sa - sb;
  });
}

function measureTotalSpan(m: MeasureModel): number {
  let s = 0;
  for (const e of m.events) {
    if (e.kind === 'note' || e.kind === 'rest') s += (e as { duration: number }).duration;
  }
  return s;
}

function noOverlapsMonotonic(m: MeasureModel): boolean {
  const ev = m.events
    .filter((e) => e.kind === 'note' || e.kind === 'rest')
    .map((e) => e as { startBeat: number; duration: number })
    .sort((a, b) => a.startBeat - b.startBeat);
  let cursor = 0;
  for (const e of ev) {
    if (e.duration < 1e-6) return false;
    if (e.startBeat + 1e-4 < cursor) return false;
    cursor = Math.max(cursor, e.startBeat + e.duration);
  }
  return cursor <= BEATS_PER_MEASURE + 1e-2;
}

function noCrossBarNotes(m: MeasureModel): boolean {
  for (const e of m.events) {
    if (e.kind !== 'note') continue;
    const n = e as NoteEvent;
    if (n.startBeat + n.duration > BEATS_PER_MEASURE + 1e-3) return false;
  }
  return true;
}

/** Each beat window [k,k+1) touched by a note or rest (onset or sustain). */
function beatWindowsCovered(m: MeasureModel): boolean {
  for (let k = 0; k < 4; k++) {
    const w0 = k;
    const w1 = k + 1;
    let ok = false;
    for (const e of m.events) {
      if (e.kind !== 'note' && e.kind !== 'rest') continue;
      const n = e as { startBeat: number; duration: number };
      const end = n.startBeat + n.duration;
      if (n.startBeat >= w0 - 1e-4 && n.startBeat < w1 - 1e-4) {
        ok = true;
        break;
      }
      if (n.startBeat < w0 + 1e-4 && end > w0 + 1e-4) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
}

function isStrongOrAnchor(
  sb: number,
  jb: boolean
): boolean {
  if (Math.abs(sb) < 0.08 || Math.abs(sb - 2) < 0.08) return true;
  if (jb && (Math.abs(sb - 1) < 0.08 || Math.abs(sb - 3) < 0.08)) return true;
  return false;
}

function isProtected(
  n: NoteEvent,
  barIndex: number,
  phraseStart: number,
  phraseEnd: number,
  noteIdx: number,
  notesSorted: NoteEvent[],
  ostinatoActive: boolean,
  jb: boolean
): boolean {
  const sb = n.startBeat;
  const rel = barIndex - phraseStart;
  if (rel === 0 && noteIdx === 0) return true;
  if (barIndex === phraseEnd && noteIdx === notesSorted.length - 1) return true;
  if (isStrongOrAnchor(sb, jb)) return true;
  if (ostinatoActive && noteIdx % 3 === 0) return true;
  if (n.articulation === 'accent' || (n.velocity ?? 90) >= 102) return true;
  return false;
}

function repeatedShortNeighbor(notes: NoteEvent[], i: number): boolean {
  if (i === 0) return false;
  const a = notes[i - 1]!;
  const b = notes[i]!;
  if (a.pitch !== b.pitch) return false;
  return b.startBeat - (a.startBeat + a.duration) < 0.15;
}

function capForMode(mode: RhythmMode): number {
  if (mode === 'stable') return 0.1;
  if (mode === 'surprise') return 0.34;
  return 0.24;
}

interface Cand {
  bar: number;
  note: NoteEvent;
  score: number;
  idx: number;
}

function tryMergeWithPrevious(m: MeasureModel, n: NoteEvent): boolean {
  const snap = snapshotMeasureNotes(m);
  const backup = cloneScoreEventList(m.events);
  const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
  notes.sort((a, b) => a.startBeat - b.startBeat);
  const i = notes.indexOf(n);
  if (i <= 0) return false;
  const prev = notes[i - 1]!;
  if (prev.pitch !== n.pitch) return false;
  const gap = n.startBeat - (prev.startBeat + prev.duration);
  if (Math.abs(gap) > 0.04) return false;
  prev.duration = snapAttackBeatToGridLocal(prev.duration + n.duration);
  const idx = m.events.indexOf(n);
  if (idx < 0) return false;
  m.events.splice(idx, 1);
  sortEventsByStart(m);
  if (!validateMeasureC7(m, snap)) {
    m.events = backup.map(cloneScoreEvent);
    return false;
  }
  return true;
}

function snapAttackBeatToGridLocal(beats: number): number {
  return Math.round(beats * 2) / 2;
}

function tryNoteToRest(m: MeasureModel, n: NoteEvent): boolean {
  const snap = snapshotMeasureNotes(m);
  const backup = cloneScoreEventList(m.events);
  const idx = m.events.indexOf(n);
  if (idx < 0) return false;
  const sb = n.startBeat;
  const dur = n.duration;
  const voice = n.voice ?? 1;
  m.events.splice(idx, 1);
  m.events.push(createRest(sb, dur, voice));
  sortEventsByStart(m);
  if (!validateMeasureC7(m, snap)) {
    m.events = backup.map(cloneScoreEvent);
    return false;
  }
  return true;
}

function validateMeasureC7(m: MeasureModel, before: { noteCount: number; totalEventSpan: number }): boolean {
  const after = snapshotMeasureNotes(m);
  if (Math.abs(after.totalEventSpan - before.totalEventSpan) > 0.03) return false;
  if (Math.abs(measureTotalSpan(m) - before.totalEventSpan) > 0.03) return false;
  if (!noOverlapsMonotonic(m)) return false;
  if (!noCrossBarNotes(m)) return false;
  if (!beatWindowsCovered(m)) return false;
  return true;
}

function countPhraseNotes(guitar: PartModel, startBar: number, endBar: number): number {
  let c = 0;
  for (let b = startBar; b <= endBar; b++) {
    const m = guitar.measures.find((x) => x.index === b);
    if (!m) continue;
    for (const e of m.events) if (e.kind === 'note') c++;
  }
  return c;
}

function c7CapScale(c5: { autoReductionStep?: number } | undefined): number {
  if (!c5) return 1;
  let s = 1;
  if ((c5.autoReductionStep ?? 0) >= 1) s *= 0.92;
  if ((c5.autoReductionStep ?? 0) >= 2) s *= 0.88;
  return Math.max(0.65, s);
}

/**
 * C7 space pass — guitar only; phrase backup + per-op rollback on invalid state.
 */
export function applySongModeSpaceC7(score: ScoreModel, context: CompositionContext): void {
  const meta = context.generationMetadata as GenerationMetadata;
  if (meta.songModeHookFirstIdentity !== true) return;
  if (context.presetId !== 'guitar_bass_duo') return;
  if (context.form.totalBars !== 32) return;

  const guitar = score.parts.find((p) => p.id === 'guitar') as PartModel | undefined;
  if (!guitar) return;

  const seed = context.seed;
  const segments = songModePhraseSegments();
  const c5rows = meta.songModeC5ByPhrase;
  const ostRows = meta.songModeOstinatoByPhrase;
  const jb = meta.songModeJamesBrownFunkApplied === true;

  const out: SongModeC7PhraseRow[] = [];
  /** Pre-phrase snapshots for post-pass rollback if swing rest ceiling is exceeded. */
  const phraseBackups: Array<Map<number, ScoreEvent[]> | undefined> = [];

  for (let pi = 0; pi < segments.length; pi++) {
    const strength = getEffectiveRhythmStrength(meta, pi) as RhythmMode;
    const { startBar, endBar } = segments[pi];
    const phraseBackup = clonePhraseMeasures(guitar, startBar, endBar);
    phraseBackups[pi] = phraseBackup;
    const ostinatoActive = ostRows?.[pi]?.ostinatoActive === true;
    const c5 = c5rows?.[pi];

    const densityBias = (context.generationMetadata as any)?.songwriterDensityBias ?? 0.5;
    const densityScale = 1.0 + (0.5 - densityBias) * 0.6;
    let cap = capForMode(strength) * c7CapScale(c5) * densityScale;
    const noteTotal = countPhraseNotes(guitar, startBar, endBar);
    let maxOps = Math.max(0, Math.floor(noteTotal * cap));
    if (maxOps === 0) {
      out.push({ phraseIndex: pi, c7Active: false, c7Summary: 'inactive: cap zero', c7OpsApplied: 0 });
      continue;
    }

    const cands: Cand[] = [];
    for (let bar = startBar; bar <= endBar; bar++) {
      if (isProtectedBar(bar, context)) continue;
      const m = guitar.measures.find((x) => x.index === bar);
      if (!m) continue;
      const notes = m.events.filter((e) => e.kind === 'note') as NoteEvent[];
      notes.sort((a, b) => a.startBeat - b.startBeat);
      for (let ni = 0; ni < notes.length; ni++) {
        const n = notes[ni]!;
        if (isProtected(n, bar, startBar, endBar, ni, notes, ostinatoActive, jb)) continue;
        let sc = 0;
        const sb = n.startBeat;
        if (!isStrongOrAnchor(sb, jb)) sc += 3;
        if (repeatedShortNeighbor(notes, ni)) sc += 2;
        if (notes.length > 5) sc += 1;
        sc += seededUnit(seed, pi, 99300 + bar * 31 + ni);
        cands.push({ bar, note: n, score: sc, idx: ni });
      }
    }

    cands.sort((a, b) => b.score - a.score);

    let ops = 0;

    for (const c of cands) {
      if (ops >= maxOps) break;
      const m = guitar.measures.find((x) => x.index === c.bar);
      if (!m) continue;
      if (!m.events.includes(c.note)) continue;

      const mergeFirst = seededUnit(seed, pi, 99400 + c.bar + ops) < 0.42;

      let ok = false;
      if (mergeFirst) {
        ok = tryMergeWithPrevious(m, c.note);
      }
      if (!ok) {
        ok = tryNoteToRest(m, c.note);
      }

      if (ok) ops++;
    }

    const noteAfter = countPhraseNotes(guitar, startBar, endBar);
    const removedFrac = noteTotal > 0 ? (noteTotal - noteAfter) / noteTotal : 0;
    if (removedFrac > cap + 0.04) {
      restorePhraseMeasures(guitar, phraseBackup);
      out.push({
        phraseIndex: pi,
        c7Active: false,
        c7Summary: 'reverted: density cap',
        c7OpsApplied: 0,
      });
      continue;
    }

    if (noteAfter < Math.max(2, Math.ceil(noteTotal * 0.45))) {
      restorePhraseMeasures(guitar, phraseBackup);
      out.push({ phraseIndex: pi, c7Active: false, c7Summary: 'reverted: anti-oversparsity', c7OpsApplied: 0 });
      continue;
    }

    out.push({
      phraseIndex: pi,
      c7Active: true,
      c7Summary: `active: ops=${ops}; removed~${(removedFrac * 100).toFixed(0)}%`,
      c7OpsApplied: ops,
    });
  }

  if (guitarRestRatio(guitar) > SWING_GUITAR_REST_CEILING) {
    for (let pi = segments.length - 1; pi >= 0; pi--) {
      const row = out[pi];
      const backup = phraseBackups[pi];
      if (!row?.c7Active || !backup) continue;
      restorePhraseMeasures(guitar, backup);
      out[pi] = {
        phraseIndex: pi,
        c7Active: false,
        c7Summary: 'reverted: swing rest ceiling (≤45%)',
        c7OpsApplied: 0,
      };
      if (guitarRestRatio(guitar) <= SWING_GUITAR_REST_CEILING) break;
    }
  }

  meta.songModeC7ByPhrase = out;
  meta.songModeC7Receipt =
    'C7: guitar space (rest/hold); bar span preserved; deterministic; no pitch/harmony edits';
}

function cloneScoreEventList(events: ScoreEvent[]): ScoreEvent[] {
  return events.map(cloneScoreEvent);
}
